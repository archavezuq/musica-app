import { useState, useRef, useEffect, useCallback } from "react";
import { store } from "./store";

const PUB = process.env.PUBLIC_URL || "";
const icon = (name) => `${PUB}/icons/dark/${name}.svg`;

const GDRIVE_CLIENT_ID = process.env.REACT_APP_GDRIVE_CLIENT_ID || "";
const GDRIVE_API_KEY   = process.env.REACT_APP_GDRIVE_API_KEY   || "";
const GDRIVE_SCOPE     = "https://www.googleapis.com/auth/drive.readonly";

const COLORS = [
  { label: "Negro",    value: "#1a1a1a" },
  { label: "Rojo",     value: "#c0504d" },
  { label: "Azul",     value: "#2e74b5" },
  { label: "Verde",    value: "#4a7c59" },
  { label: "Naranja",  value: "#e07b39" },
  { label: "Resaltar", value: "rgba(255,220,0,0.45)", highlight: true },
];

const TOOLS = [
  { id: "pen",       icon: "pen",       label: "Lápiz"      },
  { id: "highlight", icon: "highlight", label: "Resaltador" },
  { id: "eraser",    icon: "eraser",    label: "Borrador"   },
  { id: "select",    icon: "move",      label: "Mover"      },
];

// ── Drawing helpers ────────────────────────────────────────────────────────────
function drawStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth   = stroke.width;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
  ctx.globalAlpha = stroke.tool === "highlight" ? 0.45 : 1;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    const mid = {
      x: (stroke.points[i - 1].x + stroke.points[i].x) / 2,
      y: (stroke.points[i - 1].y + stroke.points[i].y) / 2,
    };
    ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, mid.x, mid.y);
  }
  ctx.stroke();
  ctx.restore();
}

function redrawAll(canvas, strokes) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  strokes.forEach(s => drawStroke(ctx, s));
}

const ptDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ── Pitch detection (normalized autocorrelation) ──────────────────────────────
function autocorrelate(buf, sr) {
  const n = buf.length;

  // RMS silence gate — more sensitive than before
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  if (Math.sqrt(rms / n) < 0.005) return -1;

  const minLag = Math.floor(sr / 1500);
  const maxLag = Math.min(Math.ceil(sr / 40), Math.floor(n / 2)); // extends to 40 Hz

  // Normalized autocorrelation: corr(lag) = r(lag) / sqrt(r0_left * r0_right)
  // Gives values in [-1,1]; eliminates amplitude bias and improves noise immunity.
  let bestCorr = -1, bestLag = -1, prevCorr = Infinity, foundDip = false;

  for (let lag = minLag; lag < maxLag; lag++) {
    let c = 0, e0 = 0, e1 = 0;
    const len = n - lag;
    for (let i = 0; i < len; i++) {
      c  += buf[i] * buf[i + lag];
      e0 += buf[i] * buf[i];
      e1 += buf[i + lag] * buf[i + lag];
    }
    const norm = Math.sqrt(e0 * e1);
    const corr = norm > 0 ? c / norm : 0;

    if (!foundDip && corr < prevCorr) foundDip = true;
    if (foundDip && corr > bestCorr)  { bestCorr = corr; bestLag = lag; }
    prevCorr = corr;
  }

  // Require strong correlation — filters out noise and harmonics
  if (bestLag < 1 || bestCorr < 0.82) return -1;

  // Parabolic interpolation for sub-sample precision
  if (bestLag > minLag && bestLag < maxLag - 1) {
    let cm = 0, cp = 0, em0 = 0, em1 = 0, ep0 = 0, ep1 = 0;
    const lm = bestLag - 1, lp = bestLag + 1;
    for (let i = 0; i < n - lm; i++) { cm += buf[i] * buf[i + lm]; em0 += buf[i] * buf[i]; em1 += buf[i + lm] * buf[i + lm]; }
    for (let i = 0; i < n - lp; i++) { cp += buf[i] * buf[i + lp]; ep0 += buf[i] * buf[i]; ep1 += buf[i + lp] * buf[i + lp]; }
    const nm = Math.sqrt(em0 * em1), np = Math.sqrt(ep0 * ep1);
    cm = nm > 0 ? cm / nm : 0;
    cp = np > 0 ? cp / np : 0;
    const denom = 2 * (2 * bestCorr - cm - cp);
    if (denom !== 0) bestLag += (cp - cm) / denom;
  }

  return sr / bestLag;
}

function freqToNote(freq, a4) {
  if (freq <= 0) return null;
  const semis   = 12 * Math.log2(freq / a4);
  const rounded = Math.round(semis);
  const cents   = Math.round((semis - rounded) * 100);
  const NAMES   = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];
  return { note: NAMES[((rounded % 12) + 12) % 12], cents };
}

// ── PitchTuner ─────────────────────────────────────────────────────────────────
function PitchTuner({ a4 = 440 }) {
  const [on,     setOn]     = useState(false);
  const [status, setStatus] = useState("idle"); // idle | listening | in-tune | flat | sharp
  const [note,   setNote]   = useState("");
  const [cents,  setCents]  = useState(0);
  const audioRef = useRef({});
  const rafRef   = useRef(null);

  const LIGHT = {
    idle:       "#3d5e45",
    listening:  "#6b8f6b",
    "in-tune":  "#22c55e",
    flat:       "#ef4444",
    sharp:      "#3b82f6",
  };

  const GLOW = {
    "in-tune": "0 0 12px 4px #22c55e88",
    flat:      "0 0 12px 4px #ef444488",
    sharp:     "0 0 12px 4px #3b82f688",
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false },
        video: false,
      });
      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096; // larger buffer = better low-frequency precision
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      audioRef.current = { ctx, analyser, stream };
      setOn(true);
      setStatus("listening");

      // Stability filter: require 2 consecutive detections of same note before displaying
      let last = 0, prevNote = "", prevCents = 0, stableCount = 0;
      const loop = (t) => {
        rafRef.current = requestAnimationFrame(loop);
        if (t - last < 60) return; // ~17 fps — good balance
        last = t;
        analyser.getFloatTimeDomainData(buf);
        const freq = autocorrelate(buf, ctx.sampleRate);
        if (freq > 0) {
          const info = freqToNote(freq, a4);
          if (info) {
            if (info.note === prevNote) {
              stableCount++;
              if (stableCount >= 2) { // confirmed — show it
                setNote(info.note);
                setCents(info.cents);
                setStatus(Math.abs(info.cents) <= 10 ? "in-tune" : info.cents < 0 ? "flat" : "sharp");
              }
            } else {
              prevNote  = info.note;
              prevCents = info.cents;
              stableCount = 1; // reset stability
            }
          }
        } else {
          stableCount = 0;
          prevNote    = "";
          setStatus("listening");
        }
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setOn(false);
    }
  };

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const { ctx, stream } = audioRef.current;
    stream?.getTracks().forEach(t => t.stop());
    ctx?.close().catch(() => {});
    audioRef.current = {};
    setOn(false);
    setStatus("idle");
    setNote("");
  }, []);

  useEffect(() => () => stop(), [stop]);

  return (
    <button
      onClick={on ? stop : start}
      title={on ? "Desactivar afinador" : "Activar afinador"}
      style={{
        background: "rgba(8,16,10,0.78)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1px solid ${LIGHT[status]}44`,
        borderRadius: 28,
        padding: "5px 11px 5px 7px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 7,
        color: "#e8e4d8", fontSize: 11, fontWeight: 700,
        boxShadow: "0 2px 14px rgba(0,0,0,0.45)",
        transition: "border-color 0.35s",
        userSelect: "none",
        minWidth: 52,
      }}
    >
      {/* The light */}
      <span style={{
        width: 13, height: 13, borderRadius: "50%",
        background: LIGHT[status],
        boxShadow: GLOW[status] || "none",
        flexShrink: 0,
        transition: "background 0.3s, box-shadow 0.3s",
      }} />

      {!on && <span style={{ fontSize: 11 }}>Afinar</span>}
      {on && status === "listening" && <span style={{ opacity: 0.45, fontSize: 11 }}>…</span>}
      {on && note && (
        <>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.5 }}>{note}</span>
          <span style={{ fontSize: 9, opacity: 0.75, fontFamily: "monospace" }}>
            {cents > 0 ? "+" : ""}{cents}¢
          </span>
        </>
      )}
    </button>
  );
}

// ── Video format presets ───────────────────────────────────────────────────────
const VIDEO_FMTS = [
  { id: "reels",  icon: "format-portrait", label: "9:16", ar: 9 / 16, hint: "Reels / Historias" },
  { id: "square", icon: "format-square",   label: "1:1",  ar: 1,      hint: "Cuadrado / Feed"   },
  { id: "orig",   icon: "video",           label: "Orig", ar: null,   hint: "Cámara nativa"     },
];

// ── ScoreRecorder ──────────────────────────────────────────────────────────────
function ScoreRecorder({ lang = "es" }) {
  const L = {
    es: { audio: "Audio", video: "Video", rec: "● Grabar", stop: "⏹ Detener",
          saved: "Guardadas", dl: "⬇ Guardar", share: "↗ Compartir",
          permErr: "Sin acceso a micrófono/cámara." },
    en: { audio: "Audio", video: "Video", rec: "● Record", stop: "⏹ Stop",
          saved: "Saved", dl: "⬇ Save", share: "↗ Share",
          permErr: "No mic/camera access." },
  }[lang] || {};

  const [mode, setMode]         = useState("audio");
  const [vfmt, setVfmt]         = useState("reels");   // video format
  const [recording, setRec]     = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [recordings, setRecs]   = useState([]);
  const [open, setOpen]         = useState(false);
  const mrRef     = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);
  const videoRef  = useRef(null);
  const fmtClock  = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const activeFmt = VIDEO_FMTS.find(f => f.id === vfmt) || VIDEO_FMTS[0];

  const startRec = async () => {
    try {
      let videoConstraints = false;
      if (mode === "video") {
        videoConstraints = { facingMode: "user" };
        if (activeFmt.ar !== null) {
          // Portrait for 9:16, square for 1:1 — aspectRatio is width/height
          videoConstraints.aspectRatio = { ideal: activeFmt.ar };
          if (activeFmt.id === "reels") {
            videoConstraints.width  = { ideal: 1080 };
            videoConstraints.height = { ideal: 1920 };
          }
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: { echoCancellation: false, noiseSuppression: false },
      });
      if (mode === "video" && videoRef.current) videoRef.current.srcObject = stream;
      chunksRef.current = [];
      const mime = mode === "video"
        ? (MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac") ? "video/mp4;codecs=h264,aac" : "video/webm;codecs=vp9,opus")
        : (MediaRecorder.isTypeSupported("audio/mp4;codecs=aac") ? "audio/mp4;codecs=aac" : "audio/webm;codecs=opus");
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext  = mode === "video" ? (mime.includes("mp4") ? "mp4" : "webm") : (mime.includes("mp4") ? "m4a" : "webm");
        const url  = URL.createObjectURL(blob);
        const id   = Date.now();
        const savedFmt = activeFmt.id;
        // Auto-download to device
        const a = document.createElement("a");
        a.href = url; a.download = `grabacion-${id}.${ext}`; a.click();
        setRecs(r => [{ id, url, ext, mode, blob, savedFmt, label: new Date().toLocaleTimeString() }, ...r]);
        setOpen(true);
      };
      mr.start(500);
      mrRef.current = mr;
      setRec(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch { alert(L.permErr); }
  };

  const stopRec = () => {
    mrRef.current?.stop();
    mrRef.current = null;
    setRec(false);
    clearInterval(timerRef.current);
  };

  const shareRec = async (r) => {
    if (!navigator.canShare) { alert("Compartir no disponible en este navegador"); return; }
    const file = new File([r.blob], `grabacion.${r.ext}`, { type: r.blob.type });
    if (!navigator.canShare({ files: [file] })) { alert("Este archivo no se puede compartir desde aquí"); return; }
    try { await navigator.share({ files: [file], title: "Grabación musical" }); } catch {}
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // CSS aspect ratio for the live preview box
  const previewAr = mode === "video" && activeFmt.ar !== null
    ? (activeFmt.id === "reels" ? "9/16" : "1/1")
    : "16/9";

  return (
    <div style={{ background: "#101e14", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
      {/* ── Controls row ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", flexWrap: "wrap" }}>
        {!recording && (
          <div style={{ display: "flex", gap: 3 }}>
            {["audio", "video"].map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ padding: "4px 9px", background: mode === m ? "#4a7c59" : "rgba(255,255,255,0.06)", color: "#e8e4d8", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <img src={icon(m === "audio" ? "audio" : "video")} alt="" style={{ width: 13, height: 13 }} />
                {m === "audio" ? L.audio : L.video}
              </button>
            ))}
          </div>
        )}

        {/* Video format selector — only when mode=video and not recording */}
        {mode === "video" && !recording && (
          <div style={{ display: "flex", gap: 2 }}>
            {VIDEO_FMTS.map(f => (
              <button key={f.id} onClick={() => setVfmt(f.id)} title={f.hint}
                style={{ padding: "3px 8px", background: vfmt === f.id ? "rgba(74,124,89,0.7)" : "rgba(255,255,255,0.05)", color: vfmt === f.id ? "#fff" : "#8fbc8f", border: `1px solid ${vfmt === f.id ? "#4a7c59" : "transparent"}`, borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                <img src={icon(f.icon)} alt="" style={{ width: 12, height: 12 }} />
                {f.label}
              </button>
            ))}
          </div>
        )}

        {recording && (
          <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
            {fmtClock(elapsed)}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={recording ? stopRec : startRec}
          style={{ background: recording ? "#ef4444" : "#4a7c59", color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
          {recording ? L.stop : L.rec}
        </button>
        {recordings.length > 0 && (
          <button onClick={() => setOpen(o => !o)}
            style={{ background: "rgba(255,255,255,0.07)", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11 }}>
            {L.saved} {recordings.length} {open ? "▲" : "▼"}
          </button>
        )}
      </div>

      {/* ── Live preview (video only) ── */}
      {mode === "video" && recording && (
        <div style={{ padding: "0 12px 8px" }}>
          <div style={{ aspectRatio: previewAr, maxHeight: 180, maxWidth: activeFmt.id === "reels" ? 100 : "100%", margin: "0 auto", borderRadius: 7, overflow: "hidden", background: "#000" }}>
            <video ref={videoRef} autoPlay muted playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ textAlign: "center", color: "#6b8f6b", fontSize: 10, marginTop: 4 }}>{activeFmt.hint}</div>
        </div>
      )}

      {/* ── Saved recordings list ── */}
      {open && recordings.length > 0 && (
        <div style={{ padding: "0 12px 12px", display: "grid", gap: 6 }}>
          {recordings.map(r => {
            const fmt = VIDEO_FMTS.find(f => f.id === r.savedFmt);
            return (
              <div key={r.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 9, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ color: "#8fbc8f", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                    <img src={icon(r.mode === "video" ? "video" : "audio")} alt="" style={{ width: 12, height: 12 }} />
                    {r.mode === "video" && fmt?.label ? `${fmt.label} ` : ""}{r.label}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {r.blob && (
                      <button onClick={() => shareRec(r)}
                        style={{ background: "rgba(74,124,89,0.25)", border: "1px solid #4a7c59", borderRadius: 6, color: "#8fbc8f", cursor: "pointer", fontSize: 11, padding: "2px 8px", fontWeight: 700 }}>
                        {L.share}
                      </button>
                    )}
                    <a href={r.url} download={`rec-${r.id}.${r.ext}`}
                      style={{ background: "#4a7c59", color: "#fff", borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: "none", padding: "2px 8px" }}>
                      {L.dl}
                    </a>
                    <button onClick={() => setRecs(rs => rs.filter(x => x.id !== r.id))}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                </div>
                {r.mode === "video" ? (
                  <div style={{ aspectRatio: r.savedFmt === "reels" ? "9/16" : r.savedFmt === "square" ? "1/1" : "16/9", maxHeight: 240, maxWidth: r.savedFmt === "reels" ? 140 : "100%", margin: "0 auto", borderRadius: 6, overflow: "hidden", background: "#000" }}>
                    <video src={r.url} controls playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ) : (
                  <audio src={r.url} controls style={{ width: "100%", height: 30 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ScoreMetronome (floating, for use while reading) ───────────────────────────
function ScoreMetronome() {
  const [bpm, setBpm]     = useState(80);
  const [beats, setBeats] = useState(4);
  const [running, setRun] = useState(false);
  const [beat, setBeat]   = useState(0);
  const audioRef  = useRef(null);
  const intervalRef = useRef(null);
  const beatRef   = useRef(0);

  const click = useCallback((accent) => {
    if (!audioRef.current)
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioRef.current;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.frequency.value = accent ? 1200 : 900;
    g.gain.setValueAtTime(accent ? 0.4 : 0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(); osc.stop(ctx.currentTime + 0.09);
  }, []);

  useEffect(() => {
    if (running) {
      beatRef.current = 0;
      click(true); setBeat(1);
      intervalRef.current = setInterval(() => {
        beatRef.current = (beatRef.current + 1) % beats;
        click(beatRef.current === 0);
        setBeat(beatRef.current + 1);
      }, (60 / bpm) * 1000);
    } else {
      clearInterval(intervalRef.current);
      setBeat(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, bpm, beats, click]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const mBtn = (active) => ({
    background: active ? "rgba(74,124,89,0.7)" : "transparent",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 6,
    color: "#c8d5c0",
    cursor: "pointer",
    width: 26, height: 26,
    fontSize: 15,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div style={{
      background: "rgba(8,16,10,0.9)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(74,124,89,0.4)",
      borderRadius: 14,
      padding: "9px 13px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.55)",
      userSelect: "none",
      flexWrap: "wrap",
    }}>
      {/* Beat indicators */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {Array.from({ length: beats }, (_, i) => (
          <span key={i} style={{
            width: i === 0 ? 13 : 10, height: i === 0 ? 13 : 10,
            borderRadius: "50%",
            background: beat === i + 1 ? (i === 0 ? "#e07b39" : "#4a7c59") : "rgba(255,255,255,0.13)",
            transition: "background 0.05s",
            display: "inline-block",
          }} />
        ))}
      </div>

      {/* BPM control */}
      <button onClick={() => setBpm(b => Math.max(30, b - 2))} style={mBtn(false)}>−</button>
      <span style={{ color: "#e8e4d8", fontWeight: 900, fontFamily: "monospace", fontSize: 17, minWidth: 36, textAlign: "center" }}>{bpm}</span>
      <button onClick={() => setBpm(b => Math.min(240, b + 2))} style={mBtn(false)}>+</button>

      {/* Time signature */}
      <div style={{ display: "flex", gap: 2 }}>
        {[2, 3, 4, 6].map(b => (
          <button key={b} onClick={() => setBeats(b)} style={{ ...mBtn(beats === b), width: "auto", padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>
            {b}
          </button>
        ))}
      </div>

      {/* Play/stop */}
      <button onClick={() => setRun(r => !r)}
        style={{ background: running ? "#e07b39" : "#4a7c59", color: "#fff", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: running ? "0 0 10px #e07b3966" : "none", transition: "box-shadow 0.2s" }}>
        {running ? "⏸" : "▶"}
      </button>
    </div>
  );
}

// ── Shared glass button style ──────────────────────────────────────────────────
const glassBtn = (active = false, danger = false) => ({
  background: danger ? "rgba(239,68,68,0.2)" : active ? "rgba(74,124,89,0.75)" : "rgba(8,16,10,0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: `1px solid ${danger ? "rgba(239,68,68,0.4)" : active ? "rgba(74,124,89,0.7)" : "rgba(255,255,255,0.1)"}`,
  borderRadius: 9,
  color: danger ? "#fca5a5" : "#e8e4d8",
  cursor: "pointer",
  fontSize: 15,
  width: 34, height: 34,
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
  transition: "background 0.2s, border-color 0.2s",
  boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
  userSelect: "none",
});

// ── Main ScoreViewer ───────────────────────────────────────────────────────────
export default function ScoreViewer({ lang = "es", onNavChange = () => {} }) {
  const S = {
    es: {
      title: "Partituras", openLocal: "Abrir archivo",
      openDrive: "Mis carpetas Drive", driveConnect: "Conectar Google Drive", driveDisconnect: "Desconectar",
      noScore: "Abre una partitura para comenzar", page: "Pág.", of: "de",
      undo: "Deshacer", redo: "Rehacer", clearPage: "Limpiar página",
      loadingPdf: "Cargando PDF…",
      fileName: "Archivo:",
      annotSaved: "Guardado", hideTools: "Ocultar", showTools: "Herramientas",
      imslpPh: "Buscar en IMSLP: compositor, obra…", noResults: "Sin resultados",
      imslpHint: "Toca un resultado para ir a IMSLP y descargar el PDF",
      width: "Grosor",
    },
    en: {
      title: "Sheet Music", openLocal: "Open file",
      openDrive: "My Drive folders", driveConnect: "Connect Google Drive", driveDisconnect: "Disconnect",
      noScore: "Open a score to start annotating", page: "Pg.", of: "of",
      undo: "Undo", redo: "Redo", clearPage: "Clear page",
      loadingPdf: "Loading PDF…",
      fileName: "File:",
      annotSaved: "Saved", hideTools: "Hide", showTools: "Tools",
      imslpPh: "Search IMSLP: composer, piece…", noResults: "No results",
      imslpHint: "Tap a result to open IMSLP and download the PDF",
      width: "Size",
    },
  }[lang] || {};

  // ── State ──────────────────────────────────────────────────────────────────
  const [pdfDoc,         setPdfDoc]         = useState(null);
  const [pageNum,        setPageNum]        = useState(1);
  const [totalPages,     setTotalPages]     = useState(0);
  const [zoom,           setZoom]           = useState(1.5);
  const [tool,           setTool]           = useState("select");
  const [color,          setColor]          = useState("#1a1a1a");
  const [lineWidth,      setLineWidth]      = useState(3);
  const [strokes,        setStrokes]        = useState({});
  const [undoStack,      setUndoStack]      = useState([]);
  const [redoStack,      setRedoStack]      = useState([]);
  const [drawing,        setDrawing]        = useState(false);
  const [currentStroke,  setCurrentStroke]  = useState(null);
  const [docId,          setDocId]          = useState(null);
  const [fileName,       setFileName]       = useState("");
  const [loading,        setLoading]        = useState(false);
  const [driveReady,     setDriveReady]     = useState(false);  // GIS + Picker scripts loaded
  const [driveToken,     setDriveToken]     = useState("");     // current OAuth access token
  const [driveUser,      setDriveUser]      = useState("");     // signed-in email (display only)
  const [saveMsg,        setSaveMsg]        = useState("");
  const [rendering,      setRendering]      = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [showImslp,      setShowImslp]      = useState(false);
  const [imslpQuery,     setImslpQuery]     = useState("");
  const [imslpResults,   setImslpResults]   = useState([]);
  const [imslpLoading,   setImslpLoading]   = useState(false);
  const [a4Freq,         setA4Freq]         = useState(440);
  const [showMetronome,  setShowMetronome]  = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const pdfCanvasRef       = useRef(null);
  const annotCanvasRef     = useRef(null);
  const fileInputRef       = useRef(null);
  const canvasContainerRef = useRef(null);
  const renderTaskRef      = useRef(null); // cancels in-progress renders on page/zoom change
  const pageObjRef         = useRef(null); // current PDF.js page object — cleaned up on navigation
  const strokesRef         = useRef(strokes); // always-fresh ref so PDF render reads latest annotations
  const pageCacheRef       = useRef(new Map()); // pageNum → offscreen canvas (pre-rendered at current zoom)
  const prefetchTasksRef   = useRef(new Map()); // pageNum → renderTask (in-progress prefetch)
  const pinchRef           = useRef({ active: false, startDist: 0, startZoom: 1 });
  const activePtrRef       = useRef(new Map());
  const tokenClientRef     = useRef(null);  // GIS TokenClient (reused per session)
  const driveTokenRef      = useRef("");    // mirror of driveToken state — readable inside async callbacks
  const zoomRef            = useRef(zoom);
  const imslpTimerRef      = useRef(null);

  // Keep strokesRef in sync with state without triggering re-renders
  useEffect(() => { strokesRef.current = strokes; }, [strokes]);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const strokeKey = `${docId}-${pageNum}`;

  // ── Auto-fit zoom — scales the page to fill the container's full width ────
  // (height is intentionally NOT a factor: the viewer scrolls vertically,
  // so fitting to height on wide/landscape screens would leave the page
  // narrower than the container — a blank margin on tablets.)
  const fitToPage = useCallback((doc, pNum = 1) => {
    if (!canvasContainerRef.current) return;
    doc.getPage(pNum).then(page => {
      const vp     = page.getViewport({ scale: 1 });
      const availW = canvasContainerRef.current.clientWidth - 4;
      page.cleanup();
      setZoom(Math.max(0.3, +(availW / vp.width).toFixed(2)));
    });
  }, []);

  // Re-fit whenever the container itself resizes (orientation change, window
  // resize, or a layout shift that doesn't fire a window "resize" event).
  useEffect(() => {
    if (!pdfDoc || !canvasContainerRef.current) return;
    const el = canvasContainerRef.current;
    const ro = new ResizeObserver(() => fitToPage(pdfDoc, pageNum));
    ro.observe(el);
    return () => ro.disconnect();
  }, [pdfDoc, pageNum, fitToPage]);

  // ── Bluetooth pedal / keyboard page navigation ─────────────────────────────
  // Pedals (AirTurn, PageFlip, Donner, etc.) connect as BT HID keyboards and
  // send standard key events — no special API needed.
  useEffect(() => {
    if (!pdfDoc) return;
    const handler = (e) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        setPageNum(p => Math.min(totalPages, p + 1));
      } else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        setPageNum(p => Math.max(1, p - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pdfDoc, totalPages]);

  // ── Signal parent nav hide ─────────────────────────────────────────────────
  useEffect(() => {
    onNavChange(!!pdfDoc && !toolbarVisible);
  }, [pdfDoc, toolbarVisible, onNavChange]);

  // ── PDF.js CDN ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (window.pdfjsLib) return;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };
    document.head.appendChild(s);
  }, []);

  // ── Google Drive — GIS (modern OAuth) + Picker API ────────────────────────
  useEffect(() => {
    if (!GDRIVE_CLIENT_ID) return;
    let gisOk = false, pickerOk = false;
    const check = () => { if (gisOk && pickerOk) setDriveReady(true); };

    // Google Identity Services — modern OAuth2 (replaces deprecated gapi.auth2)
    const loadGis = () => {
      if (window.google?.accounts?.oauth2) { gisOk = true; check(); return; }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.onload = () => { gisOk = true; check(); };
      document.head.appendChild(s);
    };

    // Google Picker API (still loaded via gapi, but only the "picker" module)
    const loadPicker = () => {
      if (window.google?.picker) { pickerOk = true; check(); return; }
      const s = document.createElement("script");
      s.src = "https://apis.google.com/js/api.js";
      s.onload = () => window.gapi.load("picker", () => { pickerOk = true; check(); });
      document.head.appendChild(s);
    };

    loadGis();
    loadPicker();
  }, []);

  // ── Annotations (safe store) ───────────────────────────────────────────────
  useEffect(() => {
    if (!docId) return;
    setStrokes(store.get(`annot-${docId}`, {}));
  }, [docId]);

  useEffect(() => {
    if (!docId || Object.keys(strokes).length === 0) return;
    store.set(`annot-${docId}`, strokes);
    setSaveMsg(S.annotSaved);
    const t = setTimeout(() => setSaveMsg(""), 1500);
    return () => clearTimeout(t);
  }, [strokes, docId, S.annotSaved]);

  // ── Page cache helpers ─────────────────────────────────────────────────────
  const clearPageCache = useCallback(() => {
    prefetchTasksRef.current.forEach(t => t.cancel?.());
    prefetchTasksRef.current.clear();
    pageCacheRef.current.clear();
  }, []);

  // Pre-render a page into the cache without touching the visible canvas
  const prefetchPage = useCallback((doc, pNum, z) => {
    if (!doc || pNum < 1 || pNum > doc.numPages) return;
    if (pageCacheRef.current.has(pNum)) return;
    if (prefetchTasksRef.current.has(pNum)) return;

    doc.getPage(pNum).then(page => {
      if (pageCacheRef.current.has(pNum)) { page.cleanup(); return; }
      const vp = page.getViewport({ scale: z });
      const offscreen = document.createElement("canvas");
      offscreen.width = vp.width;
      offscreen.height = vp.height;
      const task = page.render({ canvasContext: offscreen.getContext("2d"), viewport: vp });
      prefetchTasksRef.current.set(pNum, task);
      task.promise
        .then(() => {
          page.cleanup();
          prefetchTasksRef.current.delete(pNum);
          pageCacheRef.current.set(pNum, offscreen);
        })
        .catch(() => { prefetchTasksRef.current.delete(pNum); });
    }).catch(() => {});
  }, []);

  // ── Render PDF page ────────────────────────────────────────────────────────
  // Uses pre-rendered cache when available (instant page turn), otherwise
  // renders offscreen first then swaps atomically (no blank frame).
  // strokes intentionally NOT in deps — annotation changes must not
  // trigger a PDF re-render (that causes canvas resize → flicker).
  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    let cancelled = false;

    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;
    pageObjRef.current?.cleanup();
    pageObjRef.current = null;

    const applyCanvas = (offscreen) => {
      if (cancelled) return;
      const cvs = pdfCanvasRef.current;
      const ann = annotCanvasRef.current;
      if (!cvs || !ann) return;
      cvs.width  = ann.width  = offscreen.width;
      cvs.height = ann.height = offscreen.height;
      cvs.getContext("2d").drawImage(offscreen, 0, 0);
      redrawAll(ann, strokesRef.current[`${docId}-${pageNum}`] || []);
      setRendering(false);
      // Prefetch neighbors now that current page is painted
      prefetchPage(pdfDoc, pageNum + 1, zoom);
      prefetchPage(pdfDoc, pageNum - 1, zoom);
    };

    // Cache hit → instant display, no async wait
    if (pageCacheRef.current.has(pageNum)) {
      applyCanvas(pageCacheRef.current.get(pageNum));
      return;
    }

    setRendering(true);

    pdfDoc.getPage(pageNum).then(page => {
      if (cancelled) { page.cleanup(); return; }
      pageObjRef.current = page;
      const vp = page.getViewport({ scale: zoom });
      const offscreen = document.createElement("canvas");
      offscreen.width  = vp.width;
      offscreen.height = vp.height;
      const task = page.render({ canvasContext: offscreen.getContext("2d"), viewport: vp });
      renderTaskRef.current = task;
      task.promise
        .then(() => {
          page.cleanup();
          pageObjRef.current = null;
          pageCacheRef.current.set(pageNum, offscreen);
          applyCanvas(offscreen);
        })
        .catch(() => { if (!cancelled) setRendering(false); });
    }).catch(() => { if (!cancelled) setRendering(false); });

    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, zoom, docId, prefetchPage]); // strokes intentionally excluded — see comment above

  // Clear cache when zoom changes (cached canvases are at the old scale)
  useEffect(() => { clearPageCache(); }, [zoom, docId, clearPageCache]);

  // ── Open local file ────────────────────────────────────────────────────────
  const openLocalFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    setDocId(`local-${file.name}-${file.size}`);
    const reader = new FileReader();
    reader.onload = ev => {
      window.pdfjsLib.getDocument({ data: new Uint8Array(ev.target.result) }).promise.then(doc => {
        // Calculate zoom here so setPdfDoc + setZoom batch into ONE render in React 18,
        // avoiding the wasted render at the stale zoom=1.5 default.
        doc.getPage(1).then(page => {
          const vp     = page.getViewport({ scale: 1 });
          const availW = (canvasContainerRef.current?.clientWidth ?? 400) - 4;
          const newZoom = Math.max(0.3, +(availW / vp.width).toFixed(2));
          page.cleanup();
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setPageNum(1);
          setZoom(newZoom);
          setLoading(false);
        });
      });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // ── Google Drive: show Picker with a valid token ───────────────────────────
  const showDrivePicker = useCallback((token) => {
    const G = window.google.picker;
    const picker = new G.PickerBuilder()
      // "All Drive" tab — user can navigate any folder
      .addView(
        new G.DocsView()
          .setMimeTypes("application/pdf")
          .setMode(G.DocsViewMode.LIST)
          .setSelectFolderEnabled(false)
          .setLabel("Mis archivos")
      )
      // "Shared with me" tab
      .addView(
        new G.DocsView(G.ViewId.DOCS)
          .setMimeTypes("application/pdf")
          .setOwnedByMe(false)
          .setLabel("Compartidos conmigo")
      )
      // "Recent" tab
      .addView(new G.DocsView(G.ViewId.RECENTLY_PICKED).setMimeTypes("application/pdf").setLabel("Recientes"))
      .setOAuthToken(token)
      .setDeveloperKey(GDRIVE_API_KEY)
      .setTitle("📂 Seleccionar partitura PDF en Google Drive")
      .enableFeature(G.Feature.SUPPORT_DRIVES) // include shared drives
      .setCallback(data => {
        if (data.action !== G.Action.PICKED) return;
        const f = data.docs[0];
        setFileName(f.name);
        setLoading(true);
        setDocId(`drive-${f.id}`);
        fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&supportsAllDrives=true`, {
          headers: { Authorization: `Bearer ${driveTokenRef.current}` },
        })
          .then(r => { if (!r.ok) throw r.status; return r.arrayBuffer(); })
          .then(buf => window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise)
          .then(doc => doc.getPage(1).then(page => {
            const vp     = page.getViewport({ scale: 1 });
            const availW = (canvasContainerRef.current?.clientWidth ?? 400) - 4;
            const newZoom = Math.max(0.3, +(availW / vp.width).toFixed(2));
            page.cleanup();
            setPdfDoc(doc); setTotalPages(doc.numPages); setPageNum(1); setZoom(newZoom); setLoading(false);
          }))
          .catch(() => setLoading(false));
      })
      .build();
    picker.setVisible(true);
  }, [fitToPage]);

  // ── Google Drive: request token then open Picker ───────────────────────────
  const openDrivePicker = useCallback(() => {
    if (!driveReady) return;

    // Token already in memory — open picker directly
    if (driveTokenRef.current) { showDrivePicker(driveTokenRef.current); return; }

    // First time (or after disconnect) — initialize GIS TokenClient
    if (!tokenClientRef.current) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GDRIVE_CLIENT_ID,
        scope: GDRIVE_SCOPE,
        callback: (res) => {
          if (res.error) { console.error("Drive OAuth:", res); return; }
          driveTokenRef.current = res.access_token;
          setDriveToken(res.access_token);
          // Decode email from the id_token hint (optional — GIS doesn't expose email directly)
          try {
            const payload = JSON.parse(atob(res.access_token.split(".")[1] || "e30="));
            if (payload.email) setDriveUser(payload.email);
          } catch {}
          showDrivePicker(res.access_token);
        },
      });
    }
    tokenClientRef.current.requestAccessToken({ prompt: "consent" });
  }, [driveReady, showDrivePicker]);

  const disconnectDrive = () => {
    if (driveTokenRef.current)
      window.google?.accounts?.oauth2?.revoke(driveTokenRef.current, () => {});
    driveTokenRef.current = "";
    setDriveToken("");
    setDriveUser("");
    tokenClientRef.current = null;
  };

  // ── Pointer / pinch handlers ───────────────────────────────────────────────
  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const onPointerDown = useCallback(e => {
    if (!annotCanvasRef.current) return;
    e.preventDefault();
    annotCanvasRef.current.setPointerCapture(e.pointerId);
    activePtrRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePtrRef.current.size >= 2) {
      const [p1, p2] = [...activePtrRef.current.values()];
      pinchRef.current = { active: true, startDist: ptDist(p1, p2), startZoom: zoomRef.current };
      setDrawing(false); setCurrentStroke(null); return;
    }
    if (tool === "select") return;
    setDrawing(true);
    setCurrentStroke({
      tool, points: [getPos(e, annotCanvasRef.current)],
      color: tool === "eraser" ? "#000000" : color,
      width: tool === "eraser" ? lineWidth * 6 : tool === "highlight" ? lineWidth * 4 : lineWidth,
    });
  }, [tool, color, lineWidth]);

  const onPointerMove = useCallback(e => {
    if (!annotCanvasRef.current) return;
    e.preventDefault();
    activePtrRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.active && activePtrRef.current.size >= 2) {
      const [p1, p2] = [...activePtrRef.current.values()];
      const newZoom  = Math.min(4, Math.max(0.5, +(pinchRef.current.startZoom * ptDist(p1, p2) / pinchRef.current.startDist).toFixed(2)));
      setZoom(newZoom); return;
    }
    if (!drawing || !currentStroke) return;
    const updated = { ...currentStroke, points: [...currentStroke.points, getPos(e, annotCanvasRef.current)] };
    setCurrentStroke(updated);
    // Draw only the new segment on top — no full redraw needed while dragging
    drawStroke(annotCanvasRef.current.getContext("2d"), updated);
  }, [drawing, currentStroke]);

  const onPointerUp = useCallback(e => {
    if (e?.pointerId != null) activePtrRef.current.delete(e.pointerId);
    if (activePtrRef.current.size < 2) pinchRef.current.active = false;
    if (!drawing || !currentStroke) return;
    setDrawing(false);
    const key = `${docId}-${pageNum}`;
    const newStrokes = { ...strokesRef.current, [key]: [...(strokesRef.current[key] || []), currentStroke] };
    // Redraw annotations imperatively — no state read, no PDF re-render
    if (annotCanvasRef.current) redrawAll(annotCanvasRef.current, newStrokes[key]);
    setStrokes(newStrokes);
    setUndoStack(u => [...u, strokesRef.current]);
    setRedoStack([]);
    setCurrentStroke(null);
  }, [drawing, currentStroke, docId, pageNum]);

  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [strokesRef.current, ...r]);
    setStrokes(prev);
    setUndoStack(u => u.slice(0, -1));
    if (annotCanvasRef.current) redrawAll(annotCanvasRef.current, prev[strokeKey] || []);
  };
  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[0];
    setUndoStack(u => [...u, strokesRef.current]);
    setStrokes(next);
    setRedoStack(r => r.slice(1));
    if (annotCanvasRef.current) redrawAll(annotCanvasRef.current, next[strokeKey] || []);
  };
  const clearPage = () => {
    setUndoStack(u => [...u, strokesRef.current]);
    const cleared = { ...strokesRef.current, [strokeKey]: [] };
    setStrokes(cleared);
    if (annotCanvasRef.current) {
      const ctx = annotCanvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, annotCanvasRef.current.width, annotCanvasRef.current.height);
    }
  };

  // ── IMSLP via CORS proxy ───────────────────────────────────────────────────
  const searchImslp = useCallback(async q => {
    if (!q.trim()) { setImslpResults([]); return; }
    setImslpLoading(true);
    try {
      const apiUrl = `https://imslp.org/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=12&srnamespace=0&format=json`;
      const res    = await fetch(`https://corsproxy.io/?${encodeURIComponent(apiUrl)}`);
      const data   = await res.json();
      setImslpResults(data?.query?.search || []);
    } catch { setImslpResults([]); }
    setImslpLoading(false);
  }, []);

  const handleImslpInput = val => {
    setImslpQuery(val);
    clearTimeout(imslpTimerRef.current);
    imslpTimerRef.current = setTimeout(() => searchImslp(val), 500);
  };

  // ── Toolbar button style ───────────────────────────────────────────────────
  const tb = (active = false, danger = false) => ({
    background: danger ? "rgba(239,68,68,0.18)" : active ? "rgba(74,124,89,0.7)" : "transparent",
    color: danger ? "#fca5a5" : active ? "#fff" : "#c8d5c0",
    border: "none",
    borderRadius: 7,
    width: 32, height: 32,
    cursor: "pointer",
    fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    transition: "background 0.15s",
  });

  const sep = { width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 3px", flexShrink: 0 };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0b1610", overflow: "hidden" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.25}}
        .sv-scroll::-webkit-scrollbar{display:none}
        .sv-scroll{scrollbar-width:none;-ms-overflow-style:none}
        .imslp-row:hover{border-color:#4a7c59!important;background:rgba(74,124,89,0.12)!important}
      `}</style>

      {/* ── Empty state ── */}
      {!pdfDoc && !loading && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <img src={icon("scores")} alt="" style={{ width: 56, height: 56, marginBottom: 8, opacity: 0.7 }} />
            <div style={{ color: "#6b8f6b", fontSize: 15 }}>{S.noScore}</div>
            {fileName && <div style={{ color: "#4a7c59", fontSize: 12, marginTop: 6 }}>{fileName}</div>}
          </div>

          {/* Open actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: "10px 18px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <img src={icon("open-file")} alt="" style={{ width: 18, height: 18 }} />
              {S.openLocal}
            </button>
            {GDRIVE_CLIENT_ID && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <button onClick={openDrivePicker} disabled={!driveReady}
                  style={{ padding: "10px 18px", background: driveToken ? "#2e4d3a" : "#1a2e22", color: "#e8e4d8", border: `1px solid ${driveToken ? "#4a7c59" : "#3d5e45"}`, borderRadius: 12, cursor: driveReady ? "pointer" : "default", fontSize: 14, opacity: driveReady ? 1 : 0.5 }}>
                  <img src={icon("cloud")} alt="" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 4 }} />{driveToken ? S.openDrive : driveReady ? S.driveConnect : "…"}
                </button>
                {driveToken && (
                  <button onClick={disconnectDrive}
                    style={{ background: "none", border: "none", color: "#6b8f6b", cursor: "pointer", fontSize: 11, padding: 0, textDecoration: "underline" }}>
                    {driveUser ? `${driveUser} · ` : ""}{S.driveDisconnect}
                  </button>
                )}
              </div>
            )}
            <button onClick={() => setShowImslp(v => !v)} style={{ padding: "10px 18px", background: showImslp ? "#4a7c59" : "#1a2e22", color: "#e8e4d8", border: "1px solid #4a7c59", borderRadius: 12, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <img src={icon("search")} alt="" style={{ width: 16, height: 16 }} />
              IMSLP
            </button>
          </div>

          {/* IMSLP inline in empty state */}
          {showImslp && (
            <div style={{ width: "100%", maxWidth: 500, background: "#1a2e22", borderRadius: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={imslpQuery} onChange={e => handleImslpInput(e.target.value)}
                  placeholder={S.imslpPh}
                  style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "1px solid #4a7c59", background: "#2d4a35", color: "#e8e4d8", fontSize: 13, outline: "none" }} />
                {imslpLoading && <span style={{ alignSelf: "center", color: "#8fbc8f", fontSize: 12 }}>…</span>}
              </div>
              <div style={{ maxHeight: 260, overflowY: "auto", display: "grid", gap: 5 }} className="sv-scroll">
                {!imslpResults.length && imslpQuery && !imslpLoading && (
                  <div style={{ color: "#6b8f6b", fontSize: 13, textAlign: "center", padding: 12 }}>{S.noResults}</div>
                )}
                {imslpResults.map(r => {
                  const clean    = r.title.replace(/\(.*?\)/g, "").trim();
                  const composer = r.title.match(/\(([^)]+)\)$/)?.[1] || "";
                  return (
                    <a key={r.pageid} href={`https://imslp.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`} target="_blank" rel="noreferrer"
                      className="imslp-row"
                      style={{ display: "block", background: "#2d4a35", borderRadius: 8, padding: "9px 12px", textDecoration: "none", border: "1px solid transparent", transition: "all 0.15s" }}>
                      <div style={{ color: "#e8e4d8", fontSize: 13, fontWeight: 700 }}>{clean}</div>
                      {composer && <div style={{ color: "#8fbc8f", fontSize: 11 }}>{composer}</div>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8fbc8f", fontSize: 16, gap: 10 }}>
          <span style={{ animation: "pulse 1s infinite", color: "#8fbc8f" }}>···</span> {S.loadingPdf}
        </div>
      )}

      {/* ── Canvas area ── */}
      {pdfDoc && (
        <div ref={canvasContainerRef}
          style={{ flex: 1, minHeight: 0, position: "relative", overflow: "auto", background: "#e8e4d8", cursor: tool === "select" ? "grab" : tool === "eraser" ? "cell" : "crosshair" }}
          className="sv-scroll">

          <canvas ref={pdfCanvasRef} style={{ display: "block" }} />
          <canvas ref={annotCanvasRef}
            style={{ position: "absolute", top: 0, left: 0, touchAction: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onPointerCancel={onPointerUp}
          />

          {/* ── Floating: Tuner + A4 (top-left) ── */}
          <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 5, zIndex: 10 }}>
            <PitchTuner a4={a4Freq} />
            <button
              onClick={() => setA4Freq(f => f === 440 ? 442 : 440)}
              title="Cambiar afinación de referencia"
              style={{ background: "rgba(8,16,10,0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#8fbc8f", cursor: "pointer", fontSize: 10, fontWeight: 700, padding: "4px 8px", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", fontFamily: "monospace" }}>
              {a4Freq}Hz
            </button>
          </div>

          {/* ── Floating: Actions (top-right) ── */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5, zIndex: 10 }}>
            {toolbarVisible && (
              <>
                <button onClick={() => fileInputRef.current?.click()} title={S.openLocal} style={glassBtn()}><img src={icon("open-file")} alt="" style={{ width: 18, height: 18 }} /></button>
                {GDRIVE_CLIENT_ID && (
                  <button onClick={openDrivePicker} title={driveToken ? S.openDrive : S.driveConnect} style={glassBtn(!!driveToken)}><img src={icon("cloud")} alt="" style={{ width: 18, height: 18 }} /></button>
                )}
                <button onClick={() => setShowImslp(v => !v)} title="IMSLP" style={glassBtn(showImslp)}><img src={icon("search")} alt="" style={{ width: 18, height: 18 }} /></button>
              </>
            )}
            <button onClick={() => setToolbarVisible(v => !v)} title={toolbarVisible ? S.hideTools : S.showTools}
              style={glassBtn(false)}>
              {toolbarVisible ? "✕" : <img src={icon("pen")} alt="" style={{ width: 18, height: 18 }} />}
            </button>
          </div>

          {/* ── Floating: Page navigator (bottom-center) ── */}
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 6, zIndex: 10 }}>
            <button onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1}
              style={{ ...glassBtn(pageNum > 1), opacity: pageNum <= 1 ? 0.4 : 1, fontSize: 18 }}>‹</button>
            <span style={{ background: "rgba(8,16,10,0.72)", backdropFilter: "blur(14px)", color: "#e8e4d8", fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "4px 10px", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 2px 8px rgba(0,0,0,0.35)", fontFamily: "monospace" }}>
              {pageNum} / {totalPages}
            </span>
            <button onClick={() => setPageNum(p => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages}
              style={{ ...glassBtn(pageNum < totalPages), opacity: pageNum >= totalPages ? 0.4 : 1, fontSize: 18 }}>›</button>
          </div>

          {/* ── Floating: Metronome panel (bottom-left, above page nav) ── */}
          {showMetronome && (
            <div style={{ position: "absolute", bottom: 58, left: 10, zIndex: 20, pointerEvents: "auto" }}>
              <ScoreMetronome />
            </div>
          )}

          {/* ── Page loading overlay ── */}
          {rendering && (
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(8,16,10,0.75)", backdropFilter: "blur(10px)", borderRadius: 20, padding: "5px 14px", display: "flex", alignItems: "center", gap: 7, zIndex: 20, pointerEvents: "none" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a7c59", display: "inline-block", animation: "pulse 0.8s infinite" }} />
              <span style={{ color: "#8fbc8f", fontSize: 11, fontWeight: 700 }}>{S.loadingPdf}</span>
            </div>
          )}

          {/* ── Floating: Save confirmation ── */}
          {saveMsg && (
            <div style={{ position: "absolute", bottom: 50, right: 10, background: "rgba(74,124,89,0.9)", backdropFilter: "blur(8px)", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 11, zIndex: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
              ✓ {saveMsg}
            </div>
          )}
        </div>
      )}

      {/* ── IMSLP panel (when score is open) ── */}
      {pdfDoc && (
        <div style={{ flexShrink: 0, maxHeight: showImslp ? 280 : 0, overflow: "hidden", transition: "max-height 0.28s ease" }}>
          <div style={{ background: "#1a2e22", padding: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={imslpQuery} onChange={e => handleImslpInput(e.target.value)}
                placeholder={S.imslpPh}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #4a7c59", background: "#2d4a35", color: "#e8e4d8", fontSize: 13, outline: "none" }} />
              {imslpLoading && <span style={{ alignSelf: "center", color: "#8fbc8f" }}>⏳</span>}
            </div>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "grid", gap: 5 }} className="sv-scroll">
              {!imslpResults.length && imslpQuery && !imslpLoading && (
                <div style={{ color: "#6b8f6b", fontSize: 12, textAlign: "center", padding: 10 }}>{S.noResults}</div>
              )}
              {imslpResults.map(r => {
                const clean    = r.title.replace(/\(.*?\)/g, "").trim();
                const composer = r.title.match(/\(([^)]+)\)$/)?.[1] || "";
                return (
                  <a key={r.pageid} href={`https://imslp.org/wiki/${encodeURIComponent(r.title.replace(/ /g, "_"))}`} target="_blank" rel="noreferrer"
                    className="imslp-row"
                    style={{ display: "block", background: "#2d4a35", borderRadius: 8, padding: "8px 11px", textDecoration: "none", border: "1px solid transparent", transition: "all 0.15s" }}>
                    <div style={{ color: "#e8e4d8", fontSize: 12, fontWeight: 700 }}>{clean}</div>
                    {composer && <div style={{ color: "#8fbc8f", fontSize: 10 }}>{composer}</div>}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Compact toolbar (horizontal scroll) ── */}
      <div style={{
        flexShrink: 0,
        maxHeight: toolbarVisible ? 52 : 0,
        overflow: "hidden",
        transition: "max-height 0.22s ease",
        background: "#0f1e14",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div className="sv-scroll" style={{ display: "flex", alignItems: "center", gap: 3, padding: "8px 10px", overflowX: "auto", overflowY: "hidden", width: "100%", boxSizing: "border-box" }}>
          {/* Drawing tools */}
          {TOOLS.map(t_ => (
            <button key={t_.id} onClick={() => setTool(t_.id)} title={t_.label} style={tb(tool === t_.id)}>
              <img src={icon(t_.icon)} alt="" style={{ width: 16, height: 16 }} />
            </button>
          ))}
          <div style={sep} />

          {/* Color palette */}
          {COLORS.map(c_ => (
            <button key={c_.value}
              onClick={() => { setColor(c_.value); if (c_.highlight) setTool("highlight"); else if (tool === "highlight") setTool("pen"); }}
              title={c_.label}
              style={{ width: 20, height: 20, borderRadius: "50%", border: color === c_.value ? "2.5px solid #fff" : "1.5px solid rgba(255,255,255,0.25)", background: c_.highlight ? "#ffd700" : c_.value, cursor: "pointer", padding: 0, flexShrink: 0 }} />
          ))}
          <div style={sep} />

          {/* Line width */}
          <input type="range" min={1} max={12} value={lineWidth} onChange={e => setLineWidth(+e.target.value)}
            style={{ width: 56, accentColor: "#4a7c59", flexShrink: 0 }} />
          <div style={sep} />

          {/* Undo / Redo / Clear */}
          <button onClick={undo} disabled={!undoStack.length} title={S.undo} style={tb(false)}>↩</button>
          <button onClick={redo} disabled={!redoStack.length} title={S.redo} style={tb(false)}>↪</button>
          <button onClick={clearPage} title={S.clearPage} style={tb(false, true)}><img src={icon("trash")} alt="" style={{ width: 16, height: 16 }} /></button>
          <div style={sep} />

          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(0.5, +(z - 0.2).toFixed(1)))} style={tb(false)}>−</button>
          <span style={{ color: "#6b8f6b", fontSize: 10, minWidth: 34, textAlign: "center", fontFamily: "monospace", flexShrink: 0 }}>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(4, +(z + 0.2).toFixed(1)))} style={tb(false)}>+</button>
          <div style={sep} />

          {/* Fit to width */}
          <button onClick={() => pdfDoc && fitToPage(pdfDoc, pageNum)} title="Ajustar ancho" style={tb(false)}>⊡</button>
          <div style={sep} />

          {/* Metronome toggle */}
          <button onClick={() => setShowMetronome(v => !v)} title="Metrónomo" style={tb(showMetronome)}><img src={icon("metronome")} alt="" style={{ width: 16, height: 16 }} /></button>

          {/* File name */}
          {fileName && (
            <span style={{ color: "#3d5e45", fontSize: 10, marginLeft: 4, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
              {fileName}
            </span>
          )}
        </div>
      </div>

      {/* ── ScoreRecorder ── */}
      <ScoreRecorder lang={lang} />

      {/* ── Hidden file input ── */}
      <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={openLocalFile} />
    </div>
  );
}

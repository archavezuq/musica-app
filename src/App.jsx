import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import ScoreViewer from "./ScoreViewer";

// ─────────────────────────────────────────────────────────────────────────────
// i18n — all UI strings in Spanish and English
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  es: {
    appName: "Práctica Musical",
    appTagline: "Tu método de estudio",
    nav: { home: "Inicio", tools: "Herramientas", goals: "Metas", history: "Diario", scores: "Partituras" },
    greeting: "Buenos días,",
    musician: "músico.",
    locale: "es-ES",
    stats: { week: "Sesiones esta semana", minutes: "Minutos totales", saved: "Sesiones guardadas" },
    goalsSummary: { today: "🎯 Hoy:", month: "📅 Este mes:" },
    newSession: "🎵 Nueva sesión de estudio",
    firstSession: "🎵 Comenzar primera sesión",
    continueSession: "▶ Continuar sesión de hoy",
    linksModal: {
      title: "¿Qué hacemos con tus links?",
      subtitle: "Tienes links guardados de tu sesión anterior",
      keep: "📎 Continuar con links anteriores",
      blank: "🗒 Empezar en blanco",
    },
    session: {
      title: "Sesión de hoy",
      finish: "Finalizar ✓",
      studying: "Estudiando:",
      pause: "⏹ Pausar sección",
      target: "objetivo",
    },
    blocks: ["método", "escalas", "obras", "libre"],
    blockPh: (s) => `¿Qué vas a trabajar en ${s}?`,
    timerLabel: "⏱ Tiempo:",
    min: "min",
    alarm: "🔔 Alarma al terminar",
    searchPh: "Buscar partitura / grabación...",
    links: {
      title: "🔗 Links de referencia",
      ph: "Pega un link (YouTube, IMSLP, Spotify...)",
      empty: "Aún no has guardado links en esta sesión",
    },
    scale: {
      title: "Consulta de escalas",
      select: "— Selecciona tónica —",
      major: "Mayor",
      minor: "Menor",
      alts: "Alteraciones:",
      notes: "Notas:",
      relative: "Relativa",
    },
    finishModal: {
      title: "¡Gran sesión!",
      total: "Tiempo total:",
      save: "Guardar y salir ✓",
      keep: "Seguir practicando",
    },
    toolsTitle: "Herramientas",
    metro: {
      title: "🎵 Metrónomo",
      accent: "Acento en 1",
      start: "▶ Iniciar",
      stop: "⏸ Detener",
      label: "Metro",
    },
    tuner: {
      title: "🎙 Afinador Cromático",
      activate: "🎙 Activar afinador",
      deactivate: "⏹ Detener micrófono",
      inTune: "✓ Afinado",
    },
    goalsView: {
      title: "Metas y Progreso",
      dayLabel: "🎯 Meta del día",
      dayPh: "¿Qué quieres lograr hoy?",
      monthLabel: "📅 Meta del mes",
      monthPh: "¿Qué quieres lograr este mes?",
      practiced: "Día practicado",
      today: "Hoy",
    },
    history: {
      title: "Diario de Estudio",
      empty: "Aún no tienes sesiones guardadas.\n¡Empieza tu primera práctica!",
      back: "← Volver al historial",
      total: "Total:",
      links: "🔗 Links guardados",
      recs: "🎙 Grabaciones",
    },
    rec: {
      title: "🎙 Grabación de sesión",
      subtitle: "Video en MP4/H.264 listo para Instagram",
      audioOnly: "🎙 Solo Audio",
      audioVideo: "📹 Audio + Video",
      fmtTitle: "📐 Formato Instagram",
      fmtHint: "Se convierte a MP4 H.264 + AAC • 1080p • apto para Reels, Stories y Feed",
      recBtn: (f) => `● Grabar para Instagram (${f})`,
      recAudio: "● Grabar audio",
      stopBtn: "Detener grabación",
      converting: "⏳ Convirtiendo a MP4...",
      savedLabel: "Grabaciones guardadas",
      dl: (e) => `⬇ Descargar ${e}`,
      readyFor: "📲 Listo para",
      platforms: "Instagram · TikTok · WhatsApp",
      fallback: "⚠️ WebM — convierte antes de subir",
      loadingConv: "Cargando convertidor...",
      convFmt: (f) => `Convirtiendo a MP4 (${f})...`,
      done: "✅ MP4 listo para Instagram",
      permErr: "No se pudo acceder al micrófono/cámara. Verifica los permisos.",
    },
    days: ["L", "M", "X", "J", "V", "S", "D"],
    practicedMin: (t) => `(${t} practicado)`,
  },
  en: {
    appName: "Music Practice",
    appTagline: "Your study method",
    nav: { home: "Home", tools: "Tools", goals: "Goals", history: "Journal", scores: "Scores" },
    greeting: "Good morning,",
    musician: "musician.",
    locale: "en-US",
    stats: { week: "Sessions this week", minutes: "Total minutes", saved: "Saved sessions" },
    goalsSummary: { today: "🎯 Today:", month: "📅 This month:" },
    newSession: "🎵 New practice session",
    firstSession: "🎵 Start your first session",
    continueSession: "▶ Continue today's session",
    linksModal: {
      title: "What about your links?",
      subtitle: "You have saved links from your last session",
      keep: "📎 Keep previous links",
      blank: "🗒 Start fresh",
    },
    session: {
      title: "Today's Session",
      finish: "Finish ✓",
      studying: "Studying:",
      pause: "⏹ Pause section",
      target: "goal",
    },
    blocks: ["method", "scales", "repertoire", "free"],
    blockPh: (s) => `What will you work on in ${s}?`,
    timerLabel: "⏱ Time:",
    min: "min",
    alarm: "🔔 Alarm when done",
    searchPh: "Search score / recording...",
    links: {
      title: "🔗 Reference links",
      ph: "Paste a link (YouTube, IMSLP, Spotify...)",
      empty: "No links saved in this session yet",
    },
    scale: {
      title: "Scale reference",
      select: "— Select root note —",
      major: "Major",
      minor: "Minor",
      alts: "Alterations:",
      notes: "Notes:",
      relative: "Relative",
    },
    finishModal: {
      title: "Great session!",
      total: "Total time:",
      save: "Save and exit ✓",
      keep: "Keep practicing",
    },
    toolsTitle: "Tools",
    metro: {
      title: "🎵 Metronome",
      accent: "Accent beat 1",
      start: "▶ Start",
      stop: "⏸ Stop",
      label: "Metro",
    },
    tuner: {
      title: "🎙 Chromatic Tuner",
      activate: "🎙 Activate tuner",
      deactivate: "⏹ Stop microphone",
      inTune: "✓ In tune",
    },
    goalsView: {
      title: "Goals & Progress",
      dayLabel: "🎯 Today's goal",
      dayPh: "What do you want to achieve today?",
      monthLabel: "📅 Monthly goal",
      monthPh: "What do you want to achieve this month?",
      practiced: "Practiced",
      today: "Today",
    },
    history: {
      title: "Practice Journal",
      empty: "No sessions saved yet.\nStart your first practice!",
      back: "← Back to journal",
      total: "Total:",
      links: "🔗 Saved links",
      recs: "🎙 Recordings",
    },
    rec: {
      title: "🎙 Session recording",
      subtitle: "Video as MP4/H.264 ready for Instagram",
      audioOnly: "🎙 Audio only",
      audioVideo: "📹 Audio + Video",
      fmtTitle: "📐 Instagram format",
      fmtHint: "Converted to MP4 H.264 + AAC • 1080p • for Reels, Stories & Feed",
      recBtn: (f) => `● Record for Instagram (${f})`,
      recAudio: "● Record audio",
      stopBtn: "Stop recording",
      converting: "⏳ Converting to MP4...",
      savedLabel: "Saved recordings",
      dl: (e) => `⬇ Download ${e}`,
      readyFor: "📲 Ready for",
      platforms: "Instagram · TikTok · WhatsApp",
      fallback: "⚠️ WebM — convert before uploading",
      loadingConv: "Loading converter...",
      convFmt: (f) => `Converting to MP4 (${f})...`,
      done: "✅ MP4 ready for Instagram",
      permErr: "Could not access mic/camera. Check your permissions.",
    },
    days: ["M", "T", "W", "T", "F", "S", "S"],
    practicedMin: (t) => `(${t} practiced)`,
  },
};

const LangCtx = createContext({ lang: "es", t: T.es, setLang: () => {} });
const useLang = () => useContext(LangCtx);

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALE_DATA = {
  C:   { alterations: "Sin alteraciones / No sharps or flats", relative: "Am / La menor",   notes: "C D E F G A B" },
  G:   { alterations: "1♯ — F#",                               relative: "Em / Mi menor",   notes: "G A B C D E F#" },
  D:   { alterations: "2♯ — F# C#",                            relative: "Bm / Si menor",   notes: "D E F# G A B C#" },
  A:   { alterations: "3♯ — F# C# G#",                         relative: "F#m / Fa# menor", notes: "A B C# D E F# G#" },
  E:   { alterations: "4♯ — F# C# G# D#",                      relative: "C#m / Do# menor", notes: "E F# G# A B C# D#" },
  B:   { alterations: "5♯ — F# C# G# D# A#",                   relative: "G#m / Sol# menor",notes: "B C# D# E F# G# A#" },
  "F#":{ alterations: "6♯",                                     relative: "D#m / Re# menor", notes: "F# G# A# B C# D# E#" },
  F:   { alterations: "1♭ — Bb",                               relative: "Dm / Re menor",   notes: "F G A Bb C D E" },
  Bb:  { alterations: "2♭ — Bb Eb",                            relative: "Gm / Sol menor",  notes: "Bb C D Eb F G A" },
  Eb:  { alterations: "3♭ — Bb Eb Ab",                         relative: "Cm / Do menor",   notes: "Eb F G Ab Bb C D" },
  Ab:  { alterations: "4♭ — Bb Eb Ab Db",                      relative: "Fm / Fa menor",   notes: "Ab Bb C Db Eb F G" },
  Db:  { alterations: "5♭ — Bb Eb Ab Db Gb",                   relative: "Bbm / Sib menor", notes: "Db Eb F Gb Ab Bb C" },
};

const IG_FORMATS = [
  { id: "reels",     label: "Reels / Stories", ratio: "9:16", icon: "📱", vf: "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" },
  { id: "feed_sq",   label: "Feed cuadrado",   ratio: "1:1",  icon: "⬛", vf: "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" },
  { id: "feed_port", label: "Feed 4:5",        ratio: "4:5",  icon: "🖼", vf: "scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2,setsar=1" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function freqToNote(freq) {
  if (!freq || freq < 20) return { note: "--", cents: 0, octave: "" };
  const midi    = 69 + 12 * Math.log2(freq / 440);
  const rounded = Math.round(midi);
  const cents   = Math.round((midi - rounded) * 100);
  const noteIdx = ((rounded % 12) + 12) % 12;
  const octave  = Math.floor(rounded / 12) - 1;
  return { note: NOTE_NAMES[noteIdx], cents, octave };
}

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ─────────────────────────────────────────────────────────────────────────────
// Metronome
// ─────────────────────────────────────────────────────────────────────────────
function Metronome({ compact = false }) {
  const { t } = useLang();
  const [bpm, setBpm]               = useState(80);
  const [beats, setBeats]           = useState(4);
  const [running, setRunning]       = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [accent, setAccent]         = useState(true);
  const audioCtxRef = useRef(null);
  const intervalRef = useRef(null);
  const beatRef     = useRef(0);

  const playClick = useCallback((isAccent) => {
    if (!audioCtxRef.current)
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx  = audioCtxRef.current;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = isAccent ? 1200 : 900;
    gain.gain.setValueAtTime(isAccent ? 0.4 : 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }, []);

  useEffect(() => {
    if (running) {
      beatRef.current = 0;
      playClick(accent);
      setCurrentBeat(1);
      intervalRef.current = setInterval(() => {
        beatRef.current = (beatRef.current + 1) % beats;
        const isAcc = accent && beatRef.current === 0;
        playClick(isAcc);
        setCurrentBeat(beatRef.current + 1);
      }, (60 / bpm) * 1000);
    } else {
      clearInterval(intervalRef.current);
      setCurrentBeat(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, bpm, beats, accent, playClick]);

  if (compact)
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => setRunning((r) => !r)}
          style={{ background: running ? "#e07b39" : "#4a7c59", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}
        >
          {running ? "⏸" : "▶"} {t.metro.label}
        </button>
        <input type="range" min={30} max={240} value={bpm} onChange={(e) => setBpm(+e.target.value)} style={{ width: 80, accentColor: "#4a7c59" }} />
        <span style={{ color: "#4a7c59", fontWeight: 700, fontSize: 13, minWidth: 50 }}>{bpm} bpm</span>
        <div style={{ display: "flex", gap: 4 }}>
          {Array.from({ length: beats }, (_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: currentBeat === i + 1 ? (i === 0 && accent ? "#e07b39" : "#4a7c59") : "#c8d5c0", transition: "background 0.05s" }} />
          ))}
        </div>
      </div>
    );

  return (
    <div style={{ background: "#1a2e22", borderRadius: 20, padding: 28, color: "#e8e4d8" }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#8fbc8f", marginBottom: 20, fontSize: 20 }}>{t.metro.title}</h3>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 56, fontWeight: 900, color: "#e8e4d8", fontFamily: "monospace", lineHeight: 1 }}>{bpm}</div>
        <div style={{ color: "#8fbc8f", fontSize: 14, letterSpacing: 3, textTransform: "uppercase" }}>BPM</div>
      </div>
      <input type="range" min={30} max={240} value={bpm} onChange={(e) => setBpm(+e.target.value)} style={{ width: "100%", accentColor: "#4a7c59", marginBottom: 16 }} />
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[60, 72, 80, 96, 112, 120, 132, 144].map((v) => (
          <button key={v} onClick={() => setBpm(v)} style={{ background: bpm === v ? "#4a7c59" : "transparent", color: bpm === v ? "#fff" : "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 6, padding: "3px 7px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 }}>
            {v}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 20 }}>
        {Array.from({ length: beats }, (_, i) => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", background: currentBeat === i + 1 ? (i === 0 && accent ? "#e07b39" : "#6aab6a") : "#2d4a35", transition: "background 0.06s", border: "2px solid #4a7c59" }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {[2, 3, 4, 6].map((b) => (
          <button key={b} onClick={() => setBeats(b)} style={{ background: beats === b ? "#4a7c59" : "transparent", color: beats === b ? "#fff" : "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
            {b}/4
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 20 }}>
        <button onClick={() => setAccent((a) => !a)} style={{ background: accent ? "#4a7c59" : "transparent", color: accent ? "#fff" : "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontFamily: "inherit" }}>
          {t.metro.accent}
        </button>
        <button onClick={() => setBpm((b) => Math.max(30, b - 4))} style={{ background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 18 }}>−</button>
        <button onClick={() => setBpm((b) => Math.min(240, b + 4))} style={{ background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: 18 }}>+</button>
      </div>
      <button onClick={() => setRunning((r) => !r)} style={{ width: "100%", padding: "14px", background: running ? "#e07b39" : "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, transition: "background 0.2s" }}>
        {running ? t.metro.stop : t.metro.start}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tuner
// ─────────────────────────────────────────────────────────────────────────────
function Tuner() {
  const { t } = useLang();
  const [active, setActive]     = useState(false);
  const [noteInfo, setNoteInfo] = useState({ note: "--", cents: 0, octave: "" });
  const [freq, setFreq]         = useState(0);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);

  const detectPitch = useCallback((analyser, sampleRate) => {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    let bestCorr = 0, bestPeriod = -1;
    const minPeriod = Math.floor(sampleRate / 1200);
    const maxPeriod = Math.floor(sampleRate / 50);
    for (let p = minPeriod; p <= maxPeriod; p++) {
      let corr = 0;
      for (let i = 0; i < buf.length - p; i++) corr += buf[i] * buf[i + p];
      if (corr > bestCorr) { bestCorr = corr; bestPeriod = p; }
    }
    return bestPeriod > 0 && bestCorr > 0.01 ? sampleRate / bestPeriod : 0;
  }, []);

  useEffect(() => {
    if (!active) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
      return;
    }
    (async () => {
      try {
        const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const ctx      = new AudioContext();
        const src      = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 4096;
        src.connect(analyser);
        const loop = () => {
          const f = detectPitch(analyser, ctx.sampleRate);
          if (f > 0) { setFreq(Math.round(f)); setNoteInfo(freqToNote(f)); }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch { setActive(false); }
    })();
    return () => { streamRef.current?.getTracks().forEach((tr) => tr.stop()); cancelAnimationFrame(rafRef.current); };
  }, [active, detectPitch]);

  const centsColor  = Math.abs(noteInfo.cents) < 5 ? "#4a7c59" : Math.abs(noteInfo.cents) < 15 ? "#e0b03a" : "#c0504d";
  const needleAngle = Math.max(-45, Math.min(45, noteInfo.cents * 0.9));

  return (
    <div style={{ background: "#1a2e22", borderRadius: 20, padding: 28, color: "#e8e4d8" }}>
      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#8fbc8f", marginBottom: 20, fontSize: 20 }}>{t.tuner.title}</h3>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: "#e8e4d8", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>
          {noteInfo.note}<span style={{ fontSize: 28, color: "#8fbc8f" }}>{noteInfo.octave}</span>
        </div>
        {freq > 0 && <div style={{ color: "#8fbc8f", fontSize: 13 }}>{freq} Hz</div>}
      </div>
      <div style={{ position: "relative", height: 80, marginBottom: 20 }}>
        <svg width="100%" height="80" viewBox="0 0 200 80">
          <path d="M 10 75 A 90 90 0 0 1 190 75" fill="none" stroke="#2d4a35" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 75 A 90 90 0 0 1 190 75" fill="none" stroke="#4a7c59" strokeWidth="3" strokeDasharray="5 8" strokeLinecap="round" opacity="0.4" />
          <line x1="100" y1="75" x2={100 + 55 * Math.sin((needleAngle * Math.PI) / 180)} y2={75 - 55 * Math.cos((needleAngle * Math.PI) / 180)} stroke={centsColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "all 0.1s" }} />
          <circle cx="100" cy="75" r="5" fill={centsColor} />
          <line x1="100" y1="30" x2="100" y2="45" stroke="#4a7c59" strokeWidth="2" />
        </svg>
      </div>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <span style={{ color: centsColor, fontWeight: 700, fontSize: 18 }}>
          {noteInfo.cents > 0 ? `+${noteInfo.cents}` : noteInfo.cents} cents
        </span>
        {Math.abs(noteInfo.cents) < 5 && noteInfo.note !== "--" && (
          <span style={{ color: "#4a7c59", marginLeft: 12, fontWeight: 700 }}>{t.tuner.inTune}</span>
        )}
      </div>
      <button onClick={() => setActive((a) => !a)} style={{ width: "100%", padding: "14px", background: active ? "#c0504d" : "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>
        {active ? t.tuner.deactivate : t.tuner.activate}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scale Info
// ─────────────────────────────────────────────────────────────────────────────
function ScaleInfo() {
  const { t } = useLang();
  const [selected, setSelected] = useState("");
  const [mode, setMode]         = useState("major");
  const info = SCALE_DATA[selected];

  return (
    <div style={{ background: "#f0ede4", borderRadius: 16, padding: 20, border: "1px solid #c8d5c0" }}>
      <h4 style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", marginBottom: 12 }}>{t.scale.title}</h4>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #c8d5c0", background: "#fff", color: "#2d4a35", fontFamily: "inherit", fontSize: 14 }}>
          <option value="">{t.scale.select}</option>
          {Object.keys(SCALE_DATA).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #c8d5c0", background: "#fff", color: "#2d4a35", fontFamily: "inherit", fontSize: 14 }}>
          <option value="major">{t.scale.major}</option>
          <option value="minor">{t.scale.minor}</option>
        </select>
      </div>
      {info && (
        <div style={{ background: "#e8f0e0", borderRadius: 10, padding: 14 }}>
          <div style={{ marginBottom: 6 }}><strong style={{ color: "#2d4a35" }}>{t.scale.alts}</strong> <span style={{ color: "#4a7c59" }}>{info.alterations}</span></div>
          <div style={{ marginBottom: 6 }}><strong style={{ color: "#2d4a35" }}>{t.scale.notes}</strong> <span style={{ color: "#4a7c59", fontFamily: "monospace" }}>{info.notes}</span></div>
          <div><strong style={{ color: "#2d4a35" }}>{t.scale.relative} {mode === "major" ? t.scale.minor : t.scale.major}:</strong> <span style={{ color: "#e07b39", fontWeight: 700 }}>{info.relative}</span></div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recording Panel — Instagram-ready MP4
// ─────────────────────────────────────────────────────────────────────────────
function RecordingPanel({ session, onUpdate }) {
  const { t } = useLang();
  const [mode, setMode]                       = useState("audio");
  const [igFormat, setIgFormat]               = useState("reels");
  const [recording, setRecording]             = useState(false);
  const [converting, setConverting]           = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);
  const [convertMsg, setConvertMsg]           = useState("");
  const [mediaRecorder, setMediaRecorder]     = useState(null);
  const [recordings, setRecordings]           = useState(session.recordings || []);
  const videoRef   = useRef(null);
  const chunksRef  = useRef([]);
  const ffmpegRef  = useRef(null);
  const ffReadyRef = useRef(false);

  const loadFFmpeg = async () => {
    if (ffReadyRef.current) return ffmpegRef.current;
    setConvertMsg(t.rec.loadingConv);
    const { FFmpeg }               = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js");
    const { fetchFile, toBlobURL } = await import("https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js");
    const ff = new FFmpeg();
    ff.on("progress", ({ progress }) => setConvertProgress(Math.round(progress * 100)));
    const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current  = { ff, fetchFile };
    ffReadyRef.current = true;
    setConvertMsg("");
    return ffmpegRef.current;
  };

  const pushRecording = (rec) => {
    const full    = { id: Date.now(), date: new Date().toLocaleTimeString(), ...rec };
    const updated = [...recordings, full];
    setRecordings(updated);
    onUpdate({ ...session, recordings: updated });
  };

  const convertToMP4 = async (rawBlob) => {
    setConverting(true);
    setConvertProgress(0);
    const fmtObj = IG_FORMATS.find((f) => f.id === igFormat);
    try {
      const { ff, fetchFile } = await loadFFmpeg();
      setConvertMsg(t.rec.convFmt(fmtObj.label));
      await ff.writeFile("input.webm", await fetchFile(rawBlob));
      await ff.exec(["-i","input.webm","-vf",fmtObj.vf,"-c:v","libx264","-preset","fast","-crf","23","-profile:v","high","-level","4.0","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-movflags","+faststart","-y","output.mp4"]);
      const data = await ff.readFile("output.mp4");
      const mp4  = new Blob([data.buffer], { type: "video/mp4" });
      const url  = URL.createObjectURL(mp4);
      pushRecording({ type: "video", url, filename: `practica-${fmtObj.id}-${Date.now()}.mp4`, format: fmtObj });
      setConvertMsg(t.rec.done);
    } catch {
      const url = URL.createObjectURL(rawBlob);
      pushRecording({ type: "video", url, filename: `practica-${Date.now()}.webm`, format: null, fallback: true });
      setConvertMsg(t.rec.fallback);
    } finally {
      setConverting(false);
      setConvertProgress(0);
    }
  };

  const startRec = async () => {
    try {
      const constraints = mode === "video"
        ? { video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" }, audio: { echoCancellation: false, noiseSuppression: false } }
        : { audio: { echoCancellation: false, noiseSuppression: false } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (mode === "video" && videoRef.current) videoRef.current.srcObject = stream;
      chunksRef.current = [];
      const mimeType = mode === "video"
        ? (MediaRecorder.isTypeSupported("video/mp4;codecs=h264,aac") ? "video/mp4;codecs=h264,aac" : "video/webm;codecs=vp9,opus")
        : (MediaRecorder.isTypeSupported("audio/mp4;codecs=aac") ? "audio/mp4;codecs=aac" : "audio/webm;codecs=opus");
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        const raw = new Blob(chunksRef.current, { type: mimeType });
        if (mode === "video") await convertToMP4(raw);
        else pushRecording({ type: "audio", url: URL.createObjectURL(raw), filename: `practica-audio-${Date.now()}.m4a`, format: null });
      };
      mr.start(1000);
      setMediaRecorder(mr);
      setRecording(true);
    } catch { alert(t.rec.permErr); }
  };

  const stopRec    = () => { mediaRecorder?.stop(); setRecording(false); setMediaRecorder(null); };
  const deleteRec  = (id) => {
    const updated = recordings.filter((r) => r.id !== id);
    setRecordings(updated);
    onUpdate({ ...session, recordings: updated });
  };

  const selectedFmt = IG_FORMATS.find((f) => f.id === igFormat);

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #ddd8cc" }}>
      <h4 style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", marginBottom: 6 }}>{t.rec.title}</h4>
      <div style={{ color: "#8fbc8f", fontSize: 12, marginBottom: 16 }}>{t.rec.subtitle}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[{ id: "audio", label: t.rec.audioOnly }, { id: "video", label: t.rec.audioVideo }].map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: "10px", background: mode === m.id ? "#1a2e22" : "#f5f2eb", color: mode === m.id ? "#e8e4d8" : "#6b8f6b", border: "1px solid #ddd8cc", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "video" && (
        <div style={{ background: "#f0ede4", borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ color: "#2d4a35", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t.rec.fmtTitle}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {IG_FORMATS.map((f) => (
              <button key={f.id} onClick={() => setIgFormat(f.id)} style={{ padding: "10px 6px", textAlign: "center", background: igFormat === f.id ? "#1a2e22" : "#fff", color: igFormat === f.id ? "#e8e4d8" : "#6b8f6b", border: igFormat === f.id ? "2px solid #4a7c59" : "1px solid #ddd8cc", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ fontSize: 18 }}>{f.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{f.ratio}</div>
                <div style={{ fontSize: 10, lineHeight: 1.2, marginTop: 2 }}>{f.label}</div>
              </button>
            ))}
          </div>
          <div style={{ color: "#8fbc8f", fontSize: 11, marginTop: 8, textAlign: "center" }}>{t.rec.fmtHint}</div>
        </div>
      )}

      {mode === "video" && (
        <div style={{ position: "relative", marginBottom: 12 }}>
          <video ref={videoRef} autoPlay muted style={{ width: "100%", borderRadius: 10, background: "#111", maxHeight: 200, objectFit: "cover" }} />
          {recording && (
            <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(192,80,77,0.9)", color: "#fff", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "pulse 1s infinite" }} /> REC
            </div>
          )}
        </div>
      )}

      {converting && (
        <div style={{ background: "#1a2e22", borderRadius: 12, padding: 16, marginBottom: 14, textAlign: "center" }}>
          <div style={{ color: "#8fbc8f", fontSize: 13, marginBottom: 10 }}>{convertMsg}</div>
          <div style={{ background: "#2d4a35", borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div style={{ background: "#4a7c59", height: 8, borderRadius: 6, width: `${convertProgress}%`, transition: "width 0.3s" }} />
          </div>
          <div style={{ color: "#6b8f6b", fontSize: 12, marginTop: 6 }}>{convertProgress}%</div>
        </div>
      )}
      {convertMsg && !converting && (
        <div style={{ background: "#e8f0e0", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#2d4a35", fontSize: 13, textAlign: "center" }}>{convertMsg}</div>
      )}

      <button onClick={recording ? stopRec : startRec} disabled={converting} style={{ width: "100%", padding: 14, background: recording ? "#c0504d" : converting ? "#aaa" : "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: converting ? "not-allowed" : "pointer", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {recording ? (
          <><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite", display: "inline-block" }} />{t.rec.stopBtn}</>
        ) : converting ? t.rec.converting
          : mode === "video" ? t.rec.recBtn(selectedFmt?.ratio)
          : t.rec.recAudio}
      </button>

      {recordings.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ color: "#6b8f6b", fontSize: 13, marginBottom: 10, fontWeight: 700 }}>{t.rec.savedLabel} ({recordings.length})</div>
          {recordings.map((r) => (
            <div key={r.id} style={{ background: "#f5f2eb", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid #e0ddd4" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{r.type === "video" ? "📹" : "🎙"}</span>
                  <div>
                    <div style={{ color: "#2d4a35", fontSize: 13, fontWeight: 700 }}>{r.date}</div>
                    {r.format && <div style={{ color: "#4a7c59", fontSize: 11 }}>{r.format.icon} {r.format.label} • MP4 H.264</div>}
                    {r.fallback && <div style={{ color: "#e07b39", fontSize: 11 }}>{t.rec.fallback}</div>}
                  </div>
                </div>
                <button onClick={() => deleteRec(r.id)} style={{ background: "none", border: "none", color: "#c0504d", cursor: "pointer", fontSize: 18 }}>×</button>
              </div>
              {r.type === "video"
                ? <video src={r.url} controls playsInline style={{ width: "100%", borderRadius: 8, maxHeight: 220, background: "#000" }} />
                : <audio src={r.url} controls style={{ width: "100%" }} />}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <a href={r.url} download={r.filename} style={{ flex: 1, display: "block", textAlign: "center", padding: "8px", background: "#1a2e22", color: "#8fbc8f", borderRadius: 8, fontSize: 13, textDecoration: "none", fontWeight: 700 }}>
                  {t.rec.dl(r.type === "video" ? ".mp4" : ".m4a")}
                </a>
                {r.type === "video" && !r.fallback && (
                  <div style={{ flex: 1, background: "#e8f0e0", borderRadius: 8, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#4a7c59", fontWeight: 700 }}>{t.rec.readyFor}</div>
                    <div style={{ fontSize: 10, color: "#6b8f6b" }}>{t.rec.platforms}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Session View
// ─────────────────────────────────────────────────────────────────────────────
function SessionView({ session, onUpdate, onFinish }) {
  const { t } = useLang();
  const [activeBlock, setActiveBlock] = useState(null);
  const [running, setRunning]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [newLink, setNewLink]         = useState("");
  const [showFinish, setShowFinish]   = useState(false);
  const intervalRef = useRef(null);

  const target     = activeBlock !== null ? session.blocks[activeBlock] : null;
  const targetSecs = target ? target.time * 60 : 0;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 1;
          if (target?.alarmEnabled && next >= targetSecs) {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const g   = ctx.createGain();
              osc.connect(g); g.connect(ctx.destination);
              osc.frequency.value = 880;
              g.gain.setValueAtTime(0.3, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
              osc.start(); osc.stop(ctx.currentTime + 0.9);
            } catch {}
            setRunning(false);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, target, targetSecs]);

  const stopBlock = () => {
    setRunning(false);
    if (activeBlock !== null) {
      const updated = { ...session };
      updated.blocks[activeBlock].elapsed = (updated.blocks[activeBlock].elapsed || 0) + elapsed;
      onUpdate(updated);
    }
    setElapsed(0);
    setActiveBlock(null);
  };

  const startBlock = (i) => {
    if (running) stopBlock();
    setActiveBlock(i); setElapsed(0); setRunning(true);
  };

  const updateBlock = (i, field, val) => {
    const updated = { ...session };
    updated.blocks[i][field] = val;
    onUpdate(updated);
  };

  const addLink = () => {
    if (!newLink.trim()) return;
    const updated = { ...session, links: [...session.links, { url: newLink, id: Date.now() }] };
    onUpdate(updated); setNewLink("");
  };

  const pct = activeBlock !== null ? Math.min(100, (elapsed / targetSecs) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2e22", fontSize: 24, fontWeight: 900 }}>{t.session.title}</h2>
          <div style={{ color: "#6b8f6b", fontSize: 13 }}>{session.date}</div>
        </div>
        <button onClick={() => setShowFinish(true)} style={{ background: "#e07b39", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          {t.session.finish}
        </button>
      </div>

      <div style={{ background: "#1a2e22", borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
        <Metronome compact />
      </div>

      {activeBlock !== null && (
        <div style={{ background: "#1a2e22", borderRadius: 20, padding: 24, marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: "#8fbc8f", fontSize: 13, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
            {t.session.studying} {session.blocks[activeBlock].section.toUpperCase()}
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, color: "#e8e4d8", fontFamily: "monospace", lineHeight: 1 }}>{fmt(elapsed)}</div>
          <div style={{ color: "#6b8f6b", fontSize: 13, marginBottom: 12 }}>/ {fmt(targetSecs)} {t.session.target}</div>
          <div style={{ background: "#2d4a35", borderRadius: 6, height: 6, marginBottom: 16 }}>
            <div style={{ background: "#4a7c59", height: 6, borderRadius: 6, width: `${pct}%`, transition: "width 1s linear" }} />
          </div>
          <button onClick={stopBlock} style={{ background: "#c0504d", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", cursor: "pointer", fontWeight: 700 }}>
            {t.session.pause}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 14, marginBottom: 24 }}>
        {session.blocks.map((block, i) => (
          <div key={i} style={{ background: activeBlock === i ? "#e8f0e0" : "#fff", border: activeBlock === i ? "2px solid #4a7c59" : "1px solid #ddd8cc", borderRadius: 16, padding: 18, transition: "all 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#2d4a35", fontSize: 16, textTransform: "capitalize" }}>
                📗 {block.section}
                {block.elapsed > 0 && <span style={{ color: "#8fbc8f", fontSize: 12, fontWeight: 400, marginLeft: 8 }}>({fmt(block.elapsed || 0)})</span>}
              </div>
              <button onClick={() => startBlock(i)} style={{ background: activeBlock === i ? "#e07b39" : "#4a7c59", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                {activeBlock === i ? "⏸" : "▶"}
              </button>
            </div>
            <textarea
              placeholder={t.blockPh(block.section)}
              value={block.notes}
              onChange={(e) => updateBlock(i, "notes", e.target.value)}
              style={{ width: "100%", border: "1px solid #ddd8cc", borderRadius: 8, padding: "10px 12px", resize: "vertical", minHeight: 60, background: "#faf9f5", color: "#2d3a2d", fontSize: 14, outline: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
              <label style={{ color: "#6b8f6b", fontSize: 13 }}>{t.timerLabel}</label>
              <input type="number" min={1} max={120} value={block.time} onChange={(e) => updateBlock(i, "time", +e.target.value)}
                style={{ width: 60, padding: "4px 8px", border: "1px solid #ddd8cc", borderRadius: 6, background: "#fff", color: "#2d4a35", textAlign: "center" }} />
              <span style={{ color: "#6b8f6b", fontSize: 13 }}>{t.min}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#6b8f6b", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={block.alarmEnabled} onChange={(e) => updateBlock(i, "alarmEnabled", e.target.checked)} style={{ accentColor: "#4a7c59" }} />
                {t.alarm}
              </label>
            </div>
            {(block.section === "obras" || block.section === "repertoire") && (
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input id={`search-${i}`} placeholder={t.searchPh}
                  style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd8cc", borderRadius: 8, background: "#faf9f5", fontSize: 13, color: "#2d4a35", minWidth: 120 }}
                  onKeyDown={(e) => { if (e.key === "Enter") window.open(`https://open.spotify.com/search/${encodeURIComponent(e.target.value)}`, "_blank"); }} />
                <button onClick={() => { const v = document.getElementById(`search-${i}`)?.value || block.notes; window.open(`https://open.spotify.com/search/${encodeURIComponent(v)}`, "_blank"); }}
                  style={{ background: "#1DB954", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Spotify</button>
                <button onClick={() => { const v = document.getElementById(`search-${i}`)?.value || block.notes; window.open(`https://music.apple.com/search?term=${encodeURIComponent(v)}`, "_blank"); }}
                  style={{ background: "#fc3c44", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Apple</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}><ScaleInfo /></div>

      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #ddd8cc", marginBottom: 24 }}>
        <h4 style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", marginBottom: 14 }}>{t.links.title}</h4>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={newLink} onChange={(e) => setNewLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
            placeholder={t.links.ph}
            style={{ flex: 1, padding: "8px 12px", border: "1px solid #ddd8cc", borderRadius: 8, background: "#faf9f5", color: "#2d4a35", fontSize: 14 }} />
          <button onClick={addLink} style={{ background: "#4a7c59", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>+</button>
        </div>
        {session.links.length === 0 && <div style={{ color: "#aaa", fontSize: 13 }}>{t.links.empty}</div>}
        {session.links.map((link, i) => (
          <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, background: "#f5f2eb", borderRadius: 8, padding: "8px 12px" }}>
            <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "#4a7c59", flex: 1, fontSize: 13, wordBreak: "break-all" }}>{link.url}</a>
            <button onClick={() => { const u = { ...session, links: session.links.filter((_, j) => j !== i) }; onUpdate(u); }} style={{ background: "none", border: "none", color: "#c0504d", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        ))}
      </div>

      <RecordingPanel session={session} onUpdate={onUpdate} />

      {showFinish && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1a2e22", borderRadius: 20, padding: 32, maxWidth: 380, width: "90%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#e8e4d8", fontSize: 22, marginBottom: 8 }}>{t.finishModal.title}</div>
            <div style={{ color: "#8fbc8f", marginBottom: 24 }}>
              {t.finishModal.total} {fmt(session.blocks.reduce((a, b) => a + (b.elapsed || 0), 0))}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={() => { onFinish(); setShowFinish(false); }} style={{ padding: 14, background: "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>
                {t.finishModal.save}
              </button>
              <button onClick={() => setShowFinish(false)} style={{ padding: 12, background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 12, cursor: "pointer" }}>
                {t.finishModal.keep}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Home View
// ─────────────────────────────────────────────────────────────────────────────
function HomeView({ goals, sessions, onStart, onContinue, activeSession }) {
  const { t } = useLang();
  const totalMinutes = sessions.reduce((acc, s) => acc + s.blocks.reduce((a, b) => a + (b.elapsed || 0), 0), 0);
  const weekSessions = sessions.filter((s) => (new Date() - new Date(s.dateKey)) / 86400000 <= 7).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "#1a2e22", fontWeight: 900, lineHeight: 1.2 }}>
          {t.greeting}<br /><span style={{ color: "#4a7c59" }}>{t.musician}</span>
        </div>
        <div style={{ color: "#6b8f6b", marginTop: 6, fontSize: 15 }}>
          {new Date().toLocaleDateString(t.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: t.stats.week, value: weekSessions, icon: "📅" },
          { label: t.stats.minutes, value: Math.round(totalMinutes / 60), icon: "⏱" },
          { label: t.stats.saved, value: sessions.length, icon: "📔" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: "#1a2e22", borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
            <div style={{ color: "#8fbc8f", fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display', serif" }}>{value}</div>
            <div style={{ color: "#6b8f6b", fontSize: 11, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>
      {(goals.daily || goals.monthly) && (
        <div style={{ background: "#e8f0e0", borderRadius: 16, padding: 20, marginBottom: 20, border: "1px solid #c8d5c0" }}>
          {goals.daily && <div style={{ marginBottom: 8 }}><span style={{ color: "#4a7c59", fontWeight: 700 }}>{t.goalsSummary.today}</span> <span style={{ color: "#2d4a35" }}>{goals.daily}</span></div>}
          {goals.monthly && <div><span style={{ color: "#e07b39", fontWeight: 700 }}>{t.goalsSummary.month}</span> <span style={{ color: "#2d4a35" }}>{goals.monthly}</span></div>}
        </div>
      )}
      {activeSession && !activeSession.completed ? (
        <div style={{ display: "grid", gap: 12 }}>
          <button onClick={onContinue} style={{ width: "100%", padding: "18px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", fontSize: 18, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
            {t.continueSession}
          </button>
          <button onClick={() => onStart(false)} style={{ width: "100%", padding: "14px", background: "transparent", color: "#4a7c59", border: "2px solid #4a7c59", borderRadius: 16, cursor: "pointer", fontSize: 15, fontFamily: "'Playfair Display', serif" }}>
            + {t.newSession}
          </button>
        </div>
      ) : sessions.length > 0 ? (
        <NewSessionModal onStart={onStart} />
      ) : (
        <button onClick={() => onStart(false)} style={{ width: "100%", padding: "18px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", fontSize: 18, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
          {t.firstSession}
        </button>
      )}
    </div>
  );
}

function NewSessionModal({ onStart }) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  if (!show)
    return (
      <button onClick={() => setShow(true)} style={{ width: "100%", padding: "18px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", fontSize: 18, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
        {t.newSession}
      </button>
    );
  return (
    <div style={{ background: "#1a2e22", borderRadius: 20, padding: 28, textAlign: "center" }}>
      <div style={{ color: "#e8e4d8", fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 8 }}>{t.linksModal.title}</div>
      <div style={{ color: "#8fbc8f", fontSize: 14, marginBottom: 24 }}>{t.linksModal.subtitle}</div>
      <div style={{ display: "grid", gap: 10 }}>
        <button onClick={() => onStart(true)} style={{ padding: "14px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 16 }}>{t.linksModal.keep}</button>
        <button onClick={() => onStart(false)} style={{ padding: "14px", background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 12, cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 16 }}>{t.linksModal.blank}</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Goals View
// ─────────────────────────────────────────────────────────────────────────────
function GoalsView({ goals, setGoals, sessions }) {
  const { t } = useLang();
  const today         = new Date();
  const year          = today.getFullYear();
  const month         = today.getMonth();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const firstDay      = (new Date(year, month, 1).getDay() + 6) % 7;
  const practicedDays = new Set(sessions.map((s) => s.dateKey));

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2e22", fontSize: 26, fontWeight: 900, marginBottom: 24 }}>{t.goalsView.title}</h2>
      <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "#1a2e22", borderRadius: 16, padding: 20 }}>
          <label style={{ color: "#8fbc8f", fontSize: 13, textTransform: "uppercase", letterSpacing: 2, display: "block", marginBottom: 8 }}>{t.goalsView.dayLabel}</label>
          <textarea value={goals.daily} onChange={(e) => setGoals((g) => ({ ...g, daily: e.target.value }))} placeholder={t.goalsView.dayPh}
            style={{ width: "100%", background: "#2d4a35", border: "none", borderRadius: 10, padding: 14, color: "#e8e4d8", resize: "none", minHeight: 80, fontSize: 15, outline: "none" }} />
        </div>
        <div style={{ background: "#1a2e22", borderRadius: 16, padding: 20 }}>
          <label style={{ color: "#e0b03a", fontSize: 13, textTransform: "uppercase", letterSpacing: 2, display: "block", marginBottom: 8 }}>{t.goalsView.monthLabel}</label>
          <textarea value={goals.monthly} onChange={(e) => setGoals((g) => ({ ...g, monthly: e.target.value }))} placeholder={t.goalsView.monthPh}
            style={{ width: "100%", background: "#2d4a35", border: "none", borderRadius: 10, padding: 14, color: "#e8e4d8", resize: "none", minHeight: 80, fontSize: 15, outline: "none" }} />
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, border: "1px solid #ddd8cc" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
          {today.toLocaleDateString(t.locale, { month: "long", year: "numeric" }).toUpperCase()}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
          {t.days.map((d, i) => <div key={i} style={{ textAlign: "center", color: "#8fbc8f", fontSize: 12, fontWeight: 700 }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum    = i + 1;
            const dateKey   = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const practiced = practicedDays.has(dateKey);
            const isToday   = dayNum === today.getDate();
            return (
              <div key={dayNum} style={{ aspectRatio: "1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: practiced ? "#4a7c59" : isToday ? "#e8f0e0" : "transparent", border: isToday ? "2px solid #4a7c59" : "2px solid transparent", color: practiced ? "#fff" : isToday ? "#2d4a35" : "#6b8f6b", fontSize: 13, fontWeight: practiced || isToday ? 700 : 400 }}>
                {dayNum}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#4a7c59" }} />
            <span style={{ fontSize: 12, color: "#6b8f6b" }}>{t.goalsView.practiced}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #4a7c59" }} />
            <span style={{ fontSize: 12, color: "#6b8f6b" }}>{t.goalsView.today}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// History View
// ─────────────────────────────────────────────────────────────────────────────
function HistoryView({ sessions }) {
  const { t } = useLang();
  const [selected, setSelected] = useState(null);
  const sorted = [...sessions].sort((a, b) => b.id - a.id);

  if (selected) {
    const s = sessions.find((x) => x.id === selected);
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#4a7c59", cursor: "pointer", fontFamily: "inherit", fontSize: 15, marginBottom: 16 }}>
          {t.history.back}
        </button>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2e22", marginBottom: 4 }}>{s.date}</h3>
        <div style={{ color: "#6b8f6b", fontSize: 13, marginBottom: 20 }}>
          {t.history.total} {fmt(s.blocks.reduce((a, b) => a + (b.elapsed || 0), 0))}
        </div>
        {s.blocks.filter((b) => b.elapsed > 0 || b.notes).map((b, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #ddd8cc" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "#2d4a35", textTransform: "capitalize", marginBottom: 6 }}>
              {b.section} — <span style={{ color: "#4a7c59" }}>{fmt(b.elapsed || 0)}</span>
            </div>
            {b.notes && <div style={{ color: "#6b8f6b", fontSize: 14 }}>{b.notes}</div>}
          </div>
        ))}
        {s.links?.length > 0 && (
          <div style={{ background: "#f5f2eb", borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: "#2d4a35", marginBottom: 8 }}>{t.history.links}</div>
            {s.links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={{ display: "block", color: "#4a7c59", fontSize: 13, marginBottom: 4 }}>{l.url}</a>)}
          </div>
        )}
        {s.recordings?.length > 0 && (
          <div style={{ background: "#f5f2eb", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, color: "#2d4a35", marginBottom: 8 }}>{t.history.recs}</div>
            {s.recordings.map((r) =>
              r.type === "video"
                ? <video key={r.id} src={r.url} controls style={{ width: "100%", borderRadius: 8, marginBottom: 8 }} />
                : <audio key={r.id} src={r.url} controls style={{ width: "100%", marginBottom: 8 }} />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2e22", fontSize: 26, fontWeight: 900, marginBottom: 24 }}>{t.history.title}</h2>
      {sorted.length === 0 && (
        <div style={{ textAlign: "center", color: "#aaa", padding: 40, fontSize: 16, whiteSpace: "pre-line" }}>
          {t.history.empty}
        </div>
      )}
      {sorted.map((s) => {
        const totalSecs = s.blocks.reduce((a, b) => a + (b.elapsed || 0), 0);
        return (
          <button key={s.id} onClick={() => setSelected(s.id)} style={{ width: "100%", textAlign: "left", background: "#fff", border: "1px solid #ddd8cc", borderRadius: 16, padding: "16px 20px", marginBottom: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", fontWeight: 700, marginBottom: 4 }}>{s.date}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ color: "#4a7c59", fontSize: 13 }}>⏱ {fmt(totalSecs)}</span>
              {s.blocks.filter((b) => b.elapsed > 0).map((b) => (
                <span key={b.section} style={{ color: "#6b8f6b", fontSize: 13, textTransform: "capitalize" }}>• {b.section}</span>
              ))}
              {s.links?.length > 0 && <span style={{ color: "#e07b39", fontSize: 13 }}>🔗 {s.links.length}</span>}
              {s.recordings?.length > 0 && <span style={{ color: "#e07b39", fontSize: 13 }}>🎙 {s.recordings.length}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]           = useState(() => { try { return localStorage.getItem("lang") || "es"; } catch { return "es"; } });
  const t                         = T[lang];
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [view, setView]           = useState("home");
  const [sessions, setSessions]   = useState(() => { try { return JSON.parse(localStorage.getItem("sessions") || "[]"); } catch { return []; } });
  const [activeSession, setActiveSession] = useState(null);
  const [goals, setGoals]         = useState(() => { try { return JSON.parse(localStorage.getItem("goals") || '{"daily":"","monthly":""}'); } catch { return { daily: "", monthly: "" }; } });

  useEffect(() => { try { localStorage.setItem("sessions", JSON.stringify(sessions)); } catch {} }, [sessions]);
  useEffect(() => { try { localStorage.setItem("goals",    JSON.stringify(goals));    } catch {} }, [goals]);
  useEffect(() => { try { localStorage.setItem("lang",     lang);                     } catch {} }, [lang]);

  const saveSession = (session) =>
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = session; return n; }
      return [...prev, session];
    });

  const startNewSession = (keepLinks = false) => {
    const last    = sessions[sessions.length - 1];
    const session = {
      id: Date.now(),
      date: new Date().toLocaleDateString(t.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      dateKey: new Date().toISOString().split("T")[0],
      blocks: t.blocks.map((s) => ({ section: s, notes: "", time: 20, alarmEnabled: false, elapsed: 0 })),
      links: keepLinks && last ? [...last.links] : [],
      recordings: [],
      completed: false,
    };
    setActiveSession(session);
    setView("session");
  };

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <div style={{ minHeight: "100vh", background: "#f5f2eb", fontFamily: "'Lora', Georgia, serif", color: "#2d3a2d" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lora:wght@400;500;600&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#e8e4d8}::-webkit-scrollbar-thumb{background:#4a7c59;border-radius:3px}
          textarea,input,select,button{font-family:'Lora',Georgia,serif}
          .lopt{display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;color:#e8e4d8;font-size:14px;font-weight:600;transition:background 0.15s}
          .lopt:hover{background:#2d4a35}.lopt.lactive{background:#4a7c59}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        `}</style>

        {/* Header */}
        <div style={{ background: "#1a2e22", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>🎼</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", color: "#e8e4d8", fontSize: 18, fontWeight: 900 }}>{t.appName}</div>
              <div style={{ color: "#8fbc8f", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{t.appTagline}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[{id:"home",icon:"🏠"},{id:"tools",icon:"🔧"},{id:"goals",icon:"🎯"},{id:"history",icon:"📔"},{id:"scores",icon:"🎵"}].map(({id,icon})=>(
              <button key={id} onClick={() => setView(id)} title={t.nav[id]} style={{ background: view===id?"#4a7c59":"transparent", color:"#e8e4d8", border:"1px solid #4a7c59", borderRadius:10, padding:"7px 11px", cursor:"pointer", fontSize:15, transition:"all 0.2s" }}>
                {icon}
              </button>
            ))}
            <div style={{ position: "relative", marginLeft: 4 }}>
              <button onClick={() => setShowLangMenu((m) => !m)} style={{ background: "#2d4a35", border: "1px solid #4a7c59", borderRadius: 10, padding: "7px 11px", cursor: "pointer", color: "#e8e4d8", display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 15 }}>{lang === "es" ? "🇨🇴" : "🇺🇸"}</span>
                <span>{lang.toUpperCase()}</span>
                <span style={{ fontSize: 9, opacity: 0.6 }}>{showLangMenu ? "▲" : "▼"}</span>
              </button>
              {showLangMenu && (
                <div style={{ position: "absolute", top: 44, right: 0, background: "#1a2e22", border: "1px solid #4a7c59", borderRadius: 12, overflow: "hidden", zIndex: 200, minWidth: 150, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
                  <div style={{ padding: "8px 16px 4px", color: "#8fbc8f", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Idioma / Language</div>
                  {[{code:"es",flag:"🇨🇴",label:"Español",sub:"Spanish"},{code:"en",flag:"🇺🇸",label:"English",sub:"Inglés"}].map((opt) => (
                    <div key={opt.code} className={`lopt${lang===opt.code?" lactive":""}`} onClick={() => { setLang(opt.code); setShowLangMenu(false); }}>
                      <span style={{ fontSize: 20 }}>{opt.flag}</span>
                      <div><div>{opt.label}</div><div style={{ fontSize: 11, opacity: 0.6 }}>{opt.sub}</div></div>
                      {lang === opt.code && <span style={{ marginLeft: "auto", color: "#8fbc8f" }}>✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
          {view === "home" && (
            <HomeView goals={goals} sessions={sessions} onStart={startNewSession} onContinue={() => setView("session")} activeSession={activeSession} />
          )}
          {view === "session" && activeSession && (
            <SessionView session={activeSession} onUpdate={(s) => { setActiveSession(s); saveSession(s); }} onFinish={() => { saveSession(activeSession); setView("home"); }} />
          )}
          {view === "tools" && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", marginBottom: 24, fontSize: 26 }}>{t.toolsTitle}</h2>
              <div style={{ display: "grid", gap: 20 }}>
                <Metronome />
                <Tuner />
                <ScaleInfo />
              </div>
            </div>
          )}
          {view === "goals"   && <GoalsView goals={goals} setGoals={setGoals} sessions={sessions} />}
          {view === "history" && <HistoryView sessions={sessions} />}
          {view === "scores"  && <ScoreViewer lang={lang} />}
        </div>
      </div>
    </LangCtx.Provider>
  );
}

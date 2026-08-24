import { useState, useEffect, useRef, useCallback, createContext, useContext, lazy, Suspense } from "react";
import { store } from "./store";
const ScoreViewer  = lazy(() => import("./ScoreViewer"));
const TeacherPortal = lazy(() => import("./TeacherPortal"));
import { db, auth, provider, firebaseConfigured } from "./firebase";
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────────────────
// i18n — all UI strings in Spanish and English
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  es: {
    appName: "Atrile",
    appTagline: "Tu práctica musical",
    nav: { home: "Inicio", tools: "Herramientas", goals: "Metas", history: "Diario", scores: "Partituras", teacher: "Portal Maestro", classSession: "Sesión de Clase" },
    greeting: "Hola,",
    musician: "músico.",
    tagline: "Tu próximo nivel empieza aquí.",
    locale: "es-ES",
    stats: { week: "Sesiones esta semana", minutes: "Minutos totales", saved: "Sesiones guardadas" },
    goalsSummary: { today: "Hoy:", month: "Este mes:" },
    newSession: "Nueva sesión de estudio",
    firstSession: "Comenzar primera sesión",
    continueSession: "▶ Continuar sesión de hoy",
    linksModal: {
      title: "¿Qué hacemos con tus links?",
      subtitle: "Tienes links guardados de tu sesión anterior",
      keep: "Continuar con links anteriores",
      blank: "Empezar en blanco",
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
    timerLabel: "Tiempo:",
    min: "min",
    alarm: "Alarma al terminar",
    searchPh: "Buscar partitura / grabación...",
    links: {
      title: "Links de referencia",
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
    notes: {
      title: "Notas del Maestro",
      code: "Tu código de alumno",
      share: "Compártelo con tu maestro",
      empty: "Aún no tienes notas de tu maestro",
      new: "nota nueva",
      news: "notas nuevas",
    },
    metro: {
      title: "Metrónomo",
      accent: "Acento en 1",
      start: "▶ Iniciar",
      stop: "⏸ Detener",
      label: "Metro",
    },
    tuner: {
      title: "Afinador Cromático",
      activate: "Activar afinador",
      deactivate: "Detener micrófono",
      inTune: "✓ Afinado",
    },
    goalsView: {
      title: "Metas y Progreso",
      dayLabel: "Meta del día",
      dayPh: "¿Qué quieres lograr hoy?",
      monthLabel: "Meta del mes",
      monthPh: "¿Qué quieres lograr este mes?",
      practiced: "Día practicado",
      today: "Hoy",
    },
    history: {
      title: "Diario de Estudio",
      empty: "Aún no tienes sesiones guardadas.\n¡Empieza tu primera práctica!",
      back: "← Volver al historial",
      total: "Total:",
      links: "Links guardados",
      recs: "Grabaciones",
    },
    rec: {
      title: "Grabación de sesión",
      subtitle: "Video en MP4/H.264 listo para Instagram",
      audioOnly: "Solo Audio",
      audioVideo: "Audio + Video",
      fmtTitle: "Formato Instagram",
      fmtHint: "Se convierte a MP4 H.264 + AAC • 1080p • apto para Reels, Stories y Feed",
      recBtn: (f) => `● Grabar para Instagram (${f})`,
      recAudio: "● Grabar audio",
      stopBtn: "Detener grabación",
      converting: "Convirtiendo a MP4...",
      savedLabel: "Grabaciones guardadas",
      dl: (e) => `Descargar ${e}`,
      readyFor: "Listo para",
      platforms: "Instagram · TikTok · WhatsApp",
      fallback: "WebM — convierte antes de subir",
      loadingConv: "Cargando convertidor...",
      convFmt: (f) => `Convirtiendo a MP4 (${f})...`,
      done: "MP4 listo para Instagram",
      permErr: "No se pudo acceder al micrófono/cámara. Verifica los permisos.",
    },
    days: ["L", "M", "X", "J", "V", "S", "D"],
    practicedMin: (t) => `(${t} practicado)`,
  },
  en: {
    appName: "Atrile",
    appTagline: "Your music practice",
    nav: { home: "Home", tools: "Tools", goals: "Goals", history: "Journal", scores: "Scores", teacher: "Teacher Portal", classSession: "Class Session" },
    greeting: "Hello,",
    musician: "musician.",
    tagline: "Your next level starts here.",
    locale: "en-US",
    stats: { week: "Sessions this week", minutes: "Total minutes", saved: "Saved sessions" },
    goalsSummary: { today: "Today:", month: "This month:" },
    newSession: "New practice session",
    firstSession: "Start your first session",
    continueSession: "▶ Continue today's session",
    linksModal: {
      title: "What about your links?",
      subtitle: "You have saved links from your last session",
      keep: "Keep previous links",
      blank: "Start fresh",
    },
    session: {
      title: "Today's Session",
      finish: "Finish ✓",
      studying: "Studying:",
      pause: "⏹ Pause section",
      target: "goal",
    },
    blocks: ["method", "scales", "pieces", "open"],
    blockPh: (s) => `What will you work on in ${s}?`,
    timerLabel: "Time:",
    min: "min",
    alarm: "Alarm when done",
    searchPh: "Search score / recording...",
    links: {
      title: "Reference links",
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
    notes: {
      title: "Teacher Notes",
      code: "Your student code",
      share: "Share it with your teacher",
      empty: "No notes from your teacher yet",
      new: "new note",
      news: "new notes",
    },
    metro: {
      title: "Metronome",
      accent: "Accent beat 1",
      start: "▶ Start",
      stop: "⏸ Stop",
      label: "Metro",
    },
    tuner: {
      title: "Chromatic Tuner",
      activate: "Activate tuner",
      deactivate: "Stop microphone",
      inTune: "✓ In tune",
    },
    goalsView: {
      title: "Goals & Progress",
      dayLabel: "Today's goal",
      dayPh: "What do you want to achieve today?",
      monthLabel: "Monthly goal",
      monthPh: "What do you want to achieve this month?",
      practiced: "Practiced",
      today: "Today",
    },
    history: {
      title: "Practice Journal",
      empty: "No sessions saved yet.\nStart your first practice!",
      back: "← Back to journal",
      total: "Total:",
      links: "Saved links",
      recs: "Recordings",
    },
    rec: {
      title: "Session recording",
      subtitle: "Video as MP4/H.264 ready for Instagram",
      audioOnly: "Audio only",
      audioVideo: "Audio + Video",
      fmtTitle: "Instagram format",
      fmtHint: "Converted to MP4 H.264 + AAC • 1080p • for Reels, Stories & Feed",
      recBtn: (f) => `● Record for Instagram (${f})`,
      recAudio: "● Record audio",
      stopBtn: "Stop recording",
      converting: "Converting to MP4...",
      savedLabel: "Saved recordings",
      dl: (e) => `Download ${e}`,
      readyFor: "Ready for",
      platforms: "Instagram · TikTok · WhatsApp",
      fallback: "WebM — convert before uploading",
      loadingConv: "Loading converter...",
      convFmt: (f) => `Converting to MP4 (${f})...`,
      done: "MP4 ready for Instagram",
      permErr: "Could not access mic/camera. Check your permissions.",
    },
    days: ["M", "T", "W", "T", "F", "S", "S"],
    practicedMin: (t) => `(${t} practiced)`,
  },
};

const LangCtx = createContext({ lang: "es", t: T.es, setLang: () => {}, darkMode: false });
const useLang = () => useContext(LangCtx);

// Icon helper — always resolves to the correct light/dark SVG
const PUB = process.env.PUBLIC_URL || "";
const icon = (name, dark) => `${PUB}/icons/${dark ? "dark" : "light"}/${name}.svg`;

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
  { id: "reels",     label: "Reels / Stories", ratio: "9:16", icon: "format-portrait",  vf: "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1" },
  { id: "feed_sq",   label: "Feed cuadrado",   ratio: "1:1",  icon: "format-square",    vf: "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" },
  { id: "feed_port", label: "Feed 4:5",        ratio: "4:5",  icon: "format-landscape", vf: "scale=1080:1350:force_original_aspect_ratio=decrease,pad=1080:1350:(ow-iw)/2:(oh-ih)/2,setsar=1" },
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
      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#8fbc8f", marginBottom: 20, fontSize: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <img src={icon("metronome", true)} alt="" style={{ width: 22, height: 22, flexShrink: 0 }} />
        {t.metro.title}
      </h3>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 56, fontWeight: 400, color: "#e8e4d8", fontFamily: "'Geist Mono', monospace", lineHeight: 1 }}>{bpm}</div>
        <div style={{ color: "#8fbc8f", fontSize: 14, letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Geist Mono', monospace" }}>BPM</div>
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
      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#8fbc8f", marginBottom: 20, fontSize: 20, display: "flex", alignItems: "center", gap: 10 }}>
        <img src={icon("audio", true)} alt="" style={{ width: 22, height: 22, flexShrink: 0 }} />
        {t.tuner.title}
      </h3>
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
    <div style={{ background: "var(--c-card-warm)", borderRadius: 16, padding: 20, border: "1px solid var(--c-border-green)" }}>
      <h4 style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", marginBottom: 12 }}>{t.scale.title}</h4>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border-green)", background: "var(--c-card)", color: "var(--c-heading2)", fontFamily: "inherit", fontSize: 14 }}>
          <option value="">{t.scale.select}</option>
          {Object.keys(SCALE_DATA).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border-green)", background: "var(--c-card)", color: "var(--c-heading2)", fontFamily: "inherit", fontSize: 14 }}>
          <option value="major">{t.scale.major}</option>
          <option value="minor">{t.scale.minor}</option>
        </select>
      </div>
      {info && (
        <div style={{ background: "var(--c-card-green)", borderRadius: 10, padding: 14 }}>
          <div style={{ marginBottom: 6 }}><strong style={{ color: "var(--c-heading2)" }}>{t.scale.alts}</strong> <span style={{ color: "#4a7c59" }}>{info.alterations}</span></div>
          <div style={{ marginBottom: 6 }}><strong style={{ color: "var(--c-heading2)" }}>{t.scale.notes}</strong> <span style={{ color: "#4a7c59", fontFamily: "'Geist Mono', monospace" }}>{info.notes}</span></div>
          <div><strong style={{ color: "var(--c-heading2)" }}>{t.scale.relative} {mode === "major" ? t.scale.minor : t.scale.major}:</strong> <span style={{ color: "#e07b39", fontWeight: 700 }}>{info.relative}</span></div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recording Panel — Instagram-ready MP4
// ─────────────────────────────────────────────────────────────────────────────
function RecordingPanel({ session, onUpdate }) {
  const { t, darkMode } = useLang();
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
    const { FFmpeg }               = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js");
    const { fetchFile, toBlobURL } = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js");
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
    <div style={{ background: "var(--c-card)", borderRadius: 16, padding: 20, border: "1px solid var(--c-border)" }}>
      <h4 style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", marginBottom: 6 }}>{t.rec.title}</h4>
      <div style={{ color: "#8fbc8f", fontSize: 12, marginBottom: 16 }}>{t.rec.subtitle}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[{ id: "audio", label: t.rec.audioOnly }, { id: "video", label: t.rec.audioVideo }].map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)} style={{ flex: 1, padding: "10px", background: mode === m.id ? "#1a2e22" : "var(--c-card-alt)", color: mode === m.id ? "#e8e4d8" : "var(--c-muted)", border: "1px solid var(--c-border)", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <img src={icon(m.id, true)} alt="" style={{ width: 18, height: 18 }} />
            {m.label}
          </button>
        ))}
      </div>

      {mode === "video" && (
        <div style={{ background: "var(--c-card-warm)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ color: "var(--c-heading2)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t.rec.fmtTitle}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {IG_FORMATS.map((f) => (
              <button key={f.id} onClick={() => setIgFormat(f.id)} style={{ padding: "10px 6px", textAlign: "center", background: igFormat === f.id ? "#1a2e22" : "var(--c-card)", color: igFormat === f.id ? "#e8e4d8" : "var(--c-muted)", border: igFormat === f.id ? "2px solid #4a7c59" : "1px solid var(--c-border)", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "center" }}><img src={icon(f.icon, true)} alt="" style={{ width: 22, height: 22 }} /></div>
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
        <div style={{ background: "var(--c-card-green)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "var(--c-heading2)", fontSize: 13, textAlign: "center" }}>{convertMsg}</div>
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
            <div key={r.id} style={{ background: "var(--c-card-alt)", borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: "1px solid var(--c-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src={icon(r.type === "video" ? "video" : "audio", darkMode)} alt="" style={{ width: 18, height: 18, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: "var(--c-heading2)", fontSize: 13, fontWeight: 700 }}>{r.date}</div>
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
                  <div style={{ flex: 1, background: "var(--c-card-green)", borderRadius: 8, padding: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#4a7c59", fontWeight: 700 }}>{t.rec.readyFor}</div>
                    <div style={{ fontSize: 10, color: "var(--c-muted)" }}>{t.rec.platforms}</div>
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
// Block Panel — notes, timer, links for one practice block
// ─────────────────────────────────────────────────────────────────────────────
function BlockPanel({ block, blockIdx, t, lang, running, elapsed, onStartStop, onChange, session, onUpdate, onOpenScore }) {
  const { darkMode } = useLang();
  const [newLink, setNewLink] = useState("");
  const label      = t.blocks[blockIdx] || block.section;
  const targetSecs = block.time * 60;

  const addLink = () => {
    if (!newLink.trim()) return;
    onUpdate({ ...session, links: [...(session.links || []), { url: newLink.trim(), id: Date.now() }] });
    setNewLink("");
  };
  const removeLink = (id) =>
    onUpdate({ ...session, links: (session.links || []).filter(l => l.id !== id) });

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--c-bg)" }}>
      <div style={{ padding: "16px 16px 32px", maxWidth: 680, margin: "0 auto" }}>

        {/* Header + start/stop */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", fontSize: 20, fontWeight: 700, textTransform: "capitalize" }}>{label}</div>
            {block.elapsed > 0 && <div style={{ color: "#8fbc8f", fontSize: 12 }}>+ {fmt(block.elapsed)} {lang === "es" ? "acumulado" : "accumulated"}</div>}
          </div>
          <button onClick={onStartStop}
            style={{ background: running ? "#c0504d" : "#4a7c59", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", minWidth: 90 }}>
            {running ? `⏸ ${fmt(elapsed)}` : `▶ ${lang === "es" ? "Iniciar" : "Start"}`}
          </button>
        </div>

        {/* Timer config */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: running ? 10 : 14, background: "var(--c-card-green)", borderRadius: 10, padding: "10px 14px" }}>
          <span style={{ color: "var(--c-heading2)", fontSize: 13, flex: 1 }}>{t.timerLabel}</span>
          <button onClick={() => onChange("time", Math.max(5, block.time - 5))}
            style={{ background: "rgba(74,124,89,0.15)", border: "none", borderRadius: 6, color: "var(--c-heading2)", cursor: "pointer", width: 30, height: 30, fontSize: 18, fontWeight: 700 }}>−</button>
          <span style={{ color: "var(--c-heading2)", fontWeight: 700, fontSize: 16, minWidth: 60, textAlign: "center" }}>{block.time} {t.min}</span>
          <button onClick={() => onChange("time", Math.min(120, block.time + 5))}
            style={{ background: "rgba(74,124,89,0.15)", border: "none", borderRadius: 6, color: "var(--c-heading2)", cursor: "pointer", width: 30, height: 30, fontSize: 18, fontWeight: 700 }}>+</button>
          <label style={{ display: "flex", alignItems: "center", gap: 5, color: "#6b8f6b", fontSize: 13, cursor: "pointer", marginLeft: 6 }}>
            <input type="checkbox" checked={block.alarmEnabled} onChange={e => onChange("alarmEnabled", e.target.checked)} style={{ accentColor: "#4a7c59" }} />
            🔔
          </label>
        </div>

        {/* Progress bar when running */}
        {running && targetSecs > 0 && (
          <div style={{ background: "var(--c-border)", borderRadius: 4, height: 5, marginBottom: 14, overflow: "hidden" }}>
            <div style={{ background: "#4a7c59", height: 5, borderRadius: 4, width: `${Math.min(100, (elapsed / targetSecs) * 100)}%`, transition: "width 1s linear" }} />
          </div>
        )}

        {/* Notes */}
        <textarea
          placeholder={t.blockPh(label)}
          value={block.notes}
          onChange={e => onChange("notes", e.target.value)}
          style={{ width: "100%", border: "1px solid var(--c-border)", borderRadius: 10, padding: "12px 14px", minHeight: 100, background: "var(--c-card)", color: "var(--c-text)", fontSize: 14, resize: "vertical", outline: "none", lineHeight: 1.6, marginBottom: 14, boxSizing: "border-box" }}
        />

        {/* Open score button */}
        <button onClick={onOpenScore}
          style={{ width: "100%", padding: 11, background: "transparent", border: "1px solid #4a7c59", borderRadius: 10, color: "#4a7c59", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <img src={icon("scores", darkMode)} alt="" style={{ width: 18, height: 18 }} />
          {lang === "es" ? "Abrir partitura" : "Open score"}
        </button>

        {/* Spotify/Apple — only for pieces block (index 2) */}
        {blockIdx === 2 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <input id="block-search" placeholder={t.searchPh}
              style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--c-border)", borderRadius: 8, background: "var(--c-card-warm)", fontSize: 13, color: "var(--c-heading2)", minWidth: 120, outline: "none" }}
              onKeyDown={e => { if (e.key === "Enter") window.open(`https://open.spotify.com/search/${encodeURIComponent(e.target.value)}`, "_blank"); }} />
            <button onClick={() => window.open(`https://open.spotify.com/search/${encodeURIComponent(document.getElementById("block-search")?.value || "")}`, "_blank")}
              style={{ background: "#1DB954", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Spotify</button>
            <button onClick={() => window.open(`https://music.apple.com/search?term=${encodeURIComponent(document.getElementById("block-search")?.value || "")}`, "_blank")}
              style={{ background: "#fc3c44", color: "#fff", border: "none", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Apple</button>
          </div>
        )}

        {/* Links */}
        <div style={{ background: "var(--c-card)", borderRadius: 12, padding: 14, border: "1px solid var(--c-border)" }}>
          <div style={{ color: "var(--c-heading2)", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t.links.title}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input value={newLink} onChange={e => setNewLink(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()}
              placeholder={t.links.ph}
              style={{ flex: 1, padding: "7px 10px", border: "1px solid var(--c-border)", borderRadius: 8, background: "var(--c-card-warm)", color: "var(--c-heading2)", fontSize: 13, outline: "none" }} />
            <button onClick={addLink} style={{ background: "#4a7c59", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 700 }}>+</button>
          </div>
          {!(session.links?.length) && <div style={{ color: "var(--c-muted)", fontSize: 12 }}>{t.links.empty}</div>}
          {(session.links || []).map(link => (
            <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, background: "var(--c-card-alt)", borderRadius: 7, padding: "7px 10px" }}>
              <a href={link.url} target="_blank" rel="noreferrer" style={{ color: "#4a7c59", flex: 1, fontSize: 12, wordBreak: "break-all" }}>{link.url}</a>
              <button onClick={() => removeLink(link.id)} style={{ background: "none", border: "none", color: "#c0504d", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Session View — full-screen with auto-hiding top/bottom bars
// ─────────────────────────────────────────────────────────────────────────────
function SessionView({ session, onUpdate, onFinish, lang, onNavChange, onOpenDrawer }) {
  const { t, darkMode } = useLang();

  // Timing
  const [activeBlock, setActiveBlock] = useState(null);
  const [running, setRunning]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const intervalRef = useRef(null);

  // UI
  const [panelIdx, setPanelIdx]       = useState(null);
  const [showScore, setShowScore]     = useState(false);
  const [scoreLoaded, setScoreLoaded] = useState(false);
  const [showTools, setShowTools]     = useState(false);
  const [showFinish, setShowFinish]   = useState(false);
  const [showBars, setShowBars]       = useState(true);
  const [recActive, setRecActive]     = useState(false);

  const hideTimer = useRef(null);
  const mrRef     = useRef(null);
  const chunksRef = useRef([]);

  // Hide app header while session is active
  useEffect(() => { onNavChange(true); return () => onNavChange(false); }, [onNavChange]);

  // Auto-hide bars only while score is visible (reading mode)
  const triggerBars = useCallback(() => {
    setShowBars(true);
    clearTimeout(hideTimer.current);
    if (showScore) hideTimer.current = setTimeout(() => setShowBars(false), 4000);
  }, [showScore]);

  useEffect(() => {
    if (!showScore) { setShowBars(true); clearTimeout(hideTimer.current); }
    else triggerBars();
    return () => clearTimeout(hideTimer.current);
  }, [showScore, triggerBars]);

  // Timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1;
          const b = session.blocks[activeBlock];
          if (b?.alarmEnabled && next >= b.time * 60) {
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator(); const g = ctx.createGain();
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
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [running, activeBlock, session.blocks]);

  const saveElapsed = useCallback((idx, secs) => {
    if (idx === null || secs === 0) return;
    const u = { ...session };
    u.blocks[idx] = { ...u.blocks[idx], elapsed: (u.blocks[idx].elapsed || 0) + secs };
    onUpdate(u);
  }, [session, onUpdate]);

  const stopBlock = useCallback(() => {
    setRunning(false); saveElapsed(activeBlock, elapsed); setElapsed(0);
  }, [activeBlock, elapsed, saveElapsed]);

  const startBlock = useCallback((i) => {
    if (running) { saveElapsed(activeBlock, elapsed); setElapsed(0); }
    setActiveBlock(i); setRunning(false);
    setTimeout(() => setRunning(true), 30);
  }, [running, activeBlock, elapsed, saveElapsed]);

  const updateBlock = useCallback((i, field, val) => {
    const u = { ...session }; u.blocks[i] = { ...u.blocks[i], [field]: val }; onUpdate(u);
  }, [session, onUpdate]);

  const openScore = useCallback(() => {
    setShowScore(true); setScoreLoaded(true); triggerBars();
  }, [triggerBars]);

  const toggleBlock = useCallback((i) => {
    triggerBars();
    if (panelIdx === i && !showScore) { setPanelIdx(null); return; }
    setPanelIdx(i); setShowScore(false);
    if (activeBlock !== i) startBlock(i);
  }, [panelIdx, showScore, activeBlock, startBlock, triggerBars]);

  // Simple audio recording (full RecordingPanel stays in history/tools)
  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/mp4;codecs=aac") ? "audio/mp4;codecs=aac" : "audio/webm;codecs=opus";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(tr => tr.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const ext  = mime.includes("mp4") ? "m4a" : "webm";
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a"); a.href = url; a.download = `grabacion-${Date.now()}.${ext}`; a.click();
        onUpdate({ ...session, recordings: [...(session.recordings || []), { id: Date.now(), date: new Date().toLocaleTimeString(), type: "audio", url, filename: `audio-${Date.now()}.${ext}`, format: null }] });
      };
      mr.start(500); mrRef.current = mr; setRecActive(true);
    } catch { alert(lang === "es" ? "No se pudo acceder al micrófono" : "Could not access microphone"); }
  };
  const stopRec = () => { mrRef.current?.stop(); mrRef.current = null; setRecActive(false); };

  useEffect(() => () => { clearInterval(intervalRef.current); clearTimeout(hideTimer.current); mrRef.current?.stop(); }, []);

  const totalElapsed   = session.blocks.reduce((a, b) => a + (b.elapsed || 0), 0);
  const activeBlockObj = activeBlock !== null ? session.blocks[activeBlock] : null;
  const targetSecs     = activeBlockObj ? activeBlockObj.time * 60 : 0;
  const pct            = running && targetSecs > 0 ? Math.min(100, (elapsed / targetSecs) * 100) : 0;
  const BLOCK_SVG      = ["study", "metronome", "scores", "tools"];

  const barBase = (from) => ({
    position: "absolute", [from === "top" ? "top" : "bottom"]: 0, left: 0, right: 0, zIndex: 30,
    background: "rgba(14,26,18,0.97)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    borderBottom: from === "top" ? "1px solid rgba(74,124,89,0.18)" : "none",
    borderTop:    from === "bottom" ? "1px solid rgba(74,124,89,0.18)" : "none",
    transform: showBars ? "translateY(0)" : `translateY(${from === "top" ? "-100%" : "100%"})`,
    transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
  });

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--c-bg)" }}
      onPointerDown={triggerBars}>

      {/* ── TOP BAR ── */}
      <div style={barBase("top")}>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 8 }}>
          <button onClick={onOpenDrawer} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            <span style={{ display: "block", width: 20, height: 2, background: "#e8e4d8", borderRadius: 2 }} />
            <span style={{ display: "block", width: 14, height: 2, background: "#8fbc8f", borderRadius: 2 }} />
            <span style={{ display: "block", width: 20, height: 2, background: "#e8e4d8", borderRadius: 2 }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#e8e4d8", fontSize: 12, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{t.session.title}</div>
            <div style={{ color: "#4a7c59", fontSize: 11, fontFamily: "'Geist Mono', monospace" }}>
              {fmt(totalElapsed + (running ? elapsed : 0))}
              {running && activeBlock !== null && <span style={{ color: "#8fbc8f", marginLeft: 6 }}>· {t.blocks[activeBlock]}</span>}
            </div>
          </div>
          <button onClick={showScore ? () => setShowScore(false) : openScore} title={lang === "es" ? "Partitura" : "Score"}
            style={{ background: showScore ? "rgba(74,124,89,0.55)" : "rgba(255,255,255,0.08)", border: `1px solid ${showScore ? "#4a7c59" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, cursor: "pointer", padding: "6px 9px", display: "flex", alignItems: "center" }}>
            <img src={icon("scores", true)} alt="" style={{ width: 18, height: 18 }} />
          </button>
          <button onClick={() => setShowTools(s => !s)} title={lang === "es" ? "Metrónomo" : "Metronome"}
            style={{ background: showTools ? "rgba(74,124,89,0.55)" : "rgba(255,255,255,0.08)", border: `1px solid ${showTools ? "#4a7c59" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, cursor: "pointer", padding: "6px 9px", display: "flex", alignItems: "center" }}>
            <img src={icon("metronome", true)} alt="" style={{ width: 18, height: 18 }} />
          </button>
          <button onClick={recActive ? stopRec : startRec} title={lang === "es" ? "Grabar" : "Record"}
            style={{ background: recActive ? "rgba(192,80,77,0.7)" : "rgba(255,255,255,0.08)", border: `1px solid ${recActive ? "#c0504d" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, color: "#e8e4d8", cursor: "pointer", padding: "5px 9px", fontSize: 14 }}>
            {recActive ? "⏹" : "⏺"}
          </button>
          <button onClick={() => setShowFinish(true)}
            style={{ background: "#4a7c59", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: "inherit", flexShrink: 0 }}>
            {t.session.finish}
          </button>
        </div>
        {recActive && (
          <div style={{ background: "rgba(192,80,77,0.15)", borderTop: "1px solid rgba(192,80,77,0.25)", padding: "5px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
            <span style={{ color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>{lang === "es" ? "Grabando audio…" : "Recording audio…"}</span>
          </div>
        )}
      </div>

      {/* ── TOOLS POPUP (metronome) ── */}
      {showTools && (
        <div style={{ position: "absolute", top: 58, right: 8, zIndex: 40, background: "rgba(10,20,14,0.97)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(74,124,89,0.35)", borderRadius: 16, padding: 16, width: "min(260px, calc(100vw - 24px))", boxShadow: "0 8px 32px rgba(0,0,0,0.55)" }}>
          <Metronome compact />
        </div>
      )}

      {/* ── SCORE VIEWER — stays mounted once opened to preserve state ── */}
      {scoreLoaded && (
        <div style={{ position: "absolute", inset: 0, zIndex: 10, display: showScore ? "flex" : "none", flexDirection: "column", paddingTop: 56, paddingBottom: 76 }}>
          <Suspense fallback={<div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b8f6b", background: "#1a2e22" }}>{lang === "es" ? "Cargando…" : "Loading…"}</div>}>
            <ScoreViewer lang={lang} onNavChange={() => {}} />
          </Suspense>
        </div>
      )}

      {/* ── MAIN AREA — block panel or welcome ── */}
      {!showScore && (
        <div style={{ flex: 1, overflow: "hidden", paddingTop: 56, paddingBottom: 76 }}>
          {panelIdx !== null ? (
            <BlockPanel
              block={session.blocks[panelIdx]} blockIdx={panelIdx} t={t} lang={lang}
              running={running && activeBlock === panelIdx}
              elapsed={activeBlock === panelIdx ? elapsed : 0}
              onStartStop={() => (running && activeBlock === panelIdx) ? stopBlock() : startBlock(panelIdx)}
              onChange={(field, val) => updateBlock(panelIdx, field, val)}
              session={session} onUpdate={onUpdate} onOpenScore={openScore}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 32, textAlign: "center", gap: 20 }}>
              <img src={icon("study", darkMode)} alt="" style={{ width: 56, height: 56, opacity: 0.85 }} />
              <div style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", fontSize: 17, fontWeight: 700 }}>{session.date}</div>
              <div style={{ color: "#8fbc8f", fontSize: 14 }}>{lang === "es" ? "Toca un bloque abajo para empezar" : "Tap a block below to start"}</div>
              <button onClick={openScore}
                style={{ background: "rgba(74,124,89,0.12)", border: "1px solid #4a7c59", borderRadius: 12, color: "#4a7c59", cursor: "pointer", padding: "12px 24px", fontSize: 15, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
                <img src={icon("scores", true)} alt="" style={{ width: 20, height: 20 }} />
                {lang === "es" ? "Abrir partitura" : "Open score"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      <div style={barBase("bottom")}>
        {running && (
          <div style={{ padding: "5px 14px 4px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(74,124,89,0.1)" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite", flexShrink: 0 }} />
            <span style={{ color: "#e8e4d8", fontFamily: "monospace", fontSize: 13, fontWeight: 700, minWidth: 44 }}>{fmt(elapsed)}</span>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 3, height: 4, overflow: "hidden" }}>
              <div style={{ background: "#4a7c59", height: "100%", borderRadius: 3, width: `${pct}%`, transition: "width 1s linear" }} />
            </div>
            <span style={{ color: "#3d5e45", fontSize: 11, minWidth: 38, textAlign: "right" }}>{fmt(targetSecs)}</span>
          </div>
        )}
        <div style={{ display: "flex", padding: "6px 8px 8px", gap: 4 }}>
          {session.blocks.map((block, i) => {
            const isActive    = panelIdx === i && !showScore;
            const hasMaterial = !!(block.notes?.trim() || block.elapsed > 0);
            return (
              <button key={i} onClick={() => toggleBlock(i)}
                style={{ flex: 1, padding: "8px 4px 6px", background: isActive ? "rgba(74,124,89,0.3)" : "transparent", border: `1px solid ${isActive ? "#4a7c59" : "transparent"}`, borderRadius: 10, color: isActive ? "#e8e4d8" : "#6b8f6b", cursor: "pointer", textAlign: "center", fontFamily: "inherit", fontSize: 10, fontWeight: isActive ? 700 : 400, position: "relative", transition: "background 0.15s, color 0.15s" }}>
                <div style={{ height: 22, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 3 }}>
                  <img src={icon(BLOCK_SVG[i], true)} alt="" style={{ width: 20, height: 20, opacity: isActive ? 1 : 0.5 }} />
                </div>
                <div style={{ lineHeight: 1.2, textTransform: "capitalize" }}>{t.blocks[i]}</div>
                {hasMaterial && <span style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: "#4a7c59" }} />}
                {running && activeBlock === i && <span style={{ position: "absolute", top: 5, left: 5, width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Touch zones — activate bars when they are hidden */}
      {!showBars && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 44, zIndex: 50 }} onPointerDown={triggerBars} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 70, zIndex: 50 }} onPointerDown={triggerBars} />
        </>
      )}

      {/* ── FINISH MODAL ── */}
      {showFinish && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "#1a2e22", borderRadius: 20, padding: 32, maxWidth: 380, width: "90%", textAlign: "center" }}>
            <img src={icon("study", true)} alt="" style={{ width: 56, height: 56, marginBottom: 12 }} />
            <div style={{ fontFamily: "'Playfair Display', serif", color: "#e8e4d8", fontSize: 22, marginBottom: 8 }}>{t.finishModal.title}</div>
            <div style={{ color: "#8fbc8f", marginBottom: 24 }}>{t.finishModal.total} {fmt(totalElapsed + (running ? elapsed : 0))}</div>
            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={() => { if (running) stopBlock(); onFinish(); setShowFinish(false); }}
                style={{ padding: 14, background: "#4a7c59", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>
                {t.finishModal.save}
              </button>
              <button onClick={() => setShowFinish(false)}
                style={{ padding: 12, background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 12, cursor: "pointer" }}>
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
// Class Session View — placeholder (teacher-student real-time sync)
// ─────────────────────────────────────────────────────────────────────────────
function ClassSessionView({ lang }) {
  const { darkMode } = useLang();
  const studentId = store.str("studentId");
  const [plan,        setPlan]        = useState(null);   // { plan, teacherName, updatedAt }
  const [loading,     setLoading]     = useState(true);
  const [connected,   setConnected]   = useState(false);

  useEffect(() => {
    if (!db || !studentId) { setLoading(false); return; }
    setConnected(true);
    setLoading(true);
    getDoc(doc(db, "classPlan", studentId))
      .then(d => { if (d.exists()) setPlan(d.data()); })
      .catch(() => {})
      .finally(() => setLoading(false));
    // Live updates
    const unsub = onSnapshot(doc(db, "classPlan", studentId),
      d => { if (d.exists()) setPlan(d.data()); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, [studentId]);

  const fmtTs = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString(lang === "es" ? "es" : "en", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  if (!studentId) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 340, padding: 32, textAlign: "center", gap: 18 }}>
        <img src={icon("class-session", darkMode)} alt="" style={{ width: 56, height: 56 }} />
        <div style={{ fontFamily: "'Playfair Display', serif", color: "#2d4a35", fontSize: 22, fontWeight: 700 }}>
          {lang === "es" ? "Sesión de Clase" : "Class Session"}
        </div>
        <div style={{ color: "var(--c-muted)", fontSize: 14, lineHeight: 1.7, maxWidth: 340 }}>
          {lang === "es"
            ? "Tu código de estudiante aún no está configurado. Visita la sección Inicio para verlo."
            : "Your student code is not set up yet. Visit the Home section to find it."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 32px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <img src={icon("class-session", darkMode)} alt="" style={{ width: 48, height: 48, marginBottom: 6 }} />
        <div style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", fontSize: 20, fontWeight: 700 }}>
          {lang === "es" ? "Sesión de Clase" : "Class Session"}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#8fbc8f", padding: "32px 0", fontSize: 14 }}>
          {lang === "es" ? "Cargando…" : "Loading…"}
        </div>
      ) : plan ? (
        <div style={{ background: "#1a2e22", borderRadius: 16, padding: "18px 20px", border: "1px solid #2d4a35" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "#8fbc8f", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, display: "flex", alignItems: "center", gap: 6 }}>
              <img src={icon("lesson-plan", true)} alt="" style={{ width: 14, height: 14 }} />
              {lang === "es" ? "Plan de hoy" : "Today's plan"}
            </div>
            {plan.updatedAt && (
              <div style={{ color: "#4a7c59", fontSize: 11 }}>{fmtTs(plan.updatedAt)}</div>
            )}
          </div>
          {plan.teacherName && (
            <div style={{ color: "#6b8f6b", fontSize: 12, marginBottom: 10 }}>
              {lang === "es" ? "Enviado por" : "Sent by"}: <span style={{ color: "#8fbc8f", fontWeight: 700 }}>{plan.teacherName}</span>
            </div>
          )}
          <div style={{ color: "#e8e4d8", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{plan.plan}</div>
        </div>
      ) : (
        <div style={{ textAlign: "center", color: "var(--c-muted)", padding: "32px 0", fontSize: 14 }}>
          {lang === "es"
            ? "Tu maestro aún no ha publicado el plan de hoy."
            : "Your teacher hasn't published today's plan yet."}
        </div>
      )}

      {!firebaseConfigured && (
        <div style={{ background: "rgba(192,80,77,0.12)", border: "1px solid #c0504d44", borderRadius: 12, padding: 12, marginTop: 20, color: "#fca5a5", fontSize: 12, textAlign: "center" }}>
          {lang === "es" ? "Firebase no configurado — modo demo." : "Firebase not configured — demo mode."}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Home View
// ─────────────────────────────────────────────────────────────────────────────
function TeacherNotesPanel({ notes, studentId, onSeen, unreadCount }) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(() => store.str("studentName"));
  const [editingName, setEditingName] = useState(!store.str("studentName"));

  const saveName = () => {
    store.setStr("studentName", name);
    setEditingName(false);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(studentId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) onSeen();
  };

  const fmt = (ts) =>
    ts?.toDate
      ? ts.toDate().toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
      : "";

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Code + toggle row */}
      <div style={{ background: "#1a2e22", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          {/* Student name */}
          {editingName ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                placeholder="Tu nombre"
                autoFocus
                style={{ flex: 1, padding: "5px 10px", borderRadius: 7, border: "1px solid #4a7c59", background: "#2d4a35", color: "#e8e4d8", fontSize: 13, outline: "none" }}
              />
              <button onClick={saveName}
                style={{ padding: "5px 10px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                OK
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ color: "#e8e4d8", fontWeight: 700, fontSize: 14 }}>{name}</span>
              <button onClick={() => setEditingName(true)}
                style={{ background: "none", border: "none", color: "#6b8f6b", cursor: "pointer", fontSize: 11, padding: 0 }}>
                ✏️
              </button>
            </div>
          )}
          <div style={{ color: "#6b8f6b", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>
            {t.notes.code}
          </div>
          <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: 20, fontWeight: 500, color: "#e8e4d8", letterSpacing: 4 }}>
            {studentId}
          </div>
          <div style={{ color: "#3d5e45", fontSize: 11, marginTop: 2 }}>{t.notes.share}</div>
        </div>
        <button onClick={copyCode}
          style={{ background: copied ? "#4a7c59" : "#2d4a35", color: "#e8e4d8", border: "1px solid #4a7c59", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          {copied ? "✓" : (lang === "es" ? "Copiar" : "Copy")}
        </button>
        {notes.length > 0 && (
          <button onClick={toggle}
            style={{ position: "relative", background: open ? "#4a7c59" : "#2d4a35", color: "#e8e4d8", border: "1px solid #4a7c59", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <img src={icon("private-note", true)} alt="" style={{ width: 16, height: 16 }} />
            {notes.length} {open ? "▲" : "▼"}
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, width: 9, height: 9, borderRadius: "50%", background: "#c0504d", border: "2px solid #1a2e22" }} />
            )}
          </button>
        )}
      </div>

      {/* Notes list */}
      {open && notes.length > 0 && (
        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {notes.map((n) => (
            <div key={n.id} style={{ background: "var(--c-card-green)", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--c-border-green)" }}>
              <div style={{ fontSize: 14, color: "var(--c-text)", lineHeight: 1.6, marginBottom: 8, whiteSpace: "pre-wrap" }}>
                {n.text}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#4a7c59", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <img src={icon("sent-note", true)} alt="" style={{ width: 14, height: 14 }} />
                  {n.teacher}
                </span>
                <span style={{ color: "#6b8f6b", fontSize: 11 }}>{fmt(n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {notes.length === 0 && firebaseConfigured && (
        <div style={{ color: "#6b8f6b", fontSize: 12, textAlign: "center", marginTop: 8 }}>
          {t.notes.empty}
        </div>
      )}
    </div>
  );
}

function HomeView({ goals, sessions, onStart, onContinue, activeSession, teacherNotes = [], studentId = "", onSeenNotes = () => {}, unreadCount = 0 }) {
  const { t, darkMode } = useLang();
  const totalMinutes = sessions.reduce((acc, s) => acc + s.blocks.reduce((a, b) => a + (b.elapsed || 0), 0), 0);
  const weekSessions = sessions.filter((s) => (new Date() - new Date(s.dateKey)) / 86400000 <= 7).length;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: "var(--c-heading)", fontWeight: 900, lineHeight: 1.2 }}>
          {t.greeting}<br /><span style={{ color: "#4a7c59" }}>{t.musician}</span>
        </div>
        <div style={{ color: "var(--c-heading2)", marginTop: 6, fontSize: 15, fontStyle: "italic", fontFamily: "'Lora', Georgia, serif" }}>
          {t.tagline}
        </div>
        <div style={{ color: "var(--c-muted)", marginTop: 4, fontSize: 13 }}>
          {new Date().toLocaleDateString(t.locale, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>
      {firebaseConfigured && studentId && (
        <TeacherNotesPanel notes={teacherNotes} studentId={studentId} onSeen={onSeenNotes} unreadCount={unreadCount} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[
          { label: t.stats.week, value: weekSessions, iconFile: "goals" },
          { label: t.stats.minutes, value: Math.round(totalMinutes / 60), iconFile: "study" },
          { label: t.stats.saved, value: sessions.length, iconFile: "journal" },
        ].map(({ label, value, iconFile }) => (
          <div key={label} style={{ background: "#1a2e22", borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
            <img src={icon(iconFile, true)} alt="" style={{ width: 28, height: 28, marginBottom: 4 }} />
            <div style={{ color: "#8fbc8f", fontSize: 22, fontWeight: 900, fontFamily: "'Playfair Display', serif" }}>{value}</div>
            <div style={{ color: "#6b8f6b", fontSize: 11, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>
      {(goals.daily || goals.monthly) && (
        <div style={{ background: "var(--c-card-green)", borderRadius: 16, padding: 20, marginBottom: 20, border: "1px solid var(--c-border-green)" }}>
          {goals.daily && <div style={{ marginBottom: 8 }}><span style={{ color: "#4a7c59", fontWeight: 700 }}>{t.goalsSummary.today}</span> <span style={{ color: "var(--c-heading2)" }}>{goals.daily}</span></div>}
          {goals.monthly && <div><span style={{ color: "#e07b39", fontWeight: 700 }}>{t.goalsSummary.month}</span> <span style={{ color: "var(--c-heading2)" }}>{goals.monthly}</span></div>}
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
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading)", fontSize: 26, fontWeight: 900, marginBottom: 24 }}>{t.goalsView.title}</h2>
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
      <div style={{ background: "var(--c-card)", borderRadius: 20, padding: 24, border: "1px solid var(--c-border)" }}>
        <div style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: "center" }}>
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
              <div key={dayNum} style={{ aspectRatio: "1", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: practiced ? "#4a7c59" : isToday ? "var(--c-card-green)" : "transparent", border: isToday ? "2px solid #4a7c59" : "2px solid transparent", color: practiced ? "#fff" : isToday ? "var(--c-heading2)" : "var(--c-muted)", fontSize: 13, fontWeight: practiced || isToday ? 700 : 400 }}>
                {dayNum}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 16, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#4a7c59" }} />
            <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{t.goalsView.practiced}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid #4a7c59" }} />
            <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{t.goalsView.today}</span>
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
  const { t, darkMode } = useLang();
  const [selected, setSelected] = useState(null);
  const sorted = [...sessions].sort((a, b) => b.id - a.id);

  if (selected) {
    const s = sessions.find((x) => x.id === selected);
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#4a7c59", cursor: "pointer", fontFamily: "inherit", fontSize: 15, marginBottom: 16 }}>
          {t.history.back}
        </button>
        <h3 style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading)", marginBottom: 4 }}>{s.date}</h3>
        <div style={{ color: "var(--c-muted)", fontSize: 13, marginBottom: 20 }}>
          {t.history.total} {fmt(s.blocks.reduce((a, b) => a + (b.elapsed || 0), 0))}
        </div>
        {s.blocks.filter((b) => b.elapsed > 0 || b.notes).map((b, i) => (
          <div key={i} style={{ background: "var(--c-card)", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid var(--c-border)" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: "var(--c-heading2)", textTransform: "capitalize", marginBottom: 6 }}>
              {b.section} — <span style={{ color: "#4a7c59" }}>{fmt(b.elapsed || 0)}</span>
            </div>
            {b.notes && <div style={{ color: "var(--c-muted)", fontSize: 14 }}>{b.notes}</div>}
          </div>
        ))}
        {s.links?.length > 0 && (
          <div style={{ background: "var(--c-card-alt)", borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: "var(--c-heading2)", marginBottom: 8 }}>{t.history.links}</div>
            {s.links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noreferrer" style={{ display: "block", color: "#4a7c59", fontSize: 13, marginBottom: 4 }}>{l.url}</a>)}
          </div>
        )}
        {s.recordings?.length > 0 && (
          <div style={{ background: "var(--c-card-alt)", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--c-heading2)", marginBottom: 8 }}>{t.history.recs}</div>
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
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading)", fontSize: 26, fontWeight: 900, marginBottom: 24 }}>{t.history.title}</h2>
      {sorted.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--c-muted)", padding: 40, fontSize: 16, whiteSpace: "pre-line" }}>
          {t.history.empty}
        </div>
      )}
      {sorted.map((s) => {
        const totalSecs = s.blocks.reduce((a, b) => a + (b.elapsed || 0), 0);
        return (
          <button key={s.id} onClick={() => setSelected(s.id)} style={{ width: "100%", textAlign: "left", background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "16px 20px", marginBottom: 12, cursor: "pointer", fontFamily: "inherit" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", fontWeight: 700, marginBottom: 4 }}>{s.date}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ color: "#4a7c59", fontSize: 13 }}>{fmt(totalSecs)}</span>
              {s.blocks.filter((b) => b.elapsed > 0).map((b) => (
                <span key={b.section} style={{ color: "var(--c-muted)", fontSize: 13, textTransform: "capitalize" }}>• {b.section}</span>
              ))}
              {s.links?.length > 0 && <span style={{ color: "#e07b39", fontSize: 13 }}>· {s.links.length} links</span>}
              {s.recordings?.length > 0 && (
                <span style={{ color: "#e07b39", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <img src={icon("audio", darkMode)} alt="" style={{ width: 13, height: 13 }} />
                  {s.recordings.length}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Student ID — generated once, stored in localStorage
// ─────────────────────────────────────────────────────────────────────────────
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function getStudentId() {
  let id = store.str("studentId");
  if (!id) {
    id = Array.from({ length: 6 }, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join("");
    store.setStr("studentId", id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]           = useState(() => store.str("lang", "es"));
  const t                         = T[lang];
  const [darkMode, setDarkMode]   = useState(() => store.str("darkMode") === "true");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [view, setView]           = useState("home");
  const [navHidden, setNavHidden] = useState(false);
  const [studentId, setStudentId]  = useState(getStudentId);
  const [teacherNotes, setTeacherNotes] = useState([]);
  const [notesLastSeen, setNotesLastSeen] = useState(() => store.str("notesLastSeen"));
  const [sessions, setSessions]   = useState(() => store.get("sessions", []));
  const [activeSession, setActiveSession] = useState(null);
  const [goals, setGoals]         = useState(() => store.get("goals", { daily: "", monthly: "" }));
  const [user, setUser]           = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Firebase Auth listener — sincroniza el código de estudiante entre dispositivos
  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u && db) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref).catch(() => null);
        if (snap && snap.exists() && snap.data().studentCode) {
          // Ya tiene código en Firestore — usarlo en este dispositivo
          const cloudCode = snap.data().studentCode;
          store.setStr("studentId", cloudCode);
          setStudentId(cloudCode);
          await setDoc(ref, {
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            lastSeen: new Date().toISOString(),
          }, { merge: true }).catch(() => {});
        } else {
          // Primera vez — guardar el código local en Firestore
          const localCode = store.str("studentId") || getStudentId();
          store.setStr("studentId", localCode);
          setStudentId(localCode);
          await setDoc(ref, {
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            lastSeen: new Date().toISOString(),
            plan: "free",
            studentCode: localCode,
          }, { merge: true }).catch(() => {});
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => { store.set("sessions", sessions); }, [sessions]);
  useEffect(() => { store.set("goals",    goals);    }, [goals]);
  useEffect(() => { store.setStr("lang",  lang);     }, [lang]);
  useEffect(() => { store.setStr("darkMode", String(darkMode)); }, [darkMode]);

  // Real-time teacher notes listener
  useEffect(() => {
    if (!db || !studentId) return;
    const q = query(
      collection(db, "notes", studentId, "messages"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setTeacherNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
    return unsub;
  }, [studentId]);

  const markNotesSeen = () => {
    const now = new Date().toISOString();
    store.setStr("notesLastSeen", now);
    setNotesLastSeen(now);
  };

  const unreadCount = teacherNotes.filter((n) =>
    n.createdAt?.toDate && n.createdAt.toDate().toISOString() > notesLastSeen
  ).length;

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

  const NAV_ITEMS = [
    { id: "home",         iconFile: "home",          label: t.nav.home         },
    { id: "scores",       iconFile: "scores",        label: t.nav.scores       },
    { id: "tools",        iconFile: "tools",         label: t.nav.tools        },
    { id: "goals",        iconFile: "goals",         label: t.nav.goals        },
    { id: "history",      iconFile: "journal",       label: t.nav.history      },
    { id: "classSession", iconFile: "class-session", label: t.nav.classSession },
    { id: "teacher",      iconFile: "teacher",       label: t.nav.teacher      },
  ];

  const navigate = (id) => { setView(id); setNavHidden(false); setDrawerOpen(false); };

  return (
    <LangCtx.Provider value={{ lang, t, setLang, darkMode }}>
      <div data-theme={darkMode ? "dark" : "light"} style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--c-bg)", fontFamily: "'Lora', Georgia, serif", color: "var(--c-text)" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Lora:wght@400;500;600&family=Geist+Mono:wght@300;400;500&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}
          :root,[data-theme="light"]{
            --c-bg:#f5f2eb;--c-card:#ffffff;--c-card-alt:#f5f2eb;--c-card-warm:#f0ede4;--c-card-green:#e8f0e0;
            --c-border:#ddd8cc;--c-border-green:#c8d5c0;
            --c-text:#0f1d15;--c-heading:#1a2e22;--c-heading2:#2d4a35;--c-muted:#6b8f6b;
          }
          [data-theme="dark"]{
            --c-bg:#0f1d15;--c-card:#1a2e22;--c-card-alt:#1a2e22;--c-card-warm:#2d4a35;--c-card-green:#2d4a35;
            --c-border:#2d4a35;--c-border-green:#3d5e45;
            --c-text:#e8e4d8;--c-heading:#e8e4d8;--c-heading2:#8fbc8f;--c-muted:#8fbc8f;
          }
          ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:var(--c-card)}::-webkit-scrollbar-thumb{background:#4a7c59;border-radius:3px}
          textarea,input,select,button{font-family:'Lora',Georgia,serif}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
          .drawer-item{display:flex;align-items:center;gap:14px;width:100%;padding:13px 20px;background:transparent;border:none;border-left:3px solid transparent;color:#8fbc8f;cursor:pointer;font-size:15px;font-family:'Lora',Georgia,serif;font-weight:400;text-align:left;transition:background 0.15s,border-color 0.15s,color 0.15s}
          .drawer-item:hover{background:rgba(74,124,89,0.12);color:#c8d5c0}
          .drawer-item.active{background:rgba(74,124,89,0.2);border-left-color:#4a7c59;color:#e8e4d8;font-weight:700}
        `}</style>

        {/* ── Drawer overlay ── */}
        <div onClick={() => setDrawerOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 300, opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 0.25s",
        }} />

        {/* ── Side Drawer ── */}
        <div style={{
          position: "fixed", top: 0, left: 0, height: "100%", width: 280,
          background: "#1a2e22",
          zIndex: 400,
          display: "flex", flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: drawerOpen ? "4px 0 32px rgba(0,0,0,0.45)" : "none",
          overflowY: "auto",
        }}>
          {/* Drawer brand header */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <img
                src={`${process.env.PUBLIC_URL}/atrile-logo-dark.svg`}
                alt="Atrile"
                style={{ height: 40, objectFit: "contain", maxWidth: 160 }}
              />
              <button onClick={() => setDrawerOpen(false)}
                style={{ background: "none", border: "none", color: "#6b8f6b", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4, flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ color: "#4a7c59", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700 }}>
              {lang === "es" ? "Práctica Inteligente" : "Smart Practice"}
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, paddingTop: 8 }}>
            {NAV_ITEMS.map(({ id, iconFile, label }) => {
              const isActive = view === id;
              return (
                <button key={id} onClick={() => navigate(id)}
                  className={`drawer-item${isActive ? " active" : ""}`}>
                  <img
                    src={icon(iconFile, true)}
                    alt=""
                    style={{ width: 22, height: 22, flexShrink: 0, opacity: isActive ? 1 : 0.55, transition: "opacity 0.15s" }}
                  />
                  <span>{label}</span>
                  {id === "home" && unreadCount > 0 && (
                    <span style={{ marginLeft: "auto", background: "#c0504d", color: "#fff", borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User / Auth */}
          {firebaseConfigured && (
            <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid #4a7c59" }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#e8e4d8", fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName}</div>
                    <div style={{ color: "#4a7c59", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
                  </div>
                  <button onClick={() => signOut(auth)} style={{ background: "none", border: "1px solid #3d5e45", borderRadius: 8, color: "#6b8f6b", cursor: "pointer", fontSize: 11, padding: "4px 8px" }}>
                    {lang === "es" ? "Salir" : "Sign out"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => signInWithPopup(auth, provider).catch(() => {})}
                  style={{ width: "100%", padding: "10px 14px", background: "#2d4a35", border: "1px solid #4a7c59", borderRadius: 10, color: "#e8e4d8", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <img src={icon("login", true)} alt="" style={{ width: 20, height: 20 }} />
                  {lang === "es" ? "Iniciar sesión con Google" : "Sign in with Google"}
                </button>
              )}
            </div>
          )}

          {/* Dark / Light mode toggle */}
          <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <button onClick={() => setDarkMode(d => !d)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#8fbc8f", cursor: "pointer", fontFamily: "'Lora',Georgia,serif", transition: "border-color 0.2s" }}>
              <img src={icon(darkMode ? "theme-light" : "theme-dark", true)} alt="" style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{darkMode ? (lang === "es" ? "Modo claro" : "Light mode") : (lang === "es" ? "Modo oscuro" : "Dark mode")}</span>
              <div style={{ marginLeft: "auto", width: 34, height: 20, borderRadius: 10, background: darkMode ? "#4a7c59" : "#3d5e45", position: "relative", transition: "background 0.25s", flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#e8e4d8", position: "absolute", top: 3, left: darkMode ? 17 : 3, transition: "left 0.25s" }} />
              </div>
            </button>
          </div>

          {/* Language selector */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ color: "#3d5e45", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Idioma / Language</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{code:"es",label:"ES"},{code:"en",label:"EN"}].map(opt => (
                <button key={opt.code} onClick={() => setLang(opt.code)}
                  style={{ flex: 1, padding: "9px 8px", background: lang === opt.code ? "#4a7c59" : "rgba(255,255,255,0.05)", border: `1px solid ${lang === opt.code ? "#4a7c59" : "rgba(255,255,255,0.1)"}`, borderRadius: 9, color: "#e8e4d8", cursor: "pointer", fontSize: 14, fontWeight: lang === opt.code ? 700 : 400, letterSpacing: 1, textAlign: "center" }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legal links */}
          <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 12 }}>
            <a href={`${process.env.PUBLIC_URL}/privacy.html`} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: "#3d5e45", textDecoration: "none", flex: 1, textAlign: "center" }}>
              {lang === "es" ? "Privacidad" : "Privacy"}
            </a>
            <span style={{ color: "#2d4a35", fontSize: 11 }}>·</span>
            <a href={`${process.env.PUBLIC_URL}/terms.html`} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: "#3d5e45", textDecoration: "none", flex: 1, textAlign: "center" }}>
              {lang === "es" ? "Términos" : "Terms"}
            </a>
          </div>

          {/* App version */}
          <div style={{ padding: "4px 20px 20px", color: "#2d4a35", fontSize: 10, letterSpacing: 1, textAlign: "center" }}>
            Atrile · v1.0
          </div>
        </div>

        {/* ── App Header (clean — just hamburger + logo) ── */}
        <div style={{
          background: "#1a2e22", padding: "12px 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          overflow: "hidden", maxHeight: navHidden ? 0 : 64,
          transition: "max-height 0.3s ease", flexShrink: 0,
        }}>
          {/* Hamburger */}
          <button onClick={() => setDrawerOpen(true)}
            style={{ background: "none", border: "none", color: "#e8e4d8", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px 4px 0", display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            <span style={{ display: "block", width: 22, height: 2, background: "#e8e4d8", borderRadius: 2 }} />
            <span style={{ display: "block", width: 16, height: 2, background: "#8fbc8f", borderRadius: 2 }} />
            <span style={{ display: "block", width: 22, height: 2, background: "#e8e4d8", borderRadius: 2 }} />
          </button>

          {/* Brand center */}
          <img
            src={`${process.env.PUBLIC_URL}/atrile-logo-dark.svg`}
            alt="Atrile"
            style={{ height: 36, objectFit: "contain", maxWidth: 160 }}
          />

          {/* Right: unread badge or current view label */}
          <div style={{ minWidth: 40, display: "flex", justifyContent: "flex-end" }}>
            {unreadCount > 0 && (
              <button onClick={() => navigate("home")}
                style={{ background: "#c0504d", border: "none", borderRadius: 12, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                <img src={icon("message", true)} alt="" style={{ width: 13, height: 13 }} />
                {unreadCount}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={(view === "scores" || view === "session") ? { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } : { maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>
          {view === "home" && (
            <HomeView
              goals={goals} sessions={sessions}
              onStart={startNewSession} onContinue={() => setView("session")}
              activeSession={activeSession}
              teacherNotes={teacherNotes} studentId={studentId}
              onSeenNotes={markNotesSeen} unreadCount={unreadCount}
            />
          )}
          {view === "session" && activeSession && (
            <SessionView
              session={activeSession}
              onUpdate={(s) => { setActiveSession(s); saveSession(s); }}
              onFinish={() => { saveSession(activeSession); setView("home"); }}
              lang={lang}
              onNavChange={setNavHidden}
              onOpenDrawer={() => setDrawerOpen(true)}
            />
          )}
          {view === "tools" && (
            <div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", color: "var(--c-heading2)", marginBottom: 24, fontSize: 26 }}>{t.toolsTitle}</h2>
              <div style={{ display: "grid", gap: 20 }}>
                <Metronome />
                <Tuner />
                <ScaleInfo />
              </div>
            </div>
          )}
          {view === "goals"   && <GoalsView goals={goals} setGoals={setGoals} sessions={sessions} />}
          {view === "history" && <HistoryView sessions={sessions} />}
          {view === "scores"  && <Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#6b8f6b",fontSize:14}}>Cargando...</div>}><ScoreViewer lang={lang} onNavChange={setNavHidden} /></Suspense>}
          {view === "classSession" && <ClassSessionView lang={lang} />}
          {view === "teacher" && <Suspense fallback={null}><TeacherPortal embedded user={user} /></Suspense>}
        </div>
      </div>
    </LangCtx.Provider>
  );
}

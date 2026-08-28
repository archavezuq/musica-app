import { useState, useEffect, useRef } from "react";
import { db, firebaseConfigured } from "./firebase";
import {
  collection, addDoc, deleteDoc, doc, setDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";

const PUB = process.env.PUBLIC_URL || "";
const icon = (name) => `${PUB}/icons/dark/${name}.svg`;

// ── Helpers ────────────────────────────────────────────────────────────────────
const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function getTeacherId() {
  let id = localStorage.getItem("teacherId");
  if (!id) {
    id = Array.from({ length: 6 }, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join("");
    localStorage.setItem("teacherId", id);
  }
  return id;
}

function fmtTs(ts) {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtLocal(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function loadStudents()  { try { return JSON.parse(localStorage.getItem("teacherStudents") || "[]"); } catch { return []; } }
function saveStudents(s) { try { localStorage.setItem("teacherStudents", JSON.stringify(s)); } catch {} }
function loadPrivate(code)  { try { return JSON.parse(localStorage.getItem(`tpn-${code}`) || "[]"); } catch { return []; } }
function savePrivate(code, notes) { try { localStorage.setItem(`tpn-${code}`, JSON.stringify(notes)); } catch {} }

const S = {
  background: "#1a2e22", borderRadius: 12, padding: "10px 14px",
  border: "1px solid #2d4a35", color: "#e8e4d8",
  fontSize: 14, outline: "none", width: "100%",
  fontFamily: "'Lora', Georgia, serif", resize: "vertical",
};
const btn = (accent = false, danger = false) => ({
  padding: "9px 16px", border: "none", borderRadius: 9, cursor: "pointer",
  fontWeight: 700, fontSize: 13, fontFamily: "'Lora', Georgia, serif",
  background: danger ? "#c0504d" : accent ? "#4a7c59" : "#2d4a35",
  color: "#e8e4d8",
});

// ── Student Panel ──────────────────────────────────────────────────────────────
function StudentPanel({ student, teacherName, photoURL, onBack }) {
  const [noteText,     setNoteText]     = useState("");
  const [planText,     setPlanText]     = useState("");
  const [planSaved,    setPlanSaved]    = useState(false);
  const [sending,      setSending]      = useState(false);
  const [savingPlan,   setSavingPlan]   = useState(false);
  const [publicNotes,  setPublicNotes]  = useState([]);
  const [privateNotes, setPrivateNotes] = useState(() => loadPrivate(student.code));
  const [error,        setError]        = useState("");
  const unsubRef = useRef(null);

  // Load public notes from Firestore
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "notes", student.code, "messages"), orderBy("createdAt", "desc"));
    unsubRef.current = onSnapshot(q,
      snap => setPublicNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => setError("Error al cargar notas")
    );
    return () => unsubRef.current?.();
  }, [student.code]);

  // Load today's class plan from Firestore
  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, "classPlan", student.code)).then(d => {
      if (d.exists()) setPlanText(d.data().plan || "");
    }).catch(() => {});
  }, [student.code]);

  const sendPublic = async () => {
    if (!db || !teacherName.trim() || !noteText.trim()) return;
    setSending(true); setError("");
    try {
      await addDoc(collection(db, "notes", student.code, "messages"), {
        text: noteText.trim(), teacher: teacherName.trim(), createdAt: serverTimestamp(),
      });
      setNoteText("");
    } catch { setError("Error al enviar. Revisa la conexión."); }
    setSending(false);
  };

  const savePrivateNote = () => {
    if (!noteText.trim()) return;
    const note = { id: Date.now(), text: noteText.trim(), createdAt: new Date().toISOString() };
    const updated = [note, ...privateNotes];
    setPrivateNotes(updated);
    savePrivate(student.code, updated);
    setNoteText("");
  };

  const deletePublic = async (noteId) => {
    if (!db) return;
    try { await deleteDoc(doc(db, "notes", student.code, "messages", noteId)); }
    catch { setError("No se pudo eliminar."); }
  };

  const deletePrivate = (id) => {
    const updated = privateNotes.filter(n => n.id !== id);
    setPrivateNotes(updated);
    savePrivate(student.code, updated);
  };

  const savePlan = async () => {
    if (!db) return;
    setSavingPlan(true);
    try {
      await setDoc(doc(db, "classPlan", student.code), {
        plan: planText, teacherName: teacherName.trim(), updatedAt: serverTimestamp(),
      });
      // Guardar el plan también como entrada privada en el historial
      const planEntry = {
        id: Date.now(), text: planText.trim(), kind: "plan",
        createdAt: new Date().toISOString(),
      };
      const updated = [planEntry, ...privateNotes];
      setPrivateNotes(updated);
      savePrivate(student.code, updated);
      setPlanText("");
      setPlanSaved(true);
      setTimeout(() => setPlanSaved(false), 2000);
    } catch { setError("Error al guardar el plan."); }
    setSavingPlan(false);
  };

  // Agrupar todas las notas por fecha de sesión
  const getDateKey = (n) => {
    const d = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt || 0);
    return d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const allNotes = [
    ...publicNotes.map(n => ({ ...n, kind: "public" })),
    ...privateNotes.map(n => ({ ...n })),
  ].sort((a, b) => {
    const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return tb - ta;
  });

  const grouped = allNotes.reduce((acc, n) => {
    const key = getDateKey(n);
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div>
      {/* Back + student header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#8fbc8f", cursor: "pointer", fontSize: 22, padding: 0, lineHeight: 1 }}>←</button>
        {photoURL ? (
          <img src={photoURL} alt="" style={{ width: 44, height: 44, borderRadius: "50%", border: "2px solid #4a7c59", flexShrink: 0, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#2d4a35", border: "2px solid #4a7c59", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <img src={icon("teacher")} alt="" style={{ width: 24, height: 24 }} />
          </div>
        )}
        <div>
          <div style={{ color: "#e8e4d8", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>{student.name}</div>
          <div style={{ color: "#4a7c59", fontSize: 13, fontFamily: "monospace", letterSpacing: 3 }}>{student.code}</div>
        </div>
      </div>

      {!firebaseConfigured && (
        <div style={{ background: "rgba(192,80,77,0.15)", border: "1px solid #c0504d55", borderRadius: 10, padding: 12, marginBottom: 16, color: "#fca5a5", fontSize: 13 }}>
          Firebase no configurado — solo notas privadas disponibles.
        </div>
      )}

      {/* Nueva nota */}
      <div style={{ background: "#2d4a35", borderRadius: 14, padding: 16, marginBottom: 16 }}>
        <div style={{ color: "#8fbc8f", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Nueva nota</div>
        <textarea rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
          placeholder="Ej: Trabaja más lento la escala de Re mayor, presta atención al fa#..."
          style={S} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={sendPublic} disabled={sending || !noteText.trim() || !db}
            style={{ ...btn(true), flex: 1, opacity: (!noteText.trim() || !db) ? 0.45 : 1 }}>
            {sending ? "Enviando…" : <><img src={icon("sent-note")} alt="" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 6 }} />Enviar al estudiante</>}
          </button>
          <button onClick={savePrivateNote} disabled={!noteText.trim()}
            style={{ ...btn(false), flex: 1, opacity: !noteText.trim() ? 0.45 : 1 }}>
            <img src={icon("private-note")} alt="" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 6 }} />Solo yo
          </button>
        </div>
      </div>

      {/* Plan de clase */}
      <div style={{ background: "#2d4a35", borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ color: "#8fbc8f", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <img src={icon("lesson-plan")} alt="" style={{ width: 14, height: 14 }} />
          Plan de clase de hoy
        </div>
        <div style={{ color: "#6b8f6b", fontSize: 11, marginBottom: 10 }}>El alumno lo ve en "Sesión de Clase" · Se guarda en el historial al guardar</div>
        <textarea rows={3} value={planText} onChange={e => setPlanText(e.target.value)}
          placeholder={"1. Escalas mayor (10 min)\n2. Etude Nº3 — mano derecha (15 min)\n3. Revisión de pieza completa (20 min)"}
          style={S} />
        <button onClick={savePlan} disabled={savingPlan || !db || !planText.trim()}
          style={{ ...btn(planSaved), marginTop: 10, width: "100%", opacity: (!db || !planText.trim()) ? 0.45 : 1 }}>
          {planSaved ? "✓ Guardado y archivado" : savingPlan ? "Guardando…" : <><img src={icon("save")} alt="" style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 6 }} />Guardar plan</>}
        </button>
      </div>

      {error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

      {/* Historial agrupado por sesión */}
      {allNotes.length === 0 ? (
        <div style={{ textAlign: "center", color: "#6b8f6b", fontSize: 14, padding: "20px 0" }}>
          Sin notas todavía
        </div>
      ) : (
        <div>
          <div style={{ color: "#6b8f6b", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16 }}>Historial de clases</div>
          {Object.entries(grouped).map(([date, notes]) => (
            <div key={date} style={{ marginBottom: 20 }}>
              {/* Encabezado de sesión */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: "#2d4a35" }} />
                <div style={{ color: "#4a7c59", fontSize: 11, fontWeight: 700, textTransform: "capitalize", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                  <img src={icon("journal")} alt="" style={{ width: 12, height: 12 }} />
                  {date}
                </div>
                <div style={{ flex: 1, height: 1, background: "#2d4a35" }} />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {notes.map(n => (
                  <div key={`${n.kind}-${n.id}`} style={{
                    background: n.kind === "plan" ? "#1e3828" : n.kind === "private" ? "#1a2e22" : "#2d4a35",
                    borderRadius: 12, padding: "12px 14px",
                    border: n.kind === "plan" ? "1px solid #4a7c59" : n.kind === "private" ? "1px solid #3d5e45" : "none"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        {n.kind === "plan" && <span style={{ color: "#4a7c59", fontSize: 10, display: "flex", alignItems: "center", gap: 4, marginBottom: 4, fontWeight: 700 }}><img src={icon("lesson-plan")} alt="" style={{ width: 11, height: 11 }} /> Plan de clase</span>}
                        {n.kind === "private" && <span style={{ color: "#6b8f6b", fontSize: 10, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><img src={icon("private-note")} alt="" style={{ width: 11, height: 11 }} /> Nota privada</span>}
                        <div style={{ fontSize: 13, color: "#e8e4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{n.text}</div>
                        {n.kind === "public" && (
                          <div style={{ color: "#6b8f6b", fontSize: 11, marginTop: 6 }}>{n.teacher} · {fmtTs(n.createdAt)}</div>
                        )}
                      </div>
                      <button
                        onClick={() => n.kind === "public" ? deletePublic(n.id) : deletePrivate(n.id)}
                        style={{ background: "none", border: "none", color: "#c0504d", cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, padding: "0 2px" }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main TeacherPortal ─────────────────────────────────────────────────────────
export default function TeacherPortal({ embedded = false, user = null }) {
  const [teacherName,  setTeacherName]  = useState(() => localStorage.getItem("teacherName") || "");
  const [students,     setStudents]     = useState(loadStudents);
  const [selected,     setSelected]     = useState(null);
  const [addMode,      setAddMode]      = useState(false);
  const [newCode,      setNewCode]      = useState("");
  const [newName,      setNewName]      = useState("");
  const [addError,     setAddError]     = useState("");
  const [synced,       setSynced]       = useState(false);
  const [photoCache,   setPhotoCache]   = useState({});

  useEffect(() => {
    if (teacherName) localStorage.setItem("teacherName", teacherName);
  }, [teacherName]);

  // Paso 1: cuando llega el usuario, cargar desde Firestore (o subir localStorage si está vacío)
  useEffect(() => {
    if (!db || !user) return;
    getDoc(doc(db, "teachers", user.uid)).then(d => {
      if (d.exists() && d.data().students?.length > 0) {
        const cloudStudents = d.data().students;
        setStudents(cloudStudents);
        saveStudents(cloudStudents);
      } else {
        const local = loadStudents();
        setDoc(doc(db, "teachers", user.uid), {
          students: local,
          teacherName: localStorage.getItem("teacherName") || "",
          updatedAt: new Date().toISOString(),
        }, { merge: true }).catch(() => {});
      }
      setSynced(true);
    }).catch(() => { setSynced(true); });
  }, [user]);

  // Fetch student profile photos from Firestore (users collection, by studentCode)
  useEffect(() => {
    if (!db || students.length === 0) return;
    students.forEach(async (s) => {
      if (photoCache[s.code]) return;
      try {
        const snap = await getDocs(query(collection(db, "users"), where("studentCode", "==", s.code)));
        if (!snap.empty) {
          const photoURL = snap.docs[0].data().photoURL;
          if (photoURL) setPhotoCache(prev => ({ ...prev, [s.code]: photoURL }));
        }
      } catch {}
    });
  }, [students]); // eslint-disable-line

  // Paso 2: solo después de la carga inicial, sincronizar cambios a Firestore
  useEffect(() => {
    if (!db || !user || !synced) return;
    setDoc(doc(db, "teachers", user.uid), {
      students,
      teacherName: teacherName || "",
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
  }, [students]); // safe: user/synced captured via ref below

  const persistStudents = (updated) => {
    setStudents(updated);
    saveStudents(updated);
  };

  const addStudent = () => {
    const code = newCode.trim().toUpperCase();
    if (code.length !== 6) { setAddError("El código debe tener exactamente 6 caracteres."); return; }
    if (!newName.trim())   { setAddError("Ingresa un nombre para este estudiante."); return; }
    if (students.find(s => s.code === code)) { setAddError("Ya tienes un estudiante con ese código."); return; }
    const updated = [{ code, name: newName.trim(), addedAt: new Date().toISOString() }, ...students];
    persistStudents(updated);
    setNewCode(""); setNewName(""); setAddMode(false); setAddError("");
  };

  const removeStudent = (code) => {
    const updated = students.filter(s => s.code !== code);
    persistStudents(updated);
    if (selected?.code === code) setSelected(null);
  };

  const inner = (
    <div style={{ maxWidth: embedded ? "none" : 560, margin: "0 auto" }}>

      {/* Header */}
      {!embedded && (
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src={icon("teacher")} alt="" style={{ width: 48, height: 48, marginBottom: 6 }} />
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900 }}>Portal del Maestro</div>
          <div style={{ color: "#6b8f6b", fontSize: 11, marginTop: 4, letterSpacing: 2, textTransform: "uppercase" }}>Atrile · Práctica Inteligente</div>
        </div>
      )}

      {/* Teacher name */}
      {!selected && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#8fbc8f", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, display: "block", marginBottom: 6 }}>Tu nombre</label>
          <input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Ej: Profe Rodolfo"
            style={{ ...S, resize: "none", minHeight: "auto", padding: "10px 14px", fontSize: 15 }} />
        </div>
      )}

      {/* Student detail */}
      {selected ? (
        <StudentPanel student={selected} teacherName={teacherName} photoURL={photoCache[selected.code]} onBack={() => setSelected(null)} />
      ) : (
        <>
          {/* Student list header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ color: "#8fbc8f", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>
              Mis estudiantes ({students.length})
            </div>
            <button onClick={() => { setAddMode(m => !m); setAddError(""); }}
              style={{ ...btn(addMode), padding: "6px 14px", fontSize: 12 }}>
              {addMode ? "Cancelar" : "+ Agregar"}
            </button>
          </div>

          {/* Add student form */}
          {addMode && (
            <div style={{ background: "#2d4a35", borderRadius: 14, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="Código (6 car.)" maxLength={6}
                  style={{ ...S, resize: "none", minHeight: "auto", padding: "9px 12px", fontFamily: "monospace", fontSize: 16, letterSpacing: 4, textAlign: "center", width: "auto", flex: "0 0 130px" }} />
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre del estudiante"
                  onKeyDown={e => e.key === "Enter" && addStudent()}
                  style={{ ...S, resize: "none", minHeight: "auto", padding: "9px 12px", flex: 1 }} />
              </div>
              {addError && <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 8 }}>{addError}</div>}
              <button onClick={addStudent} style={{ ...btn(true), width: "100%" }}>Agregar estudiante</button>
            </div>
          )}

          {/* Student list */}
          {students.length === 0 ? (
            <div style={{ textAlign: "center", color: "#6b8f6b", fontSize: 14, padding: "32px 0" }}>
              Aún no has agregado estudiantes.<br />
              <span style={{ fontSize: 12, marginTop: 8, display: "block" }}>Pídele a tu estudiante su código de 6 caracteres.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {students.map(s => (
                <div key={s.code} style={{ display: "flex", alignItems: "center", gap: 12, background: "#2d4a35", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}
                  onClick={() => setSelected(s)}>
                  {photoCache[s.code] ? (
                    <img src={photoCache[s.code]} alt="" style={{ width: 38, height: 38, borderRadius: "50%", border: "2px solid #4a7c59", flexShrink: 0, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#4a7c59", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <img src={icon("scores")} alt="" style={{ width: 20, height: 20 }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#e8e4d8", fontWeight: 700, fontSize: 14 }}>{s.name}</div>
                    <div style={{ color: "#4a7c59", fontSize: 12, fontFamily: "monospace", letterSpacing: 2 }}>{s.code}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar a ${s.name}?`)) removeStudent(s.code); }}
                    style={{ background: "none", border: "none", color: "#6b8f6b", cursor: "pointer", fontSize: 18, padding: "0 4px", lineHeight: 1 }}>×</button>
                  <span style={{ color: "#6b8f6b", fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  return embedded ? inner : (
    <div style={{ minHeight: "100dvh", background: "#1a2e22", color: "#e8e4d8", fontFamily: "'Lora', Georgia, serif", padding: "24px 16px" }}>
      {inner}
    </div>
  );
}

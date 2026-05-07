import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// ScoreViewer — Partitura con anotaciones a lápiz / pen
//
// Funcionalidades:
//  • Abrir PDFs desde el dispositivo (File API)
//  • Abrir PDFs desde Google Drive (picker API)
//  • Canvas superpuesto para anotar con lápiz / stylus / ratón
//  • Herramientas: lápiz, resaltador, borrador, color, grosor
//  • Guardar anotaciones en localStorage por documento
//  • Deshacer / rehacer
//  • Zoom y navegación de páginas
// ─────────────────────────────────────────────────────────────────────────────

const GDRIVE_CLIENT_ID  = process.env.REACT_APP_GDRIVE_CLIENT_ID || "";
const GDRIVE_API_KEY    = process.env.REACT_APP_GDRIVE_API_KEY   || "";
const GDRIVE_SCOPE      = "https://www.googleapis.com/auth/drive.readonly";
const GDRIVE_DISCOVERY  = "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";

const COLORS = [
  { label: "Negro",    value: "#1a1a1a" },
  { label: "Rojo",     value: "#c0504d" },
  { label: "Azul",     value: "#2e74b5" },
  { label: "Verde",    value: "#4a7c59" },
  { label: "Naranja",  value: "#e07b39" },
  { label: "Resaltar", value: "rgba(255,220,0,0.45)", highlight: true },
];

const TOOLS = [
  { id: "pen",       icon: "✏️", label: "Lápiz / Pen"  },
  { id: "highlight", icon: "🖌️", label: "Resaltador"   },
  { id: "eraser",    icon: "⬜", label: "Borrador"     },
  { id: "select",    icon: "✋", label: "Mover / Pan"  },
];

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
  strokes.forEach((s) => drawStroke(ctx, s));
}

export default function ScoreViewer({ lang = "es" }) {
  const strings = {
    es: {
      title:        "🎼 Partituras",
      openLocal:    "📁 Abrir desde dispositivo",
      openDrive:    "☁️ Abrir desde Google Drive",
      noScore:      "Abre una partitura para comenzar a anotar",
      page:         "Página",
      of:           "de",
      zoom:         "Zoom",
      width:        "Grosor",
      undo:         "Deshacer",
      redo:         "Rehacer",
      clearPage:    "Limpiar página",
      loadingPdf:   "Cargando PDF...",
      noGapi:       "Configura REACT_APP_GDRIVE_CLIENT_ID en .env para usar Google Drive",
      driveConnect: "Conectar Google Drive",
      fileName:     "Archivo:",
      annotSaved:   "Anotaciones guardadas automáticamente",
    },
    en: {
      title:        "🎼 Sheet Music",
      openLocal:    "📁 Open from device",
      openDrive:    "☁️ Open from Google Drive",
      noScore:      "Open a score to start annotating",
      page:         "Page",
      of:           "of",
      zoom:         "Zoom",
      width:        "Size",
      undo:         "Undo",
      redo:         "Redo",
      clearPage:    "Clear page",
      loadingPdf:   "Loading PDF...",
      noGapi:       "Set REACT_APP_GDRIVE_CLIENT_ID in .env to use Google Drive",
      driveConnect: "Connect Google Drive",
      fileName:     "File:",
      annotSaved:   "Annotations saved automatically",
    },
  };
  const s = strings[lang] || strings.es;

  const [pdfDoc,        setPdfDoc]        = useState(null);
  const [pageNum,       setPageNum]       = useState(1);
  const [totalPages,    setTotalPages]    = useState(0);
  const [zoom,          setZoom]          = useState(1.2);
  const [tool,          setTool]          = useState("pen");
  const [color,         setColor]         = useState("#1a1a1a");
  const [lineWidth,     setLineWidth]     = useState(3);
  const [strokes,       setStrokes]       = useState({});
  const [undoStack,     setUndoStack]     = useState([]);
  const [redoStack,     setRedoStack]     = useState([]);
  const [drawing,       setDrawing]       = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [docId,         setDocId]         = useState(null);
  const [fileName,      setFileName]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [gapiReady,     setGapiReady]     = useState(false);
  const [gapiSignedIn,  setGapiSignedIn]  = useState(false);
  const [saveMsg,       setSaveMsg]       = useState("");

  const pdfCanvasRef   = useRef(null);
  const annotCanvasRef = useRef(null);
  const fileInputRef   = useRef(null);
  const containerRef   = useRef(null);
  const renderingRef   = useRef(false);

  const strokeKey = `${docId}-${pageNum}`;

  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!GDRIVE_CLIENT_ID) return;
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("client:auth2:picker", () => {
        window.gapi.client
          .init({ apiKey: GDRIVE_API_KEY, clientId: GDRIVE_CLIENT_ID, discoveryDocs: [GDRIVE_DISCOVERY], scope: GDRIVE_SCOPE })
          .then(() => {
            setGapiReady(true);
            setGapiSignedIn(window.gapi.auth2.getAuthInstance().isSignedIn.get());
            window.gapi.auth2.getAuthInstance().isSignedIn.listen(setGapiSignedIn);
          });
      });
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!docId) return;
    try {
      const saved = JSON.parse(localStorage.getItem(`annot-${docId}`) || "{}");
      setStrokes(saved);
    } catch {}
  }, [docId]);

  useEffect(() => {
    if (!docId || Object.keys(strokes).length === 0) return;
    try {
      localStorage.setItem(`annot-${docId}`, JSON.stringify(strokes));
      setSaveMsg(s.annotSaved);
      const t = setTimeout(() => setSaveMsg(""), 2000);
      return () => clearTimeout(t);
    } catch {}
  }, [strokes, docId, s.annotSaved]);

  useEffect(() => {
    if (!pdfDoc || !pdfCanvasRef.current || renderingRef.current) return;
    renderingRef.current = true;
    pdfDoc.getPage(pageNum).then((page) => {
      const viewport = page.getViewport({ scale: zoom });
      const canvas   = pdfCanvasRef.current;
      const annotC   = annotCanvasRef.current;
      if (!canvas || !annotC) { renderingRef.current = false; return; }
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      annotC.width  = viewport.width;
      annotC.height = viewport.height;
      const ctx = canvas.getContext("2d");
      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        renderingRef.current = false;
        redrawAll(annotC, strokes[strokeKey] || []);
      });
    });
  }, [pdfDoc, pageNum, zoom, strokes, strokeKey]);

  const openLocalFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setFileName(file.name);
    const id = `local-${file.name}-${file.size}`;
    setDocId(id);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const typedArray = new Uint8Array(ev.target.result);
      window.pdfjsLib.getDocument(typedArray).promise.then((doc) => {
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setPageNum(1);
        setLoading(false);
      });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const openDrivePicker = () => {
    if (!gapiReady) return;
    if (!gapiSignedIn) { window.gapi.auth2.getAuthInstance().signIn(); return; }
    const token  = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
    const picker = new window.google.picker.PickerBuilder()
      .addView(new window.google.picker.DocsView().setMimeTypes("application/pdf"))
      .setOAuthToken(token)
      .setDeveloperKey(GDRIVE_API_KEY)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const driveFile = data.docs[0];
          setFileName(driveFile.name);
          setLoading(true);
          const id = `drive-${driveFile.id}`;
          setDocId(id);
          fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => r.arrayBuffer())
            .then((buf) => {
              window.pdfjsLib.getDocument(new Uint8Array(buf)).promise.then((doc) => {
                setPdfDoc(doc);
                setTotalPages(doc.numPages);
                setPageNum(1);
                setLoading(false);
              });
            });
        }
      })
      .build();
    picker.setVisible(true);
  };

  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
    };
  };

  const onPointerDown = useCallback((e) => {
    if (tool === "select" || !annotCanvasRef.current) return;
    e.preventDefault();
    const pos    = getPos(e, annotCanvasRef.current);
    const stroke = {
      tool,
      color: tool === "eraser" ? "#000000" : color,
      width: tool === "eraser" ? lineWidth * 6 : tool === "highlight" ? lineWidth * 4 : lineWidth,
      points: [pos],
    };
    setCurrentStroke(stroke);
    setDrawing(true);
  }, [tool, color, lineWidth]);

  const onPointerMove = useCallback((e) => {
    if (!drawing || !currentStroke || !annotCanvasRef.current) return;
    e.preventDefault();
    const pos     = getPos(e, annotCanvasRef.current);
    const updated = { ...currentStroke, points: [...currentStroke.points, pos] };
    setCurrentStroke(updated);
    redrawAll(annotCanvasRef.current, strokes[strokeKey] || []);
    drawStroke(annotCanvasRef.current.getContext("2d"), updated);
  }, [drawing, currentStroke, strokes, strokeKey]);

  const onPointerUp = useCallback(() => {
    if (!drawing || !currentStroke) return;
    setDrawing(false);
    const pageStrokes = [...(strokes[strokeKey] || []), currentStroke];
    const newStrokes  = { ...strokes, [strokeKey]: pageStrokes };
    setStrokes(newStrokes);
    setUndoStack((u) => [...u, strokes]);
    setRedoStack([]);
    setCurrentStroke(null);
  }, [drawing, currentStroke, strokes, strokeKey]);

  const undo = () => {
    if (!undoStack.length) return;
    setRedoStack((r) => [strokes, ...r]);
    const prev = undoStack[undoStack.length - 1];
    setStrokes(prev);
    setUndoStack((u) => u.slice(0, -1));
    if (annotCanvasRef.current) redrawAll(annotCanvasRef.current, prev[strokeKey] || []);
  };

  const redo = () => {
    if (!redoStack.length) return;
    setUndoStack((u) => [...u, strokes]);
    const next = redoStack[0];
    setStrokes(next);
    setRedoStack((r) => r.slice(1));
    if (annotCanvasRef.current) redrawAll(annotCanvasRef.current, next[strokeKey] || []);
  };

  const clearPage = () => {
    setUndoStack((u) => [...u, strokes]);
    const newStrokes = { ...strokes, [strokeKey]: [] };
    setStrokes(newStrokes);
    if (annotCanvasRef.current) {
      const ctx = annotCanvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, annotCanvasRef.current.width, annotCanvasRef.current.height);
    }
  };

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif" }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#1a2e22", fontSize: 26, fontWeight: 900, marginBottom: 20 }}>{s.title}</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ flex: 1, minWidth: 160, padding: "12px 16px", background: "#1a2e22", color: "#e8e4d8", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}
        >
          {s.openLocal}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={openLocalFile} />

        {GDRIVE_CLIENT_ID ? (
          <button
            onClick={openDrivePicker}
            style={{ flex: 1, minWidth: 160, padding: "12px 16px", background: gapiSignedIn ? "#4a7c59" : "#2d4a35", color: "#e8e4d8", border: "1px solid #4a7c59", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}
          >
            {gapiSignedIn ? s.openDrive : s.driveConnect}
          </button>
        ) : (
          <div style={{ flex: 1, background: "#f0ede4", borderRadius: 12, padding: "12px 16px", color: "#8fbc8f", fontSize: 13, display: "flex", alignItems: "center" }}>
            ☁️ {s.noGapi}
          </div>
        )}
      </div>

      {fileName && (
        <div style={{ color: "#6b8f6b", fontSize: 13, marginBottom: 12 }}>
          {s.fileName} <strong>{fileName}</strong>
          {saveMsg && <span style={{ color: "#4a7c59", marginLeft: 12, fontSize: 12 }}>{saveMsg}</span>}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#8fbc8f", fontSize: 16 }}>
          ⏳ {s.loadingPdf}
        </div>
      )}

      {!pdfDoc && !loading && (
        <div style={{ textAlign: "center", padding: 60, background: "#f0ede4", borderRadius: 20, color: "#aaa", fontSize: 16, border: "2px dashed #c8d5c0" }}>
          🎵 {s.noScore}
        </div>
      )}

      {pdfDoc && (
        <>
          <div style={{ background: "#1a2e22", borderRadius: 16, padding: "12px 16px", marginBottom: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {TOOLS.map((t_) => (
                <button key={t_.id} onClick={() => setTool(t_.id)} title={t_.label}
                  style={{ background: tool === t_.id ? "#4a7c59" : "transparent", color: "#e8e4d8", border: "1px solid #4a7c59", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>
                  {t_.icon}
                </button>
              ))}
            </div>
            <div style={{ width: 1, height: 28, background: "#2d4a35" }} />
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {COLORS.map((c_) => (
                <button key={c_.value}
                  onClick={() => { setColor(c_.value); if (c_.highlight) setTool("highlight"); else if (tool === "highlight") setTool("pen"); }}
                  title={c_.label}
                  style={{ width: 22, height: 22, borderRadius: "50%", border: color === c_.value ? "3px solid #fff" : "2px solid #4a7c59", cursor: "pointer", background: c_.highlight ? "#ffd700" : c_.value, padding: 0, flexShrink: 0 }}
                />
              ))}
            </div>
            <div style={{ width: 1, height: 28, background: "#2d4a35" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#8fbc8f", fontSize: 12 }}>{s.width}</span>
              <input type="range" min={1} max={12} value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)} style={{ width: 70, accentColor: "#4a7c59" }} />
              <span style={{ color: "#e8e4d8", fontSize: 13, minWidth: 18 }}>{lineWidth}</span>
            </div>
            <div style={{ width: 1, height: 28, background: "#2d4a35" }} />
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={undo} disabled={!undoStack.length} title={s.undo}
                style={{ background: "transparent", color: undoStack.length ? "#e8e4d8" : "#4a7c59", border: "1px solid #4a7c59", borderRadius: 8, padding: "5px 10px", cursor: undoStack.length ? "pointer" : "default", fontSize: 14 }}>↩</button>
              <button onClick={redo} disabled={!redoStack.length} title={s.redo}
                style={{ background: "transparent", color: redoStack.length ? "#e8e4d8" : "#4a7c59", border: "1px solid #4a7c59", borderRadius: 8, padding: "5px 10px", cursor: redoStack.length ? "pointer" : "default", fontSize: 14 }}>↪</button>
              <button onClick={clearPage} title={s.clearPage}
                style={{ background: "transparent", color: "#c0504d", border: "1px solid #c0504d", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13 }}>🗑</button>
            </div>
            <div style={{ width: 1, height: 28, background: "#2d4a35" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                style={{ background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>−</button>
              <span style={{ color: "#e8e4d8", fontSize: 13, minWidth: 42, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                style={{ background: "transparent", color: "#8fbc8f", border: "1px solid #4a7c59", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>+</button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, justifyContent: "center" }}>
            <button onClick={() => setPageNum((p) => Math.max(1, p - 1))} disabled={pageNum <= 1}
              style={{ background: pageNum > 1 ? "#4a7c59" : "#2d4a35", color: "#e8e4d8", border: "none", borderRadius: 8, padding: "8px 16px", cursor: pageNum > 1 ? "pointer" : "default", fontWeight: 700 }}>‹</button>
            <span style={{ color: "#2d4a35", fontWeight: 700 }}>{s.page} {pageNum} {s.of} {totalPages}</span>
            <button onClick={() => setPageNum((p) => Math.min(totalPages, p + 1))} disabled={pageNum >= totalPages}
              style={{ background: pageNum < totalPages ? "#4a7c59" : "#2d4a35", color: "#e8e4d8", border: "none", borderRadius: 8, padding: "8px 16px", cursor: pageNum < totalPages ? "pointer" : "default", fontWeight: 700 }}>›</button>
          </div>

          <div ref={containerRef}
            style={{ position: "relative", overflow: "auto", borderRadius: 12, border: "2px solid #c8d5c0", background: "#f5f2eb", maxHeight: "70vh", cursor: tool === "select" ? "grab" : tool === "eraser" ? "cell" : "crosshair" }}>
            <canvas ref={pdfCanvasRef} style={{ display: "block" }} />
            <canvas ref={annotCanvasRef}
              style={{ position: "absolute", top: 0, left: 0, touchAction: "none" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>

          <div style={{ marginTop: 10, color: "#8fbc8f", fontSize: 12, textAlign: "center" }}>
            💡 {lang === "es"
              ? "Usa el lápiz de tu tablet para anotar. Las notas se guardan automáticamente."
              : "Use your tablet pen to annotate. Notes are saved automatically."}
          </div>
        </>
      )}
    </div>
  );
}

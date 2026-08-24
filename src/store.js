// Safe localStorage wrapper — all ops are try/catch, quota handled automatically

const ANNOT_PREFIX = "annot-";
const MAX_ANNOTS   = 15; // keep only last 15 annotated scores

function cleanup() {
  try {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(ANNOT_PREFIX))
      .sort();
    if (keys.length > MAX_ANNOTS)
      keys.slice(0, keys.length - MAX_ANNOTS).forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });
  } catch {}
}

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      if (e?.name === "QuotaExceededError" || e?.code === 22) {
        cleanup();
        try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
      }
    }
  },

  str(key, fallback = "") {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },

  setStr(key, val) {
    try { localStorage.setItem(key, String(val)); } catch {}
  },

  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },

  cleanup,
};

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const cfg = {
  apiKey:            process.env.REACT_APP_FB_API_KEY             || "",
  authDomain:        process.env.REACT_APP_FB_AUTH_DOMAIN         || "",
  projectId:         process.env.REACT_APP_FB_PROJECT_ID          || "",
  storageBucket:     process.env.REACT_APP_FB_STORAGE_BUCKET      || "",
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID || "",
  appId:             process.env.REACT_APP_FB_APP_ID              || "",
};

export const firebaseConfigured = !!cfg.projectId;

const app = firebaseConfigured ? initializeApp(cfg) : null;
export const db       = app ? getFirestore(app) : null;
export const auth     = app ? getAuth(app)      : null;
export const provider = app ? new GoogleAuthProvider() : null;

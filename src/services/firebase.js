import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// ⚙️ Configuración Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyAGOAndrOy2JbtJjzw4yQJKtBpI0jNA2yU",
  authDomain: "trakly-99bfa.firebaseapp.com",
  projectId: "trakly-99bfa",
  storageBucket: "trakly-99bfa.firebasestorage.app",
  messagingSenderId: "100243710666",
  appId: "1:100243710666:web:2c2c810ddebca460ad4a33",
};

// =============================
// APP PRINCIPAL (SESSION ACTIVA)
// =============================
const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

console.log("🔥 Firebase inicializado", app.name);

// 🔐 Auth principal (admin / usuario logueado)
export const auth = getAuth(app);

// 🗄️ Firestore
export const db = getFirestore(app);

// ☁️ Functions
export const functions = getFunctions(app);

// =============================
// APP SECUNDARIA (CREAR USUARIOS)
// =============================
const secondaryApp = getApps().find(
  (a) => a.name === "secondary"
)
  ? getApp("secondary")
  : initializeApp(firebaseConfig, "secondary");

// 🔐 Auth secundario (NO afecta sesión principal)
export const secondaryAuth = getAuth(secondaryApp);

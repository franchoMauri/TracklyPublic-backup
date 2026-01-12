import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// ⚙️ Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAGOAndrOy2JbtJjzw4yQJKtBpI0jNA2yU",
  authDomain: "trakly-99bfa.firebaseapp.com",
  projectId: "trakly-99bfa",
  storageBucket: "trakly-99bfa.firebasestorage.app",
  messagingSenderId: "100243710666",
  appId: "1:100243710666:web:2c2c810ddebca460ad4a33",
};

// 🚀 Inicializar Firebase (UNA SOLA VEZ)
export const app = initializeApp(firebaseConfig);

console.log("🔥 Firebase inicializado", app.name);

// 🔐 Auth
export const auth = getAuth(app);

// 🗄️ Firestore
export const db = getFirestore(app);

// ☁️ Functions (NECESARIO para Jira)
export const functions = getFunctions(app);

// 🆕 Messaging (solo si el browser lo soporta)
//export const messaging = await isSupported()
//  ? getMessaging(app)
//  : null;

import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

const ref = doc(db, "adminSettings", "global");

// 🔹 Obtener settings
export async function getAdminSettings() {
  try {
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("Error obteniendo settings admin", e);
    return null;                     // nunca explotar UX
  }
}

// 🔹 Listener realtime
export function listenAdminSettings(callback) {
  return onSnapshot(
    ref,
    (snap) => {
      try {
        callback(snap.exists() ? snap.data() : null);
      } catch (e) {
        console.error("Error en callback de settings", e);
        callback(null);
      }
    },
    (error) => {
      console.error("Error en listener realtime settings", error);
      callback(null);                // evitar pantalla en blanco
    }
  );
}

// 🔹 Guardar settings
export async function saveAdminSettings(data) {
  try {
    return await setDoc(
      ref,
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Error guardando settings admin", e);
    throw e;
  }
}

// 🔹 Asegurar documento base
export async function ensureSettingsDocument() {
  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        featureJiraCombo: true,
        featureReports: false,   // preparado para futuro

        // 🔔 NUEVO
        reminderEnabled: true,
        reminderDays: 3,
        inactivityHours: 3, // 👈 3 horas por default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error("Error asegurando documento settings", e);
  }
}

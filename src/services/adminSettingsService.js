import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/* =============================
   CONSTANTES DE MODO
============================= */
export const TRACKLY_MODES = {
  HOURS: "hours",
  PROJECTS: "projects",
  FULL: "full",
};

const ref = doc(db, "adminSettings", "global");

/* =============================
   INFERIR MODO DESDE FLAGS VIEJOS
   (compatibilidad)
============================= */
function inferModeFromLegacyFlags(data) {
  if (!data) return TRACKLY_MODES.FULL;

  const manageHours = !!data.featureManageHours;
  const hasProjects =
    !!data.featureProjects ||
    !!data.featureTasks ||
    !!data.featureWorkItems;

  if (manageHours && !hasProjects) {
    return TRACKLY_MODES.HOURS;
  }

  if (!manageHours && hasProjects) {
    return TRACKLY_MODES.PROJECTS;
  }

  return TRACKLY_MODES.FULL;
}

/* =============================
   RESOLVER FEATURES DESDE MODO
============================= */
export function resolveFeaturesFromMode(mode) {
  switch (mode) {
    case TRACKLY_MODES.HOURS:
      return {
        featureManageHours: true,
        featureProjects: false,
        featureTasks: false,
        featureWorkItems: false,
        featureReports: true,
      };

    case TRACKLY_MODES.PROJECTS:
      return {
        featureManageHours: false,
        featureProjects: true,
        featureTasks: true,
        featureWorkItems: true,
        featureReports: false,
      };

    case TRACKLY_MODES.FULL:
    default:
      return {
        featureManageHours: true,
        featureProjects: true,
        featureTasks: true,
        featureWorkItems: true,
        featureReports: true,
      };
  }
}

/* =============================
   🔹 Obtener settings
============================= */
export async function getAdminSettings() {
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();

    // 🔑 Resolver modo (nuevo o inferido)
    const mode =
      data.mode || inferModeFromLegacyFlags(data);

    return {
      ...data,
      mode,
      ...resolveFeaturesFromMode(mode), // 🔑 features derivadas
    };
  } catch (e) {
    console.error("Error obteniendo settings admin", e);
    return null;
  }
}

/* =============================
   🔹 Listener realtime
============================= */
export function listenAdminSettings(callback) {
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;

    const data = snap.data();
    const mode =
      data.mode || inferModeFromLegacyFlags(data);

    callback({
      ...data,
      mode,
      ...resolveFeaturesFromMode(mode),
    });
  });
}

/* =============================
   🔹 Guardar settings
   (solo lo nuevo + lo relevante)
============================= */
export async function saveAdminSettings(data) {
  try {
    const payload = {
      mode: data.mode || TRACKLY_MODES.FULL,

      // settings que NO dependen del modo
      inactivityEnabled: data.inactivityEnabled ?? false,
      inactivityHours: data.inactivityHours ?? 24,
      reminderEnabled: data.reminderEnabled ?? true,
      reminderDays: data.reminderDays ?? 3,

      updatedAt: serverTimestamp(),
    };

    return await setDoc(ref, payload, { merge: true });
  } catch (e) {
    console.error("Error guardando settings admin", e);
    throw e;
  }
}

/* =============================
   🔹 Asegurar documento base
============================= */
export async function ensureSettingsDocument() {
  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        // 🔑 Nuevo modelo
        mode: TRACKLY_MODES.FULL,

        // 🔔 Configuración transversal
        reminderEnabled: true,
        reminderDays: 3,
        inactivityEnabled: false,
        inactivityHours: 3,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error("Error asegurando documento settings", e);
  }
}

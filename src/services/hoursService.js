import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../services/firebase.js";

const hoursRef = collection(db, "hours");

// ======================================================
// ➕ AGREGAR HORAS + RESET INACTIVIDAD
// ======================================================
export const addHours = async (userId, data) => {
  console.log("GUARDANDO HORAS:", userId, data);

  // 1️⃣ Guardar registro de horas
  const hourDoc = await addDoc(hoursRef, {
    userId,
    project: data.project,
    hours: Number(data.hours),
    date: data.date, // YYYY-MM-DD
    description: data.description || "",
    jiraIssue: data.jiraIssue || null,
    createdAt: serverTimestamp(),
  });

  // 2️⃣ Actualizar estado del usuario (actividad)
  const userRef = doc(db, "users", userId);

  await updateDoc(userRef, {
    lastHourAt: serverTimestamp(),
    inactivityNotifiedAt: null, // 🔄 reset anti-spam
  });

  return hourDoc;
};

// ======================================================
// 📥 HORAS DE UN USUARIO
// ======================================================
export const getUserHours = async (userId) => {
  const q = query(
    hoursRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getAllHours = async () => {
  const snapshot = await getDocs(collection(db, "hours"));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ======================================================
// 📅 DÍAS CON HORAS — MES ACTUAL
// ======================================================
export const getCurrentMonthDaysWithHours = async (userId) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  const records = await getUserHours(userId);
  const uniqueDays = new Set();

  records.forEach((r) => {
    if (!r.date) return;

    const [y, m] = r.date.split("-");

    if (Number(y) === year && Number(m) === month && Number(r.hours) > 0) {
      uniqueDays.add(r.date);
    }
  });

  return uniqueDays.size;
};

// ======================================================
// 📊 HORAS DEL MES CORRIENTE
// ======================================================
export const getCurrentMonthHours = async (userId) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  const start = `${year}-${month}-01`;
  const end = `${year}-${month}-31`;

  const q = query(
    hoursRef,
    where("userId", "==", userId),
    where("date", ">=", start),
    where("date", "<=", end),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ======================================================
// 📆 HORAS POR MES (YYYY-MM)
// ======================================================
export const getHoursByMonth = async (userId, month) => {
  const start = `${month}-01`;
  const end = `${month}-31`;

  const q = query(
    hoursRef,
    where("userId", "==", userId),
    where("date", ">=", start),
    where("date", "<=", end),
    orderBy("date", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ======================================================
// ✏️ EDITAR REGISTRO
// ======================================================
export const updateHourRecord = async (id, data) => {
  if (!id) throw new Error("ID de registro inválido");

  const ref = doc(db, "hours", id);
  await updateDoc(ref, data);
};

// ======================================================
// 🗓 DÍAS CON HORAS POR MES (CALENDARIO)
// ======================================================
export const getDaysWithHoursByMonth = async (userId, month) => {
  const start = `${month}-01`;
  const end = `${month}-31`;

  const q = query(
    hoursRef,
    where("userId", "==", userId),
    where("date", ">=", start),
    where("date", "<=", end)
  );

  const snapshot = await getDocs(q);
  const days = new Set();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.date) days.add(data.date);
  });

  return Array.from(days);
};

// ======================================================
// 🗑 BORRAR REGISTRO
// ======================================================
export const deleteHourRecord = async (id) => {
  if (!id) throw new Error("ID de registro inválido");

  const ref = doc(db, "hours", id);
  await deleteDoc(ref);
};

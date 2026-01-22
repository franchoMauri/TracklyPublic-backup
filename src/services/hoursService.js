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
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase.js";

const hoursRef = collection(db, "hours");

/* ======================================================
   ➕ CREAR REGISTRO (USER / ADMIN) — NUEVO ESTÁNDAR
   ====================================================== */
export const createHourRecord = async (data) => {
  return addDoc(hoursRef, {
    ...data,
    deleted: false,
    createdAt: serverTimestamp(),
  });
};

/* ======================================================
   ➕ ALIAS LEGACY (NO ROMPE AddHours.jsx)
   ====================================================== */
export const addHours = async (userId, data) => {
  return createHourRecord({
    userId,
    project: data.project,
    hours: Number(data.hours),
    date: data.date,
    description: data.description || "",
    jiraIssue: data.jiraIssue || null,

    createdBy: userId,
    createdByRole: "user",
    actionType: "created",
  });
};

/* ======================================================
   📥 HORAS DE UN USUARIO (INCLUYE ELIMINADOS)
   ====================================================== */
export const getUserHours = async (userId) => {
  const q = query(
    hoursRef,
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* ======================================================
   ✏️ EDITAR REGISTRO
   ====================================================== */
export const updateHourRecord = async (id, data) => {
  if (!id) throw new Error("ID de registro inválido");

  const ref = doc(db, "hours", id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

/* ======================================================
   🗑 SOFT DELETE (USER / ADMIN)
   ====================================================== */
export const softDeleteHourRecord = async (id, meta = {}) => {
  if (!id) throw new Error("ID de registro inválido");

  const ref = doc(db, "hours", id);

  await updateDoc(ref, {
    deleted: true,
    actionType: "deleted",
    deletedAt: serverTimestamp(),
    ...meta, // deletedBy, deletedByRole
  });
};

/* ======================================================
   ♻️ RESTAURAR REGISTRO
   ====================================================== */
export const restoreHourRecord = async (id) => {
  if (!id) throw new Error("ID de registro inválido");

  const ref = doc(db, "hours", id);

  await updateDoc(ref, {
    deleted: false,
    actionType: "restored",
    restoredAt: serverTimestamp(),
  });
};

/* ======================================================
   📆 HORAS POR MES
   ====================================================== */
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

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* ======================================================
   🔴 LISTENER EN TIEMPO REAL – HORAS DE USUARIO
   ====================================================== */
  export const listenUserHours = (userId, callback) => {
  if (!userId) return () => {};

  const q = query(
    collection(db, "hours"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    callback(data);
  });

  return unsubscribe;
};


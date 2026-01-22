import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const ref = collection(db, "taskTypes");

/* ==============================
   GET ALL TASK TYPES
============================== */
export async function getTaskTypes() {
  const q = query(ref, orderBy("name", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* ==============================
   GET ACTIVE TASK TYPES
============================== */
export async function getActiveTaskTypes() {
  const q = query(
    ref,
    where("active", "==", true),
    orderBy("name", "asc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* ==============================
   CREATE TASK TYPE
============================== */
export async function createTaskType(name) {
  if (!name) throw new Error("Nombre requerido");

  await addDoc(ref, {
    name,
    active: true,
    createdAt: serverTimestamp(),
  });
}

/* ==============================
   UPDATE TASK TYPE
============================== */
export async function updateTaskType(id, data) {
  if (!id) throw new Error("ID inválido");

  await updateDoc(doc(db, "taskTypes", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/* ==============================
   SOFT DELETE TASK TYPE
============================== */
export async function deleteTaskType(id) {
  await updateDoc(doc(db, "taskTypes", id), {
    active: false,
    deletedAt: serverTimestamp(),
  });
}

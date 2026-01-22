import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

const ref = collection(db, "tasks");

/* ==============================
   GET ALL TASKS
============================== */
export async function getTasks() {
  const q = query(ref, orderBy("name", "asc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

/* ==============================
   CREATE TASK
============================== */
export async function createTask(name) {
  if (!name) throw new Error("Nombre requerido");

  await addDoc(ref, {
    name,
    createdAt: serverTimestamp(),
    active: true,
  });
}

/* ==============================
   UPDATE TASK
============================== */
export async function updateTask(id, data) {
  if (!id) throw new Error("ID inválido");

  await updateDoc(doc(db, "tasks", id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/* ==============================
   SOFT DELETE TASK
============================== */
export async function deleteTask(id) {
  await updateDoc(doc(db, "tasks", id), {
    active: false,
    deletedAt: serverTimestamp(),
  });
}

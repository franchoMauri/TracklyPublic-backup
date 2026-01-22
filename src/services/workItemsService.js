import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

/* ======================================================
   🧩 WORK ITEMS ACTIVOS (KANBAN / HORAS)
====================================================== */
export const getActiveWorkItems = async () => {
  const q = query(
    collection(db, "workItems"),
    where("active", "==", true),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    title: d.data().title,
    projectId: d.data().projectId || null,
    projectName: d.data().projectName || null,
  }));
};

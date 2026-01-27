import {
  doc,
  setDoc,
  getDocs,
  collection,
  serverTimestamp,
  updateDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { getHoursByMonth } from "./hoursService";

// ======================================================
// 🧾 ENVIAR / REENVIAR INFORME MENSUAL
// ======================================================
export async function submitMonthlyReport(user, month) {
  if (!user?.uid || !user?.name || !month) {
    throw new Error("Datos inválidos para generar el informe");
  }

  // 🔒 Regla: no puede existir un informe ACTIVO (submitted / approved)
  const activeQuery = query(
    collection(db, "reports"),
    where("userId", "==", user.uid),
    where("month", "==", month),
    where("status", "in", ["submitted", "approved"])
  );

  const activeSnap = await getDocs(activeQuery);

  if (!activeSnap.empty) {
    throw new Error(
      "Ya existe un informe pendiente o aprobado para este mes"
    );
  }

  const records = await getHoursByMonth(user.uid, month);

  if (!records.length) {
    throw new Error("No hay horas cargadas para este mes");
  }

  let totalHours = 0;
  const breakdown = {};

  records.forEach((r) => {
    const h = Number(r.hours || 0);
    if (!r.date || h <= 0) return;

    totalHours += h;
    breakdown[r.date] = (breakdown[r.date] || 0) + h;
  });

  const entries = records.map((r) => ({
    date: r.date,
    hours: Number(r.hours || 0),
    description: r.description || "",
  }));

  const payload = {
    userId: user.uid,
    userName: user.name,
    month,
    totalHours,
    breakdown,
    entries,
    status: "submitted",
    submittedAt: serverTimestamp(),
    adminNote: null,
    reviewedAt: null,
  };

  // ✅ Siempre crear un documento nuevo
  const ref = await addDoc(collection(db, "reports"), payload);

  return ref.id;
}

// ======================================================
// 📄 INFORMES DE UN USUARIO (FETCH)
// ======================================================
export async function getUserReports(userId) {
  if (!userId) return [];

  const q = query(
    collection(db, "reports"),
    where("userId", "==", userId),
    orderBy("month", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

// ======================================================
// 🔴 INFORMES DE USUARIO — TIEMPO REAL
// ======================================================
export function listenUserReports(userId, callback) {
  if (!userId) return () => {};

  const q = query(
    collection(db, "reports"),
    where("userId", "==", userId)
  );

  const unsub = onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(data);
  });

  return unsub;
}

// ======================================================
// 📥 BANDEJA ADMIN — TODOS LOS INFORMES
// ======================================================
export async function getAdminReports() {
  const q = query(
    collection(db, "reports"),
    orderBy("month", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();

    const entriesByDate = {};
    (data.entries || []).forEach((e) => {
      if (!e.date) return;

      if (!entriesByDate[e.date]) {
        entriesByDate[e.date] = [];
      }

      entriesByDate[e.date].push({
        hours: e.hours,
        description: e.description,
      });
    });

    return {
      id: d.id,
      ...data,
      entriesByDate,
    };
  });
}

// ======================================================
// 🔴 ADMIN — INFORMES EN TIEMPO REAL
// ======================================================
export function listenAdminReports(callback) {
  const q = query(
    collection(db, "reports"),
    orderBy("month", "desc")
  );

  const unsub = onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(data);
  });

  return unsub;
}

// ======================================================
// ✅ / ❌ ADMIN — ACTUALIZAR ESTADO
// ======================================================
export async function updateReportStatus(
  reportId,
  status,
  adminNote
) {
  if (!reportId || !status) {
    throw new Error("Parámetros inválidos");
  }

  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Estado inválido");
  }

  if (!adminNote || !adminNote.trim()) {
    throw new Error("La nota del administrador es obligatoria");
  }

  const ref = doc(db, "reports", reportId);

  await updateDoc(ref, {
    status,
    adminNote: adminNote.trim(),
    reviewedAt: serverTimestamp(),
  });
}

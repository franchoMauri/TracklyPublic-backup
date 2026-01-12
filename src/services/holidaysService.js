import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Escucha en tiempo real los feriados de un año
 * year = "2026"
 * callback = (arrayDeFechas) => {}
 */
export function listenHolidays(year, callback) {
  const ref = doc(db, "holidays", String(year));

  const unsubscribe = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }

    const data = snap.data();
    callback(Array.isArray(data.days) ? data.days : []);
  });

  return unsubscribe;
}

/**
 * Obtiene los feriados de un año (lectura puntual)
 */
export async function getHolidays(year) {
  const ref = doc(db, "holidays", String(year));
  const snap = await getDoc(ref);

  if (!snap.exists()) return [];
  const data = snap.data();

  return Array.isArray(data.days) ? data.days : [];
}

/**
 * Agrega un feriado a un año
 * date = "YYYY-MM-DD"
 */
export async function addHoliday(year, date) {
  const ref = doc(db, "holidays", String(year));
  const snap = await getDoc(ref);

  let days = [];

  if (snap.exists()) {
    days = Array.isArray(snap.data().days) ? snap.data().days : [];
  }

  if (!days.includes(date)) {
    days.push(date);
  }

  await setDoc(
    ref,
    {
      days,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Elimina un feriado de un año
 * date = "YYYY-MM-DD"
 */
export async function removeHoliday(year, date) {
  const ref = doc(db, "holidays", String(year));
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const days = (snap.data().days || []).filter((d) => d !== date);

  await setDoc(
    ref,
    {
      days,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

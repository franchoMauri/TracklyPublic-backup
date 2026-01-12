import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";

// ===============================
// 👤 USUARIO
// ===============================
export const ensureUserDocument = async (user) => {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email,
      role: "user",
      disabled: false,
      name: "",
      createdAt: serverTimestamp(),
    });
  }
};

// ===============================
// 🔐 PERFIL
// ===============================
export const getUserProfile = async (uid) => {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

// ===============================
// 👥 ADMIN
// ===============================
export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const updateUserRole = async (uid, role) => {
  await updateDoc(doc(db, "users", uid), { role });
};

export const updateUserName = async (uid, name) => {
  await updateDoc(doc(db, "users", uid), { name });
};

// ===============================
// 🔒 DESHABILITAR / REHABILITAR
// ===============================
export const setUserDisabled = async (uid, disabled) => {
  await setDoc(
    doc(db, "users", uid),
    { disabled },
    { merge: true }
  );
};

// 🔴 compatibilidad (si algún lado usa disableUser)
export const disableUser = async (uid) => {
  return setUserDisabled(uid, true);
};

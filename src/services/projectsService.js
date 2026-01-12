import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase.js";

const projectsRef = collection(db, "projects");

// 🔹 Obtener proyectos
export const getProjects = async () => {
  const snapshot = await getDocs(projectsRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// 🔹 Crear proyecto (ADMIN)
export const createProject = async (name) => {
  await addDoc(projectsRef, {
    name,
    active: true,
    createdAt: serverTimestamp(),
  });
};

import { httpsCallable } from "firebase/functions";
import { functions } from "../services/firebase.js";

/**
 * Crea usuario desde el panel Admin SIN cambiar la sesión actual
 */
export async function createUserFromPanel(data) {
  const { email, password, role } = data;

  const createUserFn = httpsCallable(functions, "panelCreateUser");

  const result = await createUserFn({
    email: email.trim(),
    password,
    role,
    disabled: false,
  });

  // ✔ FIX: leer el campo tal como lo retorna la callable
  const uid = result.data?.uid;

  return uid;
}

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserName } from "../services/usersService";
import { updatePassword } from "firebase/auth";
import { auth } from "../services/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

export default function ChooseName() {
  const { user, profile } = useAuth();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  // detectar si el usuario usa Google
  const usaGoogle = user?.providerData?.some(
    (p) => p.providerId === "google.com"
  );

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user) return;

    if (!name.trim()) {
      alert("Ingresá un nombre válido");
      return;
    }

    // 🔐 Validación de contraseña SOLO si NO es Google
    if (!usaGoogle) {
      if (password.length < 6 || password !== confirm) {
        alert("La contraseña debe tener al menos 6 caracteres y coincidir");
        return;
      }
    }

    try {
      setSaving(true);

      // 1️⃣ Cambiar contraseña SOLO si no es Google
      if (!usaGoogle) {
        await updatePassword(auth.currentUser, password);
      }

      // 2️⃣ Guardar nombre
      await updateUserName(user.uid, name.trim());

      // 3️⃣ Liberar onboarding
      await updateDoc(doc(db, "users", user.uid), {
        mustChangePassword: false,
      });

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Error onboarding", err);
      alert("No se pudo completar el registro");
      setSaving(false);
    }
  };

  const initials =
    name?.trim()?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-lg shadow p-8 w-full max-w-md space-y-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl">
            {initials}
          </div>

          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              Completá tu perfil
            </h1>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <input
          className="input w-full"
          placeholder="Nombre visible en la app"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* 🔐 CONTRASEÑA SOLO PARA MAIL/CLAVE */}
        {!usaGoogle && (
          <>
            <input
              type="password"
              className="input w-full"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              type="password"
              className="input w-full"
              placeholder="Repetir contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </>
        )}

        <button
          type="submit"
          className="btn-primary w-full text-xs py-1.5"
          disabled={saving}
        >
          {saving ? "Guardando..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}

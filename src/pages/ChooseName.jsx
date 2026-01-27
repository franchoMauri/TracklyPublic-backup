import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserName } from "../services/usersService";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { db } from "../services/firebase";

export default function ChooseName() {
  const { user, profile } = useAuth();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    /* =============================
       VALIDACIONES
    ============================= */
    if (!name.trim()) {
      setError("Ingresá un nombre válido");
      return;
    }

    if (!birthDate) {
      setError("Ingresá tu fecha de nacimiento");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setSaving(true);
      setError("");

      /* =============================
         1️⃣ Cambiar contraseña
      ============================= */
      await updatePassword(user, password);

      /* =============================
         2️⃣ Guardar nombre visible
      ============================= */
      await updateUserName(user.uid, name.trim());

      /* =============================
         3️⃣ Guardar onboarding completo
      ============================= */
      await updateDoc(doc(db, "users", user.uid), {
        birthDate,
        mustChangePassword: false,
        onboardingCompletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 🚫 NO navegar
      // AppRouter/AuthContext detectan mustChangePassword=false
    } catch (err) {
      console.error("Error onboarding", err);

      if (err.code === "auth/requires-recent-login") {
        setError(
          "Por seguridad, volvé a iniciar sesión y repetí el proceso"
        );
      } else {
        setError("No se pudo completar el registro");
      }

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
        {/* HEADER */}
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

        {error && (
          <div className="bg-red-100 text-red-700 text-xs p-2 rounded text-center">
            {error}
          </div>
        )}

        {/* NOMBRE */}
        <input
          className="input w-full"
          placeholder="Nombre visible en la app"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={saving}
        />

        {/* FECHA NACIMIENTO */}
        <input
          type="date"
          className="input w-full"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          required
          disabled={saving}
        />

        {/* NUEVA CONTRASEÑA */}
        <input
          type="password"
          className="input w-full"
          placeholder="Nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={saving}
        />

        {/* CONFIRMAR CONTRASEÑA */}
        <input
          type="password"
          className="input w-full"
          placeholder="Confirmar contraseña"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={saving}
        />

        <button
          type="submit"
          className="btn-primary w-full text-xs py-1.5"
          disabled={saving}
        >
          {saving ? "Guardando..." : "Finalizar registro"}
        </button>
      </form>
    </div>
  );
}

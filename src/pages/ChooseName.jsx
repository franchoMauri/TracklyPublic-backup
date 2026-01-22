import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserName } from "../services/usersService";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";

export default function ChooseName() {
  const { user, profile } = useAuth();

  const [name, setName] = useState("");
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

    if (!name.trim()) {
      setError("Ingresá un nombre válido");
      return;
    }

    try {
      setSaving(true);
      setError("");

      // 1️⃣ Guardar nombre visible
      await updateUserName(user.uid, name.trim());

      // 2️⃣ Liberar onboarding
      await updateDoc(doc(db, "users", user.uid), {
        mustChangePassword: false,
        updatedAt: serverTimestamp(),
      });

      // 🚫 NO navegar acá
      // AuthContext + AppRouter detectan el cambio
    } catch (err) {
      console.error("Error onboarding", err);
      setError("No se pudo completar el registro");
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

        {error && (
          <div className="bg-red-100 text-red-700 text-xs p-2 rounded text-center">
            {error}
          </div>
        )}

        <input
          className="input w-full"
          placeholder="Nombre visible en la app"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={saving}
        />

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

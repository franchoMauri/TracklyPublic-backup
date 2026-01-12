import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateUserName } from "../services/usersService";

export default function Profile() {
  const { user, profile } = useAuth();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    await updateUserName(user.uid, name);

    setSaving(false);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 1200);
  };

  const initials =
    profile?.name?.trim()?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Mi perfil</h1>

        {/* ===== PERFIL ===== */}
        <div className="bg-white rounded-xl shadow p-8 space-y-6">
          <div className="flex items-center gap-6">

            {/* AVATAR — CLICKABLE REAL */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-20 h-20 rounded-full bg-indigo-600
                         flex items-center justify-center
                         text-white text-3xl font-semibold
                         cursor-pointer hover:opacity-90
                         focus:outline-none focus:ring-2
                         focus:ring-indigo-400"
              title="Editar perfil"
            >
              {initials}
            </button>

            <div>
              <p className="text-lg font-medium">
                {profile?.name || "Usuario"}
              </p>
              <p className="text-sm text-gray-500">
                {user?.email}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">

            <h2 className="text-lg font-semibold">
              Editar perfil
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Nombre visible</label>
                <input
                  className="input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  className="input bg-gray-100 w-full"
                  value={user?.email}
                  disabled
                />
              </div>

              {saved && (
                <p className="text-sm text-green-600">
                  Perfil actualizado correctamente
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm"
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}

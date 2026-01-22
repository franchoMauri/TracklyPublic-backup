import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateUserName } from "../../services/usersService";

export default function ProfileModal({ open, onClose }) {
  const { user, profile } = useAuth();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile]);

  if (!open) return null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      await updateUserName(user.uid, name.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-trackly-card rounded-lg w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">Editar perfil</h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="trackly-label">Nombre visible</label>
            <input
              className="trackly-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="trackly-label">Email</label>
            <input
              className="trackly-input bg-gray-100"
              value={user?.email}
              disabled
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="trackly-btn trackly-btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="trackly-btn trackly-btn-primary"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

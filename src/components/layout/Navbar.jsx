import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateUserName } from "../../services/usersService";
import tracklyLogo from "../../assets/trackly-logo.png";

export default function Navbar() {
  const { user, role, profile, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  // ===== PERFIL POPUP =====
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // 🆕 animación sutil del logo
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(true);
  }, []);

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name);
    }
  }, [profile]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      await updateUserName(user.uid, name.trim());
      setProfileOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-indigo-600 dark:text-indigo-400 font-semibold"
      : "text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition";

  const initials =
    profile?.name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* IZQUIERDA - LOGO */}
          <NavLink to="/" className="flex items-center gap-3">
            <img
              src={tracklyLogo}
              alt="Trackly"
              className={`h-9 transition-all duration-500 ${
                animate ? "scale-105" : "scale-100"
              }`}
            />
          </NavLink>

          {/* ================= DESKTOP MENU ================= */}
          <nav className="hidden md:flex gap-8 items-center">
            <NavLink to="/" className={linkClass}>Dashboard</NavLink>
            <NavLink to="/add" className={linkClass}>Cargar horas</NavLink>
            <NavLink to="/records" className={linkClass}>Mis registros</NavLink>

            {role === "admin" && (
              <NavLink to="/reports" className={linkClass}>Reportes</NavLink>
            )}

            {role === "admin" && (
              <NavLink to="/admin" className={linkClass}>Admin</NavLink>
            )}
          </nav>

          {/* ================= DESKTOP USER ================= */}
          <div className="hidden md:flex items-center gap-3">

            {/* AVATAR → POPUP */}
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              title="Editar perfil"
              className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900
                         text-indigo-600 dark:text-indigo-300
                         flex items-center justify-center
                         font-semibold hover:ring-2 hover:ring-indigo-400 transition"
            >
              {initials}
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-300 max-w-[160px] truncate">
              {profile?.name || user?.email}
            </span>

            <button
              type="button"
              onClick={logout}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Cerrar sesión
            </button>
          </div>

          {/* MOBILE BUTTON */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-gray-600 dark:text-gray-300 text-xl"
          >
            ☰
          </button>
        </div>

        {/* ================= MOBILE MENU ================= */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-6 py-4 space-y-4">
            <NavLink to="/" onClick={() => setMenuOpen(false)} className={linkClass}>Dashboard</NavLink>
            <NavLink to="/add" onClick={() => setMenuOpen(false)} className={linkClass}>Cargar horas</NavLink>
            <NavLink to="/records" onClick={() => setMenuOpen(false)} className={linkClass}>Mis registros</NavLink>

            {role === "admin" && (
              <NavLink to="/reports" onClick={() => setMenuOpen(false)} className={linkClass}>
                Reportes
              </NavLink>
            )}

            {role === "admin" && (
              <NavLink to="/admin" onClick={() => setMenuOpen(false)} className={linkClass}>
                Admin
              </NavLink>
            )}

            <hr className="border-gray-200 dark:border-slate-700" />

            <button
              type="button"
              onClick={logout}
              className="w-full text-left text-red-600 dark:text-red-400 text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </header>

      {/* ================= PERFIL POPUP ================= */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar perfil</h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProfileOpen(false)}
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

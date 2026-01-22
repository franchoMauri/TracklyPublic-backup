import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateUserName } from "../../services/usersService";

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
      <header className="h-5 flex items-center bg-transparent">
        <div className="w-full flex justify-center">  
    
          {/* ================= DESKTOP MENU ================= */}
          
          {/* ================= DESKTOP USER ================= */}
          
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
      </header>
    </>
  );
}

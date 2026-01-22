import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import tracklyLogo from "../../assets/trackly-logo.png";

const baseItem =
  "flex items-center px-3 py-2 rounded-md text-sm transition";

const activeItem =
  "bg-trackly-primary/10 text-trackly-primary font-medium";

const inactiveItem =
  "text-trackly-muted hover:bg-gray-50 hover:text-trackly-text";

export default function Sidebar({onOpenProfile }) {
  const { role, user, profile, logout } = useAuth();

  const initials =
    profile?.name?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <aside className="w-48 shrink-0 bg-trackly-card border-r border-trackly-border h-screen sticky top-0 flex flex-col">
      {/* TOP */}
      <div className="p-4 space-y-6 flex-1 py-1">
        <NavLink to="/" className="flex items-center gap-3 py-5 px-2">
        <img
            src={tracklyLogo}
            alt="Trackly"
            className="h-10 w-auto"
          />
        </NavLink>
        
        {/* NAV */}
        <nav className="flex-col gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${baseItem} ${isActive ? activeItem : inactiveItem}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/add"
            className={({ isActive }) =>
              `${baseItem} ${isActive ? activeItem : inactiveItem}`
            }
          >
            Cargar horas
          </NavLink>

          <NavLink
            to="/records"
            className={({ isActive }) =>
              `${baseItem} ${isActive ? activeItem : inactiveItem}`
            }
          >
            Mis registros
          </NavLink>

          {role === "admin" && (
            <>
              <div className="pt-4 text-xs uppercase tracking-wide text-trackly-muted px-2">
                <strong>Administración</strong>
              </div>

              <NavLink
                to="/reports"
                className={({ isActive }) =>
                  `${baseItem} ${isActive ? activeItem : inactiveItem}`
                }
              >
                Reportes
              </NavLink>

              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `${baseItem} ${isActive ? activeItem : inactiveItem}`
                }
              >
                Admin
              </NavLink>
            </>
          )}
        </nav>
      </div>

      {/* FOOTER — PERFIL */}
      <div className="border-t border-trackly-border p-4">
        <button
            type="button"
            onClick={onOpenProfile}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-50 transition text-left"
          >

          <div className="w-9 h-9 rounded-full bg-trackly-primary/10 text-trackly-primary flex items-center justify-center font-semibold">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {profile?.name || "Usuario"}
            </div>
            <div className="text-xs text-trackly-muted truncate">
              {user?.email}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={logout}
          className="mt-2 w-full text-left text-sm text-trackly-muted hover:text-trackly-danger px-2 py-1"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

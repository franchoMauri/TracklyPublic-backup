import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getAllUsers,
  updateUserRole,
  setUserDisabled,
} from "../services/usersService";
import {
  getAdminSettings,
  saveAdminSettings,
} from "../services/adminSettingsService";
import AdminHolidays from "../components/admin/AdminHolidays";

export default function Admin() {
  const { user, role } = useAuth();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [settings, setSettings] = useState({
    featureJiraCombo: true,
    featureReports: false,
    inactivityEnabled: false,
    inactivityHours: 24,
    featureDashboardUsers: true,
  });

  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (role === "admin") {
      loadUsers();
      loadSettings();
    }
  }, [role]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoadingUsers(false);
  };

  const loadSettings = async () => {
    const data = await getAdminSettings();
    if (data) {
      setSettings((prev) => ({ ...prev, ...data }));
    }
  };

  const toggleUser = async (uid, disabled) => {
    if (uid === user.uid) {
      alert("No podés modificar tu propio usuario");
      return;
    }

    await setUserDisabled(uid, !disabled);
    await loadUsers();
  };

  const handleRoleChange = async (uid, newRole) => {
    if (uid === user.uid) return;
    await updateUserRole(uid, newRole);
    await loadUsers();
  };

  const handleSaveChecks = async () => {
    try {
      setSavingSettings(true);
      await saveAdminSettings(settings);
      alert("Configuración guardada");
    } catch (e) {
      console.error(e);
      alert("Error guardando configuración");
    } finally {
      setSavingSettings(false);
    }
  };

  if (role !== "admin") {
    return <p className="p-4 text-gray-500">Sin permisos</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Panel Admin</h1>

      {/* ================= CONFIGURACIÓN GENERAL ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ===== FERiados ===== */}
        <div className="bg-white rounded shadow p-5">
          <h2 className="font-medium mb-3 flex items-center gap-2">
            📅 Calendario de feriados
          </h2>

          <AdminHolidays />
        </div>

        {/* ===== FUNCIONALIDADES ===== */}
        <div className="bg-white rounded shadow p-5">
          <h2 className="font-medium mb-3">Funcionalidades</h2>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.featureJiraCombo}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureJiraCombo: e.target.checked,
                  })
                }
              />
              Combo tarea Jira en Cargar Horas
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.featureReports}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureReports: e.target.checked,
                  })
                }
              />
              Módulo de Reportes
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.featureDashboardUsers}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    featureDashboardUsers: e.target.checked,
                  })
                }
              />
              Ver tarjetas de usuarios en Dashboard
            </label>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={settings.inactivityEnabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      inactivityEnabled: e.target.checked,
                    })
                  }
                />
                Notificaciones por inactividad
              </label>

              <span className="text-gray-400">|</span>

              <div className="border border-gray-300 rounded-lg px-3 py-2">
                <label className="flex items-center gap-2 text-gray-600">
                  Tiempo sin cargar horas
                  <input
                    type="number"
                    min="1"
                    disabled={!settings.inactivityEnabled}
                    value={settings.inactivityHours}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        inactivityHours: Number(e.target.value),
                      })
                    }
                    className="input w-20 text-xs py-1"
                  />
                  horas
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveChecks}
            className="btn-primary w-full text-xs py-1.5 mt-4"
            disabled={savingSettings}
          >
            {savingSettings ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* ================= USUARIOS ================= */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-medium mb-2">Usuarios</h2>

        {loadingUsers ? (
          <p className="text-xs text-gray-400">Cargando…</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Email</th>
                <th className="py-2">Rol</th>
                <th className="py-2">Estado</th>
                <th className="py-2">Acción</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t align-middle">
                  <td className="py-2">{u.email}</td>

                  <td className="py-2">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value)
                      }
                      className="input text-xs py-1"
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>

                  <td className="py-2">
                    {u.disabled && (
                      <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">
                        Usuario deshabilitado
                      </span>
                    )}
                  </td>

                  <td className="py-2">
                    <button
                      onClick={() => toggleUser(u.id, u.disabled)}
                      className={`px-2 py-1 text-[10px] rounded ${
                        u.disabled
                          ? "bg-green-600 text-white"
                          : "bg-red-600 text-white"
                      }`}
                    >
                      {u.disabled ? "Rehabilitar" : "Deshabilitar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

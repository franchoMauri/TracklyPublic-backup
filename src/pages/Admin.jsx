import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  updateUserRole,
  setUserDisabled,
  markUserAsDeleted,
  ensureUserDocument,
} from "../services/usersService";
import {
  getAdminSettings,
  saveAdminSettings,
} from "../services/adminSettingsService";
import AdminHolidays from "../components/admin/AdminHolidays";
import InlineToast from "../components/ui/InlineToast";
import AdminReports from "./AdminReports";
import AdminHoursPanel from "./AdminHoursPanel";
import AdminManagementPanel from "./AdminManagementPanel";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { secondaryAuth, db } from "../services/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

/* ============================= */
/* REALTIME USERS LISTENER       */
/* ============================= */
function listenAllUsers(callback) {
  const q = query(collection(db, "users"), orderBy("email"));
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(users);
  });
}

export default function Admin() {
  const { user, role } = useAuth();

  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [userToToggle, setUserToToggle] = useState(null);

  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  const [hasNewReports, setHasNewReports] = useState(false);
  const [showReports, setShowReports] = useState(false);

  const [showHoursPanel, setShowHoursPanel] = useState(false); // ✅ NUEVO para AdminHoursPanel
  const [showManagement, setShowManagement] = useState(false);
  const [showTasksPanel, setShowTasksPanel] = useState(false);

  /* ===== CREAR USUARIO ===== */
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createSuccess, setCreateSuccess] = useState("");

  /* ============================= */
  /* INIT                          */
  /* ============================= */
  useEffect(() => {
    if (role !== "admin") return;

    loadSettings();
    const unsubUsers = listenAllUsers(setUsers);

    const qReports = query(
      collection(db, "reports"),
      orderBy("submittedAt", "desc")
    );

    const unsubReports = onSnapshot(qReports, (snap) => {
      const pending = snap.docs.some(
        (d) => d.data().status === "submitted"
      );
      setHasNewReports(pending);
    });

    return () => {
      unsubUsers();
      unsubReports();
    };
  }, [role]);

  const loadSettings = async () => {
    const data = await getAdminSettings();
    if (data) {
      const normalized = {
        featureManageHours: false,
        featureProjectCombo: true,
        featureTaskCombo: true,
        featureJiraCombo: false,
        featureProjects: false,
        featureTasks: false,
        featureReports: false,
        featureDashboardUsers: false,
        inactivityEnabled: false,
        featureWorkItems: false,
        inactivityHours: 24,
        ...data,
      };
      setSettings(normalized);
      setDraftSettings(normalized);
    }
  };

  /* ============================= */
  /* USERS ACTIONS                 */
  /* ============================= */
  const toggleUser = async (uid, disabled) => {
    if (uid === user.uid) {
  setToast({
    message: "No puedes deshabilitar o eliminar tu propio usuario",
    type: "error",
  });
  return;
}

    try {
      await setUserDisabled(uid, !disabled);
    } catch {
      alert("Error al actualizar el estado del usuario");
    }
  };

  const handleRoleChange = async (uid, newRole) => {
    if (uid === user.uid) return;
    await updateUserRole(uid, newRole);
  };

  const handleDeleteUser = async (u) => {
    if (u.id === user.uid) return;

    const ok = window.confirm(
      `¿Eliminar este usuario?\n\n${u.email}\n\n`
    );
    if (!ok) return;

    await markUserAsDeleted(u.id);
  };

  /* ============================= */
  /* SETTINGS                      */
  /* ============================= */
  const handleSaveChecks = async () => {
    try {
      setSavingSettings(true);

      await saveAdminSettings(draftSettings);
      setSettings(draftSettings);

      setToast({
        message: "Configuración guardada correctamente",
        type: "success",
      });
    } catch {
      setToast({
        message: "Error al guardar la configuración",
        type: "error",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  /* ============================= */
  /* CREATE USER                   */
  /* ============================= */
  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return;

    try {
      setCreatingUser(true);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        newEmail,
        newPassword
      );

      await ensureUserDocument(cred.user);

      setNewEmail("");
      setNewPassword("");

      setCreateSuccess(`Usuario creado correctamente: ${newEmail}`);
      setTimeout(() => setCreateSuccess(""), 5000);
    } finally {
      setCreatingUser(false);
    }
  };

  if (role !== "admin") {
    return <p className="p-4 text-gray-500">Sin permisos</p>;
  }

  if (!draftSettings || !settings) {
    return <p className="p-4 text-gray-500">Cargando configuración...</p>;
  }

  return (
  <>
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* TRACKLY · HORAS */}
          {settings.featureManageHours && (
            <button
              onClick={() => setShowHoursPanel(true)}
              className={`trackly-btn ${
                showHoursPanel
                  ? "trackly-btn-primary animate-pulse"
                  : "trackly-btn-secondary"
              }`}
            >
              Gestión de horas
            </button>
          )}

          {/* TRACKLY · TAREAS */}
          {settings.featureTasks && (
            <button
              onClick={() => setShowTasksPanel(true)}
              className={`trackly-btn ${
                showTasksPanel
                  ? "trackly-btn-primary animate-pulse"
                  : "trackly-btn-secondary"
              }`}
            >
              Tareas
            </button>
          )}

          {/* INFORMES */}
          {settings.featureReports && (
            <button
              onClick={() => {
                setShowReports(true);
                setHasNewReports(false);
              }}
              className={`trackly-btn ${
                hasNewReports
                  ? "trackly-btn-primary animate-pulse"
                  : "trackly-btn-secondary"
              }`}
            >
              Gestión de Informes
            </button>
          )}

          {/* CONFIGURACIÓN GENERAL */}
          <button
            onClick={() => setShowManagement(true)}
            className="trackly-btn trackly-btn-secondary"
          >
            Configuración
          </button>
        </div>
      </div>
    </div>

    {/* ================= CONFIGURACIÓN ================= */}
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto p-4">
      {/* IZQUIERDA */}
      <div className="md:col-span-4 trackly-card p-5 h-[500px] overflow-hidden">
        <h2 className="trackly-label mb-3">Calendario de Feriados</h2>
        <AdminHolidays />
      </div>

      {/* DERECHA */}
      <div className="md:col-span-8 trackly-card p-6 space-y-6">
        <h2 className="trackly-label">Configuración de módulos</h2>

        <div className="space-y-6 text-sm">
          {/* TRACKLY · CARGA DE HORAS */}
          <div className="border border-trackly-border rounded-trackly p-4 space-y-4">
            <p className="font-semibold">Trackly · Carga de Horas</p>

            <label className="flex gap-2 font-medium">
              <input
                type="checkbox"
                checked={draftSettings.featureManageHours || false}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    featureManageHours: e.target.checked,
                  })
                }
              />
              Habilitar carga y gestión de horas
            </label>

            <div
              className={`pl-6 space-y-2 ${
                !draftSettings.featureManageHours
                  ? "text-trackly-muted"
                  : "text-trackly-text"
              }`}
            >
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  disabled={!draftSettings.featureManageHours}
                  checked={draftSettings.featureProjectCombo ?? true}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      featureProjectCombo: e.target.checked,
                    })
                  }
                />
                Selector de proyecto
              </label>

              <label className="flex gap-2">
                <input
                  type="checkbox"
                  disabled={!draftSettings.featureManageHours}
                  checked={draftSettings.featureTaskCombo ?? true}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      featureTaskCombo: e.target.checked,
                    })
                  }
                />
                Selector de tareas (Tarea + Tipo)
              </label>

              <label className="flex gap-2">
                <input
                  type="checkbox"
                  disabled={!draftSettings.featureManageHours}
                  checked={draftSettings.featureJiraCombo}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      featureJiraCombo: e.target.checked,
                    })
                  }
                />
                Integración con Jira
              </label>
            </div>
          </div>

          {/* TRACKLY · GESTIÓN */}
          <div className="border border-trackly-border rounded-trackly p-4 space-y-3">
            <p className="font-semibold">Trackly · Gestión de Proyectos</p>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={draftSettings.featureProjects || false}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    featureProjects: e.target.checked,
                  })
                }
              />
              Gestión de proyectos
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={draftSettings.featureTasks || false}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    featureTasks: e.target.checked,
                  })
                }
              />
              Gestión de tareas y tipos
            </label>
          </div>

          {/* REPORTES */}
          <div className="border border-trackly-border rounded-trackly p-4 space-y-3">
            <p className="font-semibold">Reportes y Visualización</p>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={draftSettings.featureReports}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    featureReports: e.target.checked,
                  })
                }
              />
              Envío de informes mensuales
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={draftSettings.featureDashboardUsers}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    featureDashboardUsers: e.target.checked,
                  })
                }
              />
              Dashboard Admin
            </label>
          </div>

          {/* INACTIVIDAD */}
          <div className="border border-trackly-border rounded-trackly p-4 space-y-3">
            <p className="font-semibold">Control de inactividad</p>

            <div className="flex items-center gap-4">
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={draftSettings.inactivityEnabled}
                  onChange={(e) =>
                    setDraftSettings({
                      ...draftSettings,
                      inactivityEnabled: e.target.checked,
                    })
                  }
                />
                Habilitar alertas
              </label>

              <input
                type="number"
                min="1"
                disabled={!draftSettings.inactivityEnabled}
                value={draftSettings.inactivityHours}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    inactivityHours: Number(e.target.value),
                  })
                }
                className="trackly-input w-20"
              />
              hs
            </div>
          </div>
        </div>

        <InlineToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />

        <button
          onClick={handleSaveChecks}
          className="trackly-btn trackly-btn-primary"
          disabled={savingSettings}
        >
          Guardar cambios
        </button>
      </div>
    </div>

    {/* ================= USERS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto p-4">

          {/* CREAR USUARIO */}
          <div className="md:col-span-4 trackly-card p-4 flex flex-col h-[360px]">
            <h2 className="trackly-h2 mb-3">Crear usuario</h2>

            <input
              className="trackly-input"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />

            <input
              type="password"
              className="trackly-input"
              placeholder="Contraseña temporal"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            {createSuccess && (
              <div className="text-xs bg-green-100 text-green-800 rounded p-2">
                {createSuccess}
              </div>
            )}

            {/* FOOTER */}
            <div className="pt-6 mt-auto border-t border-trackly-border">
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="trackly-btn trackly-btn-primary w-full"
              >
                Crear usuario
              </button>
            </div>
          </div>
      {/* USUARIOS REGISTRADOS */}
          <div className="md:col-span-8 bg-white rounded-xl shadow p-4 h-[360px] flex flex-col">
            <h2 className="font-medium mb-3 shrink-0">Usuarios registrados</h2>

            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b text-left">
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t">
                    <td>{u.name || "—"}</td>
                    <td>{u.email}</td>

                    <td>
                      <select
                        value={u.role}
                        disabled={u.deleted}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value)
                        }
                        className="input text-xs"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    {/*ESTADOS Usuarios Registrados*/}
                    <td>
                      {u.deleted ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700">
                          Eliminado parcial
                        </span>
                      ) : !u.name ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-gray-600">
                          Sin inicio de sesión
                        </span>
                      ) : u.disabled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                          Deshabilitado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                          Activo
                        </span>
                      )}
                    </td>
                    <td>
                      {!u.deleted && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUserToToggle(u);
                            }}
                            className={`px-2 py-1 text-[10px] rounded w-[90px] ${
                              u.disabled
                                ? "bg-green-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {u.disabled ? "Habilitar" : "Deshabilitar"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="w-[32px] h-[28px] rounded bg-gray-200 hover:bg-gray-300 text-center"
                          >
                            X
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        {userToDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-semibold text-red-600">
                Eliminar usuario
              </h2>

              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                <p><strong>Email:</strong> {userToDelete.email}</p>
                <p><strong>Nombre:</strong> {userToDelete.name || "—"}</p>
                <p className="mt-2 text-red-700">
                  Esta acción no se puede deshacer.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await markUserAsDeleted(userToDelete.id);
                    setToast({
                      message: "Usuario eliminado correctamente",
                      type: "success",
                    });
                    setUserToDelete(null);
                  }}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Eliminar definitivamente
                </button>
              </div>
            </div>
          </div>
        )}

        {userToToggle && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
              <h2 className="text-lg font-semibold text-blue-600">
                {userToToggle.disabled ? "Habilitar usuario" : "Deshabilitar usuario"}
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p><strong>Email:</strong> {userToToggle.email}</p>
                <p><strong>Nombre:</strong> {userToToggle.name || "—"}</p>
                <p className="mt-2 text-blue-700">
                  {userToToggle.disabled
                    ? "Este usuario volverá a estar activo."
                    : "Este usuario no podrá iniciar sesión hasta que lo habilites nuevamente."}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setUserToToggle(null)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (userToToggle.id === user.uid) {
                      setToast({
                        message: "No puedes deshabilitar tu propio usuario",
                        type: "error",
                      });
                      setUserToToggle(null);
                      return;
                    }
                    await toggleUser(userToToggle.id, userToToggle.disabled);
                    setToast({
                      message: userToToggle.disabled
                        ? "Usuario habilitado correctamente"
                        : "Usuario deshabilitado correctamente",
                      type: "success",
                    });
                    setUserToToggle(null);
                  }}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {userToToggle.disabled ? "Habilitar" : "Deshabilitar"}
                </button>
              </div>
            </div>
          </div>
        )}

    {showReports && <AdminReports onClose={() => setShowReports(false)} />}
    {showHoursPanel && (<AdminHoursPanel onClose={() => setShowHoursPanel(false)} />
    )}
    {showManagement && (<AdminManagementPanel onClose={() => setShowManagement(false)} />
    )}
  </>
);
}

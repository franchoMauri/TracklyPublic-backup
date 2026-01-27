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
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

/* ============================= */
/* REALTIME USERS LISTENER       */
/* ============================= */
function listenAllUsers(callback) {
  const q = query(collection(db, "users"), orderBy("email"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/* ============================= */
/* MODE CARD                     */
/* ============================= */
function ModeCard({
  title,
  subtitle,
  icon,
  description,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`border rounded-trackly p-4 text-left transition ${
        selected
          ? "border-trackly-primary bg-trackly-primary/5"
          : "border-trackly-border hover:border-trackly-primary"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-trackly-muted">{subtitle}</div>
        </div>
      </div>

      <ul className="text-xs space-y-1 text-trackly-muted">
        {description.map((d) => (
          <li key={d}>• {d}</li>
        ))}
      </ul>
    </button>
  );
}

export default function Admin() {
  const { user, role } = useAuth();

  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [draftSettings, setDraftSettings] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  const [userToDelete, setUserToDelete] = useState(null);
  const [userToToggle, setUserToToggle] = useState(null);

  const [toast, setToast] = useState({ message: "", type: "success" });

  const [hasNewReports, setHasNewReports] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showHoursPanel, setShowHoursPanel] = useState(false);
  const [showManagement, setShowManagement] = useState(false);

  /* ===== CREATE USER ===== */
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createSuccess, setCreateSuccess] = useState("");

  useEffect(() => {
    if (role !== "admin") return;

    loadSettings();
    const unsubUsers = listenAllUsers(setUsers);

    const qReports = query(
      collection(db, "reports"),
      orderBy("submittedAt", "desc")
    );

    const unsubReports = onSnapshot(qReports, (snap) => {
      setHasNewReports(
        snap.docs.some((d) => d.data().status === "submitted")
      );
    });

    return () => {
      unsubUsers();
      unsubReports();
    };
  }, [role]);

  const loadSettings = async () => {
    const data = await getAdminSettings();
    if (!data) return;

    const normalized = {
      mode: "FULL",
      featureManageHours: false,
      featureProjects: false,
      featureTasks: false,
      featureReports: false,
      inactivityEnabled: false,
      inactivityHours: 24,
      ...data,
    };

    setSettings(normalized);
    setDraftSettings(normalized);
  };

  /* ===== SAVE SETTINGS ===== */
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await saveAdminSettings(draftSettings);
      setSettings(draftSettings);

      setShowSuccessOverlay(true);
      setTimeout(() => setShowSuccessOverlay(false), 2000);
    } finally {
      setSavingSettings(false);
    }
  };

  /* ===== CREATE USER ===== */
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
      setCreateSuccess(`Usuario creado correctamente: ${newEmail}`);
      setNewEmail("");
      setNewPassword("");
      setTimeout(() => setCreateSuccess(""), 4000);
    } finally {
      setCreatingUser(false);
    }
  };

  /* ===== TOGGLE USER ===== */
  const toggleUser = async (uid, disabled) => {
    if (uid === user.uid) {
      setToast({
        message: "No puedes deshabilitar tu propio usuario",
        type: "error",
      });
      return false;
    }

    try {
      await setUserDisabled(uid, !disabled);
      return true;
    } catch {
      setToast({
        message: "Error al actualizar el estado del usuario",
        type: "error",
      });
      return false;
    }
  };

  if (role !== "admin") {
    return <p className="p-4 text-gray-500">Sin permisos</p>;
  }

  if (!settings || !draftSettings) {
    return <p className="p-4 text-gray-500">Cargando configuración...</p>;
  }

  return (
    <>
      {/* OVERLAY ÉXITO */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 text-center space-y-4 shadow-xl">
            <div className="text-green-600 text-5xl">✓</div>
            <div className="text-lg font-semibold">
              Cambios guardados con Éxito
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-7xl mx-auto p-4 flex gap-2 flex-wrap">
        {settings.featureManageHours && (
          <button
            onClick={() => setShowHoursPanel(true)}
            className="trackly-btn trackly-btn-secondary"
          >
            Gestión de horas
          </button>
        )}

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

        <button
          onClick={() => setShowManagement(true)}
          className="trackly-btn trackly-btn-secondary"
        >
          Configuración
        </button>
      </div>

      {/* CONFIG */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto p-4">
        <div className="md:col-span-4 trackly-card p-5">
          <h2 className="trackly-label mb-3">Calendario de Feriados</h2>
          <AdminHolidays />
        </div>

        <div className="md:col-span-8 trackly-card p-6 space-y-6">
          <h2 className="trackly-label">Modo de funcionamiento</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <ModeCard
              title="Solo horas"
              subtitle="ONLY_HOURLY"
              icon="⏱"
              description={["Carga simple de horas", "Sin proyectos"]}
              selected={draftSettings.mode === "ONLY_HOURLY"}
              onSelect={() =>
                setDraftSettings((p) => ({ ...p, mode: "ONLY_HOURLY" }))
              }
            />

            <ModeCard
              title="Completo"
              subtitle="FULL"
              icon="🚀"
              description={["Horas + proyectos", "Reportes"]}
              selected={draftSettings.mode === "FULL"}
              onSelect={() =>
                setDraftSettings((p) => ({ ...p, mode: "FULL" }))
              }
            />
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="trackly-btn trackly-btn-primary"
          >
            Guardar configuración
          </button>
        </div>
      </div>

      {/* USERS */}
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
        <div className="md:col-span-8 trackly-card p-4 h-[360px] flex flex-col">
          <h2 className="font-medium mb-3">Usuarios registrados</h2>

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
                          updateUserRole(u.id, e.target.value)
                        }
                        className="input text-xs"
                      >
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

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
                            onClick={() => setUserToToggle(u)}
                            className={`px-2 py-1 text-[10px] rounded w-[90px] ${
                              u.disabled
                                ? "bg-green-600 text-white"
                                : "bg-red-600 text-white"
                            }`}
                          >
                            {u.disabled ? "Habilitar" : "Deshabilitar"}
                          </button>

                          <button
                            onClick={() => setUserToDelete(u)}
                            className="w-[32px] h-[28px] rounded bg-gray-200 hover:bg-gray-300"
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

      {/* MODAL ELIMINAR */}
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

      {/* MODAL TOGGLE */}
      {userToToggle && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-blue-600">
              {userToToggle.disabled
                ? "Habilitar usuario"
                : "Deshabilitar usuario"}
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p><strong>Email:</strong> {userToToggle.email}</p>
              <p><strong>Nombre:</strong> {userToToggle.name || "—"}</p>
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
                  const ok = await toggleUser(
                    userToToggle.id,
                    userToToggle.disabled
                  );
                  if (!ok) return;

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
      
{/* PANEL GESTIÓN DE HORAS */}
{showHoursPanel && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
      <AdminHoursPanel onClose={() => setShowHoursPanel(false)} />
    </div>
  </div>
)}

{/* PANEL GESTIÓN DE INFORMES */}
{showReports && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
      <AdminReports onClose={() => setShowReports(false)} />
    </div>
  </div>
)}

{/* PANEL CONFIGURACIÓN */}
{showManagement && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto p-6">
      <AdminManagementPanel onClose={() => setShowManagement(false)} />
    </div>
  </div>
)}

      <InlineToast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />
    </>
  );
}

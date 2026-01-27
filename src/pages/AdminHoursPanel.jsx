import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import {
  updateHourRecord,
  createHourRecord,
  listenUserHours,
  softDeleteHourRecord,
} from "../services/hoursService";
import { getProjects } from "../services/projectsService";
import { getJiraIssues } from "../services/jiraService";
import { getAllUsers } from "../services/usersService";
import { listenHolidays } from "../services/holidaysService";
import InlineToast from "../components/ui/InlineToast";
import { serverTimestamp } from "firebase/firestore";
import { getTaskTypes } from "../services/taskTypesService";
import TaskTypeSelector from "../components/Shared/TaskTypeSelector";

export default function AdminHoursPanel({ onClose }) {
  const { role, user, settings } = useAuth();
  const { features } = settings || {};

  const isOnlyHourly = settings?.mode === "ONLY_HOURLY";
  const isFullMode = settings?.mode === "FULL";

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");

  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [holidays, setHolidays] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "success" });

  /* =============================
     INIT DATA
  ============================= */
  useEffect(() => {
    if (role !== "admin") return;

    getAllUsers().then(setUsers);

    if (isFullMode && features?.projects) {
      getProjects().then(setProjects);
    }

    if (isFullMode && features?.tasks) {
      getTaskTypes().then(setTaskTypes);
    }

    if (isFullMode && features?.jira) {
      getJiraIssues().then(setJiraIssues);
    }
  }, [role, isFullMode, features]);

  /* =============================
     HOURS REALTIME
  ============================= */
  useEffect(() => {
    if (!selectedUser) {
      setRecords([]);
      return;
    }

    const unsub = listenUserHours(selectedUser, (data) => {
      setRecords(
        data.filter(
          (r) =>
            !r.deleted ||
            r.deletedByRole === "admin" ||
            r.modifiedByRole === "admin"
        )
      );
    });

    return () => unsub();
  }, [selectedUser]);

  /* =============================
     HOLIDAYS
  ============================= */
  useEffect(() => {
    const year = new Date().getFullYear().toString();
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, []);

  /* =============================
     NORMALIZAR EDITING
  ============================= */
  useEffect(() => {
    if (!editing) return;

    if (isOnlyHourly) {
      setEditing((e) => ({
        ...e,
        project: "",
        taskId: "",
        taskTypeId: "",
        jiraIssue: "",
      }));
    }
  }, [isOnlyHourly]);

  /* =============================
     SAVE
  ============================= */
  const handleSaveEdit = async () => {
    if (!editing) return;

    setSaving(true);
    try {
      const payload = {
        date: editing.date,
        hours: Number(editing.hours),
        description: editing.description || "",
        project:
          isFullMode && features?.projects ? editing.project : "",
        taskId:
          isFullMode && features?.tasks ? editing.taskId : "",
        taskTypeId:
          isFullMode && features?.tasks ? editing.taskTypeId : "",
        jiraIssue:
          isFullMode && features?.jira ? editing.jiraIssue : "",
      };

      if (editing.isNew) {
        await createHourRecord({
          ...payload,
          userId: selectedUser,
          createdBy: user.uid,
          createdByRole: "admin",
          createdAt: serverTimestamp(),
          actionType: "created",
        });
      } else {
        await updateHourRecord(editing.id, {
          ...payload,
          modifiedBy: user.uid,
          modifiedByRole: "admin",
          modifiedAt: serverTimestamp(),
          actionType: "edited",
        });
      }

      setEditing(null);
      setToast({
        message: "Cambios guardados correctamente",
        type: "success",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =============================
     DELETE
  ============================= */
  const confirmDelete = async () => {
    setSaving(true);
    try {
      await softDeleteHourRecord(deleting.id, {
        deletedBy: user.uid,
        deletedByRole: "admin",
      });
      setDeleting(null);
      setToast({
        message: "Registro eliminado correctamente",
        type: "success",
      });
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return <p className="p-4 text-red-600">Acceso restringido</p>;
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="trackly-card w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="trackly-h2">Gestión de horas de usuarios</h2>
          <button onClick={onClose} className="trackly-btn trackly-btn-secondary">
            Cerrar
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">

          {/* FILTRO USUARIO + ACCIÓN */}
          <div className="trackly-card p-4 flex items-end justify-between gap-4">
            <div>
              <label className="trackly-label">Usuario</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="trackly-input min-w-[260px]"
              >
                <option value="">Seleccionar usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <button
                onClick={() =>
                  setEditing({
                    isNew: true,
                    date: new Date().toISOString().slice(0, 10),
                    project: "",
                    taskId: "",
                    taskTypeId: "",
                    jiraIssue: "",
                    hours: "",
                    description: "",
                  })
                }
                className="trackly-btn trackly-btn-primary"
              >
                + Nuevo registro
              </button>
            )}
          </div>

          {/* TABLA */}
          <div className="trackly-card overflow-hidden">
            <table className="trackly-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  {isFullMode && <th>Proyecto</th>}
                  <th>Horas</th>
                  <th>Descripción</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td onClick={() => setEditing({ ...r })}>{r.date}</td>

                    {isFullMode && (
                      <td onClick={() => setEditing({ ...r })}>
                        {r.project || "—"}
                      </td>
                    )}

                    <td onClick={() => setEditing({ ...r })}>{r.hours}</td>

                    <td
                      onClick={() => setEditing({ ...r })}
                      className="cursor-pointer"
                    >
                      {r.description || "—"}

                      {r.createdByRole === "admin" &&
                        r.actionType === "created" && (
                          <div className="mt-1 text-[11px] text-purple-600">
                            🛡 Creado por administrador
                          </div>
                        )}

                      {r.modifiedByRole === "admin" &&
                        r.actionType === "edited" && (
                          <div className="mt-1 text-[11px] text-blue-600">
                            🛡 Editado por administrador
                          </div>
                        )}

                      {r.actionType === "deleted" &&
                        (r.deletedByRole === "admin" ||
                          r.modifiedByRole === "admin") && (
                          <div className="mt-1 text-[11px] text-red-600">
                            🛡 Eliminado por administrador
                          </div>
                        )}
                    </td>

                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(r);
                        }}
                        className="text-trackly-danger hover:underline"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <InlineToast
          {...toast}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      </div>

      {/* MODAL EDITAR / NUEVO */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="trackly-card w-full max-w-2xl p-6 space-y-4">

            <h2 className="trackly-h2">
              {editing.isNew ? "Nuevo registro" : "Editar registro"}
            </h2>

            <div className="flex gap-8">
              <div className="w-1/2">
                <MonthCalendarPicker
                  selected={editing.date}
                  holidays={holidays}
                  editable
                  onSelect={(date) =>
                    setEditing((e) => ({ ...e, date }))
                  }
                />
              </div>

              <div className="w-1/2 space-y-3">

                {isFullMode && features?.projects && (
                  <>
                    <label className="trackly-label">Proyecto</label>
                    <select
                      className="trackly-input"
                      value={editing.project}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          project: e.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccionar proyecto</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {isFullMode && features?.tasks && (
                  <TaskTypeSelector
                    taskId={editing.taskId}
                    taskTypeId={editing.taskTypeId}
                    onChange={({ taskId, taskTypeId }) =>
                      setEditing((p) => ({
                        ...p,
                        taskId,
                        taskTypeId,
                      }))
                    }
                  />
                )}

                <label className="trackly-label">Horas</label>
                <input
                  type="number"
                  step="0.25"
                  className="trackly-input"
                  value={editing.hours}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p,
                      hours: e.target.value,
                    }))
                  }
                />

                <textarea
                  className="trackly-input"
                  rows="3"
                  value={editing.description}
                  onChange={(e) =>
                    setEditing((p) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setEditing(null)}
                className="trackly-btn trackly-btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="trackly-btn trackly-btn-primary"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="trackly-card w-full max-w-md p-6 space-y-4">
            <h2 className="text-trackly-danger font-semibold">
              Eliminar registro
            </h2>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="trackly-btn trackly-btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="trackly-btn trackly-btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import {
  getUserHours,
  updateHourRecord,
  restoreHourRecord,
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
import { getTasks } from "../services/tasksService";
import { getTaskTypes } from "../services/taskTypesService";
import { listenAdminSettings } from "../services/adminSettingsService";
import TaskTypeSelector from "../components/shared/TaskTypeSelector";



export default function AdminHoursPanel({ onClose }) {
  const { role, user } = useAuth();

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");

  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);  
  const [loadingJira, setLoadingJira] = useState(false);
  const [loading, setLoading] = useState(false);

  const [projectFilter, setProjectFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [settings, setSettings] = useState(null);


  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [holidays, setHolidays] = useState([]);
  const [dayTotals, setDayTotals] = useState({});
  const [markedDays, setMarkedDays] = useState([]);

  const [toast, setToast] = useState({ message: "", type: "success" });

  /* =============================
     LOAD USERS + PROJECTS
  ============================= */
  useEffect(() => {
    if (role !== "admin") return;
    getAllUsers().then(setUsers);
    getProjects().then(setProjects);
    getTasks().then(setTasks);
    getTaskTypes().then(setTaskTypes);
    getJiraIssues().then(setJiraIssues);
  }, [role]);

  /* =============================
   REALTIME ADMIN SETTINGS
  ============================= */
    useEffect(() => {
      const unsub = listenAdminSettings(setSettings);
      return () => unsub();
    }, []);

    useEffect(() => {
  if (!settings?.featureTaskCombo && editing) {
    setEditing((prev) => ({
      ...prev,
      taskId: "",
      taskTypeId: "",
    }));
  }
}, [settings?.featureTaskCombo]);


  /* =============================
     LOAD HOURS BY USER (REALTIME)
  ============================= */
  useEffect(() => {
    if (!selectedUser) {
      setRecords([]);
      return;
    }

    setLoading(true);

    const unsubscribe = listenUserHours(selectedUser, (data) => {
      const visibleForAdmin = data.filter((r) => {
        if (!r.deleted) return true;
        if (
          r.deleted &&
          (r.deletedByRole === "admin" || r.modifiedByRole === "admin")
        )
          return true;
        return false;
      });

      setRecords(visibleForAdmin);
      setLoading(false);
    });

    return () => unsubscribe();
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
     CALENDAR SUMMARY
  ============================= */
  useEffect(() => {
    const totals = {};
    records.forEach((r) => {
      if (!r.date) return;
      totals[r.date] = (totals[r.date] || 0) + Number(r.hours || 0);
    });

    setDayTotals(totals);
    setMarkedDays(Object.keys(totals));
  }, [records]);

  /* =============================
     FILTERED RECORDS
  ============================= */
  const filteredRecords = useMemo(() => {
    return [...records]
      .filter((r) => {
        if (projectFilter && r.project !== projectFilter) return false;
        if (selectedDate && r.date !== selectedDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, projectFilter, selectedDate]);

  /* =============================
     SAVE (CREATE / EDIT)
  ============================= */
  const handleSaveEdit = async () => {
    if (!editing) return;

    try {
      setSaving(true);

      if (editing.isNew) {
        await createHourRecord({
          userId: selectedUser,
          date: editing.date,
          project: editing.project,
          hours: Number(editing.hours),
          description: editing.description || "",
          createdBy: user.uid,
          createdByRole: "admin",
          createdAt: serverTimestamp(),
          actionType: "created",
        });

        setToast({
          message: "Registro creado por administrador",
          type: "success",
        });
      } else {
            await updateHourRecord(editing.id, {
            project: editing.project,
            task: editing.task || "",
            taskType: editing.taskType || "",
            taskId: editing.taskId || null,
            taskTypeId: editing.taskTypeId || null,
            jiraIssue: editing.jiraIssue || "",
            hours: Number(editing.hours),
            description: editing.description || "",
            date: editing.date,
            modifiedBy: user.uid,
            modifiedByRole: "admin",
            modifiedAt: serverTimestamp(),
            actionType: "edited",
          });             


        setToast({
            message: "Registro editado correctamente",
            type: "success",
            });
      }

      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  /* =============================
     DELETE
  ============================= */
  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      setSaving(true);

      await updateHourRecord(deleting.id, {
        modifiedBy: user.uid,
        modifiedByRole: "admin",
        modifiedAt: serverTimestamp(),
        actionType: "deleted",
      });

      await softDeleteHourRecord(deleting.id, {
        deletedBy: user.uid,
        deletedByRole: "admin",
      });

      setToast({
        message: "Registro eliminado por administrador",
        type: "success",
      });

      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  if (role !== "admin") {
    return <p className="p-4 text-red-600">Acceso restringido</p>;
  }

  if (!settings) {
      return (
        <div className="p-4 text-gray-500">
          Cargando configuración…
        </div>
      );
  }

  return (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="trackly-card w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-trackly-border">
        <h2 className="trackly-h2">Gestión de horas de usuarios</h2>
        <button
          onClick={onClose}
          className="trackly-btn trackly-btn-secondary"
        >
          Cerrar
        </button>
      </div>

      <div className="p-6 space-y-4 overflow-y-auto">
        {/* FILTROS + ACCIÓN */}
        <div className="trackly-card p-4 flex items-end justify-between gap-4">
          {/* LEFT – FILTERS */}
          <div className="flex gap-4 items-end">
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
                    {u.name || "—"} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="trackly-label">Proyecto</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="trackly-input min-w-[200px]"
                disabled={!selectedUser}
              >
                <option value="">Todos los proyectos</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RIGHT – ACTION */}
          {selectedUser && (
            <div className="relative group">
              <button
                onClick={() =>
                  setEditing({
                    isNew: true,
                    date: new Date().toISOString().slice(0, 10),
                    project: projects[0]?.name || "",
                    hours: "",
                    description: "",
                  })
                }
                className="trackly-btn trackly-btn-primary w-9 h-9 p-0"
              >
                +
              </button>

              <div className="absolute right-0 mt-2 rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition pointer-events-none">
                Crear nuevo registro
              </div>
            </div>
          )}
        </div>

        {/* TABLA */}
        <div className="trackly-card overflow-hidden">
          <table className="trackly-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Horas</th>
                <th>Descripción</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {["date", "project", "hours", "description"].map((f) => (
                    <td
                      key={f}
                      className="cursor-pointer"
                      onClick={() => {
                        if (r.deleted && r.deletedByRole === "admin") return;
                        setEditing({ ...r });
                      }}
                    >
                      {r[f] || "—"}

                      {f === "description" && (
                        <>
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
                        </>
                      )}
                    </td>
                  ))}
                  <td className="text-right">
                    <button
                      onClick={() => setDeleting(r)}
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

      <h2 className="trackly-h2 text-trackly-primary">
        {editing.isNew ? "Nuevo registro" : "Editar registro"}
      </h2>

      <div className="flex gap-10 bg-blue-50 border border-blue-200 rounded p-4">

        {/* CALENDARIO */}
        <div className="w-1/2">
          <MonthCalendarPicker
            selected={editing.date}
            holidays={holidays}
            editable
            onSelect={(date) => {
              const d = new Date(date).getDay();
              if (d === 0 || d === 6 || holidays.includes(date)) return;
              setEditing((prev) => ({ ...prev, date }));
            }}
          />
        </div>

        {/* FORMULARIO */}
        <div className="w-1/2 space-y-3">

          {settings?.featureProjectCombo && (
            <>
              <label className="trackly-label">Proyecto</label>
              <select
                className="trackly-input"
                value={editing.project}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
                    project: e.target.value,
                  }))
                }
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              {settings?.featureTaskCombo && (
                    <TaskTypeSelector
                      taskId={editing.taskId}
                      taskTypeId={editing.taskTypeId}
                      onChange={({ taskId, taskTypeId }) =>
                        setEditing((prev) => ({
                          ...prev,
                          taskId,
                          taskTypeId,
                        }))
                      }
                    />
                  )}

            </>
          )}

          {/* JIRA */}
                  {settings?.featureJiraCombo && (
                    <>
                      <label className="block text-sm font-medium">
                        Tarea Jira (opcional)
                      </label>

                      <select
                        value={editing.jiraIssue || ""}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            jiraIssue: e.target.value,
                          }))
                        }
                        className="trackly-input w-full"
                      >
                        <option value="">— Sin tarea Jira —</option>

                        {loadingJira && (
                          <option value="" disabled>
                            Cargando tareas…
                          </option>
                        )}

                        {!loadingJira &&
                          jiraIssues.map((i) => (
                            <option key={i.key} value={i.key}>
                              {i.key} — {i.summary}
                            </option>
                          ))}
                      </select>
                    </>
                  )}

          <label className="trackly-label">Horas</label>
          <input
            type="number"
            step="0.25"
            className="trackly-input"
            value={editing.hours}
            onChange={(e) =>
              setEditing({ ...editing, hours: e.target.value })
            }
          />

          <textarea
            className="trackly-input"
            rows="3"
            value={editing.description}
            onChange={(e) =>
              setEditing({ ...editing, description: e.target.value })
            }
          />
        </div>
      </div>

      {/* ACTIONS */}
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
          {editing.isNew ? "Crear registro" : "Guardar cambios"}
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

          <div className="flex justify-end gap-2 pt-4">
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

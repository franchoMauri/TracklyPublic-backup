import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import {
  updateHourRecord,
  listenUserHours,
} from "../services/hoursService";
import { getProjects } from "../services/projectsService";
import { getJiraIssues } from "../services/jiraService";
import { listenHolidays } from "../services/holidaysService";
import {
  submitMonthlyReport,
  listenUserReports,
} from "../services/reportsService";
import InlineToast from "../components/ui/InlineToast";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { getTasks } from "../services/tasksService";
import { getTaskTypes } from "../services/taskTypesService";
import TaskTypeSelector from "../components/shared/TaskTypeSelector";
import { listenAdminSettings } from "../services/adminSettingsService";

export default function MyRecords() {
  const { user, settings } = useAuth();

  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [loadingJira, setLoadingJira] = useState(false);
  const [loading, setLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [holidays, setHolidays] = useState([]);
  const [dayTotals, setDayTotals] = useState({});
  const [markedDays, setMarkedDays] = useState([]);

  const [toast, setToast] = useState({ message: "", type: "success" });

  const [currentMonthReport, setCurrentMonthReport] = useState(null);
  const currentMonth = new Date().toISOString().slice(0, 7);

  /* =============================
     REALTIME HOURS
  ============================= */
  useEffect(() => {
    if (!user) return;

    const unsub = listenUserHours(user.uid, (data) => {
      setRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  /* =============================
     LIMPIAR TAREA / TIPO SI SE DESHABILITA
  ============================= */
  useEffect(() => {
  if (
    !settings?.featureTaskCombo &&
    editing &&
    (editing.taskId || editing.taskTypeId)
  ) {
    setEditing((prev) => ({
      ...prev,
      task: null,
      taskType: null,
      taskId: null,
      taskTypeId: null,
    }));
  }
}, [settings?.featureTaskCombo]); // 👈 sacamos editing de deps


  /* =============================
     REALTIME REPORTS
  ============================= */
  useEffect(() => {
    if (!user) return;

    const unsub = listenUserReports(user.uid, (reports) => {
      const r = reports.find((x) => x.month === currentMonth);
      setCurrentMonthReport(r || null);
    });

    return () => unsub();
  }, [user, currentMonth]);

  /* =============================
     STATIC DATA
  ============================= */
  useEffect(() => {
    getProjects().then(setProjects);
    getTasks().then(setTasks);
    getTaskTypes().then(setTaskTypes);
    getJiraIssues().then(setJiraIssues);
  }, []);

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
      if (!r.date || r.deleted) return;
      const h = Number(r.hours || 0);
      if (h <= 0) return;
      totals[r.date] = (totals[r.date] || 0) + h;
    });

    Object.keys(totals).forEach((d) => {
      if (totals[d] <= 0) delete totals[d];
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
        if (!showDeleted && r.deleted) return false;
        if (projectFilter && r.project !== projectFilter) return false;
        if (selectedDate && r.date !== selectedDate) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, projectFilter, selectedDate, showDeleted]);

  /* =============================
     REPORT
  ============================= */
  const canSendReport =
    !currentMonthReport ||
    currentMonthReport.status !== "submitted";

  const handleSendReport = async () => {
    const snap = await getDoc(doc(db, "users", user.uid));
    await submitMonthlyReport(
      { uid: user.uid, name: snap.data().name },
      currentMonth
    );

    setToast({ message: "Informe enviado correctamente", type: "success" });
  };

  /* =============================
     SAVE EDIT
  ============================= */
  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);

    try {
      const payload = {
        project: editing.project || "",
        jiraIssue: editing.jiraIssue || "",
        hours: Number(editing.hours),
        description: editing.description || "",
        date: editing.date,

        modifiedBy: user.uid,
        modifiedByRole: "user",
        modifiedAt: serverTimestamp(),
        actionType: "edited",

        ...(settings?.featureTaskCombo
          ? {
              task: editing.task || "",
              taskType: editing.taskType || "",
              taskId: editing.taskId || null,
              taskTypeId: editing.taskTypeId || null,
            }
          : {
              task: null,
              taskType: null,
              taskId: null,
              taskTypeId: null,
            }),
      };

      await updateHourRecord(editing.id, payload);

      setToast({
        message: "Registro editado correctamente",
        type: "success",
      });

      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  /* =============================
     SOFT DELETE
  ============================= */
  const confirmDelete = async () => {
    if (!deleting) return;
    setSaving(true);

    try {
      await updateHourRecord(deleting.id, {
        deleted: true,
        deletedBy: user.uid,
        deletedByRole: "user",
        deletedAt: serverTimestamp(),
        actionType: "deleted",
      });

      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-4 text-gray-500">Cargando registros...</p>;
  }

  return (

  <div className="py-4 mx-auto max-w-7xl px-2 space-y-4">
    {/* HEADER */}
    <InlineToast
      message={toast.message}
      type={toast.type}
      onClose={() => setToast({ message: "", type: "success" })}
    />

    <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-2 items-start">
      {/* LEFT */}
      <div className="space-y-4">
        {/* FILTERS */}
        <div className="trackly-card p-4 flex gap-4 items-center">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="trackly-input min-w-[220px]"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-trackly-muted">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Mostrar registros eliminados
          </label>
        </div>

        {/* TABLE */}
        <div className="trackly-card overflow-hidden">
          <table className="trackly-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proyecto</th>
                <th>Horas</th>
                <th>Descripción</th>
                <th className="w-10" />
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((r) => {
                const deletedByAdmin =
                  r.deleted &&
                  (r.deletedByRole === "admin" ||
                    (r.modifiedByRole === "admin" &&
                      r.actionType === "deleted"));

                return (
                  <tr
                    key={r.id}
                    className={
                      r.deleted
                        ? "bg-red-50 opacity-60"
                        : "hover:bg-gray-50 cursor-pointer"
                    }
                  >
                    {["date", "project", "hours", "description"].map((f) => (
                      <td
                        key={f}
                        className="px-6 py-3"
                        onClick={() => !r.deleted && setEditing({ ...r })}
                      >
                        {r[f] || "-"}

                        {f === "description" && (
                          <>
                            {!r.deleted &&
                              r.createdByRole === "admin" &&
                              r.actionType === "created" && (
                                <div className="mt-1 text-[11px] text-purple-600">
                                  🛡 Creado por administrador
                                </div>
                              )}

                            {!r.deleted &&
                              r.modifiedByRole === "admin" &&
                              r.actionType === "edited" && (
                                <div className="mt-1 text-[11px] text-blue-600">
                                  🛡 Editado por administrador
                                </div>
                              )}

                            {r.deleted &&
                              r.deletedByRole === "admin" && (
                                <div className="mt-1 text-[11px] text-red-600">
                                  🛡 Eliminado por administrador
                                </div>
                              )}

                            {r.deleted &&
                              r.deletedByRole === "user" && (
                                <div className="mt-1 text-[11px] text-gray-600">
                                  👤 Eliminado por vos
                                </div>
                              )}
                          </>
                        )}
                      </td>
                    ))}

                    <td className="text-right px-4 py-3">
                      {!r.deleted && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleting(r);
                          }}
                          className="text-trackly-danger hover:underline"
                        >
                          ❌
                        </button>
                      )}

                      {r.deleted && !deletedByAdmin && (
                        <button
                          onClick={async () => {
                            await updateHourRecord(r.id, {
                              deleted: false,
                              deletedBy: null,
                              deletedByRole: null,
                              deletedAt: null,
                              actionType: "restored",
                              modifiedBy: user.uid,
                              modifiedByRole: "user",
                              modifiedAt: serverTimestamp(),
                            });
                          }}
                          className="text-green-600 text-xs hover:underline"
                        >
                          Restaurar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-3">
        <div className="trackly-card p-2">
          <MonthCalendarPicker
            selected={selectedDate}
            onSelect={setSelectedDate}
            holidays={holidays}
            dayTotals={dayTotals}
            markedDays={markedDays}
            showLegend
            editable={false}
          />
        </div>

        {settings?.featureReports && (
          <div className="trackly-card p-4 space-y-3 text-sm">
            <button
              onClick={handleSendReport}
              disabled={!canSendReport}
              className="trackly-btn trackly-btn-primary w-full disabled:opacity-50"
            >
              Enviar informe mensual
            </button>

            {currentMonthReport && (
              <div className="text-xs space-y-1 text-trackly-muted">
                <div>
                  <strong>Estado:</strong>{" "}
                  {currentMonthReport.status === "submitted" && (
                    <span className="text-blue-600">
                      Pendiente de revisión
                    </span>
                  )}
                  {currentMonthReport.status === "approved" && (
                    <span className="text-green-600">Aprobado</span>
                  )}
                  {currentMonthReport.status === "rejected" && (
                    <span className="text-red-600">Rechazado</span>
                  )}
                </div>

                {currentMonthReport.adminNote && (
                  <div>
                    <strong>Nota del administrador:</strong>{" "}
                    {currentMonthReport.adminNote}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* MODAL EDIT */}
    {editing && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="trackly-card w-full max-w-2xl p-6 space-y-4">
          <h2 className="trackly-h2 text-trackly-primary">
            Editar registro
          </h2>

          <div className="flex gap-10 bg-blue-50 border border-blue-200 rounded p-4">
            <div className="w-1/2">
              <MonthCalendarPicker
                selected={editing.date}
                holidays={holidays}
                editable
                onSelect={(date) =>
                  setEditing((prev) => ({ ...prev, date }))
                }
              />
            </div>

            <div className="w-1/2 space-y-3">
              {settings?.featureProjectCombo && (
                <>
                  <label className="block text-sm font-medium">
                    Proyecto
                  </label>
                  <select
                    className="trackly-input w-full"
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
                </>
              )}

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
                    {!loadingJira &&
                      jiraIssues.map((i) => (
                        <option key={i.key} value={i.key}>
                          {i.key} — {i.summary}
                        </option>
                      ))}
                  </select>
                </>
              )}

              <label className="block text-sm font-medium">Horas</label>
              <input
                type="number"
                step="0.25"
                className="trackly-input w-full"
                value={editing.hours}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
                    hours: e.target.value,
                  }))
                }
              />

              <textarea
                className="trackly-input w-full"
                rows="3"
                value={editing.description}
                onChange={(e) =>
                  setEditing((prev) => ({
                    ...prev,
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
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL DELETE */}
    {deleting && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="trackly-card w-full max-w-md p-6 space-y-4">
          <h2 className="trackly-h2 text-trackly-danger">
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
              disabled={saving}
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

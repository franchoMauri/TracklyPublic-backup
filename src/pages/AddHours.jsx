import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { addHours } from "../services/hoursService";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import { getProjects } from "../services/projectsService";
import { getJiraIssues } from "../services/jiraService";
import { getActiveTaskTypes } from "../services/taskTypesService";
import { listenHolidays } from "../services/holidaysService";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { db } from "../services/firebase";
import MessageBanner from "../components/ui/MessageBanner";
import { getActiveWorkItems } from "../services/workItemsService";
import TaskTypeSelector from "../components/Shared/TaskTypeSelector";
import WorkItemSelector from "../components/Shared/WorkItemSelector";
import WorkItemModal from "../components/workItem/WorkItemModal";

/* =============================
   HORAS DEL USUARIO (REALTIME)
============================= */
function useHorasUsuarioTiempoReal(userId) {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "hours"),
      where("userId", "==", userId)
    );

    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [userId]);

  return records;
}

export default function AddHours() {
  const { user, settings } = useAuth();
  const { features } = settings;

  /* =============================
     MODOS
  ============================= */
  const isOnlyHourly = settings?.mode === "ONLY_HOURLY";
  const isFullMode = settings?.mode === "FULL";

  /* =============================
     STATE
  ============================= */
  const [projects, setProjects] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [workItems, setWorkItems] = useState([]);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [calendarMessage, setCalendarMessage] = useState("");

  const [workItemKey, setWorkItemKey] = useState(0);
  const [workItemModal, setWorkItemModal] = useState(null);

  const hoy = new Date().toISOString().slice(0, 10);
  const year = hoy.slice(0, 4);

  const records = useHorasUsuarioTiempoReal(user?.uid);

  const { dayTotals, markedDays } = useMemo(() => {
    const totals = {};
    records.forEach((r) => {
      if (!r.date || r.deleted) return;
      totals[r.date] = (totals[r.date] || 0) + Number(r.hours || 0);
    });
    return { dayTotals: totals, markedDays: Object.keys(totals) };
  }, [records]);

  const [form, setForm] = useState({
    project: "",
    workItemId: "",
    workItemTitle: "",
    taskId: "",
    taskTypeId: "",
    jiraIssue: "",
    hours: "",
    description: "",
  });

  const [multiple, setMultiple] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [holidays, setHolidays] = useState([]);

  /* =============================
     INIT DATA (solo FULL)
  ============================= */
  useEffect(() => {
    if (!isFullMode) return;

    async function load() {
      const [projects, types, wis] = await Promise.all([
        features.projects ? getProjects() : [],
        features.tasks ? getActiveTaskTypes() : [],
        features.workItems ? getActiveWorkItems() : [],
      ]);

      setProjects(projects || []);
      setTaskTypes(types || []);
      setWorkItems(wis || []);
    }

    load();
  }, [features, isFullMode]);

  useEffect(() => {
    if (isFullMode && features.jira) {
      getJiraIssues().then(setJiraIssues);
    }
  }, [features.jira, isFullMode]);

  useEffect(() => {
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, [year]);

  /* =============================
     HANDLERS
  ============================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((p) => ({ ...p, [e.target.name]: null }));
  };

  const handleHoursChange = (e) => {
    const value = e.target.value;
    if (/^(?:\d+|\d*\.\d+)?$/.test(value)) {
      setForm((f) => ({ ...f, hours: value }));
      setErrors((p) => ({ ...p, hours: null }));
    }
  };

  const handleHoursBlur = () => {
  if (Number(form.hours) <= 0) {
    setErrors((p) => ({
      ...p,
      hours: "Las horas deben ser mayores a 0",
    }));
  }
};

  const handleToggleDay = (iso) => {
    if (holidays.includes(iso)) {
      setCalendarMessage("No podés cargar horas en un día feriado");
      return;
    }
    if (iso > hoy) return;

    setSelectedDays((prev) =>
      multiple
        ? prev.includes(iso)
          ? prev.filter((d) => d !== iso)
          : [...prev, iso]
        : prev.includes(iso)
        ? []
        : [iso]
    );
  };

  /* =============================
     SUBMIT
  ============================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (isFullMode && features.workItems && !form.workItemId) {
      newErrors.workItemId = "Seleccioná una tarea";
    }

    if (!form.hours || Number(form.hours) <= 0) {
      newErrors.hours = "Ingresá horas válidas";
    }

    if (!form.description.trim()) {
      newErrors.description = "La descripción es obligatoria";
    }

    if (!selectedDays.length) {
      setCalendarMessage("Seleccioná al menos un día");
      return;
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);

      const hoursValue = Number(form.hours);
      const totalHoursToAdd = hoursValue * selectedDays.length;

      for (const day of selectedDays) {
        await addHours(user.uid, {
          ...form,
          project: isOnlyHourly ? "" : form.project,
          workItemId: isOnlyHourly ? "" : form.workItemId,
          workItemTitle: isOnlyHourly ? "" : form.workItemTitle,
          taskId: isOnlyHourly ? "" : form.taskId,
          taskTypeId: isOnlyHourly ? "" : form.taskTypeId,
          jiraIssue: isOnlyHourly ? "" : form.jiraIssue,
          date: day,
          hours: hoursValue,
        });
      }

      if (isFullMode && form.workItemId) {
        await updateDoc(
          doc(db, "workItems", form.workItemId),
          {
            actualHours: increment(totalHoursToAdd),
          }
        );
      }

      setSuccess(true);
      setForm({
        project: "",
        workItemId: "",
        workItemTitle: "",
        taskId: "",
        taskTypeId: "",
        jiraIssue: "",
        hours: "",
        description: "",
      });
      setSelectedDays([]);
      setMultiple(false);
    } finally {
      setSaving(false);
    }
  };

  /* =============================
     RENDER
  ============================= */
  return (
    <>
      <div className="trackly-container space-y-6">
        {success && (
          <MessageBanner
            type="success"
            duration={2500}
            onClose={() => setSuccess(false)}
          >
            Horas guardadas correctamente
          </MessageBanner>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 items-start">
          {/* FORM */}
          <div className="trackly-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              {isFullMode && features.projects && (
                <Field label="Proyecto">
                  <select
                    name="project"
                    value={form.project}
                    onChange={handleChange}
                    className="trackly-input"
                  >
                    <option value="">Seleccionar proyecto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {isFullMode && features.workItems && (
                    <Field label="Tarea (Work Item) *" error={errors.workItemId}>
                      <div
                        tabIndex={0}
                        onBlur={() => setWorkItemKey((k) => k + 1)}
                      >
                        <WorkItemSelector
                          key={workItemKey}
                          workItems={workItems}
                          value={form.workItemId}
                          onChange={(wi) => {
                            setForm((f) => ({
                              ...f,
                              workItemId: wi?.id || "",
                              workItemTitle: wi?.title || "",
                            }));

                            // ✅ limpiar error al seleccionar
                            setErrors((e) => ({ ...e, workItemId: null }));
                          }}
                          onCreate={(title) =>
                            setWorkItemModal({
                              __isNew: true,
                              title,
                            })
                          }
                        />
                      </div>
                    </Field>
                  )}


              {isFullMode && features.jira && (
                <Field label="Tarea Jira (opcional)">
                  <select
                    name="jiraIssue"
                    value={form.jiraIssue}
                    onChange={handleChange}
                    className="trackly-input"
                  >
                    <option value="">— Sin tarea Jira —</option>
                    {jiraIssues.map((i) => (
                      <option key={i.key} value={i.key}>
                        {i.key} — {i.summary}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label="Horas *" error={errors.hours}>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  inputMode="decimal"
                  value={form.hours}
                  onChange={handleHoursChange}
                  onBlur={handleHoursBlur}
                  className="trackly-input"
                />
              </Field>

              <Field label="Descripción *" error={errors.description}>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  className="trackly-input"
                />
              </Field>

              <button
                className="trackly-btn trackly-btn-primary w-full"
                disabled={saving}
              >
                {saving ? "Guardando…" : "Guardar horas"}
              </button>
            </form>
          </div>

          {/* CALENDARIO */}
          <div className="trackly-card p-4 space-y-3">
            <MonthCalendarPicker
              selected={selectedDays[0] || null}
              selectedDays={selectedDays}
              multiple={multiple}
              onSelect={handleToggleDay}
              holidays={holidays}
              maxDate={hoy}
              editable
              dayTotals={dayTotals}
              markedDays={markedDays}
              showLegend
            />

            {calendarMessage && (
              <MessageBanner
                type="warning"
                duration={2500}
                onClose={() => setCalendarMessage("")}
              >
                {calendarMessage}
              </MessageBanner>
            )}

            <label className="flex items-center gap-2 text-sm pt-2">
              <input
                type="checkbox"
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
              />
              Registrar múltiples días
            </label>
          </div>
        </div>
      </div>

      {workItemModal && (
        <WorkItemModal
          item={workItemModal}
          onClose={() => setWorkItemModal(null)}
          onSaved={(wi) => {
            setWorkItems((prev) =>
              prev.some((w) => w.id === wi.id)
                ? prev
                : [...prev, wi]
            );
            setForm((f) => ({
              ...f,
              workItemId: wi.id,
              workItemTitle: wi.title,
            }));
            setWorkItemModal(null);
          }}
        />
      )}
    </>
  );
}

/* =============================
   FIELD
============================= */
function Field({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="trackly-label">{label}</label>
      {children}
      {error && <p className="text-xs text-trackly-danger">{error}</p>}
    </div>
  );
}

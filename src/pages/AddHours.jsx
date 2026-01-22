import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { addHours } from "../services/hoursService";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import { getProjects } from "../services/projectsService";
import { getJiraIssues } from "../services/jiraService";
import {
  getAdminSettings,
  listenAdminSettings,
} from "../services/adminSettingsService";
import { getActiveTaskTypes } from "../services/taskTypesService";
import { listenHolidays } from "../services/holidaysService";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import MessageBanner from "../components/ui/MessageBanner";
import { getActiveWorkItems } from "../services/workItemsService";
import TaskTypeSelector from "../components/Shared/TaskTypeSelector.jsx";
import WorkItemSelector from "../components/Shared/WorkItemComboTest.jsx";

/* =============================
   HOOK – HORAS DEL USUARIO
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

  const [projects, setProjects] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [workItems, setWorkItems] = useState([]);

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [calendarMessage, setCalendarMessage] = useState("");

  const hoy = new Date().toISOString().slice(0, 10);
  const year = hoy.slice(0, 4);

  const records = useHorasUsuarioTiempoReal(user?.uid);

  const { dayTotals, markedDays } = useMemo(() => {
    const totals = {};
    records.forEach((r) => {
      if (!r.date || r.deleted) return;
      const h = Number(r.hours || 0);
      if (h > 0) totals[r.date] = (totals[r.date] || 0) + h;
    });
    return { dayTotals: totals, markedDays: Object.keys(totals) };
  }, [records]);

  const [form, setForm] = useState({
    project: "",
    taskId: "",
    taskTypeId: "",
    workItemId: "",
    workItemTitle: "",
    hours: "",
    description: "",
    jiraIssue: "",
  });

  const [multiple, setMultiple] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [holidays, setHolidays] = useState([]);

  /* =============================
     INIT
  ============================= */
  useEffect(() => {
    async function load() {
      const [adminSettings, projects, types, wis] = await Promise.all([
        getAdminSettings(),
        getProjects(),
        getActiveTaskTypes(),
        getActiveWorkItems(),
      ]);

      setProjects(projects);
      setTaskTypes(types);
      setWorkItems(wis);
      setLoadingSettings(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (settings?.featureJiraCombo) {
      getJiraIssues().then(setJiraIssues);
    }
  }, [settings?.featureJiraCombo]);

  useEffect(() => {
  console.log("WORK ITEMS LOADED:", workItems);
}, [workItems]);

  useEffect(() => {
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, [year]);

  /* =============================
     SETTINGS – REALTIME
  ============================= */
  useEffect(() => {
    const unsub = listenAdminSettings(() => {
      setLoadingSettings(false);
    });
    return () => unsub();
  }, []);

  /* =============================
     REACTIVIDAD FEATURES
  ============================= */
  useEffect(() => {
    if (!settings?.featureWorkItems) {
      setForm((prev) => ({
        ...prev,
        workItemId: "",
        workItemTitle: "",
      }));
    }
  }, [settings?.featureWorkItems]);

  useEffect(() => {
    if (!settings?.featureTaskCombo) {
      setForm((prev) => ({
        ...prev,
        taskId: "",
        taskTypeId: "",
      }));
    }
  }, [settings?.featureTaskCombo]);

  useEffect(() => {
    if (!settings?.featureJiraCombo) {
      setForm((prev) => ({ ...prev, jiraIssue: "" }));
    }
  }, [settings?.featureJiraCombo]);

  useEffect(() => {
    if (!settings?.featureProjectCombo) {
      setForm((prev) => ({ ...prev, project: "" }));
    }
  }, [settings?.featureProjectCombo]);

  /* =============================
     HANDLERS
  ============================= */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((p) => ({ ...p, [e.target.name]: null }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (settings?.featureProjectCombo && !form.project)
      newErrors.project = "Seleccioná un proyecto";
    if (!form.hours || Number(form.hours) <= 0)
      newErrors.hours = "Ingresá horas válidas";
    if (selectedDays.length === 0)
      setCalendarMessage("Seleccioná al menos un día");

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      for (const day of selectedDays) {
        await addHours(user.uid, {
          ...form,
          date: day,
          hours: Number(form.hours),
        });
      }

      setSuccess(true);
      setForm({
        project: "",
        taskId: "",
        taskTypeId: "",
        workItemId: "",
        workItemTitle: "",
        hours: "",
        description: "",
        jiraIssue: "",
      });
      setSelectedDays([]);
      setMultiple(false);
    } finally {
      setSaving(false);
    }
  };

  if (loadingSettings) {
    return <p className="text-trackly-muted">Cargando configuración…</p>;
  }

  return (
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
            {settings?.featureProjectCombo && (
              <Field label="Proyecto" error={errors.project}>
                <select
                  name="project"
                  value={form.project}
                  onChange={handleChange}
                  className="trackly-input"
                >
                  <option value="">Seleccionar proyectosssS</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {settings?.featureWorkItems && (
              <Field label="Tarea (Work Item)">
                <WorkItemSelector
                  workItems={workItems}
                  value={form.workItemId}
                  onChange={(wi) =>
                    setForm((prev) => ({
                      ...prev,
                      workItemId: wi?.id || "",
                      workItemTitle: wi?.title || "",
                    }))
                  }
                />
              </Field>
            )}

            {settings?.featureTaskCombo && (
              <TaskTypeSelector
                taskId={form.taskId}
                taskTypeId={form.taskTypeId}
                onChange={({ taskId, taskTypeId }) =>
                  setForm((prev) => ({
                    ...prev,
                    taskId,
                    taskTypeId,
                  }))
                }
              />
            )}

              {settings?.featureJiraCombo && (
            <Field label="Tarea (Work Item)">
                <WorkItemComboTest
                  workItems={workItems}
                  value={form.workItemId}
                  onChange={(wi) =>
                    setForm((prev) => ({
                      ...prev,
                      workItemId: wi?.id || "",
                      workItemTitle: wi?.title || "",
                    }))
                  }
                />
              </Field>
             )}            
          

            {settings?.featureJiraCombo && (
              <Field label="Tarea Jira (opcional)">
                <select
                  name="jiraIssue"
                  value={form.jiraIssue}
                  onChange={handleChange}
                  className="trackly-input"
                >
                  <option value="">— Sin Jira —</option>
                  {jiraIssues.map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.key} — {i.summary}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Horas" error={errors.hours}>
              <input
                type="number"
                name="hours"
                value={form.hours}
                onChange={handleChange}
                step="0.25"
                min="0.25"
                className="trackly-input"
              />
            </Field>

            <Field label="Descripción (opcional)">
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
        <div className="trackly-card p-4 space-y-3 relative">
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

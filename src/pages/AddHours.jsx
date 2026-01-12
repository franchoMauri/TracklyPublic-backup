import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { addHours } from "../services/hoursService";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import { getProjects } from "../services/projectsService";
import { getJiraIssues } from "../services/jiraService";
import { getAdminSettings } from "../services/adminSettingsService";
import { listenHolidays } from "../services/holidaysService";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

/* =============================
   HOOK – HORAS DEL USUARIO (TIEMPO REAL)
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
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecords(data);
    });

    return () => unsub();
  }, [userId]);

  return records;
}

export default function AddHours() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [jiraIssues, setJiraIssues] = useState([]);
  const [loadingJira, setLoadingJira] = useState(false);

  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [holidays, setHolidays] = useState([]);
  const [calendarMessage, setCalendarMessage] = useState("");

  const hoy = new Date().toISOString().slice(0, 10);
  const year = hoy.slice(0, 4);

  // =============================
  // HORAS EN TIEMPO REAL
  // =============================
  const records = useHorasUsuarioTiempoReal(user?.uid);

  const { dayTotals, markedDays } = useMemo(() => {
    const totals = {};
    records.forEach((r) => {
      if (!r.date) return;
      totals[r.date] = (totals[r.date] || 0) + Number(r.hours || 0);
    });
    return {
      dayTotals: totals,
      markedDays: Object.keys(totals),
    };
  }, [records]);

  // =============================
  // FORM STATE
  // =============================
  const [form, setForm] = useState({
    project: "",
    hours: "",
    description: "",
    jiraIssue: "",
    date: "",
  });

  const [multiple, setMultiple] = useState(false);
  const [range, setRange] = useState({ from: "", to: "" });

  // =============================
  // INIT
  // =============================
  useEffect(() => {
    getAdminSettings().then((d) => {
      setSettings(d);
      setLoadingSettings(false);
    });
    getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (!user || !settings?.featureJiraCombo) return;

    async function loadJira() {
      setLoadingJira(true);
      const data = await getJiraIssues();
      setJiraIssues(data);
      setLoadingJira(false);
    }

    loadJira();
  }, [user, settings]);

  useEffect(() => {
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, [year]);

  // =============================
  // HANDLERS
  // =============================
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const showCalendarMessage = (text) => {
    setCalendarMessage(text);
    setTimeout(() => setCalendarMessage(""), 2500);
  };

  const handleSelectDate = (date) => {
    if (date > hoy) return;
    if (holidays.includes(date)) {
      showCalendarMessage("No podés cargar horas en un día feriado");
      return;
    }
    setForm((p) => ({ ...p, date }));
  };

  const isWeekend = (d) => {
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  };

  const getDatesInRange = (from, to) => {
    const dates = [];
    let current = new Date(from);
    const end = new Date(to);

    while (current <= end) {
      const d = current.toISOString().slice(0, 10);
      if (d <= hoy && !holidays.includes(d) && !isWeekend(d)) {
        dates.push(d);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.project || Number(form.hours) <= 0) {
      alert("Completar proyecto y horas válidas");
      return;
    }

    try {
      setSaving(true);

      if (multiple) {
        const days = getDatesInRange(range.from, range.to);
        if (days.length === 0) {
          alert("El rango no contiene días hábiles");
          return;
        }

        for (const day of days) {
          await addHours(user.uid, {
            ...form,
            date: day,
            hours: Number(form.hours),
          });
        }
      } else {
        if (!form.date) {
          alert("Seleccionar una fecha");
          return;
        }

        await addHours(user.uid, {
          ...form,
          hours: Number(form.hours),
        });
      }

      setSuccess(true);
      setForm({
        project: "",
        hours: "",
        description: "",
        jiraIssue: "",
        date: "",
      });
      setMultiple(false);
      setRange({ from: "", to: "" });

      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loadingSettings) {
    return <p className="p-4 text-gray-500">Cargando configuración…</p>;
  }

  // =============================
  // RENDER
  // =============================
  return (
    <div className="py-4 mx-auto max-w-7xl px-2 space-y-4">
      <h1 className="text-2xl font-semibold">Cargar horas</h1>

      {success && (
        <div className="bg-green-100 text-green-700 px-3 py-2 rounded text-sm">
          ✔ Horas guardadas correctamente
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-2">
        {/* FORM */}
        <div className="bg-white rounded shadow p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              name="project"
              value={form.project}
              onChange={handleChange}
              className="input w-full"
              required
            >
              <option value="">Seleccionar proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            {settings?.featureJiraCombo && (
              <select
                name="jiraIssue"
                value={form.jiraIssue}
                onChange={handleChange}
                className="input w-full"
              >
                <option value="">— Sin tarea Jira —</option>
                {jiraIssues.map((i) => (
                  <option key={i.key} value={i.key}>
                    {i.key} — {i.summary}
                  </option>
                ))}
              </select>
            )}

            <input
              type="number"
              name="hours"
              value={form.hours}
              onChange={handleChange}
              className="input w-full"
              step="0.25"
              min="0.25"
              required
            />

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input w-full"
              rows="3"
            />

            <button className="btn-primary w-full" disabled={saving}>
              {saving ? "Guardando…" : "Guardar horas"}
            </button>
          </form>
        </div>

        {/* PANEL CALENDARIO */}
        <div className="bg-white rounded shadow p-3 space-y-3">
          {/* CALENDARIO */}
          <MonthCalendarPicker
            selected={form.date}
            onSelect={handleSelectDate}
            holidays={holidays}
            maxDate={hoy}
            editable={false}
            dayTotals={dayTotals}
            markedDays={markedDays}
          />

          {calendarMessage && (
            <div className="text-xs bg-pink-100 text-pink-700 rounded px-2 py-1">
              {calendarMessage}
            </div>
          )}

          {/* REGISTRO MÚLTIPLE — INTEGRADO AL CALENDARIO */}
          <div className="border-t pt-3 space-y-2 text-xs">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
              />
              Registrar múltiples días
            </label>

            {multiple && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  max={hoy}
                  value={range.from}
                  onChange={(e) =>
                    setRange({ ...range, from: e.target.value })
                  }
                  className="input"
                />
                <input
                  type="date"
                  max={hoy}
                  value={range.to}
                  onChange={(e) =>
                    setRange({ ...range, to: e.target.value })
                  }
                  className="input"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

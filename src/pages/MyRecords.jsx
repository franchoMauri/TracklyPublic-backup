import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import {
  getUserHours,
  updateHourRecord,
  deleteHourRecord,
} from "../services/hoursService";
import { getProjects } from "../services/projectsService";
import { listenHolidays } from "../services/holidaysService";

export default function MyRecords() {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // filtros
  const [projectFilter, setProjectFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  // modal edición
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  // 📧 informe
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  // 📅 feriados
  const [holidays, setHolidays] = useState([]);

  // 📊 calendario
  const [dayTotals, setDayTotals] = useState({});
  const [markedDays, setMarkedDays] = useState([]);

  // =============================
  // CARGA INICIAL
  // =============================
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      const [hoursData, projectsData] = await Promise.all([
        getUserHours(user.uid),
        getProjects(),
      ]);

      setRecords(hoursData);
      setProjects(projectsData);
      setLoading(false);
    }

    loadData();
  }, [user]);

  // =============================
  // FERIADOS
  // =============================
  useEffect(() => {
    if (!user) return;
    const year = new Date().getFullYear().toString();
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, [user]);

  // =============================
  // TOTALES POR DÍA (CALENDARIO)
  // =============================
  useEffect(() => {
    const totals = {};
    records.forEach((r) => {
      if (!r.date) return;
      totals[r.date] = (totals[r.date] || 0) + Number(r.hours || 0);
    });

    setDayTotals(totals);
    setMarkedDays(Object.keys(totals));
  }, [records]);

  // =============================
  // FILTRO
  // =============================
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (projectFilter && r.project !== projectFilter) return false;
      if (selectedDate && r.date !== selectedDate) return false;
      return true;
    });
  }, [records, projectFilter, selectedDate]);

  const totalHours = filteredRecords.reduce(
    (sum, r) => sum + Number(r.hours || 0),
    0
  );

  // =============================
  // 📧 ENVIAR INFORME
  // =============================
  const handleSendReport = async () => {
    try {
      setSendingReport(true);
      setReportMsg("");

      const month =
        selectedDate?.slice(0, 7) ||
        new Date().toISOString().slice(0, 7);

      const res = await fetch(
        `${import.meta.env.VITE_FUNCTIONS_URL}/sendHoursReport`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            month,
          }),
        }
      );

      if (!res.ok) throw new Error();

      setReportMsg("📨 Informe enviado correctamente");
    } catch {
      setReportMsg("❌ Error enviando el informe");
    } finally {
      setSendingReport(false);
      setTimeout(() => setReportMsg(""), 3000);
    }
  };

  // =============================
  // EDITAR
  // =============================
  const handleSaveEdit = async () => {
    if (!editing) return;

    try {
      setSaving(true);

      await updateHourRecord(editing.id, {
        project: editing.project,
        hours: Number(editing.hours),
        description: editing.description || "",
        date: editing.date,
      });

      setRecords((prev) =>
        prev.map((r) => (r.id === editing.id ? editing : r))
      );

      setEditing(null);
    } catch (e) {
      console.error(e);
      alert("Error actualizando registro");
    } finally {
      setSaving(false);
    }
  };

  // =============================
  // ELIMINAR
  // =============================
  const handleDelete = async () => {
    if (!editing) return;

    const ok = confirm(
      "¿Eliminar este registro? Esta acción no se puede deshacer."
    );
    if (!ok) return;

    try {
      setSaving(true);
      await deleteHourRecord(editing.id);
      setRecords((prev) => prev.filter((r) => r.id !== editing.id));
      setEditing(null);
    } catch (e) {
      console.error(e);
      alert("Error eliminando registro");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-4 text-gray-500">Cargando registros...</p>;
  }

  // =============================
  // RENDER
  // =============================
  return (
    <div className="py-4 mx-auto max-w-7xl px-2 space-y-4">
      <h1 className="text-2xl font-semibold">Mis registros</h1>

      {/* 📧 BOTÓN INFORME */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSendReport}
          disabled={sendingReport}
          className="btn-primary text-sm"
        >
          {sendingReport ? "Enviando…" : "Enviar informe por mail"}
        </button>

        {reportMsg && (
          <span className="text-sm text-gray-600">
            {reportMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-2 items-start">
        {/* ===== IZQUIERDA ===== */}
        <div className="space-y-4">
          {/* FILTROS */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-3 items-end">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="input min-w-[200px]"
            >
              <option value="">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Limpiar día
              </button>
            )}
          </div>

          {/* TOTAL */}
          <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg">
            <strong>Total:</strong> {totalHours} horas
          </div>

          {/* TABLA */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">Fecha</th>
                  <th className="px-6 py-3 text-left">Proyecto</th>
                  <th className="px-6 py-3 text-left">Horas</th>
                  <th className="px-6 py-3 text-left">Descripción</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No hay registros
                    </td>
                  </tr>
                )}

                {filteredRecords.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditing({ ...r })}
                  >
                    <td className="px-6 py-3">{r.date}</td>
                    <td className="px-6 py-3">{r.project}</td>
                    <td className="px-6 py-3 font-medium">{r.hours}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {r.description || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== DERECHA – CALENDARIO ===== */}
        <div className="bg-white rounded-lg shadow p-2 w-full">
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
      </div>

      {/* ===== MODAL EDICIÓN ===== */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold">Editar registro</h2>

            <MonthCalendarPicker
              selected={editing.date}
              onSelect={(date) =>
                setEditing((prev) => ({ ...prev, date }))
              }
              holidays={holidays}
              editable
            />

            <select
              className="input w-full"
              value={editing.project}
              onChange={(e) =>
                setEditing({ ...editing, project: e.target.value })
              }
            >
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.25"
              className="input w-full"
              value={editing.hours}
              onChange={(e) =>
                setEditing({ ...editing, hours: e.target.value })
              }
            />

            <textarea
              className="input w-full"
              rows="3"
              value={editing.description}
              onChange={(e) =>
                setEditing({ ...editing, description: e.target.value })
              }
            />

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="text-sm text-red-600 hover:underline"
              >
                Eliminar registro
              </button>

              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </button>

                <button
                  className="btn-primary px-4 py-2 text-sm"
                  disabled={saving}
                  onClick={handleSaveEdit}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

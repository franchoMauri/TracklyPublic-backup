import { useEffect, useState } from "react";
import MonthCalendarPicker from "../layout/ui/MonthCalendarPicker";
import {
  listenHolidays,
  addHoliday,
  removeHoliday,
} from "../../services/holidaysService";

export default function AdminHolidays() {
  const anioActual = new Date().getFullYear();

  const [year, setYear] = useState(anioActual);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  // =============================
  // LISTENER DE FERIADOS
  // =============================
  useEffect(() => {
    setLoading(true);

    const unsubscribe = listenHolidays(year, (days) => {
      setHolidays(days);
      setLoading(false);
    });

    return () => unsubscribe?.();
  }, [year]);

  // =============================
  // TOGGLE FERIADO
  // =============================
  const handleToggleDay = async (iso) => {
    if (holidays.includes(iso)) {
      // Si ya está en la lista → quitar
      await removeHoliday(year, iso);
    } else {
      // Si no está → agregar
      await addHoliday(year, iso);
    }
  };

  // =============================
  // RENDER
  // =============================
  return (
    <div className="space-y-3">
      {/* Selector de año */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-600 font-medium">Año</label>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="input text-xs py-1"
        >
          {[anioActual - 1, anioActual, anioActual + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Calendario */}
      <div className="border rounded-lg p-2">
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Cargando feriados…
          </p>
        ) : (
          <MonthCalendarPicker
            selected={null}
            onSelect={handleToggleDay}
            holidays={holidays}
            showLegend
            editable
          />
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-[11px] text-gray-600">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-pink-200 rounded" />
          Feriado
        </div>

        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 border border-gray-300 rounded" />
          Día normal
        </div>

        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 bg-gray-200 border border-gray-300 rounded" />
          Fin de semana
        </div>
      </div>

      <p className="text-[11px] text-gray-500">
        Click en un día para marcarlo o quitarlo como feriado.
      </p>
    </div>
  );
}
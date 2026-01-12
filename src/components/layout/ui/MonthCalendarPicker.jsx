import { useState } from "react";

function parseLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  const startOffset = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

export default function MonthCalendarPicker({
  selected,
  onSelect,
  markedDays = [],
  dayTotals = {},
  holidays = [],
  maxDate,
  editable = false, // admin = true
  showLegend = false,
}) {
  const today = new Date();
  const selectedDate = selected ? parseLocalDate(selected) : null;
  const initial = selectedDate || today;

  const [current, setCurrent] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  const year = current.getFullYear();
  const month = current.getMonth();
  const days = getMonthDays(year, month);

  const isSameDay = (a, b) =>
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isWeekend = (date) => {
    const d = date.getDay();
    return d === 0 || d === 6;
  };

  return (
    <div className="h-full flex flex-col">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}>
          ◀
        </button>

        <span className="text-sm font-medium capitalize">
          {current.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
          })}
        </span>

        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}>
          ▶
        </button>
      </div>

      {/* ADMIN LABEL */}
      
      {/* DÍAS */}
      <div className="grid grid-cols-7 text-[10px] text-gray-500 mb-1">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={i} />;

          const iso = formatISO(date);
          const total = dayTotals[iso] || 0;

          const isHoliday = holidays.includes(iso);
          const weekend = isWeekend(date);
          const isFuture = maxDate && iso > maxDate;

          const disabled =
            !editable && (isHoliday || weekend || isFuture);

          // 🎨 COLORES (prioridad)
          let color = "";

          if (isHoliday) {
            color = "bg-pink-200 text-pink-800";
          } else if (weekend) {
            color = "bg-gray-200 text-gray-600";
          } else if (total === 8) {
            color = "bg-green-200";
          } else if (total > 8) {
            color = "bg-violet-200";
          } else if (total > 0) {
            color = "bg-yellow-200";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect?.(iso)}
              className={`
                h-8 text-xs rounded transition
                ${color}
                ${disabled ? "cursor-not-allowed opacity-60" : "hover:bg-gray-100"}
                ${isSameDay(date, selectedDate) ? "ring-2 ring-indigo-500" : ""}
                ${
                  !color && isSameDay(date, today)
                    ? "border border-indigo-400"
                    : ""
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* LEYENDA (solo usuario) */}
      {showLegend && !editable && (
        <div className="flex flex-wrap gap-3 text-[10px] text-gray-600 mt-2">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-200 rounded" /> 8 hs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-yellow-200 rounded" /> &lt; 8 hs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-violet-200 rounded" /> &gt; 8 hs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-pink-200 rounded" /> Feriado
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-200 rounded" /> Fin de semana
          </span>
        </div>
      )}
    </div>
  );
}

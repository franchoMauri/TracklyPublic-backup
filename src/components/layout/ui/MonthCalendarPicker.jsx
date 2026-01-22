import { useState, useRef } from "react";

/* ===== Helpers ===== */
function parseLocalISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  selectedDays = [],
  multiple = false,
  onSelect,
  markedDays = [],
  dayTotals = {},
  holidays = [],
  maxDate,
  editable = false,
  showLegend = false,
  variant = "default",
}) {
  const isDashboard = variant === "dashboard";

  const today = new Date();
  const selectedDate = selected ? parseLocalISO(selected) : null;
  const initial = selectedDate || today;

  const [current, setCurrent] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);

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
    <div className="flex flex-col gap-3">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button
          className="text-sm text-trackly-muted"
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
        >
          ←
        </button>

        <span className="text-sm font-medium capitalize">
          {current.toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
          })}
        </span>

        <button
          className="text-sm text-trackly-muted"
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
        >
          →
        </button>
      </div>

      {/* DAYS HEADER */}
      <div className="grid grid-cols-7 text-[11px] text-trackly-muted">
        {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
          <div key={d} className="text-center">
            {d}
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="grid grid-cols-7 gap-2 relative bg-gray-50 p-2 rounded-lg">
        {days.map((date, i) => {
          if (!date) return <div key={i} />;

          const iso = formatLocalISO(date);
          const total = dayTotals[iso] || 0;

          const isHoliday = holidays.includes(iso);
          const weekend = isWeekend(date);
          const isFuture = maxDate && iso > maxDate;
          const disabled = weekend || isFuture;

          const isSelectedSingle =
            selectedDate && isSameDay(date, selectedDate);
          const isSelectedMulti =
            multiple && selectedDays.includes(iso);

          let stateClass = "bg-transparent";

          if (isHoliday) {
            stateClass = "bg-pink-200/60 text-pink-700";
          } else if (total > 8) {
            stateClass = "bg-violet-500/25";
          } else if (total === 8) {
            stateClass = "bg-blue-500/20";
          } else if (total > 0) {
            stateClass = "bg-yellow-400/30";
          }

          return isDashboard ? (
            /* =====================
               DASHBOARD CELL
            ===================== */
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect?.(iso)}
              onMouseEnter={(e) => {
                if (!total && !isHoliday) return;

                const rect = e.currentTarget.getBoundingClientRect();

                timerRef.current = setTimeout(() => {
                  setTooltip({
                    text: isHoliday ? "Feriado" : `${total} hs`,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                  });
                }, 120);
              }}
              onMouseLeave={() => {
                clearTimeout(timerRef.current);
                setTooltip(null);
              }}
              className={`
                h-24 rounded-lg p-2 flex flex-col justify-between
                transition
                ${stateClass}
                ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100"}
                ${
                  isSelectedSingle || isSelectedMulti
                    ? "ring-2 ring-trackly-primary"
                    : ""
                }
              `}
            >
              {/* 🔁 RESTAURADO: NÚMERO DEL DÍA */}
              <span className="text-sm font-semibold text-trackly-text self-end">
                {date.getDate()}
              </span>

              {/* HORAS */}
              {total > 0 && (
                <span className="text-lg font-semibold text-trackly-text self-center">
                  {total}h
                </span>
              )}
            </button>
          ) : (
            /* =====================
               DEFAULT CELL
            ===================== */
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onSelect?.(iso)}
              className={`
                h-10 rounded-md text-xs flex items-center justify-center
                transition
                ${stateClass}
                ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100"}
                ${
                  isSelectedSingle || isSelectedMulti
                    ? "ring-2 ring-trackly-primary"
                    : ""
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* TOOLTIP */}
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 text-[11px]
                     rounded-md bg-gray-900 text-white
                     pointer-events-none shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* LEGEND */}
      {showLegend && !editable && (
        <div className="flex flex-wrap gap-4 text-[11px] text-trackly-muted pt-2">
          <LegendItem label="8 hs" className="bg-blue-500/20" />
          <LegendItem label="< 8 hs" className="bg-yellow-400/30" />
          <LegendItem label="> 8 hs" className="bg-violet-500/25" />
          <LegendItem label="Feriado" className="bg-pink-200/60" />
        </div>
      )}
    </div>
  );
}

/* ===== Legend ===== */
function LegendItem({ label, className }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded ${className}`} />
      {label}
    </span>
  );
}

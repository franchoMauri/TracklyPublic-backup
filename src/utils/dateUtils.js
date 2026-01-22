// src/utils/dateUtils.js

/**
 * Cuenta días hábiles entre una fecha ISO (YYYY-MM-DD)
 * y una fecha Date, excluyendo fines de semana y feriados
 */
export function countBusinessDays(startISO, endDate, holidays = []) {
  if (!startISO || !endDate) return 0;

  const startDate = new Date(`${startISO}T00:00:00`);
  const end = new Date(endDate);

  let count = 0;
  const current = new Date(startDate);

  // avanzar día por día
  while (current < end) {
    current.setDate(current.getDate() + 1);

    const day = current.getDay(); // 0 domingo, 6 sábado
    const iso = current.toISOString().slice(0, 10);

    const isWeekend = day === 0 || day === 6;
    const isHoliday = holidays.includes(iso);

    if (!isWeekend && !isHoliday) {
      count++;
    }
  }

  return count;
}

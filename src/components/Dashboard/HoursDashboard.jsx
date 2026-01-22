import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import MonthCalendarPicker from "../layout/ui/MonthCalendarPicker";
import { listenHolidays } from "../../services/holidaysService";
import {  collection,  query,  where,  onSnapshot,  doc,  getDoc,} from "firebase/firestore";
import { db } from "../../services/firebase";
import { getAdminSettings } from "../../services/adminSettingsService";
import { escucharStatsUsuariosMes } from "../../services/adminStatsService";

/* =============================
   HELPERS
============================= */
function toYearMonthLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* =============================
   HOOK – HORAS EN TIEMPO REAL
============================= */
function useHorasMesTiempoReal(userId, month) {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    if (!userId || !month) {
      setRecords([]);
      return;
    }

    const q = query(
      collection(db, "hours"),
      where("userId", "==", userId),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`)
    );

    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [userId, month]);

  return records;
}

/* =============================
   DASHBOARD
============================= */
export default function HoursDashboard() {
  const { user, role } = useAuth();

  const [activeUser, setActiveUser] = useState(null);
  const [usersStats, setUsersStats] = useState([]);
  const [settings, setSettings] = useState(null);

  const [inactive, setInactive] = useState(false);
  const [inactiveDays, setInactiveDays] = useState(0);
  const [lastActivityDate, setLastActivityDate] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(() =>
    toYearMonthLocal(new Date())
  );

  const [holidays, setHolidays] = useState([]);

  /* =============================
     USUARIO ACTIVO
  ============================= */
  useEffect(() => {
    if (user && !activeUser) setActiveUser(user);
  }, [user, activeUser]);

  /* =============================
     USUARIOS (ADMIN)
  ============================= */
  useEffect(() => {
    if (role !== "admin") return;

    const unsub = escucharStatsUsuariosMes(selectedMonth, (stats) => {
      setUsersStats(stats.filter((u) => u.totalHours > 0));
    });

    return () => unsub?.();
  }, [role, selectedMonth]);

  /* =============================
     SETTINGS
  ============================= */
  useEffect(() => {
    getAdminSettings().then(setSettings);
  }, []);

  /* =============================
     INACTIVIDAD
  ============================= */
  useEffect(() => {
    if (!activeUser || !settings?.inactivityEnabled) {
      setInactive(false);
      setInactiveDays(0);
      setLastActivityDate(null);
      return;
    }

    const check = async () => {
      const snap = await getDoc(doc(db, "users", activeUser.uid));
      if (!snap.exists()) return;

      const { lastHourAt } = snap.data();
      if (!lastHourAt) {
        setInactive(true);
        setInactiveDays(1);
        return;
      }

      const lastDate = lastHourAt.toDate();
      setLastActivityDate(lastDate);

      const diffDays = Math.floor(
        (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      setInactive(diffDays >= 1);
      setInactiveDays(diffDays);
    };

    check();
  }, [activeUser, settings]);

  /* =============================
     FERIADOS
  ============================= */
  useEffect(() => {
    const year = selectedMonth.slice(0, 4);
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, [selectedMonth]);

  /* =============================
     HORAS
  ============================= */
  const records = useHorasMesTiempoReal(activeUser?.uid, selectedMonth);

  /* =============================
     MÉTRICAS
  ============================= */
  const metrics = useMemo(() => {
    const dayTotals = {};
    let total = 0;
    let maxDayHours = 0;

    records.forEach((r) => {
      if (!r.date || r.deleted) return;
      const h = Number(r.hours || 0);
      if (h <= 0) return;

      total += h;
      dayTotals[r.date] = (dayTotals[r.date] || 0) + h;
      maxDayHours = Math.max(maxDayHours, dayTotals[r.date]);
    });

    const daysWorked = Object.keys(dayTotals).length;
    const avg = daysWorked ? (total / daysWorked).toFixed(1) : 0;
    const progress = Math.min(100, Math.round((total / 160) * 100));

    return {
      total,
      avg,
      maxDayHours,
      daysWorked,
      progress,
      markedDays: Object.keys(dayTotals),
      dayTotals,
    };
  }, [records]);

  /* =============================
     RENDER
  ============================= */
  return (
    <div className="trackly-container space-y-8">
      <MonthlySummaryCard month={selectedMonth} metrics={metrics} />

      <div className="trackly-card p-6">
        <MonthCalendarPicker
          selected={null}
          onSelect={(day) => setSelectedMonth(day.slice(0, 7))}
          markedDays={metrics.markedDays}
          dayTotals={metrics.dayTotals}
          holidays={holidays}
          editable={false}
          showLegend
          variant="dashboard"
        />
      </div>
    </div>
  );
}

/* =============================
   COMPONENTES
============================= */

function MonthlySummaryCard({ month, metrics }) {
  const monthLabel = new Date(`${month}-01`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="trackly-card p-8 space-y-8">
      <h2 className="trackly-h2 capitalize">{monthLabel}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <Metric label="Total cargado" value={`${metrics.total} hs`} />
        <Metric label="Promedio diario" value={`${metrics.avg} hs`} />
        <Metric label="Días trabajados" value={metrics.daysWorked} />
        <Metric label="Máx. en un día" value={`${metrics.maxDayHours} hs`} />
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="space-y-1">
      <span className="trackly-label">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import { escucharStatsUsuariosMes } from "../services/adminStatsService";
import { listenHolidays } from "../services/holidaysService";
import UserMonthCard from "../components/admin/UserMonthCard";
import { Link } from "react-router-dom";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

/* =============================
   HOOK INTERNO – HORAS EN TIEMPO REAL
============================= */
function useHorasMesTiempoReal(userId, month) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !month) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "hours"),
      where("userId", "==", userId),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRecords(data);
      setLoading(false);
    });

    return () => unsub();
  }, [userId, month]);

  return { records, loading };
}

export default function Dashboard() {
  const { user, role } = useAuth();

  const [activeUser, setActiveUser] = useState(null);
  const [usersStats, setUsersStats] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [holidays, setHolidays] = useState([]);

  // =============================
  // usuario activo inicial
  // =============================
  useEffect(() => {
    if (user && !activeUser) {
      setActiveUser(user);
    }
  }, [user, activeUser]);

  // =============================
  // FERIADOS
  // =============================
  useEffect(() => {
    const year = selectedMonth.slice(0, 4);
    const unsub = listenHolidays(year, setHolidays);
    return () => unsub?.();
  }, [selectedMonth]);

  // =============================
  // STATS USUARIOS (ADMIN)
  // =============================
  useEffect(() => {
    if (role !== "admin") {
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);

    const unsub = escucharStatsUsuariosMes(selectedMonth, (stats) => {
      setUsersStats(stats.filter((u) => u.totalHours > 0));
      setLoadingUsers(false);
    });

    return () => unsub?.();
  }, [selectedMonth, role]);

  // =============================
  // HORAS DEL USUARIO ACTIVO
  // =============================
  const {
    records,
    loading: loadingRecords,
  } = useHorasMesTiempoReal(activeUser?.uid, selectedMonth);

  // =============================
  // MÉTRICAS
  // =============================
  const metrics = useMemo(() => {
    const dayTotals = {};
    let total = 0;

    records.forEach((r) => {
      const h = Number(r.hours || 0);
      if (!r.date || h <= 0) return;

      total += h;
      dayTotals[r.date] = (dayTotals[r.date] || 0) + h;
    });

    const days = Object.keys(dayTotals).length;

    return {
      total,
      avg: days ? (total / days).toFixed(1) : 0,
      markedDays: Object.keys(dayTotals),
      dayTotals,
    };
  }, [records]);

  const orderedRecords = [...records].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const noData = !loadingRecords && records.length === 0;

  // =============================
  // RENDER
  // =============================
  return (
    <div className="max-w-7xl mx-auto py-4 px-4 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {activeUser && role === "admin" && (
        <div className="text-xs text-gray-500">
          Viendo horas de{" "}
          <span className="font-medium text-gray-700">
            {activeUser.name || activeUser.email}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loadingRecords ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <MetricCard label="Total de horas del mes" value={metrics.total} />
              <MetricCard label="Promedio diario" value={metrics.avg} />
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-3">
          <MonthCalendarPicker
            selected={null}
            onSelect={(day) => setSelectedMonth(day.slice(0, 7))}
            markedDays={metrics.markedDays}
            dayTotals={metrics.dayTotals}
            holidays={holidays}
            showLegend
            editable={false}
          />
        </div>
      </div>

      {role === "admin" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {loadingUsers
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonUserCard key={i} />
              ))
            : usersStats.map((u) => (
                <UserMonthCard
                  key={u.uid}
                  user={u}
                  isActive={activeUser?.uid === u.uid}
                  onSelect={
                    activeUser?.uid === u.uid ? undefined : setActiveUser
                  }
                />
              ))}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-base font-medium">Registros del mes</h2>
        </div>

        <div className="overflow-x-auto p-4">
          {loadingRecords ? (
            <SkeletonTable />
          ) : noData ? (
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>Este usuario no tiene horas cargadas este mes.</p>
              <Link to="/add" className="inline-block text-blue-600 underline">
                Cargar horas
              </Link>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <tbody>
                {orderedRecords.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3">{r.date}</td>
                    <td className="px-3">{r.project}</td>
                    <td className="px-3">{r.hours}</td>
                    <td className="px-3">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* =============================
   COMPONENTES UX
============================= */

function MetricCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow p-3">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-3xl font-semibold">{value}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

function SkeletonUserCard() {
  return (
    <div className="bg-white rounded-lg shadow p-3 animate-pulse space-y-2">
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="flex justify-between">
        <div className="h-6 bg-gray-200 rounded w-10" />
        <div className="h-6 bg-gray-200 rounded w-10" />
      </div>
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" />
      ))}
    </div>
  );
}

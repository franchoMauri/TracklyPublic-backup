import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

export function useUserMonthCalendar({ userId, month }) {
  const [records, setRecords] = useState([]);
  const [dayTotals, setDayTotals] = useState({});
  const [markedDays, setMarkedDays] = useState([]);

  useEffect(() => {
    if (!userId || !month) return;

    const q = query(
      collection(db, "hours"),
      where("userId", "==", userId),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = [];
      const totals = {};

      snap.forEach((doc) => {
        const h = doc.data();
        data.push({ id: doc.id, ...h });

        if (!h.date) return;
        totals[h.date] = (totals[h.date] || 0) + Number(h.hours || 0);
      });

      setRecords(data);
      setDayTotals(totals);
      setMarkedDays(Object.keys(totals));
    });

    return () => unsub();
  }, [userId, month]);

  return {
    records,
    dayTotals,
    markedDays,
  };
}

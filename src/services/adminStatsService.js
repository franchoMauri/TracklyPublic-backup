// src/services/adminStatsService.js

import { db } from "./firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { getHolidays } from "./holidaysService";
import { countBusinessDays } from "../utils/dateUtils";

/**
 * Escucha en tiempo real las stats del mes por usuario
 * mes = "YYYY-MM"
 * 👉 SOLO usuarios con horas en ese mes
 */
export function escucharStatsUsuariosMes(mes, callback) {
  const usuariosRef = collection(db, "users");

  const horasQuery = query(
    collection(db, "hours"),
    where("date", ">=", `${mes}-01`),
    where("date", "<=", `${mes}-31`)
  );

  let usuarios = [];
  let holidays = [];

  // =============================
  // FERIADOS (una sola vez)
  // =============================
  const year = Number(mes.slice(0, 4));

  getHolidays(year).then((days) => {
    holidays = days;
  });

  // =============================
  // USUARIOS
  // =============================
  const unsubUsuarios = onSnapshot(usuariosRef, (usersSnap) => {
    usuarios = usersSnap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
  });

  // =============================
  // HORAS (MES CORRIENTE)
  // =============================
  const unsubHoras = onSnapshot(horasQuery, (hoursSnap) => {
    const porUsuario = {};
    const ahora = new Date();

    hoursSnap.forEach((doc) => {
      const h = doc.data();
      if (!h.userId || !h.date || h.deleted) return;

      if (!porUsuario[h.userId]) {
        porUsuario[h.userId] = {
          totalHoras: 0,
          dias: new Set(),
          ultimaFecha: null,
        };
      }

      const horas = Number(h.hours || 0);
      if (horas <= 0) return;

      porUsuario[h.userId].totalHoras += horas;
      porUsuario[h.userId].dias.add(h.date);

      if (
        !porUsuario[h.userId].ultimaFecha ||
        h.date > porUsuario[h.userId].ultimaFecha
      ) {
        porUsuario[h.userId].ultimaFecha = h.date;
      }
    });

    // =============================
    // RESULTADO FINAL
    // 👉 SOLO usuarios con horas en el mes
    // =============================
    const resultado = usuarios
      .filter((u) => porUsuario[u.uid]?.totalHoras > 0)
      .map((u) => {
        const stats = porUsuario[u.uid];

        const inactiveBusinessDays = stats?.ultimaFecha
          ? countBusinessDays(
              stats.ultimaFecha,
              ahora,
              holidays
            )
          : 0;

        return {
          uid: u.uid,
          name: u.name || null,
          email: u.email || null,
          disabled: u.disabled === true,
          totalHours: stats.totalHoras,
          daysCount: stats.dias.size,
          lastActivityDate: stats.ultimaFecha,
          inactiveBusinessDays,
        };
      });

    callback(resultado);
  });

  // =============================
  // CLEANUP
  // =============================
  return () => {
    unsubUsuarios();
    unsubHoras();
  };
}

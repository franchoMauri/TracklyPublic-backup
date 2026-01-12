// src/services/adminStatsService.js

import { db } from "./firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

/**
 * Escucha en tiempo real las stats del mes por usuario
 * mes = "YYYY-MM"
 */
export function escucharStatsUsuariosMes(mes, callback) {
  const usuariosRef = collection(db, "users");

  const horasQuery = query(
    collection(db, "hours"),
    where("date", ">=", `${mes}-01`),
    where("date", "<=", `${mes}-31`)
  );

  let usuarios = [];

  // escuchar usuarios
  const unsubUsuarios = onSnapshot(usuariosRef, (usersSnap) => {
    usuarios = usersSnap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
  });

  // escuchar horas
  const unsubHoras = onSnapshot(horasQuery, (hoursSnap) => {
    const porUsuario = {};
    const ahora = new Date();

    hoursSnap.forEach((doc) => {
      const h = doc.data();
      if (!h.userId || !h.date) return;

      if (!porUsuario[h.userId]) {
        porUsuario[h.userId] = {
          totalHoras: 0,
          dias: new Set(),
          ultimaFecha: null,
        };
      }

      const horas = Number(h.hours || 0);
      if (horas > 0) {
        porUsuario[h.userId].totalHoras += horas;
        porUsuario[h.userId].dias.add(h.date);

        if (
          !porUsuario[h.userId].ultimaFecha ||
          h.date > porUsuario[h.userId].ultimaFecha
        ) {
          porUsuario[h.userId].ultimaFecha = h.date;
        }
      }
    });

    const resultado = usuarios.map((u) => {
      const stats = porUsuario[u.uid];
      let minutosDesdeUltimaCarga = null;

      if (stats?.ultimaFecha) {
        const ultimaFecha = new Date(`${stats.ultimaFecha}T23:59:59`);
        const diferencia = Math.floor(
          (ahora - ultimaFecha) / (1000 * 60)
        );

        minutosDesdeUltimaCarga = Math.max(0, diferencia);
      }

      return {
        uid: u.uid,
        name: u.name || null,
        email: u.email || null,
        disabled: u.disabled === true,
        totalHours: stats?.totalHoras || 0,
        daysCount: stats?.dias?.size || 0,
        lastActivityDate: stats?.ultimaFecha || null,
        minutosDesdeUltimaCarga,
      };
    });

    callback(resultado);
  });

  // función de limpieza
  return () => {
    unsubUsuarios();
    unsubHoras();
  };
}

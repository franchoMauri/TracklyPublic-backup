// src/components/admin/UserMonthCard.jsx

export default function UserMonthCard({ user, isActive, onSelect }) {
  const estaDeshabilitado = user.disabled === true;

  const nombreVisible =
    user.name ||
    user.email ||
    "Usuario";

      let textoActividad = "Sin registros";
      let claseActividad = "text-gray-400";

      const minutos = Number(user.minutosDesdeUltimaCarga);

      if (Number.isFinite(minutos) && minutos >= 0) {
        const dias = Math.floor(minutos / 1440);

        if (dias === 0) {
          textoActividad = "Al día";
          claseActividad = "text-green-600";
        } else if (dias < 3) {
          textoActividad = `Hace ${dias} días`;
          claseActividad = "text-blue-600";
        } else {
          textoActividad = `Hace ${dias} días`;
          claseActividad = "text-red-600";
        }
      }


  return (
    <div
      onClick={() => onSelect?.(user)}
      className={`relative cursor-pointer rounded-lg border p-3 shadow-sm transition
        ${
          isActive
            ? "border-blue-500 bg-blue-50"
            : "border-slate-200 hover:bg-slate-50"
        }
        ${estaDeshabilitado ? "opacity-80" : ""}
      `}
    >
      {estaDeshabilitado && (
        <span className="absolute top-2 right-2 rounded bg-red-100 px-2 py-0.5 text-[9px] font-medium text-red-700">
          DESHABILITADO
        </span>
      )}

      <div className="text-sm font-medium truncate">
        {nombreVisible}
      </div>

      <div className={`mt-1 text-[11px] font-medium ${claseActividad}`}>
        {textoActividad}
      </div>

      <div className="mt-2 flex justify-between text-xs text-gray-600">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase">Horas</span>
          <span className="text-base font-semibold text-gray-900">
            {user.totalHours}
          </span>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-[10px] uppercase">Días</span>
          <span className="text-base font-semibold text-gray-900">
            {user.daysCount}
          </span>
        </div>
      </div>
    </div>
  );
}

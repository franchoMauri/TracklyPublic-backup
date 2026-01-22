import { useEffect, useState } from "react";
import {
  getAdminReports,
  updateReportStatus,
} from "../services/reportsService";
import InlineToast from "../components/ui/InlineToast";

export default function AdminReports({ onClose }) {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pendingApproval, setPendingApproval] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [toast, setToast] = useState({
    message: "",
    type: "success",
  });

  // =============================
  // DERIVED DATA
  // =============================
  const filteredReports = reports.filter(
    (r) => r.month === selectedMonth
  );

  /* =============================
     LOAD REPORTS
  ============================= */
  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminReports();
        setReports(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* =============================
     ACTIONS (PENDIENTE)
  ============================= */
  const handleAction = async (status) => {
    if (!selected) return;

    try {
      setSaving(true);

      await updateReportStatus(
        selected.id,
        status,
        adminNote || null
      );

      setReports((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                status,
                adminNote: adminNote || null,
                reviewedAt: new Date(),
              }
            : r
        )
      );

      setToast({
        message:
          status === "approved"
            ? "Informe aprobado"
            : "Informe rechazado",
        type: "success",
      });

      setSelected(null);
      setAdminNote("");
    } catch {
      setToast({
        message: "Error al actualizar el informe",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =============================
     GRID STATUS CLICK
  ============================= */
  const toggleReportStatus = (report) => {
    // 🔴 Rechazado → iniciar aprobación con nota
    if (report.status === "rejected") {
      setSelected(report);
      setAdminNote(report.adminNote || "");
      setPendingApproval(report);
      return;
    }

    // 🟢 Aprobado → Rechazado inmediato
    if (report.status === "approved") {
      changeStatus(report, "rejected", null);
    }
  };

  const changeStatus = async (report, status, note) => {
    try {
      await updateReportStatus(report.id, status, note);

      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? {
                ...r,
                status,
                adminNote: note,
                reviewedAt: new Date(),
              }
            : r
        )
      );

      setToast({
        message:
          status === "approved"
            ? "Informe aprobado"
            : "Informe rechazado",
        type: "success",
      });
    } catch {
      setToast({
        message: "Error al actualizar el informe",
        type: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Cargando informes…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            Bandeja de Informes
          </h2>

          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-500">
              Mes a consultar
            </label>

            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setSelected(null);
                setPendingApproval(null);
                setAdminNote("");
              }}
              className="border rounded-md px-2 py-1 text-sm text-gray-700"
            >
              {[...new Set(reports.map((r) => r.month))]
                .sort()
                .reverse()
                .map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
            </select>

            <button
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LISTA */}
          <div className="w-1/2 border-r overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Usuario</th>
                  <th className="px-4 py-2 text-left">Mes</th>
                  <th className="px-4 py-2 text-left">Horas</th>
                  <th className="px-4 py-2 text-center">Estado</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => {
                      setSelected(r);
                      setPendingApproval(null);
                      setAdminNote(r.adminNote || "");
                    }}
                    className={`border-t cursor-pointer hover:bg-gray-50 ${
                      selected?.id === r.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-2">{r.userName}</td>
                    <td className="px-4 py-2">{r.month}</td>
                    <td className="px-4 py-2">{r.totalHours}</td>

                    <td className="px-4 py-2 text-center">
                      {r.status === "submitted" && (
                        <span className="text-blue-600 font-medium">
                          Pendiente
                        </span>
                      )}

                      {r.status === "approved" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReportStatus(r);
                          }}
                          className="bg-transparent p-0 text-green-600 underline hover:text-green-700"
                        >
                          Aprobado
                        </button>
                      )}

                      {r.status === "rejected" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReportStatus(r);
                          }}
                          className="bg-transparent p-0 text-red-600 underline hover:text-red-700"
                        >
                          Rechazado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PANEL DERECHO */}
          <div className="w-1/2 p-6 overflow-y-auto space-y-6">
            {!selected ? (
              <div className="text-sm text-gray-400">
                Seleccioná un informe para ver el detalle
              </div>
            ) : (
              <>
                {/* DETALLE DE HORAS (SIEMPRE) */}
                <div className="space-y-1">
                  <h3 className="font-medium">
                    {selected.userName} — {selected.month}
                  </h3>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Total: {selected.totalHours} hs
                    </p>

                    {(selected.status === "approved" ||
                      selected.status === "rejected") && (
                      <div className="px-4 py-1 text-sm rounded-md bg-gray-100 text-gray-700 font-medium">
                        Informe revisado
                      </div>
                    )}
                  </div>
                </div>



                <div className="border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">
                          Fecha
                        </th>
                        <th className="px-3 py-2 text-left">
                          Horas
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(
                        selected.breakdown || {}
                      ).map(([date, h]) => (
                        <tr key={date} className="border-t">
                          <td className="px-3 py-2">
                            {date}
                          </td>
                          <td className="px-3 py-2 relative group">
                            {h}
                            {selected.entriesByDate?.[date]?.length > 0 && (
                              <div className="absolute z-20 hidden group-hover:block bg-gray-800 text-white text-xs rounded-md px-3 py-2 top-full left-0 mt-1 shadow-lg max-w-xs">
                                <div className="font-medium mb-1">
                                  Tareas del día
                                </div>
                                <ul className="space-y-1">
                                  {selected.entriesByDate[date].map(
                                    (e, i) => (
                                      <li key={i}>
                                        • {e.description}{" "}
                                        <span className="text-gray-300">
                                          ({e.hours}h)
                                        </span>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ACCIONES PARA PENDIENTE */}
                {selected.status === "submitted" && (
                  <>
                    <textarea
                      className="input w-full text-sm"
                      rows={3}
                      placeholder="Nota para el usuario (opcional)"
                      value={adminNote}
                      onChange={(e) =>
                        setAdminNote(e.target.value)
                      }
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleAction("approved")
                        }
                        disabled={saving}
                        className="px-4 py-2 rounded bg-green-600 text-white text-sm"
                      >
                        Aprobar
                      </button>

                      <button
                        onClick={() =>
                          handleAction("rejected")
                        }
                        disabled={saving}
                        className="px-4 py-2 rounded bg-red-600 text-white text-sm"
                      >
                        Rechazar
                      </button>
                    </div>
                  </>
                )}

                {/* BLOQUE DE APROBACIÓN DESDE RECHAZADO */}
                {pendingApproval && (
                  <div className="space-y-3 border-t pt-4">
                    <textarea
                      className="input w-full text-sm"
                      rows={3}
                      placeholder="Nota para el usuario (opcional)"
                      value={adminNote}
                      onChange={(e) =>
                        setAdminNote(e.target.value)
                      }
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await changeStatus(
                            pendingApproval,
                            "approved",
                            adminNote || null
                          );
                          setPendingApproval(null);
                          setAdminNote("");
                        }}
                        className="px-4 py-2 rounded bg-green-600 text-white text-sm"
                      >
                        Guardar nota
                      </button>

                      <button
                        onClick={() => {
                          setPendingApproval(null);
                          setAdminNote("");
                        }}
                        className="px-4 py-2 rounded bg-gray-200 text-gray-700 text-sm"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <InlineToast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast({ message: "", type: "success" })
          }
        />
      </div>
    </div>
  );
}

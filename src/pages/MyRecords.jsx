import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import MonthCalendarPicker from "../components/layout/ui/MonthCalendarPicker";
import {
  listenUserHours,
  updateHourRecord,
} from "../services/hoursService";
import { getProjects } from "../services/projectsService";
import { listenHolidays } from "../services/holidaysService";
import {
  submitMonthlyReport,
  listenUserReports,
} from "../services/reportsService";
import InlineToast from "../components/ui/InlineToast";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import MessageBanner from "../components/ui/MessageBanner";
import { getActiveWorkItems } from "../services/workItemsService";
import WorkItemSelector from "../components/Shared/WorkItemSelector";


const REPORT_STATUS_LABELS = {
  submitted: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const REPORT_STATUS_CLASSES = {
  submitted: "text-blue-600",
  approved: "text-green-600",
  rejected: "text-red-600",
};

export default function MyRecords() {
  const { user, settings } = useAuth();

  const isOnlyHourly = settings?.mode === "ONLY_HOURLY";
  const isFullMode = settings?.mode === "FULL";

  const isEnabled = isOnlyHourly || isFullMode;

  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const [holidays, setHolidays] = useState([]);
  const [dayTotals, setDayTotals] = useState({});
  const [markedDays, setMarkedDays] = useState([]);

  const [toast, setToast] = useState({ message: "", type: "success" });

  const [workItems, setWorkItems] = useState([]);
  const [workItemKey, setWorkItemKey] = useState(0);


  const [reports, setReports] = useState([]);
  const [currentMonthReport, setCurrentMonthReport] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  if (!isEnabled) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <MessageBanner type="info">
          Esta sección solo está disponible en los modos{" "}
          <strong>Only Hourly</strong> o <strong>Full</strong>.
        </MessageBanner>
      </div>
    );
  }

  /* HOURS */
  useEffect(() => {
    if (!user) return;
    return listenUserHours(user.uid, (data) => {
      setRecords(data);
      setLoading(false);
    });
  }, [user]);

  /* REPORTS */
  useEffect(() => {
    if (!user) return;
    return listenUserReports(user.uid, (data) => {
      setReports(data);
      const month = data
        .filter((r) => r.month === currentMonth)
        .sort(
          (a, b) =>
            (b.submittedAt?.seconds || 0) -
            (a.submittedAt?.seconds || 0)
        );
      setCurrentMonthReport(month[0] || null);
    });
  }, [user, currentMonth]);

  /* PROJECTS (solo FULL) */
  useEffect(() => {
    if (isFullMode) {
      getProjects().then(setProjects);
    }
  }, [isFullMode]);

  useEffect(() => {
  if (!isFullMode) return;

  getActiveWorkItems().then((items) => {
    setWorkItems(
      (items || []).filter(
        (w) => w.id && w.title
      )
    );
  });
}, [isFullMode]);


  /* HOLIDAYS */
  useEffect(() => {
    const year = new Date().getFullYear().toString();
    return listenHolidays(year, setHolidays);
  }, []);

  /* SUMMARY */
  useEffect(() => {
    const totals = {};
    records.forEach((r) => {
      if (!r.date || r.deleted) return;
      totals[r.date] = (totals[r.date] || 0) + Number(r.hours || 0);
    });
    setDayTotals(totals);
    setMarkedDays(Object.keys(totals));
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // 1️⃣ Eliminados → solo si el checkbox está activo
        if (r.deleted && !showDeleted) return false;

        // 2️⃣ Proyecto → solo en FULL
        if (isFullMode && projectFilter && r.project !== projectFilter)
          return false;

        // 3️⃣ Fecha
        if (selectedDate && r.date !== selectedDate) return false;

        // 4️⃣ Todo lo demás SIEMPRE visible
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [
    records,
    showDeleted,
    projectFilter,
    selectedDate,
    isFullMode,
  ]);


  const canSendReport =
    !currentMonthReport || currentMonthReport.status === "rejected";

  const totalHoursCurrentMonth = useMemo(() => {
    return records
      .filter(
        (r) =>
          !r.deleted &&
          r.date &&
          r.date.startsWith(currentMonth)
      )
      .reduce((acc, r) => acc + Number(r.hours || 0), 0);
  }, [records, currentMonth]);


  const handleSendReport = async () => {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      await submitMonthlyReport(
        { uid: user.uid, name: snap.data().name },
        currentMonth
      );
      setToast({
        message: "Informe enviado correctamente",
        type: "success",
      });
    } catch (e) {
      setToast({
        message: e.message || "No se pudo enviar el informe",
        type: "error",
      });
    }
  };

  /* EDIT */
  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateHourRecord(editing.id, {
        hours: Number(editing.hours),
        description: editing.description,
        modifiedBy: user.uid,
        modifiedByRole: "user",
        modifiedAt: serverTimestamp(),
        actionType: "edited",
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  /* DELETE */
  const confirmDelete = async () => {
    setSaving(true);
    try {
      await updateHourRecord(deleting.id, {
        deleted: true,
        deletedBy: user.uid,
        deletedByRole: "user",
        deletedAt: serverTimestamp(),
        actionType: "deleted",
      });
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  };

  /* RESTORE RECORD */
  const restoreRecord = async (record) => {
  setSaving(true);
  try {
    await updateHourRecord(record.id, {
      deleted: false,
      restoredBy: user.uid,
      restoredByRole: "user",
      restoredAt: serverTimestamp(),
      actionType: "restored",
    });
  } finally {
    setSaving(false);
  }
};


  if (loading) {
    return <p className="p-4 text-gray-500">Cargando registros…</p>;
  }

  return (
    <div className="trackly-container space-y-4">
      <InlineToast
        {...toast}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
        {/* LEFT */}
        <div className="trackly-card">
          <div className="p-4 flex items-center gap-4 border-b">
            {isFullMode && (
              <select
                className="trackly-input"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
              >
                <option value="">Todos los proyectos</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              Mostrar eliminados
            </label>
          </div>

          <table className="trackly-table">
            <thead>
              <tr>
                <th>Fecha</th>
                {isFullMode && <th>Proyecto</th>}
                <th>Horas</th>
                <th>Descripción</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr
                  key={r.id}
                  className={r.deleted ? "bg-red-50 opacity-60" : ""}
                  onClick={() => {
                        if (r.deleted) return;
                        setWorkItemKey((k) => k + 1);
                        setEditing({ ...r });
                      }}
                >
                  <td>{r.date}</td>
                  {isFullMode && <td>{r.project || "—"}</td>}
                  <td>{r.hours}</td>
                  <td>
                        {r.description || "—"}

                        {r.createdByRole === "admin" &&
                          r.actionType === "created" && (
                            <div className="mt-1 text-[11px] text-purple-600">
                              🛡 Creado por administrador
                            </div>
                          )}

                        {r.modifiedByRole === "admin" &&
                          r.actionType === "edited" && (
                            <div className="mt-1 text-[11px] text-blue-600">
                              🛡 Editado por administrador
                            </div>
                          )}

                        {r.actionType === "deleted" &&
                          r.deletedByRole === "admin" && (
                            <div className="mt-1 text-[11px] text-red-600">
                              🛡 Eliminado por administrador
                            </div>
                          )}
                      </td>
                  <td className="text-right">
                    {!r.deleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleting(r);
                        }}
                        className="text-trackly-danger"
                      >
                        ❌
                      </button>
                    )}
                     {r.deleted && r.deletedByRole === "user" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreRecord(r);
                        }}
                        className="text-green-600 hover:underline text-sm"
                      >
                        ♻ Restaurar
                      </button>
                       )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RIGHT */}
        <div className="space-y-3">
          <div className="trackly-card p-2">
            <MonthCalendarPicker
              selected={selectedDate}
               onSelect={(date) => {
                setSelectedDate((prev) => (prev === date ? null : date));
              }}
              holidays={holidays}
              dayTotals={dayTotals}
              markedDays={markedDays}
              editable={false}
              showLegend
            />
          </div>

          <div className="text-sm bg-trackly-bg border border-trackly-border rounded p-2">
              <div className="font-medium">
                Total de horas del mes: {totalHoursCurrentMonth.toFixed(2)} hs
              </div>
            </div>

            <div className="trackly-card p-4 space-y-3">
              <button
                onClick={handleSendReport}
                disabled={!canSendReport}
                className="trackly-btn trackly-btn-primary w-full"
              >
                Enviar informe mensual
              </button>

              <button
                onClick={() => setShowHistory(true)}
                className="trackly-btn trackly-btn-secondary w-full"
              >
                Ver historial
              </button>

              <div className="border-t pt-3 text-sm">
                {!currentMonthReport ? (
                  <span className="italic text-gray-400">
                    Aún no enviaste informe este mes
                  </span>
                ) : (
                  <>
                    <div className="font-medium">
                      Estado:{" "}
                      <span
                        className={`font-medium ${
                          REPORT_STATUS_CLASSES[currentMonthReport.status]
                        }`}
                      >
                        {REPORT_STATUS_LABELS[currentMonthReport.status]}
                      </span>
                    </div>
                    {currentMonthReport.adminNote && (
                      <div className="italic text-gray-600 mt-1">
                        “{currentMonthReport.adminNote}”
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* MODAL EDITAR */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h2 className="text-lg font-semibold">Editar registro</h2>

            {/* PROYECTO – SOLO FULL */}
                {isFullMode && (
                  <div>
                    <label className="trackly-label">Proyecto</label>
                    <select
                      className="trackly-input w-full"
                      value={editing.project || ""}
                      onChange={(e) =>
                        setEditing((p) => ({
                          ...p,
                          project: e.target.value,
                        }))
                      }
                    >
                      <option value="">Seleccionar proyecto</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* WORK ITEM – SOLO FULL */}
                {isFullMode && (
                  <div>
                    <label className="trackly-label">Tarea (Work Item)</label>
                    <WorkItemSelector
                      key={workItemKey}
                      workItems={workItems}
                      value={editing.workItemId || ""}
                      onChange={(wi) =>
                        setEditing((p) => ({
                          ...p,
                          workItemId: wi?.id || "",
                          workItemTitle: wi?.title || "",
                        }))
                      }
                    />
                  </div>
                )}

                {/* HORAS */}
                <div>
                  <label className="trackly-label">Horas</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    required
                    className="trackly-input w-full"
                    value={editing.hours}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        hours: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* DESCRIPCIÓN */}
                <div>
                  <label className="trackly-label">Descripción</label>
                  <textarea
                    rows={3}
                    required
                    className="trackly-input w-full"
                    value={editing.description}
                    onChange={(e) =>
                      setEditing((p) => ({
                        ...p,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>


            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="trackly-btn trackly-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="trackly-btn trackly-btn-primary"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-trackly-danger">
              Eliminar registro
            </h2>

            <p className="text-sm text-gray-600">
              ¿Confirmás que querés eliminar este registro?
            </p>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setDeleting(null)}
                className="trackly-btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="trackly-btn-danger"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <ReportsHistoryModal
          reports={reports}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

/* =============================
   MODAL HISTORIAL
============================= */
function ReportsHistoryModal({ reports, onClose }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            Historial de informes enviados
          </h2>
          <button onClick={onClose} className="text-sm text-gray-500">
            Cerrar
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/2 border-r overflow-y-auto">
            <table className="trackly-table">
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer hover:bg-trackly-bg ${
                      selected?.id === r.id
                        ? "bg-trackly-primary/10"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2">{r.month}</td>
                    <td className="px-4 py-2">{r.totalHours} hs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-1/2 p-6 overflow-y-auto">
            {selected && (
              <>
                <div className="mb-3 text-sm">
                  Estado:{" "}
                  <span
                    className={`font-medium ${
                      REPORT_STATUS_CLASSES[selected.status]
                    }`}
                  >
                    {REPORT_STATUS_LABELS[selected.status]}
                  </span>
                </div>
                <table className="trackly-table">
                  <tbody>
                    {Object.entries(selected.breakdown || {}).map(
                      ([d, h]) => (
                        <tr key={d}>
                          <td>{d}</td>
                          <td>{h} hs</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

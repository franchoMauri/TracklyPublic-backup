import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { httpsCallable } from "firebase/functions";
import { functions, db } from "../../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function AddTimeEntry() {
  const { user } = useAuth();

  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );

  const [jiraIssues, setJiraIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState("");
  const [loadingJira, setLoadingJira] = useState(false);

  const getJiraIssues = httpsCallable(functions, "getJiraIssues");

  // 🔹 Cargar tareas Jira
  useEffect(() => {
    const loadIssues = async () => {
      setLoadingJira(true);
      try {
        const res = await getJiraIssues();
        setJiraIssues(res.data || []);
      } catch (err) {
        console.error("Error cargando Jira issues", err);
      } finally {
        setLoadingJira(false);
      }
    };

    loadIssues();
  }, []);

  // 🔹 Guardar horas
  const handleSubmit = async (e) => {
    e.preventDefault();

    const issue = jiraIssues.find(i => i.key === selectedIssue);

    await addDoc(collection(db, "timeEntries"), {
      userId: user.uid,
      date,
      hours: Number(hours),
      description,

      jira: issue
        ? {
            issueKey: issue.key,
            projectKey: issue.projectKey,
            summary: issue.summary
          }
        : null,

      createdAt: serverTimestamp()
    });

    setHours("");
    setDescription("");
    setSelectedIssue("");
    alert("Horas cargadas correctamente");
  };

  return (
    <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-lg shadow">
      <h1 className="text-xl font-semibold mb-6 text-slate-800 dark:text-white">
        Cargar horas
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* FECHA */}
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
            required
          />
        </div>

        {/* TAREA JIRA */}
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Tarea Jira (opcional)
          </label>

          {loadingJira ? (
            <div className="text-sm text-gray-400 mt-2">
              Cargando tareas...
            </div>
          ) : (
            <select
              value={selectedIssue}
              onChange={e => setSelectedIssue(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="">— Sin tarea asociada —</option>

              {jiraIssues.map(issue => (
                <option key={issue.key} value={issue.key}>
                  {issue.key} — {issue.summary}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* HORAS */}
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Horas
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            value={hours}
            onChange={e => setHours(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
            required
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Descripción
          </label>
          <textarea
            rows="3"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
            placeholder="Qué hiciste…"
          />
        </div>

        {/* BOTÓN */}
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition"
        >
          Guardar horas
        </button>
      </form>
    </div>
  );
}

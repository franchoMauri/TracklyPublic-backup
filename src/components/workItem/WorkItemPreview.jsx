import { useEffect, useRef, useState } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { useAuth } from "../../context/AuthContext";
import { createPortal } from "react-dom";

import AssignUserPopover from "./AssignUserPopover";

export default function WorkItemPreview({ item, onClose }) {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";

  const ref = useRef(null);
  const avatarRef = useRef(null);
  const descRef = useRef(null);

  const [data, setData] = useState(item);
  const [showAssign, setShowAssign] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const [estimate, setEstimate] = useState("");
  const [actual, setActual] = useState("");

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [projects, setProjects] = useState([]);

  /* =============================
     FORMAT DATE
  ============================= */
  const formatDate = (ts) => {
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /* =============================
     LOAD PROJECTS
  ============================= */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "projects"),
      (snap) => {
        setProjects(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );
    return () => unsub();
  }, []);

  /* =============================
     REALTIME ITEM
  ============================= */
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "workItems", item.id),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setData({ id: item.id, ...d });
        setEstimate(d.estimateHours ?? "");
        setActual(d.actualHours ?? "");
      }
    );
    return () => unsub();
  }, [item.id]);

  /* =============================
     REALTIME COMMENTS
  ============================= */
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "workItems", item.id, "comments"),
      (snap) => {
        setComments(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort(
              (a, b) =>
                a.createdAt?.seconds - b.createdAt?.seconds
            )
        );
      }
    );
    return () => unsub();
  }, [item.id]);

  /* =============================
     CLOSE ON OUTSIDE CLICK
  ============================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  /* =============================
     TEXT COMMANDS
  ============================= */
  const exec = (cmd) => {
    document.execCommand(cmd);
    descRef.current?.focus();
  };

  /* =============================
     SAVE DESCRIPTION
  ============================= */
  const saveDescription = async () => {
    if (!isAdmin) return;
    await updateDoc(doc(db, "workItems", item.id), {
      description: descRef.current.innerHTML,
      updatedAt: serverTimestamp(),
    });
    setEditingDesc(false);
  };

  /* =============================
     SAVE PROJECT
  ============================= */
  const changeProject = async (projectId) => {
    const p = projects.find((x) => x.id === projectId);
    await updateDoc(doc(db, "workItems", item.id), {
      projectId: p?.id || "",
      projectName: p?.name || "",
      updatedAt: serverTimestamp(),
    });
  };

  /* =============================
     SAVE HOURS
  ============================= */
  const saveHours = async (field, value) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, "workItems", item.id), {
      [field]: value === "" ? null : Number(value),
    });
  };

  /* =============================
     ADD COMMENT
  ============================= */
  const addComment = async () => {
    if (!commentText.trim()) return;

    await addDoc(
      collection(db, "workItems", item.id, "comments"),
      {
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
      }
    );

    setCommentText("");
  };

  /* =============================
     PROGRESS
  ============================= */
  const progress =
    data.estimateHours && data.actualHours
      ? data.actualHours / data.estimateHours
      : 0;

  const progressPercent = Math.min(progress * 100, 100);
  const isOver = progress > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
      <div
        ref={ref}
        className="
          bg-white w-full max-w-4xl
          max-h-[85vh]
          border border-trackly-border
          shadow-xl rounded-md
          flex flex-col
        "
      >
        {/* HEADER */}
        <div className="flex justify-between items-start px-4 py-3 border-b shrink-0">
          <h3 className="text-sm font-semibold truncate pr-4">
            {data.title}
          </h3>
          <button
            onClick={onClose}
            className="text-trackly-muted hover:text-trackly-primary"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT */}
          <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col min-w-0">
            {editingDesc && isAdmin && (
              <div className="flex gap-2 mb-2 text-xs">
                <button onClick={() => exec("bold")}>B</button>
                <button onClick={() => exec("italic")}>I</button>
                <button onClick={() => exec("underline")}>U</button>
              </div>
            )}

            <div
              ref={descRef}
              contentEditable={isAdmin}
              suppressContentEditableWarning
              onFocus={() => setEditingDesc(true)}
              onBlur={saveDescription}
              className="
                flex-1 overflow-y-auto overflow-x-hidden
                pr-2 text-sm text-trackly-muted
                whitespace-pre-wrap break-words
                outline-none cursor-text
              "
              dangerouslySetInnerHTML={{
                __html:
                  data.description || "<i>Sin descripción</i>",
              }}
            />

            {/* COMMENTS */}
            <div className="border-t pt-3 mt-3 shrink-0">
              <div className="text-xs font-semibold mb-2">
                Comentarios
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-2">
                {comments.map((c) => (
                  <div key={c.id} className="text-xs">
                    <span className="font-medium">
                      {c.createdByName}
                    </span>
                    <p className="text-trackly-muted break-words">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>

              <textarea
                rows={2}
                value={commentText}
                onChange={(e) =>
                  setCommentText(e.target.value)
                }
                placeholder="Añadir comentario..."
                className="trackly-input w-full text-xs resize-none"
              />

              <div className="flex justify-end mt-2">
                <button
                  onClick={addComment}
                  className="text-xs text-trackly-primary hover:underline"
                >
                  Comentar
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-64 border-l bg-trackly-bg px-4 py-4 text-xs space-y-4 shrink-0">
            {/* PROJECT */}
            <div>
              <div className="text-trackly-muted mb-1">
                Proyecto
              </div>

              {isAdmin ? (
                <select
                  value={data.projectId || ""}
                  onChange={(e) =>
                    changeProject(e.target.value)
                  }
                  className="trackly-input w-full text-xs"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="font-medium">
                  {data.projectName || "—"}
                </div>
              )}
            </div>

            {/* ASSIGNED */}
            <div>
              <div className="text-trackly-muted mb-1">
                Usuario asignado
              </div>

              {isAdmin ? (
                <>
                  <button
                    ref={avatarRef}
                    onClick={() => setShowAssign(true)}
                    className="text-left font-medium text-trackly-primary hover:underline"
                  >
                    {data.assignedToName || "Asignar"}
                  </button>

                  {showAssign &&
                    avatarRef.current &&
                    createPortal(
                      <AssignUserPopover
                        anchorRef={avatarRef}
                        item={data}
                        onClose={() =>
                          setShowAssign(false)
                        }
                      />,
                      document.body
                    )}
                </>
              ) : (
                <div className="font-medium">
                  {data.assignedToName || "—"}
                </div>
              )}
            </div>

            {/* ESTIMATE */}
            <div>
              <div className="text-trackly-muted mb-1">
                Tiempo estimado
              </div>
              {isAdmin ? (
                <input
                  type="number"
                  step="0.5"
                  value={estimate}
                  onChange={(e) =>
                    setEstimate(e.target.value)
                  }
                  onBlur={() =>
                    saveHours("estimateHours", estimate)
                  }
                  className="trackly-input w-full text-xs"
                />
              ) : (
                `${data.estimateHours ?? "—"}`
              )}
            </div>

            {/* ACTUAL + PROGRESS */}
            <div>
              <div className="text-trackly-muted mb-1">
                Tiempo real
              </div>

              {isAdmin ? (
                <input
                  type="number"
                  step="0.5"
                  value={actual}
                  onChange={(e) =>
                    setActual(e.target.value)
                  }
                  onBlur={() =>
                    saveHours("actualHours", actual)
                  }
                  className="trackly-input w-full text-xs"
                />
              ) : (
                `${data.actualHours ?? "—"}`
              )}

              {data.estimateHours != null &&
                data.actualHours != null && (
                  <div className="mt-2">
                    <div className="h-2 w-full bg-trackly-border rounded overflow-hidden">
                      <div
                        className={`h-full ${
                          isOver
                            ? "bg-red-500"
                            : "bg-trackly-primary"
                        }`}
                        style={{
                          width: `${progressPercent}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-trackly-muted mt-1 text-right">
                      {Math.round(progress * 100)}%
                    </div>
                  </div>
                )}
            </div>

            {/* CREATED */}
            <div>
              <div className="text-trackly-muted mb-1">
                Creado por
              </div>
              <div className="font-medium">
                {data.createdByName || "—"}
              </div>
              <div className="text-[10px] text-trackly-muted mt-0.5">
                {formatDate(data.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

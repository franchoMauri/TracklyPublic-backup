import { useEffect, useState, useRef } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useUsers } from "../../hooks/useUsers";

export default function AssignUserPopover({
  item,
  onClose,
  anchorRef,
}) {
  const users = useUsers();
  const [pos, setPos] = useState(null);
  const [query, setQuery] = useState("");
  const popoverRef = useRef(null);

  /* =============================
     CALCULAR POSICIÓN
  ============================= */
  useEffect(() => {
    if (!anchorRef?.current) return;

    const rect = anchorRef.current.getBoundingClientRect();

    setPos({
      top: rect.bottom + 6,
      left: rect.left,
    });
  }, [anchorRef]);

  /* =============================
     CLOSE ON OUTSIDE CLICK
  ============================= */
  useEffect(() => {
    if (!pos) return;

    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, [pos, onClose]);

  const assign = async (u) => {
    await updateDoc(doc(db, "workItems", item.id), {
      assignedTo: u.id,
      assignedToName: u.name || u.email,
      updatedAt: serverTimestamp(),
    });
    onClose();
  };

  if (!pos) return null;

  const filteredUsers = users.filter((u) =>
    (u.name || u.email || "")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const getInitials = (user) => {
    if (user.name) {
      return user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  return (
    <div
      ref={popoverRef}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
      }}
      className="
        w-60 bg-white
        border border-trackly-border
        shadow-lg text-xs
        rounded-sm
      "
    >
      {/* HEADER */}
      <div className="px-3 py-2 text-trackly-muted border-b">
        Asignar a
      </div>

      {/* SEARCH */}
      <div className="px-2 py-2 border-b">
        <input
          type="text"
          placeholder="Buscar usuario..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="
            w-full px-2 py-1
            border border-trackly-border
            rounded-sm text-xs
            focus:outline-none
          "
        />
      </div>

      {/* USERS */}
      <div className="max-h-56 overflow-y-auto">
        {filteredUsers.length === 0 ? (
          <div className="px-3 py-2 text-trackly-muted">
            Sin resultados
          </div>
        ) : (
          filteredUsers.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => assign(u)}
              className="
                w-full px-3 py-2
                flex items-center gap-2
                text-left
                hover:bg-trackly-bg
              "
            >
              {/* AVATAR */}
              {u.photoURL || u.avatar ? (
                <img
                  src={u.photoURL || u.avatar}
                  alt={u.name || u.email}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div
                  className="
                    w-7 h-7 rounded-full
                    bg-trackly-bg
                    flex items-center justify-center
                    text-[11px] font-medium
                    text-trackly-muted
                  "
                >
                  {getInitials(u)}
                </div>
              )}

              {/* NAME */}
              <span className="truncate">
                {u.name || u.email}
              </span>
            </button>
          ))
        )}
      </div>

      {/* FOOTER */}
      <button
        type="button"
        onClick={onClose}
        className="w-full px-3 py-2 text-left text-trackly-muted hover:bg-trackly-bg border-t"
      >
        Cancelar
      </button>
    </div>
  );
}

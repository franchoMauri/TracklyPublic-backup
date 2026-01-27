import { useEffect, useState, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";

import WorkItemColumn from "./WorkItemColumn";
import WorkItemCard from "./WorkItemCard";
import WorkItemModal from "./WorkItemModal";
import WorkItemPreview from "./WorkItemPreview";

export default function WorkItemsKanban({ items, statuses }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [activeItem, setActiveItem] = useState(null);

  /* 🔑 estado optimista */
  const [localItems, setLocalItems] = useState(items);

  /* 🔒 evita que firestore pise mientras se arrastra */
  const isDraggingRef = useRef(false);

  /* =============================
     SYNC REALTIME → LOCAL
  ============================= */
  useEffect(() => {
    if (isDraggingRef.current) return;
    setLocalItems(items);
  }, [items]);

  /* =============================
     CREATE (DRAFT)
     👉 NO guarda en Firestore
  ============================= */
  const handleCreate = (statusKey) => {
    setSelectedItem({
      __isNew: true,
      title: "",
      description: "",
      status: statusKey,
      priority: "medium",
    });
  };

  /* =============================
     DND CONFIG
  ============================= */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    })
  );

  /* =============================
     EVENTS
  ============================= */
  const handleDragStart = (event) => {
    isDraggingRef.current = true;
    const item = localItems.find((i) => i.id === event.active.id);
    setActiveItem(item || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    isDraggingRef.current = false;
    setActiveItem(null);

    if (!over) return;

    const itemId = active.id;
    const newStatus = over.id;

    const item = localItems.find((i) => i.id === itemId);
    if (!item || item.status === newStatus) return;

    /* ✅ UPDATE OPTIMISTA */
    setLocalItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, status: newStatus } : i
      )
    );

    /* ✅ PERSISTENCIA */
    try {
      await updateDoc(doc(db, "workItems", id), {
        status: newStatus,
        assignedTo: user.uid,
        assignedToName: user.displayName || user.email,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error moviendo Work Item", e);
    }
  };

  /* =============================
     RENDER
  ============================= */
  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* ================= KANBAN BOARD ================= */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-1 min-w-max">
            {statuses.map((status) => (
              <div key={status.key} className="w-[300px] shrink-0">
                <WorkItemColumn
                  status={status.key}
                  title={status.label.toUpperCase()}
                  items={localItems.filter(
                    (i) => i.status === status.key
                  )}
                  onSelect={setSelectedItem}
                  onPreview={setPreviewItem}
                  onCreate={() => handleCreate(status.key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ================= DRAG OVERLAY ================= */}
        <DragOverlay>
          {activeItem ? (
            <div className="scale-105 shadow-xl w-[280px]">
              <WorkItemCard item={activeItem} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ================= PREVIEW POPUP ================= */}
      {previewItem && (
        <WorkItemPreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* ================= CREATE / EDIT MODAL ================= */}
      {selectedItem && (
        <WorkItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

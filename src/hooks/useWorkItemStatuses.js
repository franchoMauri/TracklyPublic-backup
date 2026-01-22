import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../services/firebase";

export function useWorkItemStatuses() {
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "workItemStatuses"),
      orderBy("order", "asc")
    );

    return onSnapshot(q, (snap) => {
      setStatuses(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.active)
      );
    });
  }, []);

  return statuses;
}

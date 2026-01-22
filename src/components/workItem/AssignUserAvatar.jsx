import { useState } from "react";
import AssignUserPopover from "./AssignUserPopover";

export default function AssignUserAvatar({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          w-7 h-7 rounded-full
          flex items-center justify-center
          text-xs font-medium
          bg-trackly-bg border border-trackly-border
          hover:border-trackly-primary
          transition
        "
        title={
          item.assignedToName
            ? item.assignedToName
            : "Asignar usuario"
        }
      >
        {item.assignedToName
          ? item.assignedToName.charAt(0).toUpperCase()
          : "+"}
      </button>

      {open && (
        <AssignUserPopover
          item={item}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

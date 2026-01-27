export const TRACKLY_MODES = {
  HOURS: "hours",
  PROJECTS: "projects",
  FULL: "full",
};

/**
 * Dado un mode, devuelve las features activas
 */
export function resolveFeatures(mode) {
  switch (mode) {
    case TRACKLY_MODES.HOURS:
      return {
        manageHours: true,
        projects: false,
        tasks: false,
        workItems: false,
        kanban: false,
        reports: false,
      };

    case TRACKLY_MODES.PROJECTS:
      return {
        manageHours: false,
        projects: true,
        tasks: true,
        workItems: true,
        kanban: true,
        reports: false,
      };

    case TRACKLY_MODES.FULL:
    default:
      return {
        manageHours: true,
        projects: true,
        tasks: true,
        workItems: true,
        kanban: true,
        reports: true,
      };
  }
}

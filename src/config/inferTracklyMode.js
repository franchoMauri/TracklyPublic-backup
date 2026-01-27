import { TRACKLY_MODES } from "./tracklyModes";

/**
 * Inferimos el mode a partir de los flags actuales
 * Esto permite migrar sin romper nada
 */
export function inferTracklyMode(settings) {
  if (!settings) return TRACKLY_MODES.FULL;

  const managesHours = settings.featureManageHours;
  const hasProjects =
    settings.featureProjects ||
    settings.featureTasks ||
    settings.featureWorkItems;

  if (managesHours && !hasProjects) {
    return TRACKLY_MODES.HOURS;
  }

  if (!managesHours && hasProjects) {
    return TRACKLY_MODES.PROJECTS;
  }

  return TRACKLY_MODES.FULL;
}

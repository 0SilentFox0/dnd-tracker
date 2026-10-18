export function preloadFx() {
  return Promise.all([import("./auras/canvas/AuraCanvas"), import("./frames/ImpactFrame")]);
}

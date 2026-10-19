// Best effort: a failed chunk (e.g. right after a deploy) just loads again on first use.
export function preloadFx() {
  return Promise.all([import("./auras/canvas/AuraCanvas"), import("./frames/ImpactFrame")]).then(
    () => undefined,
    () => undefined,
  );
}

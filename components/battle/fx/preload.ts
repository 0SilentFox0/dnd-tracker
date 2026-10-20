// Best effort: a failed chunk (e.g. right after a deploy) just loads again on first use.
export function preloadFx() {
  return Promise.all([import("@/components/battle/fx/auras/AuraCanvas"), import("./frames/ImpactFrame"), import("@/components/battle/fx/dice/scene")]).then(
    () => undefined,
    () => undefined,
  );
}

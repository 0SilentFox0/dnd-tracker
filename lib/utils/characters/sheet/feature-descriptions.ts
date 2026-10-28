import type { ResolvedClassEntry } from "@/types/classes";
export function classFeatureDescriptions(entries: ResolvedClassEntry[]) {
  return entries.flatMap(entry => [entry.class, entry.subclass].flatMap(owner => (owner?.features ?? []).filter(feature => feature.level <= entry.level && feature.description?.trim()).map(feature => ({ source: owner!.name, level: feature.level, description: feature.description! }))));
}

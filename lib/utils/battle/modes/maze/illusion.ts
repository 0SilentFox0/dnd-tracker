import type { IllusionDisguise, IllusionPair, MazeConfig } from "@/types/battle";

export const illusionPairs = (maze: MazeConfig | null | undefined): IllusionPair[] => maze?.illusionSwap?.pairs ?? [];

export const illusionPartner = (pairs: IllusionPair[], id: string): IllusionPair | undefined => pairs.find((p) => p.a === id || p.b === id);

export const areIllusionFoes = (pairs: IllusionPair[], aId: string, bId: string): boolean =>
  aId !== bId && pairs.some((p) => (p.a === aId && p.b === bId) || (p.a === bId && p.b === aId));

/** маска для глядача `viewerId`: ким він бачить `targetId` (undefined — справжнім) */
export const disguiseFor = (pairs: IllusionPair[], viewerId: string, targetId: string): IllusionDisguise | undefined => {
  for (const p of pairs) {
    if (p.a === viewerId && p.b === targetId) return p.aSees;

    if (p.b === viewerId && p.a === targetId) return p.bSees;
  }

  return undefined;
};

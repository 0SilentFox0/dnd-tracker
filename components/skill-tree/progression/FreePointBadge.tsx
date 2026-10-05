"use client";

import { useCharacterProgression } from "@/lib/hooks/skills";

export function FreePointBadge({ campaignId, characterId }: { campaignId: string; characterId: string }) {
  const { view } = useCharacterProgression(campaignId, characterId);

  if (!view || view.points.free === 0) return null;

  return (
    <a href="#progression" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-300">
      <span aria-hidden className="h-2 w-2 rotate-45 bg-amber-400" />
      Є вільне очко
    </a>
  );
}

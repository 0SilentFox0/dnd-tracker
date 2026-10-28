"use client";

import { useScenarioPages } from "@/lib/hooks/scenario";
import { useDeckScene } from "@/lib/hooks/show";
import type { SlideDeck } from "@/types/show";

export function DeckSceneSelect({ campaignId, deck }: { campaignId: string; deck: SlideDeck }) {
  const { data: pages = [] } = useScenarioPages(campaignId);

  const scene = useDeckScene(campaignId, deck.id);

  return (
    <label className="flex items-center gap-2 text-sm text-hud-muted">
      Сцена
      <select
        aria-label="Сцена"
        value={deck.scenarioPageId ?? ""}
        disabled={scene.pending}
        onChange={(e) => void scene.set(e.target.value || null)}
        className="h-9 rounded border border-hud-rule bg-black/70 px-2 text-sm text-hud-bone"
      >
        <option value="">Без сцени</option>
        {pages
          .filter((p) => p.kind === "scene")
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
      </select>
    </label>
  );
}

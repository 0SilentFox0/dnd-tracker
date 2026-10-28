"use client";

import { QueryState } from "@/components/common/states";
import { useTravelLog } from "@/lib/hooks/world";
import type { TravelRest } from "@/types/world";

const REST_LABEL: Record<TravelRest, string> = { none: "", short: "короткий відпочинок", long: "довгий відпочинок" };

export function TravelLog({ campaignId }: { campaignId: string }) {
  const log = useTravelLog(campaignId);

  return (
    <QueryState query={log} empty={<p className="text-xs text-hud-muted">Подорожей ще не було.</p>}>
      {(entries) => (
        <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto text-xs text-hud-muted">
          {entries.map((e) => (
            <li key={e.id}>
              <span className="text-hud-ink">{e.heroes.map((h) => h.name).join(", ")}</span> → {e.toMarkerName ?? e.mapName}
              {e.rest !== "none" ? `, ${REST_LABEL[e.rest]}` : ""}
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  );
}

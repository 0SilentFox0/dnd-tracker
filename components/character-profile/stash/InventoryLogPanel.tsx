"use client";

import { useProfile } from "../ProfileContext";
import { describeLog } from "./describe-log";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useInventoryLog } from "@/lib/hooks/characters";

export function InventoryLogPanel() {
  const { campaignId, characterId } = useProfile();

  const log = useInventoryLog(campaignId, characterId);

  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <HudPanel>
      <HudSection title="ЖУРНАЛ">
        {entries.length === 0 && <p className="text-sm text-hud-muted">{log.isPending ? "Завантаження…" : "Записів ще немає."}</p>}
        <ul>
          {entries.map((e) => (
            <li key={e.id} className="break-words border-b border-[#2a2218] py-1.5 text-xs text-hud-muted">
              {new Date(e.createdAt).toLocaleDateString("uk-UA")} · {e.actor.displayName ?? "—"} · <span className="text-hud-ink">{describeLog(e)}</span>
            </li>
          ))}
        </ul>
        {log.hasNextPage && (
          <Button variant="outline" size="sm" className="mt-2" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
            Показати ще
          </Button>
        )}
      </HudSection>
    </HudPanel>
  );
}

"use client";

import { useProfile } from "../ProfileContext";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useCharacterLog } from "@/lib/hooks/characters";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

export function CharacterLogTab() {
  const { campaignId, characterId } = useProfile();

  const log = useCharacterLog(campaignId, characterId);

  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <HudSection title="ЖУРНАЛ">
      {entries.length === 0 && <p className="text-sm text-hud-muted">{log.isPending ? "Завантаження…" : "Записів ще немає."}</p>}
      <ul>
        {entries.map((e) => (
          <li key={e.id} className="break-words border-b border-[#2a2218] py-1.5 text-xs text-hud-muted">
            {new Date(e.createdAt).toLocaleString("uk-UA")} · {e.actor?.displayName ?? "Система"} · <span className="text-hud-ink">{describeCharacterLog(e)}</span>
          </li>
        ))}
      </ul>
      {log.hasNextPage && (
        <Button variant="outline" size="sm" className="mt-2" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
          Показати ще
        </Button>
      )}
    </HudSection>
  );
}

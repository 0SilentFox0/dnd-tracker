"use client";

import { useFormatter } from "next-intl";

import { useProfile } from "../ProfileContext";
import { describeLog } from "./describe-log";

import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useInventoryLog } from "@/lib/hooks/characters";
import { useTranslator } from "@/lib/i18n/use-translator";

export function InventoryLogPanel() {
  const { campaignId, characterId } = useProfile();

  const t = useTranslator("inventory");

  const format = useFormatter();

  const log = useInventoryLog(campaignId, characterId);

  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <HudPanel>
      <HudSection title={t("log.title")}>
        {entries.length === 0 && <p className="text-sm text-hud-muted">{log.isPending ? t("log.loading") : t("log.empty")}</p>}
        <ul>
          {entries.map((e) => (
            <li key={e.id} className="break-words border-b border-[#2a2218] py-1.5 text-xs text-hud-muted">
              {format.dateTime(new Date(e.createdAt), { day: "2-digit", month: "2-digit", year: "numeric" })} · {e.actor.displayName ?? "—"} · <span className="text-hud-ink">{describeLog(e, t)}</span>
            </li>
          ))}
        </ul>
        {log.hasNextPage && (
          <Button variant="outline" size="sm" className="mt-2" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
            {t("log.more")}
          </Button>
        )}
      </HudSection>
    </HudPanel>
  );
}

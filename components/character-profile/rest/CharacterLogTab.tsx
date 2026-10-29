"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useProfile } from "../ProfileContext";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useCharacterLog } from "@/lib/hooks/characters";
import { useTranslator } from "@/lib/i18n/use-translator";
import { describeCharacterLog } from "@/lib/utils/characters/resources/describe-log";

const LOG_DATE = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" } as const;

export function CharacterLogTab() {
  const t = useTranslations("rest.log");

  const tr = useTranslator();

  const format = useFormatter();

  const { campaignId, characterId } = useProfile();

  const log = useCharacterLog(campaignId, characterId);

  const describeLine = (e: Parameters<typeof describeCharacterLog>[0]) => {
    const { key, params } = describeCharacterLog(e);

    return tr(key, params);
  };

  const entries = log.data?.pages.flatMap((p) => p.entries) ?? [];

  return (
    <HudSection title={t("title")}>
      {entries.length === 0 && <p className="text-sm text-hud-muted">{log.isPending ? t("loading") : t("empty")}</p>}
      <ul>
        {entries.map((e) => (
          <li key={e.id} className="break-words border-b border-[#2a2218] py-1.5 text-xs text-hud-muted">
            {format.dateTime(new Date(e.createdAt), LOG_DATE)} · {e.actor?.displayName ?? t("system")} · <span className="text-hud-ink">{describeLine(e)}</span>
          </li>
        ))}
      </ul>
      {log.hasNextPage && (
        <Button variant="outline" size="sm" className="mt-2" disabled={log.isFetchingNextPage} onClick={() => void log.fetchNextPage()}>
          {t("more")}
        </Button>
      )}
    </HudSection>
  );
}

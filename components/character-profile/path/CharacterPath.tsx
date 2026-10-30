"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PathRowCard } from "./PathRowCard";

import { HudPill } from "@/components/hud/page";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { chosenSubclassId, pathSummary, splitPathRows } from "@/lib/utils/characters/classes";
import type { ClassProgression, ProgressionItem, ProgressionRow } from "@/types/classes";

interface CharacterPathProps {
  progression: ClassProgression;
  actions?: { onPick: () => void };
  names?: Record<string, string>;
}

export function CharacterPath({ progression, actions, names }: CharacterPathProps) {
  const t = useTranslations("characterProfile.path");

  const { reached, focus, future } = splitPathRows(progression);

  const chosen = chosenSubclassId(progression);

  const { level, open } = pathSummary(progression);

  const [detail, setDetail] = useState<ProgressionItem | null>(null);

  const card = (row: ProgressionRow) => <PathRowCard key={row.level} row={row} progression={progression} chosen={chosen} onPick={actions?.onPick} onDetail={setDetail} names={names} />;

  const group = (rows: ProgressionRow[], label: string) =>
    rows.length > 0 ? (
      <details>
        <summary className="cursor-pointer text-sm text-hud-muted">{label}</summary>
        <div className="mt-2 space-y-2">{rows.map(card)}</div>
      </details>
    ) : null;

  return (
    <div className="space-y-2">
      {level !== null ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-hud-ink">
          {t("summary", { level, cls: progression.className })}
          {open > 0 ? <HudPill tone="accent">{t("summaryOpen", { count: open })}</HudPill> : null}
        </p>
      ) : null}
      {focus.map(card)}
      {group(reached, t("reached", { count: reached.length }))}
      {group(future, t("upcoming", { count: future.length }))}
      {detail ? (
        <ResponsiveDialog hud open onOpenChange={(o) => !o && setDetail(null)} title={detail.name}>
          <p className="whitespace-pre-line text-sm text-hud-ink">{detail.description}</p>
        </ResponsiveDialog>
      ) : null}
    </div>
  );
}

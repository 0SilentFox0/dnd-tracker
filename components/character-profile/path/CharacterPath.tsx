"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { PathRowCard } from "./PathRowCard";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { chosenSubclassId, splitPathRows } from "@/lib/utils/characters/classes/path";
import type { ClassProgression, ProgressionItem, ProgressionRow } from "@/types/classes";

interface CharacterPathProps {
  progression: ClassProgression;
  actions?: { onPick: () => void };
}

export function CharacterPath({ progression, actions }: CharacterPathProps) {
  const t = useTranslations("characterProfile.path");

  const { reached, focus, future } = splitPathRows(progression);

  const chosen = chosenSubclassId(progression);

  const [detail, setDetail] = useState<ProgressionItem | null>(null);

  const card = (row: ProgressionRow) => <PathRowCard key={row.level} row={row} progression={progression} chosen={chosen} onPick={actions?.onPick} onDetail={setDetail} />;

  const group = (rows: ProgressionRow[], label: string) =>
    rows.length > 0 ? (
      <details>
        <summary className="cursor-pointer text-sm text-hud-muted">{label}</summary>
        <div className="mt-2 space-y-2">{rows.map(card)}</div>
      </details>
    ) : null;

  return (
    <div className="space-y-2">
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

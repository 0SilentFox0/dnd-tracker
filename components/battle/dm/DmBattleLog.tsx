"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ScrollText, Trash2 } from "lucide-react";

import { BattleLogLoadEarlier } from "@/components/battle/log/BattleLogLoadEarlier";
import { LogTimeline } from "@/components/battle/log/LogTimeline";
import { useBattleScene } from "@/lib/hooks/battle";
import { useConfirm } from "@/lib/hooks/common";
import { canRollbackEntry } from "@/lib/utils/battle/view";
import type { BattleAction } from "@/types/battle";

export function DmBattleLog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("battleDm.log");

  const { battle, viewer, actions } = useBattleScene();

  const confirm = useConfirm();

  const entries = useMemo(() => [...((battle.battleLog ?? []) as BattleAction[])].reverse(), [battle.battleLog]);

  const renderActions = (entry: BattleAction) =>
    viewer.isDM && canRollbackEntry(battle, entry) ? (
      <button
        type="button"
        className="flex size-8 items-center justify-center text-hud-danger transition-colors hover:bg-hud-danger/15"
        title={t("rollback")}
        onClick={async () => {
          if (await confirm({ title: t("rollbackConfirm"), confirmLabel: t("confirm") })) {
            actions.rollback.mutate({ actionIndex: entry.actionIndex });
          }
        }}
      >
        <Trash2 className="size-3.5" />
      </button>
    ) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="hud-sc flex items-center gap-2 text-[15px] tracking-[.08em] text-[var(--gold)]">
          <ScrollText className="size-4" />
          {t("title")}
          {entries.length > 0 && <span className="font-sans text-xs tracking-normal text-[var(--hud-muted)]">({entries.length})</span>}
        </span>
        <button type="button" className="h-8 px-2 text-[13px] text-[var(--hud-muted)] hover:text-[var(--ink)]" onClick={onClose}>
          {t("close")}
        </button>
      </div>
      <div className="custom-scrollbar h-[min(50vh,400px)] overflow-y-auto border border-hud-rule bg-black/40 px-2">
        {entries.length === 0 ? (
          <p className="py-2 text-sm italic text-[var(--hud-muted)]">{t("empty")}</p>
        ) : (
          <LogTimeline entries={entries} participants={battle.initiativeOrder ?? []} renderActions={renderActions} />
        )}
        <BattleLogLoadEarlier />
      </div>
    </div>
  );
}

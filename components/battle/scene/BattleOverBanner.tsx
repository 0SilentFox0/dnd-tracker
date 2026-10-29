"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";

import { useBattleScene } from "@/lib/hooks/battle";
import { useTranslator } from "@/lib/i18n/use-translator";
import { formatBattleLog } from "@/lib/utils/battle/log/lines";
import { lastAction } from "@/lib/utils/battle/view";

export const BattleOverBanner = memo(function BattleOverBanner() {
  const t = useTranslator();

  const ts = useTranslations("battle.scene");

  const { battle, dialogs: { resultScreen } } = useBattleScene();

  const last = lastAction(battle.battleLog ?? []);

  return (
    <button type="button" onClick={() => resultScreen.setOpen(true)} className="mx-4 mt-2 flex min-h-10 w-[calc(100%-2rem)] items-center justify-center gap-3 border-y border-[var(--gold)]/60 bg-[var(--gold)]/10 px-3 py-1.5 text-center">
      <Trophy className="size-4 shrink-0 text-[var(--gold)]" />
      <span className="hud-sc text-[17px] tracking-[.12em] text-[var(--ink)]">{ts("over")}</span>
      {last && <span className="truncate text-sm text-[#b8ab95]">{formatBattleLog(t, last)}</span>}
    </button>
  );
});

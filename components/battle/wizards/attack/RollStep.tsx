import { useState } from "react";
import { useTranslations } from "next-intl";

import { type AttackWizardModel,btn } from "./shared";

import { AiRollButton, DiceGrid } from "@/components/battle/hud/DiceInput";
import { Switch } from "@/components/ui/switch";
import { useText } from "@/lib/i18n/use-text";
import { cn } from "@/lib/utils";
import type { AttackMode } from "@/lib/utils/battle/flows";
import type { BattleParticipant } from "@/types/battle";

const MODES: AttackMode[] = ["normal", "advantage", "disadvantage"];

export function RollStep({ wizard: { state, view, actions }, target }: { wizard: AttackWizardModel; target: BattleParticipant }) {
  const t = useTranslations("battleWizards.attack.roll");

  const tc = useTranslations("common.actions");

  const text = useText();

  const [first, setFirst] = useState<number | undefined>();

  const setMode = (m: AttackMode) => {
    setFirst(undefined);
    actions.setMode(m);
  };

  const setInspiration = (v: boolean) => {
    setFirst(undefined);
    actions.setInspiration(v);
  };

  const pick = (v: number) => {
    if (view.rollMode !== "normal" && first === undefined) setFirst(v);
    else actions.roll(first ?? v, first === undefined ? undefined : v);
  };

  return (
    <>
      <div className="hud-sc text-xl font-bold">{t("title")}</div>
      {state.strikes.length > 1 && <div className="mt-1 text-sm text-[var(--hud-muted)]">{t("strike", { n: state.index + 1, total: state.strikes.length, name: target.basicInfo.name })}</div>}
      {view.cover.has(target.basicInfo.id) && <div className="mt-2 text-sm text-[#e0a050]">{t("cover")}</div>}
      <div className={cn("mt-3 grid h-10 grid-cols-3 border border-white/20", view.forcedMode && "opacity-60")}>
        {MODES.map((m) => (
          <button key={m} type="button" disabled={!!view.forcedMode} onClick={() => setMode(m)} className={cn("border-l border-white/20 text-sm first:border-l-0 disabled:cursor-not-allowed", view.rollMode === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-[#a89c88]")}>{t(`rollModes.${m}`)}</button>
        ))}
      </div>
      {view.forcedMode && <div className="mt-1.5 text-xs text-[#cdb87e]">{text(view.forcedMode.reason)}</div>}
      {view.inspirationAvailable && state.index === 0 && (
        <label className="mt-2 flex items-center gap-2 text-sm text-[#cdb87e]">
          <Switch checked={!!state.inspiration} onCheckedChange={setInspiration} aria-label={t("inspiration")} />
          {t("inspirationNote")}
        </label>
      )}
      {view.rollMode !== "normal" && <div className="mt-2 text-xs text-[var(--hud-muted)]">{t("diceHint")}</div>}
      <DiceGrid sides={20} value={first} onPick={pick} />
      <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
        <AiRollButton onClick={actions.aiRoll} />
        <button type="button" onClick={actions.back} className={cn(btn, "border-white/25")}>{tc("back")}</button>
      </div>
    </>
  );
}

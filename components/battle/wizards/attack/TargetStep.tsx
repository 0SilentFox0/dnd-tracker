import { useTranslations } from "next-intl";

import { type AttackWizardModel,btn, primaryBtn } from "./shared";

import { HealthLabel } from "@/components/battle/hud";
import { TargetButton } from "@/components/battle/wizards/TargetButton";
import { cn } from "@/lib/utils";

export function TargetStep({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
  const tw = useTranslations("battleWizards.attack.target");

  const tc = useTranslations("common.actions");

  return (
    <>
      <div className="space-y-2">
        {view.targets.map((t) => (
          <TargetButton
            key={t.basicInfo.id}
            participant={t}
            tone="enemy"
            selected={state.targetIds.includes(t.basicInfo.id)}
            onClick={() => actions.toggleTarget(t.basicInfo.id)}
            trailing={
              <span className="ml-auto flex items-center gap-2">
                {view.cover.has(t.basicInfo.id) && <span className="text-xs text-[#e0a050]" title={tw("cover")}>🧱 ×0.5</span>}
                <HealthLabel participant={t} />
              </span>
            }
          />
        ))}
      </div>
      {view.canSelectAllEnemies && (
        <button type="button" onClick={actions.selectAllEnemies} className={cn(btn, "mt-3 w-full border-white/25")}>{tw("allEnemies")}</button>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={actions.close} className={cn(btn, "border-white/25")}>{tc("cancel")}</button>
        <button type="button" disabled={state.targetIds.length === 0} onClick={actions.confirmTargets} className={cn(btn, primaryBtn, "disabled:opacity-50")}>{tw("next")}</button>
      </div>
    </>
  );
}

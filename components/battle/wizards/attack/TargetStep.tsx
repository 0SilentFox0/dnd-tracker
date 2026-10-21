import { type AttackWizardModel,btn, primaryBtn } from "./shared";

import { HealthLabel } from "@/components/battle/hud";
import { TargetButton } from "@/components/battle/wizards/TargetButton";
import { cn } from "@/lib/utils";

export function TargetStep({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
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
                {view.cover.has(t.basicInfo.id) && <span className="text-xs text-[#e0a050]" title="Між стрільцем і ціллю є перешкода">🧱 ×0.5</span>}
                <HealthLabel participant={t} />
              </span>
            }
          />
        ))}
      </div>
      {view.canSelectAllEnemies && (
        <button type="button" onClick={actions.selectAllEnemies} className={cn(btn, "mt-3 w-full border-white/25")}>Усі вороги</button>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={actions.close} className={cn(btn, "border-white/25")}>Скасувати</button>
        <button type="button" disabled={state.targetIds.length === 0} onClick={actions.confirmTargets} className={cn(btn, primaryBtn, "disabled:opacity-50")}>Далі · кидок</button>
      </div>
    </>
  );
}

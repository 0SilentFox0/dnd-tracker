import { Crosshair, Swords } from "lucide-react";

import type { AttackWizardModel } from "./shared";

import { AttackType } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";
import { signed } from "@/lib/utils/common/format";

export function WeaponStep({ wizard: { state, view, actions } }: { wizard: AttackWizardModel }) {
  return (
    <div className="space-y-2">
      {view.attacks.map((a) => {
        const id = a.id ?? a.name;

        const preview = view.previews[id];

        return (
          <button key={id} type="button" onClick={() => actions.selectWeapon(a)} className={cn("flex h-[76px] w-full items-center gap-3 border px-3 text-left", id === state.attackId ? "border-[var(--enemy)] bg-[var(--enemy)]/15" : "border-white/15")}>
            {a.type === AttackType.RANGED ? <Crosshair className="size-7 shrink-0 text-[var(--gold)]" /> : <Swords className="size-7 shrink-0 text-[var(--gold)]" />}
            <span className="min-w-0 flex-1">
              <span className="hud-sc block text-[17px] font-bold">{a.name}</span>
              <span className="block text-[13px] text-[#a89c88]">{a.type === AttackType.MELEE ? "ближній" : "дальній"} · {signed(preview?.toHit ?? a.attackBonus)} до влучання</span>
              <span className="mt-1 flex flex-wrap gap-x-2.5 text-xs text-[#cdb87e]">
                {preview?.bonuses.map((b) => <span key={b.label}>{b.label} {b.percent ? `${signed(b.percent)}%` : signed(b.flat)}</span>)}
              </span>
            </span>
            <span className="w-[72px] text-right text-[15px]">{preview?.formula || a.damageDice}<small className="block text-xs text-[var(--hud-muted)]">≈ {preview?.estimate}</small></span>
          </button>
        );
      })}
    </div>
  );
}

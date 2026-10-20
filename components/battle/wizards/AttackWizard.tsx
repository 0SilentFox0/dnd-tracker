"use client";

import { Crosshair, Swords } from "lucide-react";

import { DamageStep } from "./attack/DamageStep";
import { RollStep } from "./attack/RollStep";
import type { AttackWizardModel } from "./attack/shared";
import { SummaryStep } from "./attack/SummaryStep";
import { TargetStep } from "./attack/TargetStep";
import { WeaponStep } from "./attack/WeaponStep";

import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { cn } from "@/lib/utils";

const STEPS = ["Зброя", "Ціль", "Кидок", "Шкода", "Підсумок"] as const;

const STEP_INDEX = { weapon: 0, target: 1, roll: 2, damage: 3, summary: 4, submitting: 4 } as const;

const PICKED_LABEL = { melee: "Ближня атака", ranged: "Дальня атака" } as const;

const PICKED_STEPS = new Set(["roll", "damage", "summary", "submitting"]);

export function AttackWizard({ wizard }: { wizard: AttackWizardModel }) {
  const { state, view, actions } = wizard;

  const { attack, targets } = view;

  const open = state.step !== "closed" && state.step !== "result";

  const current = STEP_INDEX[state.step as keyof typeof STEP_INDEX] ?? 0;

  const strike = state.strikes[state.index];

  const target = targets.find((t) => t.basicInfo.id === strike?.targetId) ?? null;

  // кубики кроку живуть у дочірньому компоненті: новий удар чи закриття діалогу їх скидає
  const stepKey = `${state.step}:${state.index}`;

  const header = (
    <div className={cn("mb-3 grid h-8 gap-1", state.weaponCount > 1 ? "grid-cols-5" : "grid-cols-4")}>
      {STEPS.slice(state.weaponCount > 1 ? 0 : 1).map((label, i) => {
        const idx = i + (state.weaponCount > 1 ? 0 : 1);

        return (
          <div key={label} className={cn("flex flex-col justify-end gap-1.5 text-xs after:h-[3px] after:content-['']", idx < current ? "text-[#a89c88] after:bg-[var(--hud-muted)]" : idx === current ? "font-bold text-[var(--ink)] after:bg-[var(--enemy)]" : "text-[#6b604f] after:bg-white/10")}>
            {label}
          </div>
        );
      })}
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && actions.close()} title={attack ? `${attack.name}${target ? ` → ${target.basicInfo.name}` : ""}` : "Атака"} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
      {header}
      {state.picked && view.attackKind && PICKED_STEPS.has(state.step) && (
        <div data-attack-picked={view.attackKind} className="mb-2 flex min-h-8 items-center justify-between gap-2 text-sm text-[#cdb87e]">
          <span className="flex items-center gap-1.5">
            {view.attackKind === "ranged" ? <Crosshair className="size-4" /> : <Swords className="size-4" />}
            {PICKED_LABEL[view.attackKind]}
            {view.reachChecked && view.attackKind === "melee" && " · ціль поруч"}
          </span>
          {state.step === "roll" && state.weaponCount > 1 && state.index === 0 && (
            <button type="button" onClick={actions.changeWeapon} className="h-8 border border-white/25 px-2.5 text-xs text-[var(--ink)]">Змінити зброю</button>
          )}
        </div>
      )}
      {state.step === "weapon" && <WeaponStep wizard={wizard} />}
      {state.step === "target" && <TargetStep wizard={wizard} />}
      {state.step === "roll" && target && <RollStep key={stepKey} wizard={wizard} target={target} />}
      {state.step === "damage" && <DamageStep key={stepKey} wizard={wizard} />}
      {(state.step === "summary" || state.step === "submitting") && <SummaryStep wizard={wizard} />}
    </ResponsiveDialog>
  );
}

"use client";

import { useState } from "react";
import { Loader2, Swords } from "lucide-react";

import { AiRollButton, DamageDice, DiceGrid } from "./DiceInput";

import { HealthLabel, Portrait } from "@/components/battle/hud";
import { HUD_SURFACE } from "@/components/hud";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { AttackType } from "@/lib/constants/battle";
import { rollDie, type useAttackWizard } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { AttackMode } from "@/lib/utils/battle/flows";
import { signed } from "@/lib/utils/format";

type Wizard = ReturnType<typeof useAttackWizard>;

const STEPS = ["Зброя", "Ціль", "Кидок", "Шкода", "Підсумок"] as const;

const STEP_INDEX = { weapon: 0, target: 1, roll: 2, damage: 3, summary: 4, submitting: 4 } as const;

const MODES: [AttackMode, string][] = [["normal", "Звичайний"], ["advantage", "Перевага"], ["disadvantage", "Перешкода"]];

const btn = "hud-sc flex h-[52px] items-center justify-center gap-2.5 border text-base font-bold tracking-[.04em]";

export function AttackWizard({ wizard }: { wizard: Wizard }) {
  const { state, attack, attacks, targets, steps, estimate } = wizard;

  const [draft, setDraft] = useState<(number | undefined)[]>([]);

  const [second, setSecond] = useState<number | undefined>();

  const open = state.step !== "closed" && state.step !== "result";

  const current = STEP_INDEX[state.step as keyof typeof STEP_INDEX] ?? 0;

  const strike = state.strikes[state.index];

  const target = targets.find((t) => t.basicInfo.id === strike?.targetId) ?? null;

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
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && wizard.close()} title={attack ? `${attack.name}${target ? ` → ${target.basicInfo.name}` : ""}` : "Атака"} className={cn(HUD_SURFACE, "border-white/25 bg-[#15110e]")}>
      {header}
      {state.step === "weapon" && (
        <div className="space-y-2">
          {attacks.map((a) => (
            <button key={a.id ?? a.name} type="button" onClick={() => wizard.selectWeapon(a)} className={cn("flex h-[76px] w-full items-center gap-3 border px-3 text-left", (a.id ?? a.name) === state.attackId ? "border-[var(--enemy)] bg-[var(--enemy)]/15" : "border-white/15")}>
              <Swords className="size-7 text-[var(--gold)]" />
              <span className="min-w-0 flex-1">
                <span className="hud-sc block text-[17px] font-bold">{a.name}</span>
                <span className="block text-[13px] text-[#a89c88]">{a.type === AttackType.MELEE ? "ближній" : "дальній"} · +{a.attackBonus} до влучання</span>
                <span className="mt-1 flex flex-wrap gap-x-2.5 text-xs text-[#cdb87e]">
                  {wizard.previews[a.id ?? a.name]?.bonuses.map((b) => <span key={b.label}>{b.label} {b.percent ? `${signed(b.percent)}%` : signed(b.flat)}</span>)}
                </span>
              </span>
              <span className="w-[72px] text-right text-[15px]">{a.damageDice}<small className="block text-xs text-[var(--hud-muted)]">≈ {wizard.previews[a.id ?? a.name]?.estimate}</small></span>
            </button>
          ))}
        </div>
      )}
      {state.step === "target" && (
        <>
          <div className="space-y-2">
            {targets.map((t) => (
              <button key={t.basicInfo.id} type="button" onClick={() => wizard.toggleTarget(t.basicInfo.id)} className={cn("flex h-14 w-full items-center gap-3 border px-3 text-left", state.targetIds.includes(t.basicInfo.id) ? "border-[var(--enemy)] bg-[var(--enemy)]/15" : "border-white/15")}>
                <Portrait participant={t} size={36} />
                <span className="hud-sc flex-1 font-bold">{t.basicInfo.name}</span>
                <HealthLabel participant={t} />
              </button>
            ))}
          </div>
          {wizard.canSelectAllEnemies && (
            <button type="button" onClick={wizard.selectAllEnemies} className={cn(btn, "mt-3 w-full border-white/25")}>Усі вороги</button>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={wizard.close} className={cn(btn, "border-white/25")}>Скасувати</button>
            <button type="button" disabled={state.targetIds.length === 0} onClick={wizard.confirmTargets} className={cn(btn, "border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc] disabled:opacity-50")}>Далі · кидок</button>
          </div>
        </>
      )}
      {state.step === "roll" && target && (
        <>
          <div className="hud-sc text-xl font-bold">Кидок атаки · d20</div>
          {state.strikes.length > 1 && <div className="mt-1 text-sm text-[var(--hud-muted)]">Удар {state.index + 1} з {state.strikes.length} · {target.basicInfo.name}</div>}
          <div className="mt-3 grid h-10 grid-cols-3 border border-white/20">
            {MODES.map(([m, label]) => (
              <button key={m} type="button" onClick={() => wizard.setMode(m)} className={cn("border-l border-white/20 text-sm first:border-l-0", state.mode === m ? "bg-white/10 font-bold text-[var(--ink)]" : "text-[#a89c88]")}>{label}</button>
            ))}
          </div>
          {state.mode !== "normal" && <div className="mt-2 text-xs text-[var(--hud-muted)]">Спершу перший кубик, потім другий</div>}
          <DiceGrid
            sides={20}
            value={second}
            onPick={(v) => {
              if (state.mode !== "normal" && second === undefined) setSecond(v);
              else {
                wizard.roll(second ?? v, second === undefined ? undefined : v);
                setSecond(undefined);
              }
            }}
          />
          <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
            <AiRollButton onClick={wizard.aiRoll} />
            <button type="button" onClick={wizard.back} className={cn(btn, "border-white/25")}>Назад</button>
          </div>
        </>
      )}
      {state.step === "damage" && (
        <>
          <div className="hud-sc text-xl font-bold">Шкода{strike?.outcome === "crit" ? " · критичне" : ""}</div>
          <DamageDice slots={state.diceSlots} values={draft} onChange={(i, v) => setDraft((d) => { const n = [...d];

 n[i] = v;

 return n; })} />
          <div className="mt-3 grid grid-cols-[1.25fr_1fr] gap-2">
            <AiRollButton onClick={() => setDraft(state.diceSlots.map((sides) => rollDie(sides)))} />
            <button
              type="button"
              disabled={state.diceSlots.some((_, i) => draft[i] === undefined)}
              onClick={() => {
                wizard.damage(draft as number[]);
                setDraft([]);
              }}
              className={cn(btn, "border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc] disabled:opacity-50")}
            >
              Далі · підсумок
            </button>
          </div>
        </>
      )}
      {(state.step === "summary" || state.step === "submitting") && (
        <>
          {steps.map((list, k) => (
            <div key={k} className="mt-1">
              {list.map((s, i) => (
                <div key={i} className={cn("flex min-h-9 items-center justify-between border-b border-white/[.06] text-sm", s.side === "attacker" && s.kind === "percent" && s.value > 0 && "text-[#cdb87e]", s.side === "target" && "text-hud-danger")}>
                  <span>{s.label}</span>
                  <span>{s.kind === "percent" ? `${signed(s.value)}%` : s.kind === "multiplier" ? `×${s.value}` : s.kind === "immunity" ? "імунітет" : s.kind === "flat" ? signed(s.value) : s.value} → {s.after}</span>
                </div>
              ))}
            </div>
          ))}
          {wizard.unknownDefense && <div className="flex min-h-9 items-center justify-between text-sm italic text-[var(--hud-muted)]"><span>Захист і опори цілі</span><span>невідомо</span></div>}
          {steps.length > 0 && <div className="hud-sc flex h-12 items-center justify-between text-lg font-bold"><span>Орієнтовно</span><span className="text-[26px]">{estimate}</span></div>}
          {state.error && <p className="mt-2 text-sm text-[#e9a08f]">{state.error}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={state.step === "submitting"} onClick={wizard.back} className={cn(btn, "border-white/25")}>← Назад</button>
            <button type="button" disabled={state.step === "submitting"} onClick={wizard.submit} className={cn(btn, "border-[#a8473a] bg-[#7a2a1f] text-[#f3e7cc]")}>
              {state.step === "submitting" ? <Loader2 className="size-5 animate-spin" /> : <><Swords className="size-5" />Атакувати</>}
            </button>
          </div>
        </>
      )}
    </ResponsiveDialog>
  );
}

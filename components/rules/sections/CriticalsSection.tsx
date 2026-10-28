import { NumberField } from "../NumberField";
import { RulesSection } from "../RulesSection";

import { HudSection } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SwitchField } from "@/components/ui/switch-field";
import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS, type CriticalEffect } from "@/lib/constants/critical-effects";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { toggleItem } from "@/lib/utils/common/collections";

type Criticals = RulesFormState["data"]["criticals"];

const DOUBLE_DAMAGE_NAME = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "double_damage")?.name;

interface EffectListProps {
  title: string;
  prefix: string;
  effects: CriticalEffect[];
  disabled: string[];
  locked: boolean;
  onChange: (disabled: string[]) => void;
}

function EffectList({ title, prefix, effects, disabled, locked, onChange }: EffectListProps) {
  const toggle = (id: string) => onChange(toggleItem(disabled, id));

  return (
    <HudSection title={title}>
      <div className="grid gap-2 sm:grid-cols-2">
        {effects.map((effect) => {
          const id = String(effect.id);

          const htmlId = `${prefix}-${id}`;

          return (
            <div key={id} className="flex items-center gap-2">
              <Checkbox id={htmlId} checked={!disabled.includes(id)} disabled={locked} onCheckedChange={() => toggle(id)} />
              <Label htmlFor={htmlId}>{effect.name}</Label>
            </div>
          );
        })}
      </div>
    </HudSection>
  );
}

export function CriticalsSection({ form }: { form: RulesFormState }) {
  const c = form.data.criticals;

  const set = (patch: Partial<Criticals>) => form.set("criticals", { ...c, ...patch });

  return (
    <>
      <RulesSection mechanic="criticals">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Крит на (d20 ≥)" value={c.critOn} range={[2, 20]} onCommit={(critOn) => set({ critOn })} />
          <NumberField label="Провал на (d20 ≤)" value={c.fumbleOn} range={[0, 5]} description="0 — без провалу" onCommit={(fumbleOn) => set({ fumbleOn })} />
        </div>
        <SwitchField id="rules-crit-effects" label="Таблиці критичних ефектів" checked={c.effects} onCheckedChange={(effects) => set({ effects })} className="mt-3" />
        <p className="mt-2 text-xs text-hud-muted">
          Подвоєння шкоди при криті — це ефект таблиці (“{DOUBLE_DAMAGE_NAME}”). Якщо вимкнути таблиці або цей ефект, крит лише позначається, без додаткової шкоди.
        </p>
        <SwitchField id="rules-crit-double-dice" label="Подвоєння кубиків на криті" checked={c.doubleDice} onCheckedChange={(doubleDice) => set({ doubleDice })} className="mt-3" />
        <p className="mt-2 text-xs text-hud-muted">Крит подвоює кубики шкоди (зброя, атака заклинанням); модифікатори не подвоюються.</p>
      </RulesSection>
      <EffectList title="Ефекти криту" prefix="rules-crit-success" effects={CRITICAL_SUCCESS_EFFECTS} disabled={c.disabledSuccess} locked={!c.effects} onChange={(disabledSuccess) => set({ disabledSuccess })} />
      <EffectList title="Ефекти провалу" prefix="rules-crit-fail" effects={CRITICAL_FAIL_EFFECTS} disabled={c.disabledFail} locked={!c.effects} onChange={(disabledFail) => set({ disabledFail })} />
    </>
  );
}

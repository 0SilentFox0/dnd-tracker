import { NumberField } from "../NumberField";

import { HudSection } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CRITICAL_FAIL_EFFECTS, CRITICAL_SUCCESS_EFFECTS, type CriticalEffect } from "@/lib/constants/critical-effects";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

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
  const toggle = (id: string, on: boolean) => onChange(on ? disabled.filter((d) => d !== id) : [...disabled, id]);

  return (
    <HudSection title={title}>
      <div className="grid gap-2 sm:grid-cols-2">
        {effects.map((effect) => {
          const id = String(effect.id);

          const htmlId = `${prefix}-${id}`;

          return (
            <div key={id} className="flex items-center gap-2">
              <Checkbox id={htmlId} checked={!disabled.includes(id)} disabled={locked} onCheckedChange={(v) => toggle(id, v === true)} />
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
      <HudSection title={MECHANIC_REGISTRY.criticals.label}>
        <p className="mb-3 text-sm text-hud-muted">{MECHANIC_REGISTRY.criticals.description}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Крит на (d20 ≥)" value={c.critOn} range={[2, 20]} onCommit={(critOn) => set({ critOn })} />
          <NumberField label="Провал на (d20 ≤)" value={c.fumbleOn} range={[0, 5]} description="0 — без провалу" onCommit={(fumbleOn) => set({ fumbleOn })} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Switch id="rules-crit-effects" checked={c.effects} onCheckedChange={(effects) => set({ effects })} />
          <Label htmlFor="rules-crit-effects">Таблиці критичних ефектів</Label>
        </div>
        <p className="mt-2 text-xs text-hud-muted">
          Подвоєння шкоди при криті — це ефект таблиці (“{DOUBLE_DAMAGE_NAME}”). Якщо вимкнути таблиці або цей ефект, крит лише позначається, без додаткової шкоди.
        </p>
      </HudSection>
      <EffectList title="Ефекти криту" prefix="rules-crit-success" effects={CRITICAL_SUCCESS_EFFECTS} disabled={c.disabledSuccess} locked={!c.effects} onChange={(disabledSuccess) => set({ disabledSuccess })} />
      <EffectList title="Ефекти провалу" prefix="rules-crit-fail" effects={CRITICAL_FAIL_EFFECTS} disabled={c.disabledFail} locked={!c.effects} onChange={(disabledFail) => set({ disabledFail })} />
    </>
  );
}

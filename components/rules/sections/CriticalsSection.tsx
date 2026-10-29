import { useTranslations } from "next-intl";

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

const DOUBLE_DAMAGE_ID = CRITICAL_SUCCESS_EFFECTS.find((e) => e.effect.type === "double_damage")?.id;

interface EffectListProps {
  title: string;
  prefix: string;
  kind: "success" | "fail";
  effects: CriticalEffect[];
  disabled: string[];
  locked: boolean;
  onChange: (disabled: string[]) => void;
}

function EffectList({ title, prefix, kind, effects, disabled, locked, onChange }: EffectListProps) {
  const tTerms = useTranslations("battleTerms");

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
              <Label htmlFor={htmlId}>{tTerms(`crits.attack.${kind}.${effect.id}.name`)}</Label>
            </div>
          );
        })}
      </div>
    </HudSection>
  );
}

export function CriticalsSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const tTerms = useTranslations("battleTerms");

  const c = form.data.criticals;

  const set = (patch: Partial<Criticals>) => form.set("criticals", { ...c, ...patch });

  return (
    <>
      <RulesSection mechanic="criticals">
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label={t("sections.criticals.critOn")} value={c.critOn} range={[2, 20]} onCommit={(critOn) => set({ critOn })} />
          <NumberField label={t("sections.criticals.fumbleOn")} value={c.fumbleOn} range={[0, 5]} description={t("sections.criticals.fumbleOnHint")} onCommit={(fumbleOn) => set({ fumbleOn })} />
        </div>
        <SwitchField id="rules-crit-effects" label={t("sections.criticals.effects")} checked={c.effects} onCheckedChange={(effects) => set({ effects })} className="mt-3" />
        <p className="mt-2 text-xs text-hud-muted">
          {t("sections.criticals.effectsHint", { name: DOUBLE_DAMAGE_ID === undefined ? "" : tTerms(`crits.attack.success.${DOUBLE_DAMAGE_ID}.name`) })}
        </p>
        <SwitchField id="rules-crit-double-dice" label={t("sections.criticals.doubleDice")} checked={c.doubleDice} onCheckedChange={(doubleDice) => set({ doubleDice })} className="mt-3" />
        <p className="mt-2 text-xs text-hud-muted">{t("sections.criticals.doubleDiceHint")}</p>
      </RulesSection>
      <EffectList title={t("sections.criticals.successTitle")} prefix="rules-crit-success" kind="success" effects={CRITICAL_SUCCESS_EFFECTS} disabled={c.disabledSuccess} locked={!c.effects} onChange={(disabledSuccess) => set({ disabledSuccess })} />
      <EffectList title={t("sections.criticals.failTitle")} prefix="rules-crit-fail" kind="fail" effects={CRITICAL_FAIL_EFFECTS} disabled={c.disabledFail} locked={!c.effects} onChange={(disabledFail) => set({ disabledFail })} />
    </>
  );
}

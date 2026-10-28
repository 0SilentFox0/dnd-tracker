import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { Ruleset } from "@/lib/utils/rules";

type Toggle = { key: "persistResources" | "xp" | "inspiration"; label: string };

const TOGGLES: Toggle[] = [
  { key: "persistResources", label: "Ресурси героїв зберігаються між боями" },
  { key: "xp", label: "Досвід за таблицею 5e (інакше — віхи)" },
  { key: "inspiration", label: "Натхнення" },
];

export function OutOfCombatSection({ form }: { form: RulesFormState }) {
  const section = form.data.outOfCombat;

  const set = (patch: Partial<Ruleset["outOfCombat"]>) => form.set("outOfCombat", { ...section, ...patch });

  return (
    <RulesSection mechanic="outOfCombat">
      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <SwitchField key={t.key} id={`rules-ooc-${t.key}`} label={t.label} checked={section[t.key]} onCheckedChange={(v) => set({ [t.key]: v })} />
        ))}
        {section.persistResources && (
          <SwitchField id="rules-ooc-hit-dice" label="Правила 2024: довгий відпочинок повертає всі кістки хітів (інакше — половину)" checked={section.longRestHitDice === "all"} onCheckedChange={(v) => set({ longRestHitDice: v ? "all" : "half" })} />
        )}
      </div>
    </RulesSection>
  );
}

import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
          <div key={t.key} className="flex items-center gap-3">
            <Switch id={`rules-ooc-${t.key}`} checked={section[t.key]} onCheckedChange={(v) => set({ [t.key]: v })} />
            <Label htmlFor={`rules-ooc-${t.key}`}>{t.label}</Label>
          </div>
        ))}
        {section.persistResources && (
          <div className="flex items-center gap-3">
            <Switch id="rules-ooc-hit-dice" checked={section.longRestHitDice === "all"} onCheckedChange={(v) => set({ longRestHitDice: v ? "all" : "half" })} />
            <Label htmlFor="rules-ooc-hit-dice">Правила 2024: довгий відпочинок повертає всі кістки хітів (інакше — половину)</Label>
          </div>
        )}
      </div>
    </RulesSection>
  );
}

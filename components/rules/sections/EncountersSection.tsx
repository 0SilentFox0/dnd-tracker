import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { Ruleset } from "@/lib/utils/rules";

export function EncountersSection({ form }: { form: RulesFormState }) {
  const section = form.data.encounters;

  const set = (patch: Partial<Ruleset["encounters"]>) => form.set("encounters", { ...section, ...patch });

  const toggles = [
    { id: "rules-enc-balance", label: "Баланс за бюджетом XP 5e (інакше — рівний бій HOMM)", checked: section.balance === "xp", patch: (v: boolean) => ({ balance: v ? "xp" : "fair" }) as const },
    { id: "rules-enc-edition", label: "Пороги складності за DMG 2024 (інакше 2014)", checked: section.edition === "2024", patch: (v: boolean) => ({ edition: v ? "2024" : "2014" }) as const },
    { id: "rules-enc-autoxp", label: "Авто-досвід після перемоги", checked: section.autoXp, patch: (v: boolean) => ({ autoXp: v }) },
  ];

  return (
    <RulesSection mechanic="encounters">
      <div className="space-y-3">
        {toggles.map(({ id, label, checked, patch }) => (
          <div key={id} className="flex items-center gap-3">
            <Switch id={id} checked={checked} onCheckedChange={(v) => set(patch(v))} />
            <Label htmlFor={id}>{label}</Label>
          </div>
        ))}
        {section.autoXp && !form.data.outOfCombat.xp && <p className="text-xs text-hud-muted">Діє лише разом із «Досвід за таблицею 5e» на вкладці «Поза боєм».</p>}
      </div>
    </RulesSection>
  );
}

import { useTranslations } from "next-intl";

import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import type { Ruleset } from "@/lib/utils/rules";

type ToggleKey = "persistResources" | "xp" | "inspiration";

const TOGGLES: ToggleKey[] = ["persistResources", "xp", "inspiration"];

export function OutOfCombatSection({ form }: { form: RulesFormState }) {
  const t = useTranslations("rules");

  const section = form.data.outOfCombat;

  const set = (patch: Partial<Ruleset["outOfCombat"]>) => form.set("outOfCombat", { ...section, ...patch });

  return (
    <RulesSection mechanic="outOfCombat">
      <div className="space-y-3">
        {TOGGLES.map((key) => (
          <SwitchField key={key} id={`rules-ooc-${key}`} label={t(`sections.outOfCombat.${key}`)} checked={section[key]} onCheckedChange={(v) => set({ [key]: v })} />
        ))}
        {section.persistResources && (
          <SwitchField id="rules-ooc-hit-dice" label={t("sections.outOfCombat.longRestHitDice")} checked={section.longRestHitDice === "all"} onCheckedChange={(v) => set({ longRestHitDice: v ? "all" : "half" })} />
        )}
      </div>
    </RulesSection>
  );
}

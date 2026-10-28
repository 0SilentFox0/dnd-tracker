import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function DeathSavesSection({ form }: { form: RulesFormState }) {
  const deathSaves = form.data.deathSaves;

  return (
    <RulesSection mechanic="deathSaves">
      <div className="space-y-3">
      <SwitchField id="rules-death-saves-enabled" label="Увімкнені" checked={deathSaves.enabled} onCheckedChange={(v) => form.set("deathSaves", { ...deathSaves, enabled: v })} />
      {deathSaves.enabled && (
        <SwitchField id="rules-death-saves-units" label="Юніти на 0 HP помирають" checked={deathSaves.unitsDieAtZero} onCheckedChange={(v) => form.set("deathSaves", { ...deathSaves, unitsDieAtZero: v })} />
      )}
      </div>
    </RulesSection>
  );
}

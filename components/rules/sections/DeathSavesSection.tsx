import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function DeathSavesSection({ form }: { form: RulesFormState }) {
  const deathSaves = form.data.deathSaves;

  return (
    <RulesSection mechanic="deathSaves">
      <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch id="rules-death-saves-enabled" checked={deathSaves.enabled} onCheckedChange={(v) => form.set("deathSaves", { ...deathSaves, enabled: v })} />
        <Label htmlFor="rules-death-saves-enabled">Увімкнені</Label>
      </div>
      {deathSaves.enabled && (
        <div className="flex items-center gap-3">
          <Switch id="rules-death-saves-units" checked={deathSaves.unitsDieAtZero} onCheckedChange={(v) => form.set("deathSaves", { ...deathSaves, unitsDieAtZero: v })} />
          <Label htmlFor="rules-death-saves-units">Юніти на 0 HP помирають</Label>
        </div>
      )}
      </div>
    </RulesSection>
  );
}

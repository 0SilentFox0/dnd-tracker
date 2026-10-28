import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ConcentrationSection({ form }: { form: RulesFormState }) {
  const concentration = form.data.concentration;

  return (
    <RulesSection mechanic="concentration">
      <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch id="rules-concentration-enabled" checked={concentration.enabled} onCheckedChange={(v) => form.set("concentration", { ...concentration, enabled: v })} />
        <Label htmlFor="rules-concentration-enabled">Концентрація увімкнена</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="rules-concentration-cap" checked={concentration.dcCap === 30} disabled={!concentration.enabled} onCheckedChange={(v) => form.set("concentration", { ...concentration, dcCap: v ? 30 : null })} />
        <Label htmlFor="rules-concentration-cap">Межа СК 30 (2024)</Label>
      </div>
      </div>
    </RulesSection>
  );
}

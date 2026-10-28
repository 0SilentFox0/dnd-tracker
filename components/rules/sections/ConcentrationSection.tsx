import { RulesSection } from "../RulesSection";

import { SwitchField } from "@/components/ui/switch-field";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function ConcentrationSection({ form }: { form: RulesFormState }) {
  const concentration = form.data.concentration;

  return (
    <RulesSection mechanic="concentration">
      <div className="space-y-3">
      <SwitchField id="rules-concentration-enabled" label="Концентрація увімкнена" checked={concentration.enabled} onCheckedChange={(v) => form.set("concentration", { ...concentration, enabled: v })} />
      <SwitchField id="rules-concentration-cap" label="Межа СК 30 (2024)" checked={concentration.dcCap === 30} disabled={!concentration.enabled} onCheckedChange={(v) => form.set("concentration", { ...concentration, dcCap: v ? 30 : null })} />
      </div>
    </RulesSection>
  );
}

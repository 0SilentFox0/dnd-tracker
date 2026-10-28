import { NumberField } from "../NumberField";

import { HudSection } from "@/components/hud/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

export function MoraleSection({ form }: { form: RulesFormState }) {
  const morale = form.data.morale;

  return (
    <HudSection title={MECHANIC_REGISTRY.morale.label}>
      <p className="mb-3 text-sm text-hud-muted">{MECHANIC_REGISTRY.morale.description}</p>
      <div className="flex items-center gap-3">
        <Switch id="rules-morale-enabled" checked={morale.enabled} onCheckedChange={(enabled) => form.set("morale", { ...morale, enabled })} />
        <Label htmlFor="rules-morale-enabled">Увімкнена</Label>
      </div>
      <NumberField label="Межа ±N" value={morale.cap} range={[1, 10]} disabled={!morale.enabled} onCommit={(cap) => form.set("morale", { ...morale, cap })} />
    </HudSection>
  );
}

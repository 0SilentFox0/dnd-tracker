import { HudSection } from "@/components/hud/form";
import { LabeledInput } from "@/components/ui/labeled-input";
import type { RulesFormState } from "@/lib/hooks/campaigns";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

export function DefaultAttacksSection({ form }: { form: RulesFormState }) {
  const a = form.data.defaultAttacks;

  return (
    <HudSection title={MECHANIC_REGISTRY.defaultAttacks.label}>
      <p className="mb-3 text-sm text-hud-muted">{MECHANIC_REGISTRY.defaultAttacks.description}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledInput label="Ближня атака" maxLength={60} value={a.meleeName} onChange={(e) => form.set("defaultAttacks", { ...a, meleeName: e.target.value })} />
        <LabeledInput label="Дальня атака" maxLength={60} value={a.rangedName} onChange={(e) => form.set("defaultAttacks", { ...a, rangedName: e.target.value })} />
      </div>
    </HudSection>
  );
}

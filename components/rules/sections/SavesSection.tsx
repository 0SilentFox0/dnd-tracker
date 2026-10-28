import { RulesSection } from "../RulesSection";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { RulesFormState } from "@/lib/hooks/campaigns";

export function SavesSection({ form }: { form: RulesFormState }) {
  const saves = form.data.saves;

  return (
    <RulesSection mechanic="saves">
      <div className="flex items-center gap-3">
        <Switch id="rules-saves-proficiency" checked={saves.proficiency} onCheckedChange={(v) => form.set("saves", { ...saves, proficiency: v })} />
        <Label htmlFor="rules-saves-proficiency">Майстерність у рятівних кидках</Label>
      </div>
    </RulesSection>
  );
}

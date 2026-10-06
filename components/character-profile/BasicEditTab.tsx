"use client";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import type { DmCharacterEditor } from "@/lib/hooks/characters";

type Coef = "hpMultiplier" | "meleeMultiplier" | "rangedMultiplier";

export function BasicEditTab({ editor, onDeleted }: { editor: DmCharacterEditor; onDeleted: () => void }) {
  const { form, members, races } = editor;

  const coef = form.formData.scalingCoefficients;

  const setCoef = (key: Coef, v: number) =>
    form.setFormData((prev) => ({
      ...prev,
      scalingCoefficients: {
        hpMultiplier: prev.scalingCoefficients?.hpMultiplier ?? 1,
        meleeMultiplier: prev.scalingCoefficients?.meleeMultiplier ?? 1,
        rangedMultiplier: prev.scalingCoefficients?.rangedMultiplier ?? 1,
        [key]: v,
      },
    }));

  const remove = async () => {
    if (await editor.remove()) onDeleted();
  };

  return (
    <div className="space-y-6">
      <CharacterBasicInfo basicInfo={form.basicInfo} campaignMembers={members} races={races} />
      <CharacterHpPreview level={form.basicInfo.level} strength={form.abilityScores.strength} coefficient={coef?.hpMultiplier ?? 1} onCoefficientChange={(v) => setCoef("hpMultiplier", v)} isDm />
      <div className="grid grid-cols-2 gap-3">
        <LabeledInput id="meleeMultiplier" label="Коеф. ближньої шкоди" type="number" step="0.1" min={0.1} max={3} value={coef?.meleeMultiplier ?? 1} onChange={(e) => setCoef("meleeMultiplier", Number(e.target.value) || 1)} />
        <LabeledInput id="rangedMultiplier" label="Коеф. дальньої шкоди" type="number" step="0.1" min={0.1} max={3} value={coef?.rangedMultiplier ?? 1} onChange={(e) => setCoef("rangedMultiplier", Number(e.target.value) || 1)} />
      </div>
      <Button type="button" variant="destructive" className="h-11 w-full" onClick={() => void remove()}>
        Видалити персонажа
      </Button>
    </div>
  );
}

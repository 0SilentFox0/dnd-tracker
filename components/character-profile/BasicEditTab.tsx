"use client";

import { useState } from "react";

import { useProfile } from "./ProfileContext";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { Button } from "@/components/ui/button";
import type { DmCharacterEditor } from "@/lib/hooks/characters";
import { useClassMode } from "@/lib/hooks/classes";
import { classHp, hitDiceLabel } from "@/lib/utils/characters/classes";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";

export function BasicEditTab({ editor, onDeleted }: { editor: DmCharacterEditor; onDeleted: () => void }) {
  const { form, options } = editor;

  const { campaignId, sheet } = useProfile();

  const classMode = useClassMode(campaignId);

  const [converting, setConverting] = useState(false);

  const hasEntries = (form.basicInfo.data.classes ?? []).length > 0;

  const classUi = classMode.enabled && (hasEntries || converting);

  const classEntries = resolveClassEntries(form.basicInfo.data.classes ?? [], classMode.byId);

  const hp = classUi && classEntries.some((e) => e.class)
    ? { total: classHp(classEntries, form.abilityScores.data.constitution), lines: [{ label: `Кістки хітів: ${hitDiceLabel(classEntries)}`, value: "" }] }
    : sheet.hp;

  const remove = async () => {
    if (await editor.dmActions.remove()) onDeleted();
  };

  return (
    <div className="space-y-6">
      <CharacterBasicInfo basicInfo={form.basicInfo} campaignMembers={options.members} races={options.races} classMode={classUi ? classMode : undefined} />
      {classMode.enabled && !classUi && (
        <Button type="button" variant="outline" size="sm" onClick={() => setConverting(true)}>
          Перевести на класи
        </Button>
      )}
      <CharacterHpPreview hp={hp} />
      <Button type="button" variant="destructive" className="h-11 w-full" onClick={() => void remove()}>
        Видалити персонажа
      </Button>
    </div>
  );
}

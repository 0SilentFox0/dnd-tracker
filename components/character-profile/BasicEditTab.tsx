"use client";

import { useProfile } from "./ProfileContext";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { Button } from "@/components/ui/button";
import type { DmCharacterEditor } from "@/lib/hooks/characters";

export function BasicEditTab({ editor, onDeleted }: { editor: DmCharacterEditor; onDeleted: () => void }) {
  const { form, options } = editor;

  const { sheet } = useProfile();

  const remove = async () => {
    if (await editor.dmActions.remove()) onDeleted();
  };

  return (
    <div className="space-y-6">
      <CharacterBasicInfo basicInfo={form.basicInfo} campaignMembers={options.members} races={options.races} />
      <CharacterHpPreview hp={sheet.hp} />
      <Button type="button" variant="destructive" className="h-11 w-full" onClick={() => void remove()}>
        Видалити персонажа
      </Button>
    </div>
  );
}

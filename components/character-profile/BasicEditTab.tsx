"use client";

import { useProfile } from "./ProfileContext";

import { CharacterBasicInfo } from "@/components/characters/basic/CharacterBasicInfo";
import { CharacterHpPreview } from "@/components/characters/stats/CharacterHpPreview";
import { Button } from "@/components/ui/button";
import type { DmCharacterEditor } from "@/lib/hooks/characters";

export function BasicEditTab({ editor, onDeleted }: { editor: DmCharacterEditor; onDeleted: () => void }) {
  const { form, members, races } = editor;

  const { sheet } = useProfile();

  const remove = async () => {
    if (await editor.remove()) onDeleted();
  };

  return (
    <div className="space-y-6">
      <CharacterBasicInfo basicInfo={form.basicInfo} campaignMembers={members} races={races} />
      <CharacterHpPreview hp={sheet.hp} />
      <Button type="button" variant="destructive" className="h-11 w-full" onClick={() => void remove()}>
        Видалити персонажа
      </Button>
    </div>
  );
}

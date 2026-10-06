"use client";

import Image from "next/image";

import { HudSection } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ParticipantSourceType } from "@/lib/constants/battle";
import type { EditBattleCharacter } from "@/types/battle-setup";

interface AvailableCharactersCardProps {
  playerCharacters: EditBattleCharacter[];
  npcCharacters: EditBattleCharacter[];
  isParticipantSelected: (id: string) => boolean;
  onParticipantToggle: (
    id: string,
    type: typeof ParticipantSourceType.CHARACTER,
    checked: boolean,
  ) => void;
}

export function AvailableCharactersCard({
  playerCharacters,
  npcCharacters,
  isParticipantSelected,
  onParticipantToggle,
}: AvailableCharactersCardProps) {
  const renderCharacterList = (
    list: EditBattleCharacter[],
  ) =>
    list.map((character) => (
      <div
        key={character.id}
        className="flex items-center justify-between rounded border border-[#4a3c2c] bg-[#1a140f] p-2 transition-colors hover:bg-accent"
      >
        <div className="flex items-center gap-2 flex-1">
          <Checkbox
            checked={isParticipantSelected(character.id)}
            onCheckedChange={(checked) =>
              onParticipantToggle(character.id, ParticipantSourceType.CHARACTER, checked as boolean)
            }
          />
          {character.avatar && (
            <Image
              src={character.avatar}
              alt={character.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded"
            />
          )}
          <span className="text-sm font-medium">{character.name}</span>
        </div>
      </div>
    ));

  return (
    <HudSection title="Усі Персонажі" className="max-h-[600px] space-y-4 overflow-y-auto">
        <p className="text-xs text-muted-foreground">Гравці та NPC герої</p>
        {playerCharacters.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
              Гравці ({playerCharacters.length})
            </h3>
            <div className="space-y-2">
              {renderCharacterList(playerCharacters)}
            </div>
          </div>
        )}
        {npcCharacters.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
              NPC Герої ({npcCharacters.length})
            </h3>
            <div className="space-y-2">
              {renderCharacterList(npcCharacters)}
            </div>
          </div>
        )}
    </HudSection>
  );
}

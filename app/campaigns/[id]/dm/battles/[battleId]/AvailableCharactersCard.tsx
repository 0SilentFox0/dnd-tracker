"use client";

import Image from "next/image";

import type { EditBattleCharacter } from "./useEditBattleData";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface AvailableCharactersCardProps {
  playerCharacters: EditBattleCharacter[];
  npcCharacters: EditBattleCharacter[];
  isParticipantSelected: (id: string) => boolean;
  onParticipantToggle: (
    id: string,
    type: "character",
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
        className="flex items-center justify-between p-2 border rounded hover:bg-accent transition-colors"
      >
        <div className="flex items-center gap-2 flex-1">
          <Checkbox
            checked={isParticipantSelected(character.id)}
            onCheckedChange={(checked) =>
              onParticipantToggle(character.id, "character", checked as boolean)
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
    <Card>
      <CardHeader>
        <CardTitle>👥 Усі Персонажі</CardTitle>
        <CardDescription>Гравці та NPC герої</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
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
      </CardContent>
    </Card>
  );
}

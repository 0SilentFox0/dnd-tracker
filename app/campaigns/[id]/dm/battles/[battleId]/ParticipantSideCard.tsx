"use client";

import Image from "next/image";

import type { EditBattleCharacter } from "./useEditBattleData";
import type { EditBattleUnit } from "./useEditBattleData";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";

interface ParticipantSideCardProps {
  side: "ally" | "enemy";
  participants: BattlePreparationParticipant[];
  characters: EditBattleCharacter[];
  units: EditBattleUnit[];
  onSideChange: (
    participantId: string,
    side: BattlePreparationParticipant["side"],
  ) => void;
}

const SIDE_CONFIG = {
  ally: {
    title: "✅ Союзники",
    description: "Учасники на вашій стороні",
    cardClass: "bg-green-50 dark:bg-green-950/20",
    switchTo: ParticipantSide.ENEMY,
    switchLabel: "→",
  },
  enemy: {
    title: "⚔️ Вороги",
    description: "Противники в битві",
    cardClass: "bg-red-50 dark:bg-red-950/20",
    switchTo: ParticipantSide.ALLY,
    switchLabel: "←",
  },
} as const;

export function ParticipantSideCard({
  side,
  participants,
  characters,
  units,
  onSideChange,
}: ParticipantSideCardProps) {
  const config = SIDE_CONFIG[side];

  const sideParticipants = participants.filter((p) => p.side === side);

  const characterParticipants = sideParticipants.filter(
    (p) => p.type === "character",
  );

  const unitParticipants = sideParticipants.filter((p) => p.type === "unit");

  const renderRow = (
    participant: BattlePreparationParticipant,
    entity: { id: string; name: string; avatar: string | null } | undefined,
    showQuantity: boolean,
  ) => {
    if (!entity) return null;

    return (
      <div
        key={participant.id}
        className={`flex items-center justify-between p-2 border rounded ${config.cardClass}`}
      >
        <div className="flex items-center gap-2">
          {entity.avatar && (
            <Image
              src={entity.avatar}
              alt={entity.name}
              width={32}
              height={32}
              className="w-8 h-8 rounded"
            />
          )}
          <span className="text-sm font-medium">{entity.name}</span>
          {showQuantity && (
            <span className="text-xs text-muted-foreground">
              (x{participant.quantity || 1})
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onSideChange(participant.id, config.switchTo)}
        >
          {config.switchLabel}
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle
          className={
            side === "ally"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
        >
          {config.title}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
            Персонажі
          </h4>
          <div className="space-y-2">
            {characterParticipants.map((p) =>
              renderRow(
                p,
                characters.find((c) => c.id === p.id),
                false,
              ),
            )}
          </div>
        </div>
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
            Юніти
          </h4>
          <div className="space-y-2">
            {unitParticipants.map((p) =>
              renderRow(
                p,
                units.find((u) => u.id === p.id),
                true,
              ),
            )}
          </div>
        </div>
        {sideParticipants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {side === "ally"
              ? "Немає обраних союзників"
              : "Немає обраних ворогів"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

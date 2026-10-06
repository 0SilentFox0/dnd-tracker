"use client";

import Image from "next/image";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";
import type { EditBattleCharacter } from "@/types/battle-setup";
import type { EditBattleUnit } from "@/types/battle-setup";

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
    title: "Союзники",
    description: "Учасники на вашій стороні",
    rowClass: "border-l-[3px] border-l-[color:var(--ally)]",
    switchTo: ParticipantSide.ENEMY,
    switchLabel: "→",
  },
  enemy: {
    title: "Вороги",
    description: "Противники в битві",
    rowClass: "border-l-[3px] border-l-[color:var(--enemy)]",
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
    (p) => p.type === ParticipantSourceType.CHARACTER,
  );

  const unitParticipants = sideParticipants.filter((p) => p.type === ParticipantSourceType.UNIT);

  const renderRow = (
    participant: BattlePreparationParticipant,
    entity: { id: string; name: string; avatar: string | null } | undefined,
    showQuantity: boolean,
  ) => {
    if (!entity) return null;

    return (
      <div
        key={participant.id}
        className={`flex items-center justify-between rounded border border-[#4a3c2c] bg-[#1a140f] p-2 ${config.rowClass}`}
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
    <HudSection title={config.title} className="max-h-[500px] space-y-3 overflow-y-auto">
        <p className="text-xs text-muted-foreground">{config.description}</p>
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
    </HudSection>
  );
}

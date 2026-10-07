"use client";

import { SetupParticipantRow } from "./SetupParticipantRow";

import { HudSection } from "@/components/hud/form";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { BattlePreparationParticipant } from "@/types/battle";
import type { SetupCharacter, SetupUnit } from "@/types/battle-setup";

interface SidePanelCardProps {
  side: ParticipantSide;
  participants: BattlePreparationParticipant[];
  characters: SetupCharacter[];
  units: SetupUnit[];
  onSideChange: (participantId: string, newSide: ParticipantSide) => void;
  onRemove: (participantId: string) => void;
}

const SIDE_CONFIG = {
  [ParticipantSide.ALLY]: {
    title: "Союзники",
    description: "Учасники на вашій стороні",
  },
  [ParticipantSide.ENEMY]: {
    title: "Вороги",
    description: "Противники в битві",
  },
} as const;

export function SidePanelCard({
  side,
  participants,
  characters,
  units,
  onSideChange,
  onRemove,
}: SidePanelCardProps) {
  const config = SIDE_CONFIG[side];

  const otherSide = side === ParticipantSide.ALLY ? ParticipantSide.ENEMY : ParticipantSide.ALLY;

  const characterParticipants = participants.filter(
    (p) => p.side === side && p.type === ParticipantSourceType.CHARACTER,
  );

  const unitParticipants = participants.filter(
    (p) => p.side === side && p.type === ParticipantSourceType.UNIT,
  );

  const isEmpty = participants.filter((p) => p.side === side).length === 0;

  return (
    <HudSection title={config.title} className="max-h-[500px] space-y-3 overflow-y-auto">
        <p className="text-xs text-muted-foreground">{config.description}</p>
        {characterParticipants.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
              Персонажі
            </h4>
            <div className="space-y-2">
              {characterParticipants.map((participant) => {
                const entity = characters.find((c) => c.id === participant.id);

                if (!entity) return null;

                return (
                  <SetupParticipantRow
                    key={participant.id}
                    name={entity.name}
                    avatar={entity.avatar}
                    side={side}
                    onMoveToOtherSide={() => onSideChange(participant.id, otherSide)}
                    onRemove={() => onRemove(participant.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
        {unitParticipants.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
              Юніти
            </h4>
            <div className="space-y-2">
              {unitParticipants.map((participant) => {
                const entity = units.find((u) => u.id === participant.id);

                if (!entity) return null;

                return (
                  <SetupParticipantRow
                    key={participant.id}
                    name={entity.name}
                    avatar={entity.avatar}
                    quantity={participant.quantity ?? 1}
                    side={side}
                    onMoveToOtherSide={() => onSideChange(participant.id, otherSide)}
                    onRemove={() => onRemove(participant.id)}
                  />
                );
              })}
            </div>
          </div>
        )}
        {isEmpty && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Оберіть учасників зі списку нижче
          </p>
        )}
    </HudSection>
  );
}

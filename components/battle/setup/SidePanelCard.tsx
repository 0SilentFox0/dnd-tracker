"use client";

import { SetupParticipantRow } from "./SetupParticipantRow";

import { HudSection } from "@/components/hud/form";
import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import type { ParticipantActions } from "@/lib/hooks/battles";
import type { BattlePreparationParticipant } from "@/types/battle";
import type { SetupCharacter, SetupUnit } from "@/types/battle-setup";

interface SidePanelCardProps {
  side: ParticipantSide;
  participants: BattlePreparationParticipant[];
  characters: SetupCharacter[];
  units: SetupUnit[];
  actions: Pick<ParticipantActions, "setSide" | "remove" | "setReserve">;
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
  actions,
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
    <HudSection title={config.title} className="mt-0 max-h-[500px] space-y-3 overflow-y-auto">
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
                    reserved={participant.reserved ?? 0}
                    actions={{
                      onMoveToOtherSide: () => actions.setSide(participant.id, otherSide),
                      onRemove: () => actions.remove(participant.id),
                      onReserveChange: (n) => actions.setReserve(participant.id, n),
                    }}
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
                    reserved={participant.reserved ?? 0}
                    actions={{
                      onMoveToOtherSide: () => actions.setSide(participant.id, otherSide),
                      onRemove: () => actions.remove(participant.id),
                      onReserveChange: (n) => actions.setReserve(participant.id, n),
                    }}
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

"use client";

import { SetupParticipantRow } from "./SetupParticipantRow";

import { HudSection } from "@/components/hud/form";
import { ParticipantSide, ParticipantSourceType, type ParticipantSourceTypeValue } from "@/lib/constants/battle";
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

  const sideParticipants = participants.filter((p) => p.side === side);

  const groups: { title: string; type: ParticipantSourceTypeValue; entities: Pick<SetupCharacter, "id" | "name" | "avatar">[] }[] = [
    { title: "Персонажі", type: ParticipantSourceType.CHARACTER, entities: characters },
    { title: "Юніти", type: ParticipantSourceType.UNIT, entities: units },
  ];

  const visibleGroups = groups
    .map((g) => ({ ...g, members: sideParticipants.filter((p) => p.type === g.type) }))
    .filter((g) => g.members.length > 0);

  return (
    <HudSection title={config.title} className="mt-0 max-h-[500px] space-y-3 overflow-y-auto">
        <p className="text-xs text-muted-foreground">{config.description}</p>
        {visibleGroups.map(({ title, type, entities, members }) => (
          <div key={type}>
            <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h4>
            <div className="space-y-2">
              {members.map((participant) => {
                const entity = entities.find((e) => e.id === participant.id);

                if (!entity) return null;

                return (
                  <SetupParticipantRow
                    key={participant.id}
                    name={entity.name}
                    avatar={entity.avatar}
                    quantity={type === ParticipantSourceType.UNIT ? (participant.quantity ?? 1) : undefined}
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
        ))}
        {sideParticipants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Оберіть учасників зі списку нижче
          </p>
        )}
    </HudSection>
  );
}

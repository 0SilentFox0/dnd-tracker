"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Character, Participant, Unit } from "./types";
import { ParticipantRow } from "./ParticipantRow";

interface SidePanelCardProps {
  side: "ally" | "enemy";
  participants: Participant[];
  characters: Character[];
  units: Unit[];
  onSideChange: (participantId: string, newSide: "ally" | "enemy") => void;
  onRemove: (participantId: string) => void;
}

const SIDE_CONFIG = {
  ally: {
    title: "✅ Союзники",
    description: "Учасники на вашій стороні",
    titleClass: "text-green-600 dark:text-green-400",
  },
  enemy: {
    title: "⚔️ Вороги",
    description: "Противники в битві",
    titleClass: "text-red-600 dark:text-red-400",
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
  const otherSide = side === "ally" ? "enemy" : "ally";

  const characterParticipants = participants.filter(
    (p) => p.side === side && p.type === "character",
  );
  const unitParticipants = participants.filter(
    (p) => p.side === side && p.type === "unit",
  );
  const isEmpty = participants.filter((p) => p.side === side).length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className={config.titleClass}>{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
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
                  <ParticipantRow
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
                  <ParticipantRow
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
      </CardContent>
    </Card>
  );
}

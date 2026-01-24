"use client";

import { InitiativeParticipantCard } from "./cards/InitiativeParticipantCard";

import type { BattleParticipant } from "@/types/battle";

interface BattleInitiativeBarProps {
  initiativeOrder: BattleParticipant[];
  currentTurnIndex: number;
  isDM: boolean;
}

export function BattleInitiativeBar({
  initiativeOrder,
  currentTurnIndex,
}: BattleInitiativeBarProps) {
  const currentParticipant = initiativeOrder[currentTurnIndex];

  const otherParticipants = initiativeOrder.filter((_, index) => index !== currentTurnIndex);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t shadow-lg">
      <div className="mx-auto px-2 sm:px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto overflow-y-visible py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Активний учасник (закріплений зліва, більший) */}
          {currentParticipant && (
            <InitiativeParticipantCard
              participant={currentParticipant}
              isActive={true}
              isNext={false}
              size="large"
            />
          )}

          {/* Роздільник */}
          <div className="w-px h-16 sm:h-20 bg-border shrink-0" />

          {/* Інші учасники (горизонтальна шкала) */}
          <div className="flex items-center gap-2 flex-1 overflow-y-visible overflow-x-auto scrollbar-hide">
            {otherParticipants.map((participant) => {
              const originalIndex = initiativeOrder.findIndex((p) => p.basicInfo.id === participant.basicInfo.id);

              const isNext = originalIndex === (currentTurnIndex + 1) % initiativeOrder.length;
              
              return (
                <InitiativeParticipantCard
                  key={participant.basicInfo.id}
                  participant={participant}
                  isActive={false}
                  isNext={isNext}
                  size="small"
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

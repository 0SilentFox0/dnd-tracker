"use client";

import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

interface InitiativeTimelineProps {
  battle: BattleScene;
  roundsToShow?: number;
}

/**
 * Компонент для відображення шкали ходів на кілька раундів вперед
 */
export function InitiativeTimeline({
  battle,
  roundsToShow = 3,
}: InitiativeTimelineProps) {
  const timelineData = useMemo(() => {
    const rounds: Array<{
      round: number;
      participants: Array<{
        participant: BattleParticipant;
        index: number;
      }>;
    }> = [];

    const currentRound = battle.currentRound;

    const currentTurnIndex = battle.currentTurnIndex;

    const initiativeOrder = battle.initiativeOrder;

    // Генеруємо дані для наступних roundsToShow раундів
    for (let roundOffset = 0; roundOffset < roundsToShow; roundOffset++) {
      const round = currentRound + roundOffset;

      const participants: Array<{
        participant: BattleParticipant;
        index: number;
      }> = [];

      // Для поточного раунду починаємо з поточного ходу
      // Для наступних раундів починаємо з початку
      const startIndex = roundOffset === 0 ? currentTurnIndex : 0;

      // Додаємо учасників від поточного/початкового індексу до кінця
      for (let i = startIndex; i < initiativeOrder.length; i++) {
        participants.push({
          participant: initiativeOrder[i],
          index: i,
        });
      }

      // Додаємо учасників від початку до початкового індексу (для циклічності)
      if (roundOffset === 0 && startIndex > 0) {
        for (let i = 0; i < startIndex; i++) {
          participants.push({
            participant: initiativeOrder[i],
            index: i,
          });
        }
      } else if (roundOffset > 0) {
        // Для наступних раундів додаємо всіх від початку
        for (let i = 0; i < startIndex; i++) {
          participants.push({
            participant: initiativeOrder[i],
            index: i,
          });
        }
      }

      rounds.push({
        round,
        participants,
      });
    }

    return rounds;
  }, [battle, roundsToShow]);

  const currentParticipantId = battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo.id;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Шкала ходів (наступні {roundsToShow} раунди)</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {timelineData.map((roundData) => (
          <div
            key={roundData.round}
            className="flex-shrink-0 min-w-[200px] border rounded-lg p-2 bg-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={roundData.round === battle.currentRound ? "default" : "outline"}>
                Раунд {roundData.round}
              </Badge>
            </div>
            <div className="space-y-1">
              {roundData.participants.map(({ participant, index }) => (
                <div
                  key={`${roundData.round}-${participant.basicInfo.id}-${index}`}
                  className={`text-xs p-1 rounded ${
                    participant.basicInfo.id === currentParticipantId && roundData.round === battle.currentRound
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted"
                  }`}
                >
                  {participant.basicInfo.name}
                  {participant.basicInfo.id === currentParticipantId && roundData.round === battle.currentRound && (
                    <span className="ml-1">← Зараз</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

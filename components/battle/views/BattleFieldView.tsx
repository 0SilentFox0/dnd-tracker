"use client";

import { ParticipantCard } from "@/components/battle/cards/ParticipantCard";
import { InitiativeTimeline } from "@/components/battle/InitiativeTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { ParticipantSide } from "@/lib/constants/battle";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

interface BattleFieldViewProps {
  battle: BattleScene;
  allies: BattleParticipant[];
  enemies: BattleParticipant[];
  isDM: boolean;
}

/**
 * Компонент для відображення ігрового поля (коли не хід гравця)
 * Показує всіх учасників та шкалу ходів на 3 раунди
 */
export function BattleFieldView({
  battle,
  allies,
  enemies,
  isDM,
}: BattleFieldViewProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Шкала ходів */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-40 px-2 sm:px-4 py-2">
        <InitiativeTimeline
          battle={battle}
          roundsToShow={3}
        />
      </div>

      {/* Основний контент - 2 колонки (Союзники | Вороги) */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4 overflow-y-auto">
          {/* Союзники */}
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              Союзники ({allies.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {allies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Немає союзників
                  </CardContent>
                </Card>
              ) : (
                allies.map((participant: BattleParticipant) => (
                  <ParticipantCard
                    key={participant.basicInfo.id}
                    participant={participant}
                    isDM={isDM}
                    isCurrentTurn={participant.basicInfo.id === battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo.id}
                    canSeeEnemyHp={isDM || participant.basicInfo.side === ParticipantSide.ALLY}
                  />
                ))
              )}
            </div>
          </div>

          {/* Вороги */}
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              Вороги ({enemies.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {enemies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Немає ворогів
                  </CardContent>
                </Card>
              ) : (
                enemies.map((participant: BattleParticipant) => (
                  <ParticipantCard
                    key={participant.basicInfo.id}
                    participant={participant}
                    isDM={isDM}
                    isCurrentTurn={participant.basicInfo.id === battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo.id}
                    canSeeEnemyHp={isDM}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

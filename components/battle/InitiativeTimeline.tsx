"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Skull } from "lucide-react";
import { useMemo, useState } from "react";

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
  const [isExpanded, setIsExpanded] = useState(true);

  const timelineData = useMemo(() => {
    const rounds: Array<{
      round: number;
      participants: Array<{
        participant: BattleParticipant;
        index: number;
      }>;
    }> = [];

    const currentRound = battle.currentRound;
    const livingInitiativeOrder = battle.initiativeOrder.filter(
      (p) =>
        p.combatStats?.status !== "dead" &&
        p.combatStats?.status !== "unconscious",
    );

    const currentParticipantId =
      battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo?.id;
    const livingCurrentTurnIndex = Math.max(
      0,
      livingInitiativeOrder.findIndex(
        (p) => p.basicInfo.id === currentParticipantId,
      ),
    );

    // Генеруємо дані для наступних roundsToShow раундів
    for (let roundOffset = 0; roundOffset < roundsToShow; roundOffset++) {
      const round = currentRound + roundOffset;
      const participants: Array<{
        participant: BattleParticipant;
        index: number;
      }> = [];

      const startIndex = roundOffset === 0 ? livingCurrentTurnIndex : 0;

      for (let i = startIndex; i < livingInitiativeOrder.length; i++) {
        participants.push({
          participant: livingInitiativeOrder[i],
          index: i,
        });
      }

      if (roundOffset === 0 && startIndex > 0) {
        for (let i = 0; i < startIndex; i++) {
          participants.push({
            participant: livingInitiativeOrder[i],
            index: i,
          });
        }
      } else if (roundOffset > 0) {
        for (let i = 0; i < startIndex; i++) {
          participants.push({
            participant: livingInitiativeOrder[i],
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

  const currentParticipantId =
    battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo?.id;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm font-semibold flex items-center gap-2 w-full hover:opacity-80 transition-opacity"
      >
        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
        Шкала ходів
        <div className="ml-auto">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {timelineData.map((roundData) => (
                  <motion.div
                    key={roundData.round}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-shrink-0 min-w-[220px] border rounded-xl p-3 bg-card/50 backdrop-blur-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        variant={
                          roundData.round === battle.currentRound
                            ? "default"
                            : "outline"
                        }
                        className="rounded-full px-3"
                      >
                        Раунд {roundData.round}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {roundData.participants.map(
                          ({ participant, index }) => {
                            const isCurrent =
                              participant.basicInfo?.id ===
                                currentParticipantId &&
                              roundData.round === battle.currentRound;
                            const isDead =
                              participant.combatStats?.status === "dead";
                            const isUnconscious =
                              participant.combatStats?.status === "unconscious";

                            if (isUnconscious) return null; // Should be filtered already but extra check

                            return (
                              <motion.div
                                key={`${roundData.round}-${participant.basicInfo?.id}-${index}`}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                className={`text-xs p-2 rounded-lg transition-colors border ${
                                  isCurrent
                                    ? "bg-primary text-primary-foreground font-semibold border-primary shadow-md ring-2 ring-primary/20"
                                    : isDead
                                      ? "bg-muted/50 text-muted-foreground border-transparent grayscale"
                                      : "bg-muted/80 border-transparent hover:bg-muted"
                                } flex items-center justify-between gap-2`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {isDead && (
                                    <Skull className="w-3 h-3 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {participant.basicInfo?.name}
                                  </span>
                                </div>

                                {isDead && (
                                  <span className="text-[9px] font-bold opacity-70 hidden sm:inline">
                                    DEAD
                                  </span>
                                )}
                              </motion.div>
                            );
                          },
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

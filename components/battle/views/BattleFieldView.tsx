import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

import { ParticipantCard } from "@/components/battle/cards/ParticipantCard";
import { InitiativeTimeline } from "@/components/battle/InitiativeTimeline";
import { Button } from "@/components/ui/button";
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
  const [alliesOpen, setAlliesOpen] = useState(true);

  const [enemiesOpen, setEnemiesOpen] = useState(true);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-black/40 backdrop-blur-sm relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] z-10" />

      {/* Шкала ходів */}
      <div className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-md z-40 px-2 sm:px-4 py-3 shadow-2xl">
        <InitiativeTimeline battle={battle} roundsToShow={3} />
      </div>

      {/* Основний контент - 2 колонки (Союзники | Вороги) */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6 overflow-y-auto custom-scrollbar relative z-0">
          {/* Союзники */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between bg-black/20 rounded-lg p-2 z-20 border border-white/5">
              <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.5)] bg-clip-text">
                🛡️ СОЮЗНИКИ{" "}
                <span className="text-sm font-normal opacity-70 ml-2">
                  ({allies.length})
                </span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setAlliesOpen(!alliesOpen)}
              >
                {alliesOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {alliesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-3">
                    {allies.length === 0 ? (
                      <Card className="glass-card border-blue-500/20">
                        <CardContent className="py-12 text-center text-muted-foreground italic">
                          Немає активних союзників у бою...
                        </CardContent>
                      </Card>
                    ) : (
                      allies.map((participant: BattleParticipant) => (
                        <ParticipantCard
                          key={participant.basicInfo.id}
                          battle={battle}
                          participant={participant}
                          isDM={isDM}
                          isCurrentTurn={
                            participant.basicInfo.id ===
                            battle.initiativeOrder[battle.currentTurnIndex]
                              ?.basicInfo.id
                          }
                          canSeeEnemyHp={
                            isDM ||
                            participant.basicInfo.side === ParticipantSide.ALLY
                          }
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Вороги */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between  bg-black/20  rounded-lg p-2 z-20 border border-white/5">
              <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                ⚔️ ВОРОГИ{" "}
                <span className="text-sm font-normal opacity-70 ml-2">
                  ({enemies.length})
                </span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setEnemiesOpen(!enemiesOpen)}
              >
                {enemiesOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            <AnimatePresence initial={false}>
              {enemiesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-3">
                    {enemies.length === 0 ? (
                      <Card className="glass-card border-red-500/20">
                        <CardContent className="py-12 text-center text-muted-foreground italic">
                          Ворогів не виявлено. Перемога?
                        </CardContent>
                      </Card>
                    ) : (
                      enemies.map((participant: BattleParticipant) => (
                        <ParticipantCard
                          key={participant.basicInfo.id}
                          battle={battle}
                          participant={participant}
                          isDM={isDM}
                          isCurrentTurn={
                            participant.basicInfo.id ===
                            battle.initiativeOrder[battle.currentTurnIndex]
                              ?.basicInfo.id
                          }
                          canSeeEnemyHp={isDM}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

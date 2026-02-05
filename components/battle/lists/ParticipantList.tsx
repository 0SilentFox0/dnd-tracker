"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useState } from "react";

import { ParticipantCard } from "@/components/battle/cards/ParticipantCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

interface ParticipantListProps {
  title: ReactNode;
  participants: BattleParticipant[];
  battle: BattleScene;
  isDM: boolean;
  emptyMessage: string;
  emptyCardBorderColor: string;
  defaultOpen?: boolean;
  canSeeHp?: boolean;
}

export function ParticipantList({
  title,
  participants,
  battle,
  isDM,
  emptyMessage,
  emptyCardBorderColor,
  defaultOpen = true,
  canSeeHp = false,
}: ParticipantListProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center justify-between bg-black/20 rounded-lg p-2 z-20 border border-white/5">
        <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 p-1">
              {participants.length === 0 ? (
                <Card className={`glass-card ${emptyCardBorderColor}`}>
                  <CardContent className="py-12 text-center text-muted-foreground italic">
                    {emptyMessage}
                  </CardContent>
                </Card>
              ) : (
                participants.map((participant: BattleParticipant) => (
                  <ParticipantCard
                    key={participant.basicInfo.id}
                    battle={battle}
                    participant={participant}
                    isDM={isDM}
                    isCurrentTurn={
                      participant.basicInfo.id ===
                      battle.initiativeOrder[battle.currentTurnIndex]?.basicInfo
                        .id
                    }
                    canSeeEnemyHp={canSeeHp}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

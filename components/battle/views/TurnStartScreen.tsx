"use client";

import { motion } from "framer-motion";

import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { Button } from "@/components/ui/button";
import type { BattleParticipant } from "@/types/battle";

interface TurnStartScreenProps {
  participant: BattleParticipant;
  onStartTurn: () => void;
}

/**
 * Екран "Приготуватись" перед початком ходу гравця
 */
export function TurnStartScreen({
  participant,
  onStartTurn,
}: TurnStartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 bg-black/40 backdrop-blur-xl animate-in fade-in duration-700">
      <div className="absolute top-4 w-full flex justify-center opacity-50 hover:opacity-100 transition-opacity">
        <ParticipantStats
          participant={participant}
          className="px-4 py-2 bg-black/60 rounded-full border border-white/10"
        />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-4"
      >
        <div className="inline-block px-4 py-1 rounded-full bg-primary/20 text-primary text-xs font-black uppercase tracking-[0.3em] mb-2 animate-pulse">
          Приготуватись
        </div>
        <h2 className="text-3xl sm:text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
          ТВІЙ ХІД
        </h2>
        <p className="text-xl sm:text-2xl text-white/60 font-medium italic">
          — {participant.basicInfo.name} —
        </p>
      </motion.div>

      <Button
        size="lg"
        onClick={onStartTurn}
        className="text-xl px-12 py-8 rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300 transform hover:scale-110 active:scale-95 font-black uppercase tracking-widest"
      >
        ПОЧАТИ БІЙ
      </Button>
    </div>
  );
}

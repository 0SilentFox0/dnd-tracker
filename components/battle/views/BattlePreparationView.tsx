"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";

interface BattlePreparationViewProps {
  battle: BattleScene;
  alliesCount: number;
  enemiesCount: number;
  isDM: boolean;
  onStartBattle: () => void;
  isStarting: boolean;
}

export function BattlePreparationView({
  battle,
  alliesCount,
  enemiesCount,
  isDM,
  onStartBattle,
  isStarting,
}: BattlePreparationViewProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 backdrop-blur-md animate-in fade-in duration-1000 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-2xl w-full space-y-8 relative z-10"
      >
        <div className="space-y-4">
          <Badge
            variant="outline"
            className="rounded-full px-4 py-1 border-primary/50 text-primary font-black uppercase tracking-[0.3em] animate-pulse bg-primary/5"
          >
            Підготовка до битви
          </Badge>
          <h2 className="text-4xl sm:text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">
            АРЕНА ГОТОВА
          </h2>
          <p className="text-lg sm:text-2xl text-white/60 font-medium italic max-w-lg mx-auto leading-relaxed">
            Кожен воїн на своїй позиції. Час вирішити долю цієї сутички.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              label: "Учасники",
              value: battle.participants.length,
              color: "text-white",
            },
            {
              label: "Союзники",
              value: alliesCount,
              color: "text-blue-400",
            },
            {
              label: "Вороги",
              value: enemiesCount,
              color: "text-red-500",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-4 sm:p-6 border-white/5 flex flex-col items-center gap-1 group hover:border-white/20 transition-all"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">
                {stat.label}
              </span>
              <span
                className={cn(
                  "text-3xl sm:text-4xl font-black italic tabular-nums drop-shadow-lg",
                  stat.color,
                )}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4 sm:pt-8">
          {isDM ? (
            <Button
              size="lg"
              className="w-full sm:w-80 text-xl sm:text-2xl py-8 sm:py-10 rounded-full font-black italic uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 shadow-[0_0_50px_rgba(var(--primary),0.6)] transition-all duration-500 transform hover:scale-105 active:scale-95 group overflow-hidden relative"
              onClick={onStartBattle}
              disabled={isStarting}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rotate-12" />
              {isStarting ? "ЗБІР ВІЙСЬКА..." : "ДО БОЮ!"}
            </Button>
          ) : (
            <div className="glass-card rounded-full px-6 sm:px-8 py-4 sm:py-6 text-lg sm:text-xl font-bold italic tracking-wide text-white/80 animate-pulse border-white/10 shadow-xl inline-block mx-auto">
              🗡️ Очікуйте наказу DM...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

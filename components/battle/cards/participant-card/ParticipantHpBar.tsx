"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface ParticipantHpBarProps {
  currentHp: number;
  maxHp: number;
  showHp: boolean;
}

export function ParticipantHpBar({
  currentHp,
  maxHp,
  showHp,
}: ParticipantHpBarProps) {
  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  if (!showHp) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
          <span>Здоров&apos;я</span>
          <span>???</span>
        </div>
        <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
          <div className="h-full w-full bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-extrabold">
        <span className="text-muted-foreground/80">Здоров&apos;я</span>
        <span
          className={cn(
            "font-black",
            hpPercent < 25
              ? "text-red-500 animate-pulse"
              : hpPercent < 50
                ? "text-yellow-500"
                : "text-green-500",
          )}
        >
          {currentHp} / {maxHp}
        </span>
      </div>
      <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden border border-white/5 ring-1 ring-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${hpPercent}%` }}
          className={cn(
            "h-full transition-all duration-700 ease-out",
            hpPercent < 25
              ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]"
              : hpPercent < 50
                ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                : "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]",
          )}
        />
      </div>
    </div>
  );
}

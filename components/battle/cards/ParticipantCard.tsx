"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Skull, TrendingDown, TrendingUp } from "lucide-react";

import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ParticipantSide } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";
import type { BattleParticipant } from "@/types/battle";

interface ParticipantCardProps {
  battle?: BattleScene;
  participant: BattleParticipant;
  isCurrentTurn: boolean;
  isDM: boolean;
  canSeeEnemyHp: boolean; // DM mode або спеціальний скіл
  onSelect?: () => void;
  className?: string;
}

export function ParticipantCard({
  battle,
  participant,
  isCurrentTurn,
  isDM,
  canSeeEnemyHp,
  onSelect,
  className,
}: ParticipantCardProps) {
  const isEnemy = participant.basicInfo.side === ParticipantSide.ENEMY;

  const showHp = isDM || !isEnemy || canSeeEnemyHp;

  /** Союзники не бачать стати ворогів (AC, HP, ефекти) і навпаки. DM бачить усе. */
  const canSeeStats = isDM || !isEnemy || canSeeEnemyHp;

  const isDead = participant.combatStats.status === "dead";

  const hpPercent =
    (participant.combatStats.currentHp / participant.combatStats.maxHp) * 100;

  const [lastHp, setLastHp] = useState(participant.combatStats.currentHp);

  const [showDamage, setShowDamage] = useState(false);

  const [damageAmount, setDamageAmount] = useState(0);

  useEffect(() => {
    if (participant.combatStats.currentHp !== lastHp) {
      const diff = participant.combatStats.currentHp - lastHp;

      setDamageAmount(diff);
      setShowDamage(true);

      const timer = setTimeout(() => setShowDamage(false), 2000);

      setLastHp(participant.combatStats.currentHp);

      return () => clearTimeout(timer);
    }
  }, [participant.combatStats.currentHp, lastHp]);

  return (
    <div
      className={cn(
        "relative border rounded-xl p-3 sm:p-4 transition-all cursor-pointer glass-card group",
        isCurrentTurn && "ring-2 ring-primary z-10",
        isDead
          ? "dead-state"
          : isEnemy
            ? "border-red-500/30 bg-red-300/10"
            : "border-blue-500/30 bg-blue-500/5",
        className,
      )}
      onClick={onSelect}
    >
      {/* Background Glow */}
      {isCurrentTurn && !isDead && (
        <div className="absolute inset-0 bg-primary/10 animate-pulse-glow pointer-events-none" />
      )}

      {/* Анімація шкоди/лікування */}
      {showDamage && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center font-black text-4xl z-50 pointer-events-none animate-in fade-out slide-out-to-top-12 duration-1000 drop-shadow-2xl",
            damageAmount < 0 ? "text-red-500" : "text-green-500",
          )}
        >
          {damageAmount > 0 ? `+${damageAmount}` : damageAmount}
        </div>
      )}

      {/* Індикатор активного ходу */}
      {isCurrentTurn && !isDead && (
        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg z-20 flex justify-center items-center min-w-8 min-h-8 animate-[float_2s_infinite]">
          <span className="text-sm">⚔️</span>
        </div>
      )}

      {isDead ? (
        <div className="relative flex items-center gap-4 py-2 animate-in fade-in zoom-in duration-700">
          <Avatar className="w-16 h-16 grayscale opacity-40 border-2 border-red-900/50 shadow-inner">
            <AvatarImage
              src={participant.basicInfo.avatar || undefined}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-red-950/40 text-red-500/50">
              {participant.basicInfo.name.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-black italic uppercase text-red-500/60 line-through tracking-tighter text-xl">
                {participant.basicInfo.name}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-red-600/80">
                <Skull className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-[0.2em]">
                  Загинув у бою
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] border-red-900/50 text-red-950 bg-red-500/10"
              >
                Раунд {battle?.currentRound || "?"}
              </Badge>
            </div>
          </div>

          <div className="absolute inset-0 bg-red-950/10 pointer-events-none" />
        </div>
      ) : (
        <div className="flex items-start gap-3 relative z-10">
          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 border-2 border-border shadow-sm">
            <AvatarImage
              src={participant.basicInfo.avatar || undefined}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback>
              {participant.basicInfo.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm sm:text-base truncate">
                {participant.basicInfo.name}
              </h3>
            </div>

            {/* HP Bar */}
            <div className="space-y-1.5">
              {showHp ? (
                <>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-extrabold">
                    <span className="text-muted-foreground/80">Здоров'я</span>
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
                      {participant.combatStats.currentHp} /{" "}
                      {participant.combatStats.maxHp}
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
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    <span>Здоров'я</span>
                    <span>???</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-muted/20" />
                  </div>
                </>
              )}
            </div>

            {/* Temp HP & Effects — приховані для ворогів (крім DM) */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {canSeeStats && participant.combatStats.tempHp > 0 && (
                <Badge
                  variant="outline"
                  className="text-[9px] border-yellow-500/50 text-yellow-500 bg-yellow-500/5"
                >
                  🛡️ {participant.combatStats.tempHp} заст.
                </Badge>
              )}

              {canSeeStats &&
                participant.combatStats.status === "unconscious" && (
                  <Badge className="text-[9px] bg-indigo-500 text-white border-none shadow-[0_0_10px_rgba(99,102,241,0.3)] animate-pulse">
                    💤 Непритомний
                  </Badge>
                )}

              {canSeeStats &&
                participant.battleData.activeEffects
                  .slice(0, 5)
                  .map((effect, idx) => {
                  const isBuff = effect.type === "buff";

                  const isDebuff = effect.type === "debuff";

                  const durationText =
                    effect.duration != null ? `${effect.duration} раундів` : "";

                  const tooltip = [effect.name, durationText]
                    .filter(Boolean)
                    .join(" · ");

                  const Icon = isBuff
                    ? TrendingUp
                    : isDebuff
                      ? TrendingDown
                      : HelpCircle;

                  return (
                    <Badge
                      key={effect.id ?? idx}
                      variant="outline"
                      title={tooltip}
                      className={cn(
                        "text-[9px] cursor-help gap-0.5 border",
                        isBuff &&
                          "border-emerald-500/50 text-emerald-400 bg-emerald-500/10",
                        isDebuff &&
                          "border-red-500/50 text-red-400 bg-red-500/10",
                        !isBuff &&
                          !isDebuff &&
                          "border-white/20 text-white/70 bg-white/5",
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate max-w-[80px]">
                        {effect.name}
                      </span>
                    </Badge>
                  );
                })}

              {canSeeStats && (
                <ParticipantStats
                  participant={participant}
                  className="w-full mt-1 pt-2 border-t border-white/5"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

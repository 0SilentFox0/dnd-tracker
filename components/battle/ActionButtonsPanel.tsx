"use client";

import { Crosshair, SkipForward, Sparkles, Sword, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AttackType } from "@/lib/constants/battle";
import { cn } from "@/lib/utils";
import type { ActiveSkill, BattleParticipant } from "@/types/battle";

interface ActionButtonsPanelProps {
  participant: BattleParticipant;
  bonusActions: ActiveSkill[];
  onMeleeAttack: () => void;
  onRangedAttack: () => void;
  onSpell: () => void;
  onBonusAction: (skill: ActiveSkill) => void;
  onSkipTurn: () => void;
  /** Показати кнопку «Мораль» (fallback, якщо модалка не з’явилась після «Почати хід») */
  showMoraleButton?: boolean;
  onOpenMorale?: () => void;
}

/**
 * Панель з кнопками дій в 3 колонки
 * Ряд 1: Атака Ближня | Атака Дальня | Заклинання
 * Ряд 2: Бонусна дія | ... | Пропуск ходу
 */
export function ActionButtonsPanel({
  participant,
  bonusActions,
  onMeleeAttack,
  onRangedAttack,
  onSpell,
  onBonusAction,
  onSkipTurn,
  showMoraleButton,
  onOpenMorale,
}: ActionButtonsPanelProps) {
  const hasMeleeAttacks =
    participant.battleData.attacks?.some(
      (attack) => attack.type === AttackType.MELEE || attack.range === "5 ft",
    ) || false;

  const hasRangedAttacks =
    participant.battleData.attacks?.some(
      (attack) =>
        attack.type === AttackType.RANGED ||
        (attack.range && attack.range !== "5 ft"),
    ) || false;

  const hasSpells =
    participant.spellcasting.knownSpells &&
    participant.spellcasting.knownSpells.length > 0;

  const canUseBonusAction = !participant.actionFlags.hasUsedBonusAction;

  return (
    <div className="w-full max-w-4xl space-y-4 sm:space-y-8 px-2">
      {/* Ряд 1: Основні дії */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        <Button
          size="lg"
          variant={hasMeleeAttacks ? "default" : "outline"}
          disabled={!hasMeleeAttacks || participant.actionFlags.hasUsedAction}
          onClick={onMeleeAttack}
          className={cn(
            "h-20 sm:h-32 flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl transition-all duration-300 group relative overflow-hidden",
            hasMeleeAttacks && !participant.actionFlags.hasUsedAction
              ? "bg-gradient-to-br from-orange-600 to-red-700 hover:scale-105 hover:shadow-[0_0_20px_rgba(234,88,12,0.5)] border-none"
              : "glass-card opacity-50",
          )}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sword className="w-6 h-6 sm:w-10 sm:h-10 drop-shadow-lg group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] sm:text-lg font-black uppercase tracking-widest italic drop-shadow-md">
            Меч
          </span>
        </Button>

        <Button
          size="lg"
          variant={hasRangedAttacks ? "default" : "outline"}
          disabled={!hasRangedAttacks || participant.actionFlags.hasUsedAction}
          onClick={onRangedAttack}
          className={cn(
            "h-20 sm:h-32 flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl transition-all duration-300 group relative overflow-hidden",
            hasRangedAttacks && !participant.actionFlags.hasUsedAction
              ? "bg-gradient-to-br from-blue-600 to-indigo-700 hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] border-none"
              : "glass-card opacity-50",
          )}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Crosshair className="w-6 h-6 sm:w-10 sm:h-10 drop-shadow-lg group-hover:scale-110 transition-transform" />
          <span className="text-[10px] sm:text-lg font-black uppercase tracking-widest italic drop-shadow-md">
            Лук
          </span>
        </Button>

        <Button
          size="lg"
          variant={hasSpells ? "default" : "outline"}
          disabled={!hasSpells || participant.actionFlags.hasUsedAction}
          onClick={onSpell}
          className={cn(
            "h-20 sm:h-32 col-span-2 sm:col-span-1 flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl transition-all duration-300 group relative overflow-hidden",
            hasSpells && !participant.actionFlags.hasUsedAction
              ? "bg-gradient-to-br from-purple-600 to-fuchsia-700 hover:scale-105 hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] border-none"
              : "glass-card opacity-50",
          )}
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkles className="w-6 h-6 sm:w-10 sm:h-10 drop-shadow-lg group-hover:animate-pulse transition-transform" />
          <span className="text-[10px] sm:text-lg font-black uppercase tracking-widest italic drop-shadow-md">
            Магія
          </span>
        </Button>
      </div>

      {/* Ряд 2: Бонусні дії та пропуск */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
        {/* Бонусні дії з тригерів */}
        {bonusActions.length > 0 && canUseBonusAction ? (
          bonusActions.map((skill) => (
            <Button
              key={skill.skillId}
              size="lg"
              variant="secondary"
              onClick={() => onBonusAction(skill)}
              className="h-20 sm:h-32 flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 hover:scale-105 hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] border-none group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Zap className="w-6 h-6 sm:w-10 sm:h-10 drop-shadow-lg group-hover:animate-bounce transition-transform" />
              <span className="text-[10px] sm:text-lg font-black uppercase tracking-widest italic drop-shadow-md truncate w-full px-2">
                {skill.name}
              </span>
            </Button>
          ))
        ) : (
          <div className="h-20 sm:h-32 flex items-center justify-center glass-card rounded-2xl text-muted-foreground text-[10px] sm:text-sm font-bold uppercase tracking-widest italic px-4 text-center">
            {canUseBonusAction ? "No Bonus" : "Used"}
          </div>
        )}

        {showMoraleButton && onOpenMorale && (
          <Button
            size="lg"
            variant="outline"
            onClick={onOpenMorale}
            className="h-20 sm:h-32 min-h-[44px] flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          >
            <span className="text-[10px] sm:text-lg font-black uppercase tracking-widest italic">
              Мораль
            </span>
          </Button>
        )}

        {/* Пропуск ходу */}
        <div className="col-span-1 sm:col-start-3">
          <Button
            size="lg"
            variant="secondary"
            onClick={onSkipTurn}
            className="w-full h-20 sm:h-32 flex flex-col items-center justify-center gap-1 sm:gap-2 rounded-2xl border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60 transition-all duration-300 group"
          >
            <SkipForward className="w-6 h-6 sm:w-10 sm:h-10 group-hover:translate-x-1 transition-transform" />
            <span className="text-[10px] sm:text-lg font-black uppercase tracking-widest italic">
              Pass
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

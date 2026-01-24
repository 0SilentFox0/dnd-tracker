"use client";

import { Crosshair, SkipForward,Sparkles, Sword, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AttackType } from "@/lib/constants/battle";
import type { ActiveSkill,BattleParticipant } from "@/types/battle";

interface ActionButtonsPanelProps {
  participant: BattleParticipant;
  bonusActions: ActiveSkill[];
  onMeleeAttack: () => void;
  onRangedAttack: () => void;
  onSpell: () => void;
  onBonusAction: (skill: ActiveSkill) => void;
  onSkipTurn: () => void;
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
}: ActionButtonsPanelProps) {
  const hasMeleeAttacks = participant.battleData.attacks?.some(
    (attack) => attack.type === AttackType.MELEE || attack.range === "5 ft"
  ) || false;

  const hasRangedAttacks = participant.battleData.attacks?.some(
    (attack) => attack.type === AttackType.RANGED || (attack.range && attack.range !== "5 ft")
  ) || false;

  const hasSpells = participant.spellcasting.knownSpells && participant.spellcasting.knownSpells.length > 0;

  const canUseBonusAction = !participant.actionFlags.hasUsedBonusAction;

  return (
    <div className="w-full max-w-4xl space-y-4">
      {/* Ряд 1: Основні дії */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Button
          size="lg"
          variant={hasMeleeAttacks ? "default" : "outline"}
          disabled={!hasMeleeAttacks || participant.actionFlags.hasUsedAction}
          onClick={onMeleeAttack}
          className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
        >
          <Sword className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-base">Атака Ближня</span>
        </Button>

        <Button
          size="lg"
          variant={hasRangedAttacks ? "default" : "outline"}
          disabled={!hasRangedAttacks || participant.actionFlags.hasUsedAction}
          onClick={onRangedAttack}
          className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
        >
          <Crosshair className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-base">Атака Дальня</span>
        </Button>

        <Button
          size="lg"
          variant={hasSpells ? "default" : "outline"}
          disabled={!hasSpells || participant.actionFlags.hasUsedAction}
          onClick={onSpell}
          className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
        >
          <Sparkles className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="text-sm sm:text-base">Заклинання</span>
        </Button>
      </div>

      {/* Ряд 2: Бонусні дії та пропуск */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Бонусні дії з тригерів */}
        {bonusActions.length > 0 && canUseBonusAction ? (
          bonusActions.map((skill) => (
            <Button
              key={skill.skillId}
              size="lg"
              variant="secondary"
              onClick={() => onBonusAction(skill)}
              className="h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
            >
              <Zap className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-sm sm:text-base">{skill.name}</span>
            </Button>
          ))
        ) : (
          <div className="h-20 sm:h-24 flex items-center justify-center text-muted-foreground text-sm">
            {canUseBonusAction ? "Немає бонусних дій" : "Бонусна дія використана"}
          </div>
        )}

        {/* Пропуск ходу */}
        <div className="sm:col-start-3">
          <Button
            size="lg"
            variant="outline"
            onClick={onSkipTurn}
            className="w-full h-20 sm:h-24 flex flex-col items-center justify-center gap-2"
          >
            <SkipForward className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-sm sm:text-base">Пропуск ходу</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

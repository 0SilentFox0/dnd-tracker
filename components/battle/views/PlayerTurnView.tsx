"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { ActionButtonsPanel } from "@/components/battle/ActionButtonsPanel";
import { RollResultOverlay } from "@/components/battle/RollResultOverlay";
import { PlayerTurnHud } from "@/components/battle/views/PlayerTurnHud";
import { PlayerTurnViewDialogs } from "@/components/battle/views/PlayerTurnViewDialogs";
import { TurnStartScreen } from "@/components/battle/views/TurnStartScreen";
import { BATTLE_RACE } from "@/lib/constants/battle";
import { useAttackFlow } from "@/lib/hooks/battle";
import { getSkillsByTrigger } from "@/lib/utils/skills/triggers";
import type { BattleParticipant } from "@/types/battle";
import type { PlayerTurnViewProps } from "@/types/battle-ui";
/**
 * Компонент для екрану ходу гравця
 * Показує кнопку "Почати хід", перевірку моралі та панель дій
 */
export function PlayerTurnView({
  battle,
  participant,
  isDM,
  campaignId,
  canSeeEnemyHp = false,
  onAttack,
  onSpell,
  onSpellPreview,
  onBonusAction,
  onSkipTurn,
  onMoraleCheck,
  isNextTurnPending = false,
  isAttackPending = false,
  isMoraleCheckPending = false,
}: PlayerTurnViewProps) {
  const [turnStarted, setTurnStarted] = useState(false);

  const [showMoraleCheck, setShowMoraleCheck] = useState(false);

  // Стан для відстеження чи була перевірка моралі вже пропущена/виконана
  const [, setMoraleCheckDismissed] = useState(false);

  const [spellSelectionDialogOpen, setSpellSelectionDialogOpen] =
    useState(false);

  const [hasPerformedAction, setHasPerformedAction] = useState(false);

  const attackFlow = useAttackFlow({
    participant,
    initiativeOrder: battle.initiativeOrder ?? [],
    onAttack,
    onAttackSuccess: () => setHasPerformedAction(true),
  });

  const { dialogs, selection, rollResult, clearAttackState, handlers } =
    attackFlow;

  // Скидаємо локальний стан коли змінюється учасник або починається новий хід
  useEffect(() => {
    // Reset when turn or participant changes; key-based remount would require large refactor
    setHasPerformedAction(false); // eslint-disable-line react-hooks/set-state-in-effect
  }, [participant.basicInfo.id, turnStarted]);

  // Отримуємо бонусні дії з тригерів
  const bonusActions = useMemo(() => {
    if (
      !participant.battleData.activeSkills ||
      participant.battleData.activeSkills.length === 0
    )
      return [];

    return getSkillsByTrigger(
      participant.battleData.activeSkills,
      "bonusAction",
      participant,
      battle.initiativeOrder,
      {
        currentRound: battle.currentRound,
      },
    );
  }, [participant, battle.initiativeOrder, battle.currentRound]);

  // Stable ref для onSkipTurn — щоб useEffect нижче не reset-ив timer коли
  // parent передає нову (не memoized) функцію на кожен render (CODE_AUDIT 4.5).
  const onSkipTurnRef = useRef(onSkipTurn);

  useEffect(() => {
    onSkipTurnRef.current = onSkipTurn;
  });

  // Автоматичне завершення ходу, якщо не залишилося дій (чекати завершення атаки та next-turn)
  useEffect(() => {
    if (
      isNextTurnPending ||
      isAttackPending ||
      !turnStarted ||
      (!participant.actionFlags.hasUsedAction && !hasPerformedAction) ||
      (!participant.actionFlags.hasUsedBonusAction && bonusActions.length > 0)
    ) {
      return;
    }

    const timer = setTimeout(() => onSkipTurnRef.current(), 1500);

    return () => clearTimeout(timer);
  }, [
    participant.actionFlags.hasUsedAction,
    participant.actionFlags.hasUsedBonusAction,
    hasPerformedAction,
    bonusActions.length,
    turnStarted,
    isNextTurnPending,
    isAttackPending,
  ]);

  const handleStartTurn = () => {
    setTurnStarted(true);
    setMoraleCheckDismissed(false); // Скидаємо при початку нового ходу

    // Перевіряємо чи потрібна перевірка моралі
    if (participant.combatStats.morale !== 0) {
      const race = participant.abilities.race?.toLowerCase() ?? "";

      let currentMorale = participant.combatStats.morale;

      if (race === BATTLE_RACE.HUMAN && currentMorale < 0) {
        currentMorale = 0;
      }

      if (race === BATTLE_RACE.NECROMANCER) {
        // Некроманти пропускають перевірку
        return;
      }

      if (currentMorale !== 0) {
        setShowMoraleCheck(true);
      }
    }
  };

  const handleMoraleCheckConfirm = (d10Roll: number) => {
    setShowMoraleCheck(false);
    setMoraleCheckDismissed(true); // Позначаємо що перевірка була виконана
    onMoraleCheck(d10Roll);
  };

  const effectiveParticipant = {
    ...participant,
    actionFlags: {
      ...participant.actionFlags,
      hasUsedAction:
        participant.actionFlags.hasUsedAction || hasPerformedAction,
    },
  };

  const isProcessing = isNextTurnPending || isMoraleCheckPending;

  if (!turnStarted) {
    return (
      <TurnStartScreen
        participant={participant}
        onStartTurn={handleStartTurn}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-black/60 to-transparent animate-in fade-in duration-500">
      <PlayerTurnHud
        participant={participant}
        initiativeOrder={(battle.initiativeOrder ?? []) as BattleParticipant[]}
      />

      <PlayerTurnViewDialogs
        battle={battle}
        participant={participant}
        campaignId={campaignId}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        showMoraleCheck={showMoraleCheck}
        setShowMoraleCheck={setShowMoraleCheck}
        setMoraleCheckDismissed={setMoraleCheckDismissed}
        onMoraleCheckConfirm={handleMoraleCheckConfirm}
        spellSelectionDialogOpen={spellSelectionDialogOpen}
        setSpellSelectionDialogOpen={setSpellSelectionDialogOpen}
        setHasPerformedAction={setHasPerformedAction}
        onSpell={onSpell}
        onSpellPreview={onSpellPreview}
        dialogs={dialogs}
        selection={selection}
        clearAttackState={clearAttackState}
        handlers={handlers}
      />

      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        {isProcessing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        )}
        <ActionButtonsPanel
          participant={effectiveParticipant}
          bonusActions={bonusActions}
          onMeleeAttack={handlers.handleMeleeAttack}
          onRangedAttack={handlers.handleRangedAttack}
          onSpell={() => setSpellSelectionDialogOpen(true)}
          onBonusAction={onBonusAction}
          onSkipTurn={onSkipTurn}
        />
      </div>

      <RollResultOverlay
        type={rollResult}
        onComplete={handlers.handleRollResultComplete}
      />
    </div>
  );
}

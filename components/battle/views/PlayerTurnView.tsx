"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

import { RollResultOverlay } from "@/components/battle/RollResultOverlay";
import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { ActionButtonsPanel } from "@/components/battle/ActionButtonsPanel";
import { AttackRollDialog } from "@/components/battle/dialogs/AttackRollDialog";
import { DamageRollDialog } from "@/components/battle/dialogs/DamageRollDialog";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import { TargetSelectionDialog } from "@/components/battle/dialogs/TargetSelectionDialog";
import { Button } from "@/components/ui/button";
import { AttackType } from "@/lib/constants/battle";
import { getSkillsByTrigger } from "@/lib/utils/skills/skill-triggers";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { PlayerTurnViewProps, Spell } from "@/types/battle-ui";

/**
 * Компонент для екрану ходу гравця
 * Показує кнопку "Почати хід", перевірку моралі та панель дій
 */
export function PlayerTurnView({
  battle,
  participant,
  campaignId,
  onAttack,
  onSpell,
  onBonusAction,
  onSkipTurn,
  onMoraleCheck,
}: PlayerTurnViewProps) {
  const [turnStarted, setTurnStarted] = useState(false);

  const [showMoraleCheck, setShowMoraleCheck] = useState(false);

  // Стан для відстеження чи була перевірка моралі вже пропущена/виконана
  const [, setMoraleCheckDismissed] = useState(false);

  // Стан для послідовного відкриття діалогів атаки

  const [targetSelectionDialogOpen, setTargetSelectionDialogOpen] =
    useState(false);

  const [attackRollDialogOpen, setAttackRollDialogOpen] = useState(false);

  const [damageRollDialogOpen, setDamageRollDialogOpen] = useState(false);

  const [selectedAttack, setSelectedAttack] = useState<BattleAttack | null>(
    null,
  );

  const [selectedTarget, setSelectedTarget] =
    useState<BattleParticipant | null>(null);

  const [attackRollData, setAttackRollData] = useState<{
    attackRoll: number;
    advantageRoll?: number;
  } | null>(null);

  const [spellSelectionDialogOpen, setSpellSelectionDialogOpen] =
    useState(false);

  // Локальний стан для миттєвого блокування дій після виконання
  const [hasPerformedAction, setHasPerformedAction] = useState(false);

  // Скидаємо локальний стан коли змінюється учасник або починається новий хід
  useEffect(() => {
    setHasPerformedAction(false);
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

  // Автоматичне завершення ходу, якщо не залишилося дій
  useEffect(() => {
    if (
      turnStarted &&
      (participant.actionFlags.hasUsedAction || hasPerformedAction) &&
      (participant.actionFlags.hasUsedBonusAction || bonusActions.length === 0)
    ) {
      // Використовуємо setTimeout, щоб дати час на закриття останнього діалогу
      const timer = setTimeout(() => {
        onSkipTurn();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    participant.actionFlags.hasUsedAction,
    participant.actionFlags.hasUsedBonusAction,
    hasPerformedAction,
    bonusActions.length,
    turnStarted,
    onSkipTurn,
  ]);

  // ... (handleStartTurn, handleMoraleCheckConfirm, etc. - keep unchanged)
  // But replace_file_content cannot skip large chunks easily without context.
  // I will target the useEffect first.

  // Actually, I can replace just the useEffect block.
  // But wait, replace_file_content needs contiguous block.
  // I will replace useEffect first.

  // ...

  // Wait, I will split these.

  const handleStartTurn = () => {
    setTurnStarted(true);
    setMoraleCheckDismissed(false); // Скидаємо при початку нового ходу

    // Перевіряємо чи потрібна перевірка моралі
    if (participant.combatStats.morale !== 0) {
      // Перевіряємо расові модифікатори
      let currentMorale = participant.combatStats.morale;

      if (participant.abilities.race === "human" && currentMorale < 0) {
        currentMorale = 0;
      }

      if (participant.abilities.race === "necromancer") {
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

  // Обробники для послідовного відкриття діалогів атаки
  const handleMeleeAttack = () => {
    const attack = participant.battleData.attacks?.find(
      (a) => a.type === AttackType.MELEE || a.range === "5 ft",
    );

    if (attack) {
      setSelectedAttack(attack);
      setTargetSelectionDialogOpen(true);
    } else {
      alert("Немає доступної ближньої атаки");
    }
  };

  const handleRangedAttack = () => {
    const attack = participant.battleData.attacks?.find(
      (a) => a.type === AttackType.RANGED || (a.range && a.range !== "5 ft"),
    );

    if (attack) {
      setSelectedAttack(attack);
      setTargetSelectionDialogOpen(true);
    } else {
      alert("Немає доступної дальньої атаки");
    }
  };

  const handleTargetSelect = (targetIds: string[]) => {
    if (targetIds.length === 0) return;

    const target = battle.initiativeOrder.find(
      (p) => p.basicInfo.id === targetIds[0],
    );

    if (!target) return;

    setSelectedTarget(target);
    setTargetSelectionDialogOpen(false);
    setAttackRollDialogOpen(true);
  };

  const [rollResult, setRollResult] = useState<
    import("@/components/battle/RollResultOverlay").RollResultType | null
  >(null);

  const handleAttackRollConfirm = (data: {
    attackRoll: number;
    advantageRoll?: number;
  }) => {
    setAttackRollData(data);
    setAttackRollDialogOpen(false);

    if (!selectedAttack || !selectedTarget) return;

    // Розраховуємо результат
    const d20 = data.advantageRoll
      ? Math.max(data.attackRoll, data.advantageRoll)
      : data.attackRoll;
    const isCrit = d20 === 20;
    const isCritFail = d20 === 1;

    // Розрахунок бонусу (дублюється з діалогу, варто винести в утиліту)
    const attackBonus = selectedAttack.attackBonus || 0;
    const statModifier =
      selectedAttack.type === AttackType.MELEE
        ? Math.floor((participant.abilities.strength - 10) / 2)
        : Math.floor((participant.abilities.dexterity - 10) / 2);
    const totalBonus =
      attackBonus + statModifier + participant.abilities.proficiencyBonus;

    const totalRoll = d20 + totalBonus;
    const targetAC = selectedTarget.combatStats.armorClass;

    if (isCrit) {
      setRollResult("crit");
    } else if (isCritFail) {
      setRollResult("crit_fail");
    } else if (totalRoll >= targetAC) {
      setRollResult("hit");
    } else {
      setRollResult("miss");
    }
  };

  const handleRollResultComplete = () => {
    if (!rollResult) return;

    const isHit = rollResult === "hit" || rollResult === "crit";

    // Скидаємо результат
    setRollResult(null);

    // Якщо це хіт -> відкриваємо діалог урону
    if (isHit) {
      setDamageRollDialogOpen(true);
    } else {
      // Якщо промах -> завершуємо дію без урону (але з записом в лог)
      if (!selectedAttack || !selectedTarget || !attackRollData) return;

      setHasPerformedAction(true); // Блокуємо дії миттєво

      onAttack({
        attackerId: participant.basicInfo.id,
        targetId: selectedTarget.basicInfo.id,
        attackId: selectedAttack.id || selectedAttack.name,
        attackRoll: attackRollData.attackRoll,
        advantageRoll: attackRollData.advantageRoll,
        damageRolls: [], // Empty damage for miss
      });

      // Скидаємо стан
      setSelectedAttack(null);
      setSelectedTarget(null);
      setAttackRollData(null);
    }
  };

  const handleDamageRollConfirm = (damageRolls: number[]) => {
    if (!selectedAttack || !selectedTarget || !attackRollData) return;

    setHasPerformedAction(true); // Блокуємо дії миттєво

    onAttack({
      attackerId: participant.basicInfo.id,
      targetId: selectedTarget.basicInfo.id,
      attackId: selectedAttack.id || selectedAttack.name,
      attackRoll: attackRollData.attackRoll,
      advantageRoll: attackRollData.advantageRoll,
      damageRolls,
    });

    // Скидаємо стан
    setSelectedAttack(null);
    setSelectedTarget(null);
    setAttackRollData(null);
    setDamageRollDialogOpen(false);
  };

  const effectiveParticipant = {
    ...participant,
    actionFlags: {
      ...participant.actionFlags,
      hasUsedAction:
        participant.actionFlags.hasUsedAction || hasPerformedAction,
    },
  };

  if (!turnStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 p-6 bg-black/40 backdrop-blur-xl animate-in fade-in duration-700">
        {/* Header Stats for context (optional, but requested during turn) */}
        <div className="absolute top-4 w-full flex justify-center opacity-50 hover:opacity-100 transition-opacity">
          <ParticipantStats
            participant={participant}
            className="px-4 py-2 bg-black/60 rounded-full border border-white/10"
          />
        </div>

        <motion.div
          // ...
          // Wait, replacing the whole block is risky.
          // I will just perform smaller edits.

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
          onClick={handleStartTurn}
          className="text-xl px-12 py-8 rounded-full bg-primary hover:bg-primary/90 shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300 transform hover:scale-110 active:scale-95 font-black uppercase tracking-widest"
        >
          ПОЧАТИ БІЙ
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-black/60 to-transparent animate-in fade-in duration-500">
      {/* Stats Header */}
      <div className="shrink-0 flex justify-center bg-black/40 backdrop-blur-md border-b border-white/10 p-2">
        <ParticipantStats participant={participant} className="text-white/90" />
      </div>

      {/* Перевірка моралі */}
      <MoraleCheckDialog
        open={showMoraleCheck}
        onOpenChange={(open) => {
          if (!open) {
            setShowMoraleCheck(false);
            setMoraleCheckDismissed(true);
          }
        }}
        participant={participant}
        onConfirm={handleMoraleCheckConfirm}
      />

      <SpellDialog
        open={spellSelectionDialogOpen}
        onOpenChange={setSpellSelectionDialogOpen}
        caster={participant}
        battle={battle}
        campaignId={campaignId}
        availableTargets={battle.initiativeOrder}
        isDM={true}
        canSeeEnemyHp={true}
        onCast={(data) => {
          setHasPerformedAction(true);
          onSpell(data);
          setSpellSelectionDialogOpen(false);
        }}
      />

      {/* ... TargetSelectionDialog ... */}
      <TargetSelectionDialog
        open={targetSelectionDialogOpen}
        onOpenChange={setTargetSelectionDialogOpen}
        availableTargets={(() => {
          const friendlyFire = battle.campaign?.friendlyFire || false;
          const participantSide = participant.basicInfo.side;

          if (friendlyFire) {
            return battle.initiativeOrder.filter(
              (p) =>
                p.basicInfo.id !== participant.basicInfo.id &&
                p.combatStats.status === "active",
            );
          } else {
            return battle.initiativeOrder.filter(
              (p) =>
                p.basicInfo.side !== participantSide &&
                p.basicInfo.id !== participant.basicInfo.id &&
                p.combatStats.status === "active",
            );
          }
        })()}
        isAOE={false}
        onSelect={handleTargetSelect}
        title="🎯 ОБЕРІТЬ ЦІЛЬ"
        description="Оберіть ворога для нанесення удару"
      />

      {selectedAttack && selectedTarget && (
        <AttackRollDialog
          open={attackRollDialogOpen}
          onOpenChange={setAttackRollDialogOpen}
          attacker={participant}
          attack={selectedAttack}
          target={selectedTarget}
          onConfirm={handleAttackRollConfirm}
        />
      )}

      {selectedAttack && (
        <DamageRollDialog
          open={damageRollDialogOpen}
          onOpenChange={setDamageRollDialogOpen}
          attack={selectedAttack}
          onConfirm={handleDamageRollConfirm}
        />
      )}

      {/* Панель дій */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <ActionButtonsPanel
          participant={effectiveParticipant}
          bonusActions={bonusActions}
          onMeleeAttack={handleMeleeAttack}
          onRangedAttack={handleRangedAttack}
          onSpell={() => setSpellSelectionDialogOpen(true)}
          onBonusAction={onBonusAction}
          onSkipTurn={onSkipTurn}
        />
      </div>

      <RollResultOverlay
        type={rollResult}
        onComplete={handleRollResultComplete}
      />
    </div>
  );
}

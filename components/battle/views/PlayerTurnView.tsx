"use client";

import { useEffect, useMemo, useState } from "react";

import { ActionButtonsPanel } from "@/components/battle/ActionButtonsPanel";
import { AttackRollDialog } from "@/components/battle/dialogs/AttackRollDialog";
import { DamageRollDialog } from "@/components/battle/dialogs/DamageRollDialog";
import { DamageSummaryModal } from "@/components/battle/dialogs/DamageSummaryModal";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import { TargetSelectionDialog } from "@/components/battle/dialogs/TargetSelectionDialog";
import { ParticipantStats } from "@/components/battle/ParticipantStats";
import { RollResultOverlay } from "@/components/battle/RollResultOverlay";
import { TurnStartScreen } from "@/components/battle/views/TurnStartScreen";
import { AttackType, BATTLE_RACE, CombatStatus } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { mergeDiceFormulas } from "@/lib/utils/battle/balance-calculations";
import { getSkillsByTrigger } from "@/lib/utils/skills/skill-triggers";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
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
  onBonusAction,
  onSkipTurn,
  onMoraleCheck,
  isNextTurnPending = false,
  isAttackPending = false,
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

  const [damageSummaryOpen, setDamageSummaryOpen] = useState(false);

  const [damageFromCrit, setDamageFromCrit] = useState(false);

  const [pendingAttackData, setPendingAttackData] = useState<{
    damageRolls: number[];
    attackRollData: { attackRoll: number; advantageRoll?: number };
  } | null>(null);

  const [selectedAttack, setSelectedAttack] = useState<BattleAttack | null>(
    null,
  );

  const [selectedTarget, setSelectedTarget] =
    useState<BattleParticipant | null>(null);

  const [selectedTargets, setSelectedTargets] = useState<BattleParticipant[]>(
    [],
  );

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

    const timer = setTimeout(() => onSkipTurn(), 1500);

    return () => clearTimeout(timer);
  }, [
    participant.actionFlags.hasUsedAction,
    participant.actionFlags.hasUsedBonusAction,
    hasPerformedAction,
    bonusActions.length,
    turnStarted,
    onSkipTurn,
    isNextTurnPending,
    isAttackPending,
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

    const targets = targetIds
      .map((id) => battle.initiativeOrder.find((p) => p.basicInfo.id === id))
      .filter((p): p is BattleParticipant => !!p);

    if (targets.length === 0) return;

    setSelectedTargets(targets);
    setSelectedTarget(targets[0]);
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

    const wasCrit = rollResult === "crit";

    // Скидаємо результат
    setRollResult(null);

    // Якщо це хіт -> відкриваємо діалог урону
    if (isHit) {
      setDamageFromCrit(wasCrit);
      setDamageRollDialogOpen(true);
    } else {
      if (!selectedAttack || selectedTargets.length === 0 || !attackRollData) return;

      setHasPerformedAction(true);

      onAttack({
        attackerId: participant.basicInfo.id,
        targetIds: selectedTargets.map((t) => t.basicInfo.id),
        attackId: selectedAttack.id || selectedAttack.name,
        attackRoll: attackRollData.attackRoll,
        advantageRoll: attackRollData.advantageRoll,
        damageRolls: [], // Empty damage for miss
      });

      setSelectedAttack(null);
      setSelectedTarget(null);
      setSelectedTargets([]);
      setAttackRollData(null);
    }
  };

  const handleDamageRollConfirm = (damageRolls: number[]) => {
    if (!selectedAttack || selectedTargets.length === 0 || !attackRollData) return;

    setPendingAttackData({ damageRolls, attackRollData });
    setDamageRollDialogOpen(false);
    setDamageSummaryOpen(true);
  };

  const handleDamageSummaryApply = () => {
    if (!selectedAttack || selectedTargets.length === 0 || !attackRollData || !pendingAttackData) return;

    setHasPerformedAction(true);

    onAttack({
      attackerId: participant.basicInfo.id,
      targetIds: selectedTargets.map((t) => t.basicInfo.id),
      attackId: selectedAttack.id || selectedAttack.name,
      attackRoll: attackRollData.attackRoll,
      advantageRoll: attackRollData.advantageRoll,
      damageRolls: pendingAttackData.damageRolls,
    });

    setSelectedAttack(null);
    setSelectedTarget(null);
    setSelectedTargets([]);
    setAttackRollData(null);
    setPendingAttackData(null);
    setDamageSummaryOpen(false);
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
      <TurnStartScreen
        participant={participant}
        onStartTurn={handleStartTurn}
      />
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
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onCast={(data) => {
          setHasPerformedAction(true);
          onSpell(data);
          setSpellSelectionDialogOpen(false);
        }}
      />

      <TargetSelectionDialog
        open={targetSelectionDialogOpen}
        onOpenChange={setTargetSelectionDialogOpen}
        isAOE={selectedAttack?.targetType === "aoe"}
        maxTargets={selectedAttack?.targetType === "aoe" ? selectedAttack.maxTargets : undefined}
        canSeeEnemyHp={canSeeEnemyHp}
        availableTargets={(() => {
          const friendlyFire = battle.campaign?.friendlyFire || false;

          const participantSide = participant.basicInfo.side;

          if (friendlyFire) {
            return battle.initiativeOrder.filter(
              (p) =>
                p.basicInfo.id !== participant.basicInfo.id &&
                p.combatStats.status === CombatStatus.ACTIVE,
            );
          } else {
            return battle.initiativeOrder.filter(
              (p) =>
                p.basicInfo.side !== participantSide &&
                p.basicInfo.id !== participant.basicInfo.id &&
                p.combatStats.status === CombatStatus.ACTIVE,
            );
          }
        })()}
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
          canSeeEnemyHp={canSeeEnemyHp}
          onConfirm={handleAttackRollConfirm}
        />
      )}

      {selectedAttack && (
        <DamageRollDialog
          open={damageRollDialogOpen}
          onOpenChange={setDamageRollDialogOpen}
          attack={selectedAttack}
          damageDiceFormula={
            participant.basicInfo.sourceType === "character"
              ? mergeDiceFormulas(
                  selectedAttack.damageDice ?? "",
                  getHeroDamageDiceForLevel(
                    participant.abilities.level,
                    selectedAttack.type as AttackType,
                  ),
                )
              : undefined
          }
          onConfirm={handleDamageRollConfirm}
        />
      )}

      {selectedAttack && selectedTarget && pendingAttackData && (
        <DamageSummaryModal
          open={damageSummaryOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDamageSummaryOpen(false);
              setPendingAttackData(null);
              setSelectedAttack(null);
              setSelectedTarget(null);
              setSelectedTargets([]);
              setAttackRollData(null);
            }
          }}
          attacker={participant}
          target={selectedTarget}
          attack={selectedAttack}
          damageRolls={pendingAttackData.damageRolls}
          allParticipants={battle.initiativeOrder}
          isCritical={damageFromCrit}
          campaignId={campaignId}
          battleId={battle.id}
          onApply={handleDamageSummaryApply}
        />
      )}

      {/* Панель дій; кнопка «Мораль» — fallback, якщо модалка не з’явилась після «Почати хід» */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <ActionButtonsPanel
          participant={effectiveParticipant}
          bonusActions={bonusActions}
          onMeleeAttack={handleMeleeAttack}
          onRangedAttack={handleRangedAttack}
          onSpell={() => setSpellSelectionDialogOpen(true)}
          onBonusAction={onBonusAction}
          onSkipTurn={onSkipTurn}
          showMoraleButton={
            turnStarted &&
            (() => {
              const race = participant.abilities.race?.toLowerCase() ?? "";

              let currentMorale = participant.combatStats.morale;

              if (race === BATTLE_RACE.HUMAN && currentMorale < 0) currentMorale = 0;

              return (
                participant.combatStats.morale !== 0 &&
                race !== BATTLE_RACE.NECROMANCER &&
                currentMorale !== 0
              );
            })()
          }
          onOpenMorale={() => setShowMoraleCheck(true)}
        />
      </div>

      <RollResultOverlay
        type={rollResult}
        onComplete={handleRollResultComplete}
      />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, Loader2, TrendingDown, TrendingUp } from "lucide-react";

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
import { cn } from "@/lib/utils";
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

  // Стан для послідовного відкриття діалогів атаки

  const [targetSelectionDialogOpen, setTargetSelectionDialogOpen] =
    useState(false);

  const [attackRollDialogOpen, setAttackRollDialogOpen] = useState(false);

  const [damageRollDialogOpen, setDamageRollDialogOpen] = useState(false);

  const [damageSummaryOpen, setDamageSummaryOpen] = useState(false);

  const [damageFromCrit, setDamageFromCrit] = useState(false);

  const [pendingAttackData, setPendingAttackData] = useState<{
    damageRolls: number[];
    attackRollData: { attackRoll: number; advantageRoll?: number; disadvantageRoll?: number };
    attackRollsData?: Array<{
      attackRoll: number;
      advantageRoll?: number;
      disadvantageRoll?: number;
    }>;
  } | null>(null);

  /** Для multi-target: зібрані кидки по попаданню (один на ціль) */
  const [attackRollsData, setAttackRollsData] = useState<
    Array<{
      attackRoll: number;
      advantageRoll?: number;
      disadvantageRoll?: number;
    }>
  >([]);

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
    disadvantageRoll?: number;
  } | null>(null);

  const [spellSelectionDialogOpen, setSpellSelectionDialogOpen] =
    useState(false);

  // Локальний стан для миттєвого блокування дій після виконання
  const [hasPerformedAction, setHasPerformedAction] = useState(false);

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
    setAttackRollsData([]);
    setTargetSelectionDialogOpen(false);
    setAttackRollDialogOpen(true);
  };

  const [rollResult, setRollResult] = useState<
    import("@/components/battle/RollResultOverlay").RollResultType | null
  >(null);

  const handleAttackRollConfirm = (data: {
    attackRoll: number;
    advantageRoll?: number;
    disadvantageRoll?: number;
  }) => {
    if (!selectedAttack || !selectedTarget) return;

    const d20 =
      data.advantageRoll != null
        ? Math.max(data.attackRoll, data.advantageRoll)
        : data.disadvantageRoll != null
          ? Math.min(data.attackRoll, data.disadvantageRoll)
          : data.attackRoll;

    const isCrit = d20 === 20;
    const isCritFail = d20 === 1;
    const attackBonus = selectedAttack.attackBonus || 0;
    const statModifier =
      selectedAttack.type === AttackType.MELEE
        ? Math.floor((participant.abilities.strength - 10) / 2)
        : Math.floor((participant.abilities.dexterity - 10) / 2);
    const totalBonus =
      attackBonus + statModifier + participant.abilities.proficiencyBonus;
    const totalRoll = d20 + totalBonus;
    const targetAC = selectedTarget.combatStats.armorClass;

    if (selectedTargets.length > 1) {
      setAttackRollsData((prev) => [...prev, data]);
      setAttackRollDialogOpen(false);
    } else {
      setAttackRollData(data);
      setAttackRollDialogOpen(false);
    }

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

  const currentRollTarget =
    selectedTargets.length > 1
      ? selectedTargets[attackRollsData.length]
      : selectedTarget;

  const handleRollResultComplete = () => {
    if (!rollResult) return;

    const isHit = rollResult === "hit" || rollResult === "crit";
    const wasCrit = rollResult === "crit";

    setRollResult(null);

    const multiTarget = selectedTargets.length > 1;

    if (multiTarget) {
      const allRollsDone = attackRollsData.length >= selectedTargets.length;

      if (!allRollsDone) {
        setSelectedTarget(selectedTargets[attackRollsData.length]);
        setAttackRollDialogOpen(true);
        return;
      }

      const anyHit = attackRollsData.some((data, i) => {
        const d20 =
          data.advantageRoll != null
            ? Math.max(data.attackRoll, data.advantageRoll)
            : data.disadvantageRoll != null
              ? Math.min(data.attackRoll, data.disadvantageRoll)
              : data.attackRoll;
        const attackBonus = selectedAttack?.attackBonus || 0;
        const statModifier =
          selectedAttack?.type === AttackType.MELEE
            ? Math.floor((participant.abilities.strength - 10) / 2)
            : Math.floor((participant.abilities.dexterity - 10) / 2);
        const totalRoll =
          d20 + attackBonus + statModifier + participant.abilities.proficiencyBonus;

        return totalRoll >= selectedTargets[i].combatStats.armorClass;
      });

      if (anyHit) {
        setDamageFromCrit(false);
        setPendingAttackData({
          damageRolls: [],
          attackRollData: attackRollsData[0],
          attackRollsData,
        });
        setDamageRollDialogOpen(true);
      } else {
        if (!selectedAttack) return;

        setHasPerformedAction(true);
        const effectiveRolls = attackRollsData.map((d) =>
          d.advantageRoll != null
            ? Math.max(d.attackRoll, d.advantageRoll)
            : d.disadvantageRoll != null
              ? Math.min(d.attackRoll, d.disadvantageRoll)
              : d.attackRoll,
        );

        onAttack({
          attackerId: participant.basicInfo.id,
          targetIds: selectedTargets.map((t) => t.basicInfo.id),
          attackId: selectedAttack.id || selectedAttack.name,
          attackRolls: effectiveRolls,
          damageRolls: [],
        });

        setSelectedAttack(null);
        setSelectedTarget(null);
        setSelectedTargets([]);
        setAttackRollsData([]);
      }

      return;
    }

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
        disadvantageRoll: attackRollData.disadvantageRoll,
        damageRolls: [],
      });

      setSelectedAttack(null);
      setSelectedTarget(null);
      setSelectedTargets([]);
      setAttackRollData(null);
    }
  };

  const handleDamageRollConfirm = (damageRolls: number[]) => {
    if (!selectedAttack || selectedTargets.length === 0) return;

    const rollData =
      selectedTargets.length > 1 && attackRollsData.length > 0
        ? { damageRolls, attackRollData: attackRollsData[0], attackRollsData }
        : { damageRolls, attackRollData: attackRollData! };

    if (selectedTargets.length === 1 && !attackRollData) return;

    setPendingAttackData(rollData);
    setDamageRollDialogOpen(false);
    setDamageSummaryOpen(true);
  };

  const handleDamageSummaryApply = () => {
    if (!selectedAttack || selectedTargets.length === 0 || !pendingAttackData) return;

    const multi = pendingAttackData.attackRollsData != null;

    if (!multi && !attackRollData) return;

    setHasPerformedAction(true);

    const effectiveRolls = multi
      ? pendingAttackData.attackRollsData!.map((d) =>
          d.advantageRoll != null
            ? Math.max(d.attackRoll, d.advantageRoll)
            : d.disadvantageRoll != null
              ? Math.min(d.attackRoll, d.disadvantageRoll)
              : d.attackRoll,
        )
      : undefined;

    onAttack({
      attackerId: participant.basicInfo.id,
      targetIds: selectedTargets.map((t) => t.basicInfo.id),
      attackId: selectedAttack.id || selectedAttack.name,
      ...(multi && effectiveRolls
        ? { attackRolls: effectiveRolls }
        : {
            attackRoll: attackRollData!.attackRoll,
            advantageRoll: attackRollData!.advantageRoll,
            disadvantageRoll: attackRollData!.disadvantageRoll,
          }),
      damageRolls: pendingAttackData.damageRolls,
    });

    setSelectedAttack(null);
    setSelectedTarget(null);
    setSelectedTargets([]);
    setAttackRollData(null);
    setAttackRollsData([]);
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

  const isProcessing = isNextTurnPending || isMoraleCheckPending;

  if (!turnStarted) {
    return (
      <TurnStartScreen
        participant={participant}
        onStartTurn={handleStartTurn}
      />
    );
  }

  const { currentHp, maxHp } = participant.combatStats;

  const activeEffects = participant.battleData?.activeEffects ?? [];

  const buffs = activeEffects.filter((e) => e.type === "buff");

  const debuffs = activeEffects.filter((e) => e.type === "debuff");

  const conditions = activeEffects.filter((e) => e.type === "condition");

  const hpPercent = maxHp > 0 ? (currentHp / maxHp) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-black/60 to-transparent animate-in fade-in duration-500">
      {/* HUD: HP + бафи/дебафи */}
      <div className="shrink-0 bg-black/50 backdrop-blur-md border-b border-white/10 px-3 py-2 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Поточне здоров'я */}
          <div
            className="flex items-center gap-2 min-w-0"
            title="Здоров'я"
          >
            <Heart className="h-4 w-4 shrink-0 text-red-400/90" />
            <span className="tabular-nums font-bold text-white">
              {currentHp}/{maxHp}
            </span>
            <div className="h-1.5 w-16 rounded-full bg-white/20 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  hpPercent <= 25
                    ? "bg-red-500"
                    : hpPercent <= 50
                      ? "bg-amber-500"
                      : "bg-green-500",
                )}
                style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
              />
            </div>
          </div>
          {/* Бафи */}
          {buffs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3 shrink-0 text-green-400/80" />
              {buffs.map((e) => (
                <span
                  key={e.id}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-500/25 text-green-200 border border-green-500/40"
                  title={e.description ?? `${e.name}${e.duration > 0 ? ` (${e.duration} раундів)` : ""}`}
                >
                  {e.icon ? (
                    <img
                      src={e.icon}
                      alt={e.name}
                      className="h-4 w-4 rounded object-cover shrink-0 border-2 border-green-500"
                    />
                  ) : (
                    <span>{e.name}</span>
                  )}
                  {e.duration > 0 ? ` (${e.duration})` : ""}
                </span>
              ))}
            </div>
          )}
          {/* Дебафи */}
          {debuffs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3 shrink-0 text-red-400/80" />
              {debuffs.map((e) => {
                const dotInfo =
                  e.dotDamage &&
                  `${e.dotDamage.damagePerRound} ${e.dotDamage.damageType} урону/раунд`;
                const title =
                  e.description ??
                  [e.name, e.duration > 0 ? `(${e.duration} р.)` : "", dotInfo]
                    .filter(Boolean)
                    .join(" ");
                return (
                  <span
                    key={e.id}
                    className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-500/25 text-red-200 border border-red-500/40"
                    title={title}
                  >
                    {e.icon ? (
                      <img
                        src={e.icon}
                        alt={e.name}
                        className="h-4 w-4 rounded object-cover shrink-0 border-2 border-red-500"
                      />
                    ) : (
                      <span>{e.name}</span>
                    )}
                    {e.duration > 0 ? ` (${e.duration})` : ""}
                  </span>
                );
              })}
            </div>
          )}
          {/* Умови (condition) */}
          {conditions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {conditions.map((e) => (
                <span
                  key={e.id}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/25 text-amber-200 border border-amber-500/40"
                  title={e.description ?? `${e.name}${e.duration > 0 ? ` (${e.duration} раундів)` : ""}`}
                >
                  {e.icon ? (
                    <img
                      src={e.icon}
                      alt={e.name}
                      className="h-4 w-4 rounded object-cover shrink-0"
                    />
                  ) : (
                    <span>{e.name}</span>
                  )}
                  {e.duration > 0 ? ` (${e.duration})` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Stats: AC, характеристики, мораль, слоти */}
        <div className="flex justify-center">
          <ParticipantStats participant={participant} className="text-white/90" />
        </div>
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
        onPreview={
          onSpellPreview
            ? (data) => {
                onSpellPreview(data);
                setSpellSelectionDialogOpen(false);
              }
            : undefined
        }
        onCast={(data) => {
          setHasPerformedAction(true);
          onSpell(data);
          setSpellSelectionDialogOpen(false);
        }}
      />

      <TargetSelectionDialog
        open={targetSelectionDialogOpen}
        onOpenChange={setTargetSelectionDialogOpen}
        isAOE={
          selectedAttack?.targetType === "aoe" ||
          (selectedAttack?.type === AttackType.RANGED &&
            (participant.combatStats.maxTargets ?? 1) > 1)
        }
        maxTargets={
          selectedAttack?.targetType === "aoe"
            ? selectedAttack.maxTargets
            : selectedAttack?.type === AttackType.RANGED &&
                (participant.combatStats.maxTargets ?? 1) > 1
              ? participant.combatStats.maxTargets
              : undefined
        }
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

      {selectedAttack && currentRollTarget && (
        <AttackRollDialog
          open={attackRollDialogOpen}
          onOpenChange={setAttackRollDialogOpen}
          attacker={participant}
          attack={selectedAttack}
          target={currentRollTarget}
          canSeeEnemyHp={canSeeEnemyHp}
          onConfirm={handleAttackRollConfirm}
        />
      )}

      {selectedAttack && (
        <DamageRollDialog
          open={damageRollDialogOpen}
          onOpenChange={setDamageRollDialogOpen}
          attack={selectedAttack}
          attacker={participant}
          targetsCount={selectedTargets.length}
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
          targets={
            selectedTargets.length > 1 ? selectedTargets : undefined
          }
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
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        {isProcessing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        )}
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

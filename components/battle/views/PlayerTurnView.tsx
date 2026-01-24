"use client";

import { useMemo, useState } from "react";

import { ActionButtonsPanel } from "@/components/battle/ActionButtonsPanel";
import { AttackRollDialog } from "@/components/battle/dialogs/AttackRollDialog";
import { AttackTypeDialog } from "@/components/battle/dialogs/AttackTypeDialog";
import { DamageRollDialog } from "@/components/battle/dialogs/DamageRollDialog";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellSelectionDialog } from "@/components/battle/dialogs/SpellSelectionDialog";
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
  const [attackTypeDialogOpen, setAttackTypeDialogOpen] = useState(false);

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

  // Стан для послідовного відкриття діалогів заклинання
  const [spellSelectionDialogOpen, setSpellSelectionDialogOpen] =
    useState(false);

  const [spellTargetSelectionDialogOpen, setSpellTargetSelectionDialogOpen] =
    useState(false);

  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

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
  const handleAttackClick = () => {
    setAttackTypeDialogOpen(true);
  };

  const handleAttackTypeSelect = (_type: AttackType, attack: BattleAttack) => {
    setSelectedAttack(attack);
    setAttackTypeDialogOpen(false);
    setTargetSelectionDialogOpen(true);
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

  const handleAttackRollConfirm = (data: {
    attackRoll: number;
    advantageRoll?: number;
  }) => {
    setAttackRollData(data);
    setAttackRollDialogOpen(false);
    setDamageRollDialogOpen(true);
  };

  const handleDamageRollConfirm = (damageRolls: number[]) => {
    if (!selectedAttack || !selectedTarget || !attackRollData) return;

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

  if (!turnStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-4">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold">🎯 Твій хід!</h2>
          <p className="text-muted-foreground">{participant.basicInfo.name}</p>
        </div>
        <Button
          size="lg"
          onClick={handleStartTurn}
          className="text-lg px-8 py-6"
        >
          Почати хід
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Перевірка моралі */}
      <MoraleCheckDialog
        open={showMoraleCheck}
        onOpenChange={(open) => {
          if (!open) {
            // Якщо діалог закривається без підтвердження, позначаємо що він був закритий
            setShowMoraleCheck(false);
            setMoraleCheckDismissed(true);
          }
        }}
        participant={participant}
        onConfirm={handleMoraleCheckConfirm}
      />

      {/* Послідовні діалоги для атаки */}
      <AttackTypeDialog
        open={attackTypeDialogOpen}
        onOpenChange={setAttackTypeDialogOpen}
        participant={participant}
        onSelect={handleAttackTypeSelect}
      />

      <TargetSelectionDialog
        open={targetSelectionDialogOpen}
        onOpenChange={setTargetSelectionDialogOpen}
        availableTargets={(() => {
          // Визначаємо доступні цілі (тільки вороги, якщо friendlyFire вимкнено)
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
        title="🎯 Вибір Цілі"
        description="Оберіть ціль для атаки"
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

      {/* Діалоги для заклинання */}
      <SpellSelectionDialog
        open={spellSelectionDialogOpen}
        onOpenChange={setSpellSelectionDialogOpen}
        caster={participant}
        campaignId={campaignId}
        onSelect={(spell) => {
          setSelectedSpell(spell);
          setSpellSelectionDialogOpen(false);
          setSpellTargetSelectionDialogOpen(true);
        }}
      />

      {selectedSpell && (
        <TargetSelectionDialog
          open={spellTargetSelectionDialogOpen}
          onOpenChange={setSpellTargetSelectionDialogOpen}
          availableTargets={(() => {
            // Визначаємо доступні цілі для заклинання
            const friendlyFire = battle.campaign?.friendlyFire || false;

            const participantSide = participant.basicInfo.side;

            if (selectedSpell.type === "aoe") {
              // Для AOE можна вибрати кілька цілей
              if (friendlyFire) {
                return battle.initiativeOrder.filter(
                  (p) =>
                    p.basicInfo.id !== participant.basicInfo.id &&
                    p.combatStats.status === "active",
                );
              } else {
                // Для AOE зазвичай можна вибрати всіх ворогів
                return battle.initiativeOrder.filter(
                  (p) =>
                    p.basicInfo.side !== participantSide &&
                    p.basicInfo.id !== participant.basicInfo.id &&
                    p.combatStats.status === "active",
                );
              }
            } else {
              // Для target тільки одна ціль
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
            }
          })()}
          isAOE={selectedSpell.type === "aoe"}
          onSelect={(targetIds) => {
            setSpellTargetSelectionDialogOpen(false);
            // TODO: Відкрити діалог для saving throws та damage rolls
            // Поки що викликаємо onSpell з базовими даними
            onSpell({
              casterId: participant.basicInfo.id,
              casterType: participant.basicInfo.sourceType,
              spellId: selectedSpell.id,
              targetIds,
              damageRolls: [], // TODO: Додати діалог для damage rolls
            });
            setSelectedSpell(null);
          }}
          title="🎯 Вибір Цілі для Заклинання"
          description={`Оберіть ціль для ${selectedSpell.name}`}
        />
      )}

      {/* Панель дій */}
      <div className="flex-1 flex items-center justify-center p-4">
        <ActionButtonsPanel
          participant={participant}
          bonusActions={bonusActions}
          onMeleeAttack={handleAttackClick}
          onRangedAttack={handleAttackClick}
          onSpell={() => setSpellSelectionDialogOpen(true)}
          onBonusAction={onBonusAction}
          onSkipTurn={onSkipTurn}
        />
      </div>
    </div>
  );
}

"use client";

import { AttackRollDialog } from "@/components/battle/dialogs/AttackRollDialog";
import { DamageRollDialog } from "@/components/battle/dialogs/DamageRollDialog";
import { DamageSummaryModal } from "@/components/battle/dialogs/DamageSummaryModal";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import { TargetSelectionDialog } from "@/components/battle/dialogs/TargetSelectionDialog";
import { AttackType, CombatStatus } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { mergeDiceFormulas } from "@/lib/utils/battle/balance";
import type { BattleScene } from "@/types/api";
import type { BattleAttack, BattleParticipant } from "@/types/battle";
import type { SpellCastData } from "@/types/battle-ui";

export interface PlayerTurnViewDialogsProps {
  battle: BattleScene;
  participant: BattleParticipant;
  campaignId: string;
  isDM: boolean;
  canSeeEnemyHp: boolean;
  showMoraleCheck: boolean;
  setShowMoraleCheck: (v: boolean) => void;
  setMoraleCheckDismissed: (v: boolean) => void;
  onMoraleCheckConfirm: (d10Roll: number) => void;
  spellSelectionDialogOpen: boolean;
  setSpellSelectionDialogOpen: (v: boolean) => void;
  setHasPerformedAction: (v: boolean) => void;
  onSpell: (data: SpellCastData) => void;
  onSpellPreview?: (data: SpellCastData) => void;
  dialogs: {
    targetSelection: { open: boolean; setOpen: (v: boolean) => void };
    attackRoll: { open: boolean; setOpen: (v: boolean) => void };
    damageRoll: { open: boolean; setOpen: (v: boolean) => void };
    damageSummary: { open: boolean; setOpen: (v: boolean) => void };
  };
  selection: {
    selectedAttack: BattleAttack | null;
    selectedTarget: BattleParticipant | null;
    selectedTargets: BattleParticipant[];
    currentRollTarget: BattleParticipant | null;
    attackRollsData: Array<{ attackRoll: number; advantageRoll?: number; disadvantageRoll?: number }>;
    pendingAttackData: { damageRolls: number[] } | null;
    damageFromCrit: boolean;
  };
  clearAttackState: () => void;
  handlers: {
    handleTargetSelect: (ids: string[]) => void;
    handleAttackRollConfirm: (data: { attackRoll: number; advantageRoll?: number; disadvantageRoll?: number }) => void;
    handleDamageRollConfirm: (damageRolls: number[]) => void;
    handleDamageSummaryApply: () => void;
  };
}

export function PlayerTurnViewDialogs({
  battle,
  participant,
  campaignId,
  isDM,
  canSeeEnemyHp,
  showMoraleCheck,
  setShowMoraleCheck,
  setMoraleCheckDismissed,
  onMoraleCheckConfirm,
  spellSelectionDialogOpen,
  setSpellSelectionDialogOpen,
  setHasPerformedAction,
  onSpell,
  onSpellPreview,
  dialogs,
  selection,
  clearAttackState,
  handlers,
}: PlayerTurnViewDialogsProps) {
  const availableTargets = (() => {
    const friendlyFire = battle.campaign?.friendlyFire || false;

    const participantSide = participant.basicInfo.side;

    if (friendlyFire) {
      return battle.initiativeOrder.filter(
        (p) =>
          p.basicInfo.id !== participant.basicInfo.id &&
          p.combatStats.status === CombatStatus.ACTIVE,
      );
    }

    return battle.initiativeOrder.filter(
      (p) =>
        p.basicInfo.side !== participantSide &&
        p.basicInfo.id !== participant.basicInfo.id &&
        p.combatStats.status === CombatStatus.ACTIVE,
    );
  })();

  return (
    <>
      <MoraleCheckDialog
        open={showMoraleCheck}
        onOpenChange={(open) => {
          if (!open) {
            setShowMoraleCheck(false);
            setMoraleCheckDismissed(true);
          }
        }}
        participant={participant}
        onConfirm={onMoraleCheckConfirm}
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
        open={dialogs.targetSelection.open}
        onOpenChange={dialogs.targetSelection.setOpen}
        isAOE={
          selection.selectedAttack?.targetType === "aoe" ||
          (selection.selectedAttack?.type === AttackType.RANGED &&
            (participant.combatStats.maxTargets ?? 1) > 1)
        }
        maxTargets={
          selection.selectedAttack?.targetType === "aoe"
            ? selection.selectedAttack.maxTargets
            : selection.selectedAttack?.type === AttackType.RANGED &&
                (participant.combatStats.maxTargets ?? 1) > 1
              ? participant.combatStats.maxTargets
              : undefined
        }
        canSeeEnemyHp={canSeeEnemyHp}
        availableTargets={availableTargets}
        onSelect={handlers.handleTargetSelect}
        title="🎯 ОБЕРІТЬ ЦІЛЬ"
        description="Оберіть ворога для нанесення удару"
      />
      {selection.selectedAttack && selection.currentRollTarget && (
        <AttackRollDialog
          open={dialogs.attackRoll.open}
          onOpenChange={dialogs.attackRoll.setOpen}
          attacker={participant}
          attack={selection.selectedAttack}
          target={selection.currentRollTarget}
          canSeeEnemyHp={canSeeEnemyHp}
          onConfirm={handlers.handleAttackRollConfirm}
        />
      )}
      {selection.selectedAttack && (
        <DamageRollDialog
          key={`damage-${selection.selectedTargets.length}-${selection.attackRollsData?.length ?? 0}`}
          open={dialogs.damageRoll.open}
          onOpenChange={dialogs.damageRoll.setOpen}
          attack={selection.selectedAttack}
          attacker={participant}
          targetsCount={
            selection.selectedTargets.length > 1
              ? Math.max(
                  selection.selectedTargets.length,
                  selection.attackRollsData?.length ?? 0,
                ) || 1
              : 1
          }
          damageDiceFormula={
            participant.basicInfo.sourceType === "character"
              ? mergeDiceFormulas(
                  selection.selectedAttack.damageDice ?? "",
                  getHeroDamageDiceForLevel(
                    participant.abilities.level,
                    selection.selectedAttack.type as AttackType,
                  ),
                )
              : undefined
          }
          onConfirm={handlers.handleDamageRollConfirm}
        />
      )}
      {selection.selectedAttack &&
        selection.selectedTarget &&
        selection.pendingAttackData && (
          <DamageSummaryModal
            open={dialogs.damageSummary.open}
            onOpenChange={(open) => {
              if (!open) clearAttackState();
            }}
            attacker={participant}
            target={selection.selectedTarget}
            targets={
              selection.selectedTargets.length > 1
                ? selection.selectedTargets
                : undefined
            }
            attack={selection.selectedAttack}
            damageRolls={selection.pendingAttackData.damageRolls}
            allParticipants={battle.initiativeOrder}
            isCritical={selection.damageFromCrit}
            campaignId={campaignId}
            battleId={battle.id}
            onApply={handlers.handleDamageSummaryApply}
          />
        )}
    </>
  );
}

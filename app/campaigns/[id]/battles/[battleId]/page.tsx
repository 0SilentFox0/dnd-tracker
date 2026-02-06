"use client";

import { use } from "react";
import { BattleHeader } from "@/components/battle/BattleHeader";
import { AttackDialog } from "@/components/battle/dialogs/AttackDialog";
import { CounterAttackResultDialog } from "@/components/battle/dialogs/CounterAttackResultDialog";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import { BattleFieldView } from "@/components/battle/views/BattleFieldView";
import { PlayerTurnView } from "@/components/battle/views/PlayerTurnView";
import { BattlePreparationView } from "@/components/battle/views/BattlePreparationView";
import { useBattleSceneLogic } from "@/lib/hooks/battle/useBattleSceneLogic";

export default function BattlePage({
  params,
}: {
  params: Promise<{ id: string; battleId: string }>;
}) {
  const { id, battleId } = use(params);
  const {
    battle,
    loading,
    isDM,
    currentParticipant,
    isCurrentPlayerTurn,
    allies,
    enemies,
    canSeeEnemyHp,
    availableTargets,
    dialogs,
    mutations,
    handlers,
  } = useBattleSceneLogic(id, battleId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xl font-black italic uppercase tracking-widest animate-pulse">
            Завантаження...
          </p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-2xl font-black italic uppercase tracking-widest">
          Бій не знайдено
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-black selection:bg-primary/30 text-white">
      <BattleHeader
        battle={battle}
        onNextTurn={handlers.handleNextTurn}
        onReset={() => mutations.resetBattle.mutate()}
        isDM={isDM}
      />

      {/* Основний контент */}
      <main className="flex-1 overflow-hidden relative">
        {battle.status === "prepared" ? (
          <BattlePreparationView
            battle={battle}
            alliesCount={allies.length}
            enemiesCount={enemies.length}
            isDM={isDM}
            onStartBattle={handlers.handleStartBattle}
            isStarting={mutations.startBattle.isPending}
          />
        ) : isCurrentPlayerTurn &&
          currentParticipant &&
          battle.status === "active" ? (
          <PlayerTurnView
            battle={battle}
            participant={currentParticipant}
            isDM={isDM}
            campaignId={id}
            onAttack={(data) => handlers.handleAttack(data)}
            onSpell={(data) => mutations.spell.mutate(data)}
            onBonusAction={(skill) => alert(`Бонусна дія: ${skill.name}`)}
            onSkipTurn={handlers.handleNextTurn}
            onMoraleCheck={() => {}} // Handle properly inside PlayerTurnView if needed
          />
        ) : (
          battle.status === "active" && (
            <BattleFieldView
              battle={battle}
              allies={allies}
              enemies={enemies}
              isDM={isDM}
            />
          )
        )}
      </main>

      {/* Діалоги */}
      <AttackDialog
        open={dialogs.attack.open}
        onOpenChange={dialogs.attack.setOpen}
        attacker={null}
        battle={battle}
        availableTargets={availableTargets}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onAttack={(data) =>
          handlers.handleAttack(data, () => dialogs.attack.setOpen(false))
        }
      />

      {!isCurrentPlayerTurn && (
        <MoraleCheckDialog
          open={dialogs.morale.open}
          onOpenChange={dialogs.morale.setOpen}
          participant={null} // Participant for morale should be handled in hook if needed for DM
          onConfirm={(roll) => {}} // mutations.moraleCheck.mutate
        />
      )}

      <SpellDialog
        open={dialogs.spell.open}
        onOpenChange={dialogs.spell.setOpen}
        caster={null}
        battle={battle}
        campaignId={id}
        availableTargets={availableTargets}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onCast={(data) =>
          mutations.spell.mutate(data, {
            onSuccess: () => dialogs.spell.setOpen(false),
          })
        }
      />

      <CounterAttackResultDialog
        open={dialogs.counterAttack.open}
        onOpenChange={dialogs.counterAttack.setOpen}
        info={dialogs.counterAttack.info}
      />
    </div>
  );
}

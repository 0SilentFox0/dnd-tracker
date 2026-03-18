"use client";

import { use, useMemo, useState } from "react";

import { BattlePageDialogs, type BattlePageDialogsProps } from "./BattlePageDialogs";
import { BattlePageLoadingState } from "./BattlePageLoadingState";

import { BattleHeader } from "@/components/battle/BattleHeader";
import { DmQuickActionsPanel } from "@/components/battle/panels";
import { BattleFieldView } from "@/components/battle/views/BattleFieldView";
import { BattlePreparationView } from "@/components/battle/views/BattlePreparationView";
import { PlayerTurnView } from "@/components/battle/views/PlayerTurnView";
import { spellPreview } from "@/lib/api/battles";
import {
  useBattlePageDialogs,
  useBattleSceneLogic,
  useMoraleOverlay,
} from "@/lib/hooks/battle";
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";
import type { BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";

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
    dmControlledParticipantId,
    setDmControlledParticipantId,
    dmSpellCasterId,
    setDmSpellCasterId,
    addParticipantMutation,
    updateParticipantMutation,
    globalDamageFlash,
    turnStartedNotification,
    pusherConnectionState,
  } = useBattleSceneLogic(id, battleId);

  const dmDialogs = useBattlePageDialogs();

  const moraleOverlay = useMoraleOverlay({
    onSkipTurn: handlers.handleNextTurn,
  });

  const [spellResultAction, setSpellResultAction] =
    useState<BattleAction | null>(null);

  const [spellResultModalOpen, setSpellResultModalOpen] = useState(false);

  const [spellPreviewAction, setSpellPreviewAction] =
    useState<BattleAction | null>(null);

  const [pendingSpellData, setPendingSpellData] = useState<{
    casterId: string;
    casterType: string;
    spellId: string;
    targetIds: string[];
    damageRolls: number[];
    savingThrows?: Array<{ participantId: string; roll: number }>;
    additionalRollResult?: number;
    hitRoll?: number;
  } | null>(null);

  const [, setSpellPreviewLoading] = useState(false);

  const handleSpellPreview = useMemo(
    () =>
      async (data: {
        casterId: string;
        casterType: string;
        spellId: string;
        targetIds: string[];
        damageRolls: number[];
        savingThrows?: Array<{ participantId: string; roll: number }>;
        additionalRollResult?: number;
        hitRoll?: number;
      }) => {
        setSpellPreviewLoading(true);
        try {
          const json = await spellPreview(id, battleId, data);

          if (json.preview && json.battleAction) {
            setSpellPreviewAction(json.battleAction as BattleAction);
            setPendingSpellData(data);
            setSpellResultModalOpen(true);
          }
        } finally {
          setSpellPreviewLoading(false);
        }
      },
    [id, battleId],
  );

  const handleSpellApplyFromModal = () => {
    if (!pendingSpellData) return;

    mutations.spell.mutate(pendingSpellData, {
      onSuccess: (updatedBattle: BattleScene | undefined) => {
        setSpellResultModalOpen(false);
        setSpellPreviewAction(null);
        setPendingSpellData(null);

        if (updatedBattle) handlers.triggerGlobalDamageFromBattle(updatedBattle);
      },
    });
  };

  const preparationCounts = useMemo(() => {
    if (!battle || battle.status !== "prepared") return { allies: 0, enemies: 0 };

    const participants = (battle.participants ?? []) as Array<{
      side?: string;
      quantity?: number;
    }>;

    return {
      allies: participants
        .filter((p) => p.side === "ally")
        .reduce((sum, p) => sum + (p.quantity ?? 1), 0),
      enemies: participants
        .filter((p) => p.side === "enemy")
        .reduce((sum, p) => sum + (p.quantity ?? 1), 0),
    };
  }, [battle]);

  if (loading) return <BattlePageLoadingState mode="loading" />;

  if (!battle) return <BattlePageLoadingState mode="not-found" />;

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-black selection:bg-primary/30 text-white relative">
      {turnStartedNotification && (
        <div className="shrink-0 py-2 px-4 bg-primary/90 text-primary-foreground text-center font-bold text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          ⚔️ {turnStartedNotification}
        </div>
      )}
      <BattleHeader
        battle={battle}
        onNextTurn={handlers.handleNextTurn}
        onReset={() => mutations.resetBattle.mutate()}
        onCompleteBattle={handlers.handleCompleteBattle}
        isDM={isDM}
        connectionState={pusherConnectionState}
        isNextTurnPending={mutations.nextTurn.isPending}
      />

      {/* Основний контент */}
      <main className="flex-1 overflow-hidden relative">
        {battle.status === "prepared" ? (
          <BattlePreparationView
            battle={battle}
            alliesCount={preparationCounts.allies}
            enemiesCount={preparationCounts.enemies}
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
            canSeeEnemyHp={canSeeEnemyHp}
            onAttack={(data) => handlers.handleAttack(data)}
            onSpellPreview={handleSpellPreview}
            onSpell={(data) =>
              mutations.spell.mutate(data, {
                onSuccess: (updatedBattle: BattleScene | undefined) => {
                  const log = updatedBattle?.battleLog;

                  if (!log || log.length === 0) return;

                  const last = log[log.length - 1] as BattleAction;

                  if (last.actionType === "spell") {
                    setSpellResultAction(last);
                    setSpellResultModalOpen(true);
                  }
                },
              })
            }
            onBonusAction={(skill) =>
              handlers.handleBonusAction(
                currentParticipant.basicInfo.id,
                skill.skillId,
              )
            }
            onSkipTurn={handlers.handleNextTurn}
            isNextTurnPending={mutations.nextTurn.isPending}
            isAttackPending={mutations.attack.isPending}
            isMoraleCheckPending={mutations.moraleCheck.isPending}
            onMoraleCheck={(d10Roll) => {
              if (currentParticipant)
                mutations.moraleCheck.mutate(
                  {
                    participantId: currentParticipant.basicInfo.id,
                    d10Roll,
                  },
                  {
                    onSuccess: (data) => {
                      moraleOverlay.showMoraleResult(
                        data.moraleResult as MoraleCheckResult,
                      );
                    },
                  },
                );
            }}
          />
        ) : (
          battle.status === "active" && (
            <>
              <BattleFieldView
                battle={battle}
                allies={allies}
                enemies={enemies}
                isDM={isDM}
              />
            </>
          )
        )}
      </main>

      {isDM && battle.status === "active" && (
        <DmQuickActionsPanel
          battle={battle}
          isDM={isDM}
          onOpenLog={dmDialogs.openLog}
          onAddParticipant={dmDialogs.openAddParticipant}
          onIncreaseHp={dmDialogs.openHpDialog}
          onRemoveFromBattle={(p) => {
            updateParticipantMutation.mutate({
              participantId: p.basicInfo.id,
              data: { removeFromBattle: true },
            });
          }}
          onCompleteBattle={(result) => handlers.handleCompleteBattle(result)}
          onTakeControl={(p) =>
            setDmControlledParticipantId(p?.basicInfo.id ?? null)
          }
          dmControlledParticipantId={dmControlledParticipantId ?? null}
          logPanelOpen={dmDialogs.logPanelOpen}
          setLogPanelOpen={dmDialogs.setLogPanelOpen}
          onRollback={handlers.handleRollback}
          onOpenCastSpell={() => {
            setDmSpellCasterId(null);
            dialogs.spell.setOpen(true);
          }}
        />
      )}

      <BattlePageDialogs
        battleContext={{
          campaignId: id,
          battle,
          isDM,
          isCurrentPlayerTurn,
          currentParticipant,
          availableTargets,
          canSeeEnemyHp,
        }}
        dmSpell={{
          dmSpellCasterId,
          setDmSpellCasterId,
        }}
        dialogs={dialogs}
        dmDialogs={{
          addParticipantDialogOpen: dmDialogs.addParticipantDialogOpen,
          setAddParticipantDialogOpen: dmDialogs.setAddParticipantDialogOpen,
          hpDialogParticipant: dmDialogs.hpDialogParticipant,
          closeHpDialog: dmDialogs.closeHpDialog,
        }}
        mutations={
          {
            addParticipant: addParticipantMutation,
            updateParticipant: updateParticipantMutation,
            moraleCheck: mutations.moraleCheck,
            spell: mutations.spell,
            attack: mutations.attack,
            nextTurn: mutations.nextTurn,
          } as BattlePageDialogsProps["mutations"]
        }
        handlers={handlers}
        moraleOverlay={moraleOverlay}
        spellResult={{
          spellResultModalOpen,
          setSpellResultModalOpen,
          spellResultAction,
          setSpellResultAction,
          spellPreviewAction,
          setSpellPreviewAction,
          pendingSpellData,
          setPendingSpellData,
          handleSpellPreview,
          handleSpellApplyFromModal,
        }}
        globalDamageFlash={globalDamageFlash}
      />
    </div>
  );
}

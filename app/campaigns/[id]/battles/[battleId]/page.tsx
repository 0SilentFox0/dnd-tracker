"use client";

import { use, useMemo, useState } from "react";

import { BattleHeader } from "@/components/battle/BattleHeader";
import { AddParticipantDialog } from "@/components/battle/dialogs/AddParticipantDialog";
import { AttackDialog } from "@/components/battle/dialogs/AttackDialog";
import { ChangeHpDialog } from "@/components/battle/dialogs/ChangeHpDialog";
import { CounterAttackResultDialog } from "@/components/battle/dialogs/CounterAttackResultDialog";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import { SpellResultModal } from "@/components/battle/dialogs/SpellResultModal";
import { GlobalDamageOverlay } from "@/components/battle/overlays";
import { DmQuickActionsPanel } from "@/components/battle/panels";
import { BattleFieldView } from "@/components/battle/views/BattleFieldView";
import { BattlePreparationView } from "@/components/battle/views/BattlePreparationView";
import { PlayerTurnView } from "@/components/battle/views/PlayerTurnView";
import { useBattlePageDialogs } from "@/lib/hooks/battle/useBattlePageDialogs";
import { useBattleSceneLogic } from "@/lib/hooks/battle/useBattleSceneLogic";
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
    addParticipantMutation,
    updateParticipantMutation,
    globalDamageFlash,
    turnStartedNotification,
    pusherConnectionState,
  } = useBattleSceneLogic(id, battleId);

  const dmDialogs = useBattlePageDialogs();

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
          const res = await fetch(
            `/api/campaigns/${id}/battles/${battleId}/spell`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...data, preview: true }),
            },
          );

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));

            throw new Error(err?.error ?? "Preview failed");
          }

          const json = await res.json();

          if (json.preview && json.battleAction) {
            setSpellPreviewAction(json.battleAction);
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

  const isApplyingDamageOrTurn =
    mutations.attack.isPending || mutations.nextTurn.isPending;

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
            onMoraleCheck={(d10Roll) => {
              if (currentParticipant)
                mutations.moraleCheck.mutate({
                  participantId: currentParticipant.basicInfo.id,
                  d10Roll,
                });
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
        />
      )}

      <AddParticipantDialog
        open={dmDialogs.addParticipantDialogOpen}
        onOpenChange={dmDialogs.setAddParticipantDialogOpen}
        campaignId={id}
        onAdd={(data) =>
          addParticipantMutation.mutate(data, {
            onSuccess: () => dmDialogs.setAddParticipantDialogOpen(false),
          })
        }
        isPending={addParticipantMutation.isPending}
      />

      <ChangeHpDialog
        open={dmDialogs.hpDialogParticipant !== null}
        onOpenChange={(open) => !open && dmDialogs.closeHpDialog()}
        participant={dmDialogs.hpDialogParticipant}
        onConfirm={(participantId, newHp) => {
          updateParticipantMutation.mutate({
            participantId,
            data: { currentHp: newHp },
          });
          dmDialogs.closeHpDialog();
        }}
        isPending={updateParticipantMutation.isPending}
      />

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

      {!isCurrentPlayerTurn && currentParticipant && (
        <MoraleCheckDialog
          open={dialogs.morale.open}
          onOpenChange={dialogs.morale.setOpen}
          participant={currentParticipant}
          onConfirm={(d10Roll) =>
            mutations.moraleCheck.mutate({
              participantId: currentParticipant.basicInfo.id,
              d10Roll,
            })
          }
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
        onPreview={async (data) => {
          dialogs.spell.setOpen(false);
          await handleSpellPreview(data);
        }}
        onCast={(data) =>
          mutations.spell.mutate(data, {
            onSuccess: (updatedBattle: BattleScene | undefined) => {
              dialogs.spell.setOpen(false);

              if (updatedBattle) {
                handlers.triggerGlobalDamageFromBattle(updatedBattle);

                const log = updatedBattle.battleLog;

                if (log?.length) {
                  const last = log[log.length - 1] as BattleAction;

                  if (last.actionType === "spell") {
                    setSpellResultAction(last);
                    setSpellResultModalOpen(true);
                  }
                }
              }
            },
          })
        }
      />

      <CounterAttackResultDialog
        open={dialogs.counterAttack.open}
        onOpenChange={dialogs.counterAttack.setOpen}
        info={dialogs.counterAttack.info}
      />

      <SpellResultModal
        open={spellResultModalOpen}
        onOpenChange={(open) => {
          setSpellResultModalOpen(open);

          if (!open) {
            setPendingSpellData(null);
            setSpellPreviewAction(null);
          }
        }}
        lastSpellAction={
          pendingSpellData ? spellPreviewAction : spellResultAction
        }
        onApply={
          pendingSpellData ? handleSpellApplyFromModal : undefined
        }
      />

      {globalDamageFlash && (
        <GlobalDamageOverlay
          value={globalDamageFlash.value}
          isHealing={globalDamageFlash.isHealing}
          onDone={handlers.clearGlobalDamageFlash}
        />
      )}

      {/* Лоадер при застосуванні шкоди або переході ходу */}
      {isApplyingDamageOrTurn && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-white/90">
              {mutations.attack.isPending
                ? "Застосування шкоди…"
                : "Перехід ходу…"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

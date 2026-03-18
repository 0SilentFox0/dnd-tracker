"use client";

import type { BattlePageDialogsDialogs } from "./BattlePageDialogs-types";
import type { BattlePageDialogsHandlers } from "./BattlePageDialogs-types";
import type { BattlePageDialogsMutations } from "./BattlePageDialogs-types";
import type { BattlePageDialogsSpellResult } from "./BattlePageDialogs-types";

import { CounterAttackResultDialog } from "@/components/battle/dialogs/CounterAttackResultDialog";
import { SpellResultModal } from "@/components/battle/dialogs/SpellResultModal";
import { GlobalDamageOverlay } from "@/components/battle/overlays";

interface BattlePageDialogsOverlaysProps {
  dialogs: Pick<BattlePageDialogsDialogs, "counterAttack">;
  mutations: Pick<BattlePageDialogsMutations, "attack" | "nextTurn">;
  handlers: Pick<BattlePageDialogsHandlers, "clearGlobalDamageFlash">;
  spellResult: BattlePageDialogsSpellResult;
  globalDamageFlash: { value: number; isHealing: boolean } | null;
}

export function BattlePageDialogsOverlays({
  dialogs,
  mutations,
  handlers,
  spellResult,
  globalDamageFlash,
}: BattlePageDialogsOverlaysProps) {
  const isApplyingDamageOrTurn =
    mutations.attack.isPending || mutations.nextTurn.isPending;

  return (
    <>
      <CounterAttackResultDialog
        open={dialogs.counterAttack.open}
        onOpenChange={dialogs.counterAttack.setOpen}
        info={dialogs.counterAttack.info}
      />
      <SpellResultModal
        open={spellResult.spellResultModalOpen}
        onOpenChange={(open) => {
          spellResult.setSpellResultModalOpen(open);

          if (!open) {
            spellResult.setPendingSpellData(null);
            spellResult.setSpellPreviewAction(null);
          }
        }}
        lastSpellAction={
          spellResult.pendingSpellData
            ? spellResult.spellPreviewAction
            : spellResult.spellResultAction
        }
        onApply={
          spellResult.pendingSpellData
            ? spellResult.handleSpellApplyFromModal
            : undefined
        }
      />
      {globalDamageFlash && (
        <GlobalDamageOverlay
          value={globalDamageFlash.value}
          isHealing={globalDamageFlash.isHealing}
          onDone={handlers.clearGlobalDamageFlash}
        />
      )}
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
    </>
  );
}

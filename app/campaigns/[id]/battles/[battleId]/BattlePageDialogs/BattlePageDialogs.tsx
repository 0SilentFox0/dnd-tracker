"use client";

import type { BattlePageDialogsProps } from "./BattlePageDialogs-types";
import { BattlePageDialogsCombatSection } from "./BattlePageDialogsCombatSection";
import { BattlePageDialogsDmSection } from "./BattlePageDialogsDmSection";
import { BattlePageDialogsOverlays } from "./BattlePageDialogsOverlays";
import { BattlePageDialogsSpellSection } from "./BattlePageDialogsSpellSection";

export type { BattlePageDialogsProps } from "./BattlePageDialogs-types";

export function BattlePageDialogs({
  battleContext,
  dmSpell,
  dialogs,
  dmDialogs,
  mutations,
  handlers,
  moraleOverlay,
  spellResult,
  globalDamageFlash,
}: BattlePageDialogsProps) {
  return (
    <>
      <BattlePageDialogsDmSection
        campaignId={battleContext.campaignId}
        dmDialogs={dmDialogs}
        mutations={{
          addParticipant: mutations.addParticipant,
          updateParticipant: mutations.updateParticipant,
        }}
      />
      <BattlePageDialogsCombatSection
        battleContext={battleContext}
        dialogs={{ attack: dialogs.attack, morale: dialogs.morale }}
        mutations={{ moraleCheck: mutations.moraleCheck }}
        handlers={{ handleAttack: handlers.handleAttack }}
        moraleOverlay={moraleOverlay}
      />
      <BattlePageDialogsSpellSection
        battleContext={battleContext}
        dmSpell={dmSpell}
        dialogs={{ spell: dialogs.spell }}
        mutations={{ spell: mutations.spell }}
        handlers={{
          triggerGlobalDamageFromBattle:
            handlers.triggerGlobalDamageFromBattle,
        }}
        spellResult={spellResult}
      />
      <BattlePageDialogsOverlays
        dialogs={{ counterAttack: dialogs.counterAttack }}
        mutations={{
          attack: mutations.attack,
          nextTurn: mutations.nextTurn,
        }}
        handlers={{ clearGlobalDamageFlash: handlers.clearGlobalDamageFlash }}
        spellResult={spellResult}
        globalDamageFlash={globalDamageFlash}
      />
    </>
  );
}

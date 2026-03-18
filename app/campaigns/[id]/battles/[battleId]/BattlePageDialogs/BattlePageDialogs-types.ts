/**
 * Згруповані типи пропсів для BattlePageDialogs — менше окремих пропсів, зручніша зміна API.
 */

import type { CounterAttackResultInfo } from "@/components/battle/dialogs/CounterAttackResultDialog";
import type { RollResultType } from "@/components/battle/RollResultOverlay";
import type { AddParticipantData } from "@/lib/api/battles";
import type { MoraleCheckResult } from "@/lib/utils/battle/battle-morale";
import type { AttackData, BattleScene } from "@/types/api";
import type { BattleAction } from "@/types/battle";
import type { BattleParticipant } from "@/types/battle";

export type UpdateParticipantPayload = {
  participantId: string;
  data: { currentHp?: number; removeFromBattle?: boolean };
};

export type SpellPreviewData = {
  casterId: string;
  casterType: string;
  spellId: string;
  targetIds: string[];
  damageRolls: number[];
  savingThrows?: Array<{ participantId: string; roll: number }>;
  additionalRollResult?: number;
  hitRoll?: number;
};

/** Контекст бою: дані сцени та учасників для діалогів */
export interface BattlePageDialogsBattleContext {
  campaignId: string;
  battle: BattleScene;
  isDM: boolean;
  isCurrentPlayerTurn: boolean;
  currentParticipant: BattleParticipant | null;
  availableTargets: BattleParticipant[];
  canSeeEnemyHp: boolean;
}

/** Стан вибору кастера заклинань (DM) */
export interface BattlePageDialogsDmSpell {
  dmSpellCasterId: string | null;
  setDmSpellCasterId: (id: string | null) => void;
}

/** Відкриття/закриття основних діалогів */
export interface BattlePageDialogsDialogs {
  attack: { open: boolean; setOpen: (v: boolean) => void };
  morale: { open: boolean; setOpen: (v: boolean) => void };
  spell: { open: boolean; setOpen: (v: boolean) => void };
  counterAttack: {
    open: boolean;
    setOpen: (v: boolean) => void;
    info: CounterAttackResultInfo | null;
  };
}

/** Діалоги DM: додати учасника, змінити HP */
export interface BattlePageDialogsDmDialogs {
  addParticipantDialogOpen: boolean;
  setAddParticipantDialogOpen: (v: boolean) => void;
  hpDialogParticipant: BattleParticipant | null;
  closeHpDialog: () => void;
}

/** Усі мутації для діалогів сторінки бою */
export interface BattlePageDialogsMutations {
  addParticipant: {
    mutate: (data: AddParticipantData, opts?: { onSuccess?: () => void }) => void;
    isPending: boolean;
  };
  updateParticipant: {
    mutate: (opts: UpdateParticipantPayload) => void;
    isPending: boolean;
  };
  moraleCheck: {
    mutate: (opts: unknown, cb?: unknown) => void;
  };
  spell: {
    mutate: (data: unknown, opts?: unknown) => void;
    isPending?: boolean;
  };
  attack: { isPending: boolean };
  nextTurn: { isPending: boolean };
}

/** Хендлери бою для діалогів */
export interface BattlePageDialogsHandlers {
  handleAttack: (data: AttackData, onSuccess?: () => void) => void;
  triggerGlobalDamageFromBattle: (battle: BattleScene) => void;
  clearGlobalDamageFlash: () => void;
}

/** Оверлей моралі (результат кидка) */
export interface BattlePageDialogsMoraleOverlay {
  overlayType: RollResultType | null;
  overlayCustomText: string | null;
  handleOverlayComplete: () => void;
  showMoraleResult: (result: MoraleCheckResult) => void;
}

/** Стан та хендлери модалки результату заклинання */
export interface BattlePageDialogsSpellResult {
  spellResultModalOpen: boolean;
  setSpellResultModalOpen: (v: boolean) => void;
  spellResultAction: BattleAction | null;
  setSpellResultAction: (a: BattleAction | null) => void;
  spellPreviewAction: BattleAction | null;
  setSpellPreviewAction: (a: BattleAction | null) => void;
  pendingSpellData: SpellPreviewData | null;
  setPendingSpellData: (d: SpellPreviewData | null) => void;
  handleSpellPreview: (data: SpellPreviewData) => Promise<void>;
  handleSpellApplyFromModal: () => void;
}

export interface BattlePageDialogsProps {
  battleContext: BattlePageDialogsBattleContext;
  dmSpell: BattlePageDialogsDmSpell;
  dialogs: BattlePageDialogsDialogs;
  dmDialogs: BattlePageDialogsDmDialogs;
  mutations: BattlePageDialogsMutations;
  handlers: BattlePageDialogsHandlers;
  moraleOverlay: BattlePageDialogsMoraleOverlay;
  spellResult: BattlePageDialogsSpellResult;
  globalDamageFlash: { value: number; isHealing: boolean } | null;
}

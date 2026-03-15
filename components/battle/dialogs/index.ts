/**
 * Battle dialogs – shared wrappers and dialog components.
 * Use shared wrappers for new dialogs: BattleDialog, BattleDialogFooter, ConfirmCancelFooter.
 */

export { AddParticipantDialog } from "./AddParticipantDialog";
export { AttackDialog } from "./AttackDialog";
export { AttackRollDialog } from "./AttackRollDialog";
export { AttackTypeDialog } from "./AttackTypeDialog";
export { ChangeHpDialog } from "./ChangeHpDialog";
export type { CounterAttackResultInfo } from "./CounterAttackResultDialog";
export { CounterAttackResultDialog } from "./CounterAttackResultDialog";
export { DamageRollDialog } from "./DamageRollDialog";
export { DamageSummaryModal } from "./DamageSummaryModal";
export { MoraleCheckDialog } from "./MoraleCheckDialog";
export type {
  BattleDialogBaseProps,
  BattleDialogFooterProps,
  ConfirmCancelFooterProps,
} from "./shared";
export {
  BattleDialog,
  BattleDialogFooter,
  ConfirmCancelFooter,
} from "./shared";
export type { SpellTargetType } from "./SpellDialog";
export { SpellDialog } from "./SpellDialog";
export { SpellResultModal } from "./SpellResultModal";
export { SpellSelectionDialog } from "./SpellSelectionDialog";
export { TargetSelectionDialog } from "./TargetSelectionDialog";

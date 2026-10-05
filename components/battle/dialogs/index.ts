/**
 * Battle dialogs – shared wrappers and dialog components.
 * Use shared wrappers for new dialogs: BattleDialog, BattleDialogFooter, ConfirmCancelFooter.
 */

export { AddParticipantDialog } from "./AddParticipantDialog";
export { ChangeHpDialog } from "./ChangeHpDialog";
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

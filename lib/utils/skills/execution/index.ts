/**
 * Утиліти для виконання ефектів скілів з тригерів.
 * Публічний API — реекспорт з модулів для зручності читання та підтримки.
 */

export type { SkillTriggerExecutionResult } from "../types/execution";
export { RUNIC_ATTACK_RUNES } from "../types/execution";
export {
  applyOnBattleStartEffectsToNewAllies,
  executeOnBattleStartEffects,
  executeOnBattleStartEffectsForAll,
} from "./battle-start";
export { executeBonusActionSkill } from "./bonus-action";
export { updateMoraleOnEvent } from "./morale";
export { executeOnHitEffects } from "./on-hit";
export { executeOnKillEffects } from "./on-kill";
export {
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeAfterSpellCastTriggers,
  executeBeforeAttackTriggers,
  executeBeforeSpellCastTriggers,
  executeComplexTriggersForChangedParticipant,
  executeSkillsByTrigger,
  executeStartOfRoundTriggers,
} from "./simple";

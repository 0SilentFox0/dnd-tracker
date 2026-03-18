/**
 * @deprecated Імпортуйте з ./execution
 */
export {
  applyOnBattleStartEffectsToNewAllies,
  checkSurviveLethal,
  executeAfterAttackTriggers,
  executeAfterSpellCastTriggers,
  executeBeforeAttackTriggers,
  executeBeforeSpellCastTriggers,
  executeBonusActionSkill,
  executeComplexTriggersForChangedParticipant,
  executeOnBattleStartEffects,
  executeOnBattleStartEffectsForAll,
  executeOnHitEffects,
  executeOnKillEffects,
  executeSkillsByTrigger,
  executeStartOfRoundTriggers,
  updateMoraleOnEvent,
} from "./execution";
export type { SkillTriggerExecutionResult } from "./types/execution";
export { RUNIC_ATTACK_RUNES } from "./types/execution";

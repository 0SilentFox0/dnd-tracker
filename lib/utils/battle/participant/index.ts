export type { CampaignSpellContext } from '../types/participant';
export { createBattleParticipantFromUnit } from './from-unit';
export {
    actionsPerTurnPool,
    applyMainActionUsed,
    getEffectiveArmorClass,
    grantExtraActions,
    setExtraActionPool,
} from './helpers';

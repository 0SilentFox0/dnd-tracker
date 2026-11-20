import { traitEffects } from './read';

import { resolvedAbilitiesOf } from '@/lib/utils/abilities/engine/core/participants';
import type { TALENT_KINDS } from '@/systems/wfrp/rules/trait-kinds';
import type { BattleParticipant } from '@/types/battle';

export type WfrpTalent = (typeof TALENT_KINDS)[number];

export const hasTalent = (p: BattleParticipant, talent: WfrpTalent): boolean =>
    traitEffects(resolvedAbilitiesOf(p)).some(
        (e) => e.kind === 'wfrpTalent' && e.talent === talent
    );

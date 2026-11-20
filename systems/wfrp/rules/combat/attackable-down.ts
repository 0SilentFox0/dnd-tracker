import { isHelpless } from '../conditions/test-mod';
import { editionOf } from '../edition/read';

import type { Ruleset } from '@/lib/utils/rules/schema';
import type { BattleParticipant } from '@/types/battle';

/** Canon5e: an Unconscious (Helpless) body can still be attacked (p167) */
export const wfrpAttackableDown = (
    p: BattleParticipant,
    rules: Ruleset
): boolean => editionOf(rules).combatModsModel === 'canon5e' && isHelpless(p);

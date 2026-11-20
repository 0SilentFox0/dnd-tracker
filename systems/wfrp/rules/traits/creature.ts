import { traitEffects } from './read';

import { resolvedAbilitiesOf } from '@/lib/utils/abilities/engine/core/participants';
import { CREATURE_TRAITS } from '@/systems/wfrp/rules/trait-kinds';
import type { BattleParticipant } from '@/types/battle';

type CreatureTrait = (typeof CREATURE_TRAITS)[number];

export const hasCreatureTrait = (
    p: BattleParticipant,
    trait: CreatureTrait
): boolean =>
    traitEffects(resolvedAbilitiesOf(p)).some(
        (e) => e.kind === 'wfrpCreature' && e.trait === trait
    );

export const isSwarm = (p: BattleParticipant) => hasCreatureTrait(p, 'swarm');

export const isFlier = (p: BattleParticipant) => hasCreatureTrait(p, 'fly');

export const isPainless = (p: BattleParticipant) =>
    hasCreatureTrait(p, 'painless');

export const isUndead = (p: BattleParticipant) => hasCreatureTrait(p, 'undead');

export const hasRegenerate = (p: BattleParticipant): boolean =>
    traitEffects(resolvedAbilitiesOf(p)).some(
        (e) => e.kind === 'wfrpRegenerate'
    );

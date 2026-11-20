import type { Spell } from '@prisma/client';

import type { SpellRequestData } from '@/lib/schemas/battles';
import type { InterruptSpell } from '@/lib/utils/battle/counter/types';
import type { BattleMutationContext } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { casterSpellDice } from '@/lib/utils/battle/spell/caster-dice';
import { resolveSpellSource } from '@/lib/utils/battle/spell/resolve-source';
import { splitSaveRolls } from '@/lib/utils/battle/spell/save-rolls';
import { resolveSpellTargets } from '@/lib/utils/battle/spell/spell-targeting';
import { toCastableSpell } from '@/lib/utils/battle/spell/to-castable';
import { type SummonDeps } from '@/lib/utils/battle/summon/ability-summons';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type {
    CastExtension,
    CastResourceGate,
} from '@/lib/utils/rules/systems/types';
import type { IngredientPlan } from '@/lib/utils/spells/ingredients/plan';
import type { BattleParticipant } from '@/types/battle';

export interface SpellMutationDeps extends SummonDeps {
    loadSpell(spellId: string, campaignId: string): Promise<Spell | null>;
    loadInterruptSpells?(
        campaignId: string,
        ids: string[]
    ): Promise<InterruptSpell[]>;
}

export type Spellcast = ReturnType<typeof toCastableSpell>;

export type SpellSource = ReturnType<typeof resolveSpellSource>;

export type Resolution = Extract<
    ReturnType<typeof resolveSpellTargets>,
    { ok: true }
>;

export type ChosenSlot = CastResourceGate | null;

export interface CastPlan {
    ctx: BattleMutationContext;
    data: SpellRequestData;
    deps: SpellMutationDeps;
    spell: Spellcast;
    caster: BattleParticipant;
    order: BattleParticipant[];
    source: SpellSource;
    chosen: ChosenSlot;
    ingredients: IngredientPlan | null;
    castLevel: number | undefined;
    resolution: Resolution;
    reach?: CastExtension;
    expected: ReturnType<typeof casterSpellDice>;
    diceRolls: number[];
    saves: ReturnType<typeof splitSaveRolls>;
    serverRolls: boolean;
    system: SystemSlot | undefined;
    pickedSpell?: { id: string; name: string; level: number };
    cancelledBy?: string;
}

export type SpellDefinition = Spellcast['definition'];

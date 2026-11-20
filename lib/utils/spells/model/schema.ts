import { z } from 'zod';

import { ABILITY_KEYS } from '@/lib/constants/abilities';
import { MAX_DURATION_ROUNDS } from '@/lib/constants/duration';
import { DurationSchema } from '@/lib/utils/abilities/schema/common';
import {
    BASE_EFFECTS,
    NonRandomEffectSchema,
    RandomOfSchema,
} from '@/lib/utils/abilities/schema/effects';
import {
    DICE_RE,
    SAVE_SOURCE_TAGS,
} from '@/lib/utils/abilities/schema/kinds';

export const SPELL_COSTS = [
    'action',
    'bonusAction',
    'reaction',
    'long',
] as const;

export const SPELL_MAGIC_KINDS = [
    'petty',
    'arcane',
    'hedge',
    'witchcraft',
    'chaos',
    'blessing',
    'miracle',
] as const;

export type SpellMagicKind = (typeof SPELL_MAGIC_KINDS)[number];

export const SpellMagicSchema = z.object({
    cn: z.number().int().min(0).max(30),
    kind: z.enum(SPELL_MAGIC_KINDS),
    overcast: z.enum(['dice', 'targets']).nullable().default(null),
    attribute: z
        .object({
            condition: z.string().min(1).max(40),
            levels: z.number().int().min(1).max(3),
        })
        .optional(),
    /** Damage is a magic missile: the caster's power bonus is added and the cast roll picks the hit location */
    missile: z.boolean().optional(),
    /** Armour (`ap`) or toughness and armour (`tbAp`) the damage ignores */
    ignore: z.enum(['ap', 'tbAp']).optional(),
    /** Characteristic whose bonus the flat damage or heal adds */
    scale: z
        .string()
        .regex(/^[a-z]{1,4}$/)
        .optional(),
});

export type SpellMagic = z.infer<typeof SpellMagicSchema>;

export const SpellCastingTimeSchema = z.object({
    magic: SpellMagicSchema.optional(),
    rounds: z.number().int().min(2).max(144000).optional(),
    text: z.string().trim().min(1).max(500).optional(),
    trigger: z.string().trim().min(1).max(1000).optional(),
});

export type SpellCastingTime = z.infer<typeof SpellCastingTimeSchema>;

export const SpellCostSchema = z.enum(SPELL_COSTS);

export const TEMPLATE_SHAPES = [
    'circle',
    'cube',
    'cone',
    'line',
    'cross',
    'emanation',
] as const;

const rangeField = z.number().int().min(5).max(600).optional();

export const ZONE_MAX_ROUNDS = MAX_DURATION_ROUNDS;

export const ZoneTriggerSchema = z.object({
    save: z.object({ ability: z.enum(ABILITY_KEYS) }).optional(),
    effects: z.array(NonRandomEffectSchema).max(4),
    pull: z.literal('centre').optional(),
    attack: z.literal('spell').optional(),
    saveHalf: z.literal(true).optional(),
});

export type ZoneTrigger = z.infer<typeof ZoneTriggerSchema>;

export const ZONE_TERRAIN = ['difficult', 'obscured'] as const;

export const SpellZoneSchema = z.object({
    rounds: z.number().int().min(1).max(ZONE_MAX_ROUNDS),
    label: z.string().max(60).optional(),
    terrain: z.array(z.enum(ZONE_TERRAIN)).min(1).max(2).optional(),
    side: z.enum(['enemies', 'all']).optional(),
    onEnter: ZoneTriggerSchema.optional(),
    onTurnStart: ZoneTriggerSchema.optional(),
    onExit: ZoneTriggerSchema.optional(),
});

export type SpellZone = z.infer<typeof SpellZoneSchema>;

export const SpellTargetFilterSchema = z.object({
    creatureTypes: z
        .array(z.string().trim().min(1).max(40))
        .min(1)
        .max(10)
        .optional(),
    maxCr: z.number().min(0).max(30).optional(),
    maxCrPerLevel: z.number().min(0).max(5).optional(),
    movement: z.literal('fly').optional(),
});

const filterField = SpellTargetFilterSchema.optional();

export type SpellTargetFilter = z.infer<typeof SpellTargetFilterSchema>;

export const SpellTargetingSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('self') }),
    z.object({
        kind: z.literal('ally'),
        range: rangeField,
        filter: filterField,
    }),
    z.object({
        kind: z.literal('enemy'),
        range: rangeField,
        filter: filterField,
        projectiles: z.boolean().optional(),
    }),
    z.object({ kind: z.literal('allyDead'), range: rangeField }),
    z.object({ kind: z.literal('allAlliesDead') }),
    z.object({
        kind: z.literal('area'),
        side: z.enum(['ally', 'enemy']),
        maxTargets: z.number().int().min(1).max(20),
        range: rangeField,
        chain: z.boolean().optional(),
        filter: filterField,
        projectiles: z.boolean().optional(),
    }),
    z
        .object({
            kind: z.literal('template'),
            shape: z.enum(TEMPLATE_SHAPES),
            size: z.number().int().min(5).max(120),
            side: z.enum(['ally', 'enemy', 'all']),
            maxTargets: z.number().int().min(1).max(20),
            range: rangeField,
            zone: SpellZoneSchema.optional(),
            hollow: z.boolean().optional(),
            exact: z.boolean().optional(),
            filter: filterField,
        })
        .refine((t) => t.exact === undefined || t.shape === 'circle', {
            message: 'spellEditor.validation.exactCircleOnly',
            path: ['exact'],
        }),
    z.object({ kind: z.literal('allAllies') }),
    z.object({ kind: z.literal('allEnemies') }),
    z.object({ kind: z.literal('everyone') }),
]);

export const SpellResolutionSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('auto') }),
    z.object({
        kind: z.literal('save'),
        ability: z.enum(ABILITY_KEYS),
        orAbility: z.enum(ABILITY_KEYS).optional(),
        onSuccess: z.enum(['half', 'none']),
        tags: z.array(z.enum(SAVE_SOURCE_TAGS)).min(1).optional(),
    }),
    z.object({ kind: z.literal('attack') }),
]);

export const RaceModifierSchema = z.object({
    raceId: z.string().min(1),
    percent: z.number().min(-100).max(200),
});

export const SpellDiceSchema = z.number().int().min(0).max(40);

export const SpellDieSidesSchema = z.union([
    z.literal(4),
    z.literal(6),
    z.literal(8),
    z.literal(10),
    z.literal(12),
    z.literal(20),
]);

const ChooseOneSchema = z.object({
    kind: z.literal('chooseOne'),
    options: z.array(NonRandomEffectSchema).min(2).max(7),
});

const InputDiceSchema = z.object({
    kind: z.literal('inputDice'),
    label: z.string().trim().min(1).max(40),
    max: z.number().int().min(1).max(40),
});

const attackNeedsEnemy = (d: {
    resolution: { kind: string };
    targeting: { kind: string };
}) =>
    d.resolution.kind !== 'attack' ||
    d.targeting.kind === 'enemy' ||
    d.targeting.kind === 'area';

const ATTACK_TARGET_ISSUE = {
    message: 'spellEditor.validation.attackTargets',
    path: ['resolution'],
};

const MoveSummonSchema = z.object({
    kind: z.literal('moveSummon'),
    feet: z.number().int().min(5).max(120).multipleOf(5),
});

export const InlineCastSchema = z
    .object({
        targeting: SpellTargetingSchema,
        resolution: SpellResolutionSchema,
        dice: z.number().int().min(0).max(40),
        dieSides: SpellDieSidesSchema.optional(),
        addAbilityMod: z.boolean().optional(),
        damageBonus: z.number().int().min(-20).max(40).optional(),
        effects: z.array(NonRandomEffectSchema).min(1).max(6),
        moveSummonFeet: MoveSummonSchema.shape.feet.optional(),
        anchorMarkId: z.string().min(1).max(40).optional(),
        perObjectFeet: z.number().int().min(5).max(60).optional(),
        auto: z
            .object({ on: z.enum(['attackAgainstMarked', 'damageToMarked']) })
            .optional(),
    })
    .refine(attackNeedsEnemy, ATTACK_TARGET_ISSUE);

export const GRANT_CAST_COSTS = ['action', 'bonusAction', 'reaction'] as const;

const GrantCastSchema = z.object({
    kind: z.literal('grantCast'),
    label: z.string().trim().min(1).max(60),
    cost: z.enum(GRANT_CAST_COSTS),
    uses: z.number().int().min(1).max(20).optional(),
    duration: DurationSchema,
    target: z.enum(['self', 'eventTarget']).optional(),
    cast: InlineCastSchema,
});

const HitRiderSchema = z.object({
    kind: z.literal('hitRider'),
    attackKind: z.enum(['melee', 'ranged', 'any']),
    extraDice: z.string().regex(DICE_RE),
    upcastDice: z.number().int().min(1).max(10).optional(),
    maxDice: z.number().int().min(1).max(30).optional(),
    damageType: z.string().trim().min(1).max(30),
    charges: z.number().int().min(1).max(10),
    consumeOnMiss: z.boolean().optional(),
    save: z
        .object({
            ability: z.enum(ABILITY_KEYS),
            onFail: z.array(NonRandomEffectSchema).min(1).max(3),
        })
        .optional(),
    expireAtTurnEnd: z.boolean().optional(),
    duration: DurationSchema,
    target: z.enum(['self', 'eventTarget']).optional(),
});

const MoveSelfSchema = z.object({
    kind: z.literal('moveSelf'),
    to: z.literal('adjacentToTarget'),
});

const TeleportSelfSchema = z.object({ kind: z.literal('teleportSelf') });

const CreateTerrainSchema = z.object({
    kind: z.literal('createTerrain'),
    terrain: z.enum(['wall', 'difficult']),
    shape: z.enum(['cell', 'line']),
    cells: z.number().int().min(1).max(20),
    rounds: z.number().int().min(1).max(ZONE_MAX_ROUNDS),
});

export const AnchoredZoneSchema = z.object({
    kind: z.literal('anchoredZone'),
    radiusFeet: z.number().int().min(5).max(60),
    side: z.enum(['enemies', 'allies', 'all']),
    excludeBearer: z.boolean().optional(),
    onEnter: ZoneTriggerSchema.optional(),
    onTurnStart: ZoneTriggerSchema.optional(),
    endsWhenStartOutside: z.boolean().optional(),
    duration: z.object({
        rounds: z.number().int().min(1).max(ZONE_MAX_ROUNDS),
    }),
});

const BurstSchema = z.object({
    kind: z.literal('burst'),
    radiusFeet: z.number().int().min(5).max(60),
    dice: z.string().regex(DICE_RE),
    upcastDice: z.number().int().min(1).max(10).optional(),
    trigger: ZoneTriggerSchema,
});

export const SUMMON_INLINE_SIZES = [
    'tiny',
    'small',
    'medium',
    'large',
] as const;

const InlineAttackSchema = z.object({
    name: z.string().trim().min(1).max(60),
    attackBonus: z.number().int().min(-5).max(20),
    damageDice: z.string().regex(DICE_RE),
    damageType: z.string().trim().min(1).max(30),
    range: z.string().trim().min(1).max(20).optional(),
});

const SummonInlineSchema = z.object({
    kind: z.literal('summonInline'),
    name: z.string().trim().min(1).max(60),
    size: z.enum(SUMMON_INLINE_SIZES),
    ac: z.union([z.number().int().min(1).max(30), z.literal('spellDc')]),
    hp: z.number().int().min(1).max(500).nullable(),
    count: z.number().int().min(1).max(4),
    upcastEvery: z.number().int().min(1).max(9).optional(),
    attacks: z.array(InlineAttackSchema).max(2).optional(),
    aura: z
        .object({
            radiusFeet: z.number().int().min(5).max(60),
            side: z.enum(['enemies', 'allies', 'all']),
            onEnter: ZoneTriggerSchema.optional(),
            onTurnStart: ZoneTriggerSchema.optional(),
        })
        .optional(),
    duration: DurationSchema,
});

const TransformSchema = z.object({
    kind: z.literal('transform'),
    unitId: z.string().trim().min(1).max(64).optional(),
    pick: z
        .object({ creatureType: z.string().trim().min(1).max(40) })
        .optional(),
    revertAtZero: z.literal(true),
    duration: DurationSchema,
});

const GrantSpellSchema = z.object({
    kind: z.literal('grantSpell'),
    maxLevel: z.number().int().min(0).max(9),
    onOption: z.number().int().min(0).max(6).optional(),
    duration: DurationSchema,
});

const PhantomSchema = z.object({ kind: z.literal('phantom') });

const InterruptCastSchema = z.object({ kind: z.literal('interruptCast') });

const SPELL_ONLY_EFFECTS = [
    ChooseOneSchema,
    InputDiceSchema,
    GrantCastSchema,
    HitRiderSchema,
    MoveSelfSchema,
    TeleportSelfSchema,
    CreateTerrainSchema,
    AnchoredZoneSchema,
    BurstSchema,
    MoveSummonSchema,
    SummonInlineSchema,
    TransformSchema,
    GrantSpellSchema,
    PhantomSchema,
    InterruptCastSchema,
] as const;

export const SPELL_ONLY_EFFECT_KINDS = SPELL_ONLY_EFFECTS.map(
    (s) => s.shape.kind.value
);

export const SpellEffectSchema = z.discriminatedUnion('kind', [
    ...BASE_EFFECTS,
    RandomOfSchema,
    ...SPELL_ONLY_EFFECTS,
]);

export type SpellEffect = z.infer<typeof SpellEffectSchema>;

export type GrantCastEffect = z.infer<typeof GrantCastSchema>;

export type MoveSummonEffect = z.infer<typeof MoveSummonSchema>;

export type BurstEffect = z.infer<typeof BurstSchema>;

export type AnchoredZoneEffect = z.infer<typeof AnchoredZoneSchema>;

export type SummonInlineEffect = z.infer<typeof SummonInlineSchema>;

export type GrantSpellEffect = z.infer<typeof GrantSpellSchema>;

export type TransformEffect = z.infer<typeof TransformSchema>;

export type CreateTerrainEffect = z.infer<typeof CreateTerrainSchema>;

export type HitRiderEffect = z.infer<typeof HitRiderSchema>;

export type InlineCast = z.infer<typeof InlineCastSchema>;

export const SpellDefinitionSchema = z
    .object({
        executionMode: z.enum(['native', 'manual']).optional(),
        dice: SpellDiceSchema,
        cost: SpellCostSchema,
        casting: SpellCastingTimeSchema.optional(),
        targeting: SpellTargetingSchema,
        resolution: SpellResolutionSchema,
        effects: z.array(SpellEffectSchema),
        raceModifiers: z.array(RaceModifierSchema),
        stackable: z.boolean().optional(),
        maxStacks: z.number().int().min(1).max(10).optional(),
        concentration: z.boolean().optional(),
        ritual: z.boolean().optional(),
        dieSides: SpellDieSidesSchema.optional(),
        upcastDice: z.number().int().min(0).max(10).optional(),
        upcastTargets: z.number().int().min(0).max(10).optional(),
        addAbilityMod: z.boolean().optional(),
        fixedDice: z.boolean().optional(),
        damageBonus: z.number().int().min(-20).max(40).optional(),
        perObjectFeet: z.number().int().min(5).max(60).optional(),
    })
    .refine(attackNeedsEnemy, ATTACK_TARGET_ISSUE);

export type SpellCost = z.infer<typeof SpellCostSchema>;

export type SpellTargeting = z.infer<typeof SpellTargetingSchema>;

export type SpellResolution = z.infer<typeof SpellResolutionSchema>;

export type RaceModifier = z.infer<typeof RaceModifierSchema>;

export type SpellDefinition = z.infer<typeof SpellDefinitionSchema>;

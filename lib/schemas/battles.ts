import { z } from 'zod';

import {
    HAZARD_DICE_PATTERN,
    MAZE_DIFFICULTIES,
    MAZE_LIMITS,
    MAZE_MARK_SYMBOLS,
    ParticipantSide,
    ParticipantSourceType,
    TURN_TIMER_RANGE,
} from '@/lib/constants/battle';
import { MAP_MOTION_MAX_SPEED } from '@/lib/constants/battle-motion';
import { WEATHER_KINDS } from '@/lib/constants/battle-weather';
import { DAMAGE_ELEMENT_OPTIONS } from '@/lib/constants/damage';
import { hexColorSchema } from '@/lib/schemas/common';
import { CUNNING_STRIKE_EFFECTS } from '@/lib/utils/abilities/schema';
import { hasPlayableArea } from '@/lib/utils/battle/grid/map-editor';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { ZoneTriggerSchema } from '@/lib/utils/spells/model/schema';

const MAP_BACKGROUND_PATTERN =
    /^(https:\/\/\S+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

/** castId = `<caster>:<spell>@<round>#<seq>` з uuid-id, зона додає `@<round>` або `#<i>`; id призваних — `inline:<castId>:<n>` */
const SPELL_ID_MAX = 200;

export const weatherKindSchema = z.enum(WEATHER_KINDS);

export const mapCellSchema = z.object({
    x: z.number().int().min(0).max(59),
    y: z.number().int().min(0).max(59),
});

const edgeKeySchema = z.string().regex(/^\d+:\d+:[es]$/);

const cellKeySchema = z.string().regex(/^\d+:\d+$/);

const mazeDifficultySchema = z.enum(MAZE_DIFFICULTIES);

const mazeMarkSymbolSchema = z.enum(MAZE_MARK_SYMBOLS);

const illusionDisguiseSchema = z.object({
    name: z.string().trim().min(1).max(60),
    avatar: z.string().max(500).optional(),
    unitId: z.string().max(64).optional(),
});

const illusionPairSchema = z
    .object({
        a: z.string().min(1).max(64),
        b: z.string().min(1).max(64),
        aSees: illusionDisguiseSchema,
        bSees: illusionDisguiseSchema,
    })
    .refine((p) => p.a !== p.b, {
        message: 'battleSetup.validation.illusionDuplicate',
    });

const illusionPairsSchema = z
    .array(illusionPairSchema)
    .max(8)
    .superRefine((pairs, ctx) => {
        const ids = pairs.flatMap((p) => [p.a, p.b]);

        if (new Set(ids).size !== ids.length)
            ctx.addIssue({
                code: 'custom',
                message: 'battleSetup.validation.illusionDuplicate',
            });
    });

export const mazeSchema = z.object({
    walls: z.array(edgeKeySchema).max(7200),
    exit: mapCellSchema.nullable(),
    difficulty: mazeDifficultySchema,
    teleports: z.array(z.tuple([mapCellSchema, mapCellSchema])).max(20),
    fog: z.array(cellKeySchema).max(3600),
    marks: z
        .record(
            cellKeySchema,
            z.object({
                symbol: mazeMarkSymbolSchema,
                color: hexColorSchema(),
                by: z.string().max(64),
            })
        )
        .refine(
            (m) => Object.keys(m).length <= 3600,
            'battleSetup.validation.tooManyMarks'
        ),
    dark: z.boolean(),
    moved: z.boolean().optional(),
    illusionSwap: z.object({ pairs: illusionPairsSchema }).optional(),
});

const mazeFeatureCounts = {
    teleportPairs: z.number().int().min(0).max(MAZE_LIMITS.teleportPairs),
    fogPatches: z.number().int().min(0).max(MAZE_LIMITS.fogPatches),
};

const edgeBatch = z.array(edgeKeySchema).max(MAZE_LIMITS.wallEdgesPerOp);

export const mazeActionSchema = z.discriminatedUnion('op', [
    z.object({
        op: z.literal('generate'),
        difficulty: mazeDifficultySchema,
        ...mazeFeatureCounts,
        exit: mapCellSchema.nullable(),
    }),
    z.object({
        op: z.literal('reshuffle'),
        mode: z.enum(['walls', 'scatter', 'tunnel']),
        ...mazeFeatureCounts,
    }),
    z.object({ op: z.literal('walls'), add: edgeBatch, remove: edgeBatch }),
    z.object({ op: z.literal('exit'), cell: mapCellSchema }),
    z.object({
        op: z.literal('teleport'),
        pair: z.tuple([mapCellSchema, mapCellSchema]).nullable(),
        removeAt: mapCellSchema.optional(),
    }),
    z.object({
        op: z.literal('fog'),
        cells: z.array(cellKeySchema).max(MAZE_LIMITS.fogCellsPerOp),
        on: z.boolean(),
    }),
    z.object({ op: z.literal('dark'), on: z.boolean() }),
    z.object({ op: z.literal('illusion'), pairs: illusionPairsSchema }),
    z.object({ op: z.literal('scatterStarts') }),
]);

export const mazeMarkSchema = z.object({
    participantId: z.string(),
    symbol: mazeMarkSymbolSchema,
});

export const mapBackgroundSchema = z
    .string()
    .max(7_000_000)
    .refine(
        (v) => MAP_BACKGROUND_PATTERN.test(v),
        'battleSetup.validation.background'
    )
    .nullable();

const motionConfigSchema = z.object({
    axis: z.enum(['x', 'y']),
    speed: z.number().min(-MAP_MOTION_MAX_SPEED).max(MAP_MOTION_MAX_SPEED),
});

export const battleMapSchema = z
    .object({
        cols: z.number().int().min(4).max(60),
        rows: z.number().int().min(4).max(60),
        background: mapBackgroundSchema,
        opacity: z.number().min(0).max(1),
        blocked: z
            .array(z.string().regex(/^\d+:\d+$/))
            .max(3600)
            .optional(),
        terrain: z
            .record(
                z.string().regex(/^\d+:\d+$/),
                z
                    .object({
                        kind: z.enum([
                            'wall',
                            'barrier',
                            'hazard',
                            'difficult',
                        ]),
                        label: z.string().max(60).optional(),
                        difficult: z.literal(true).optional(),
                        obscured: z.literal(true).optional(),
                        zoneId: z.string().max(SPELL_ID_MAX).optional(),
                        untilRound: z.number().int().min(1).optional(),
                        damage: z
                            .object({
                                dice: z
                                    .string()
                                    .regex(HAZARD_DICE_PATTERN)
                                    .optional(),
                                amount: z
                                    .number()
                                    .int()
                                    .min(0)
                                    .max(1000)
                                    .optional(),
                                type: z.string().min(1).max(30),
                                spellId: z
                                    .string()
                                    .max(SPELL_ID_MAX)
                                    .optional(),
                                casterId: z
                                    .string()
                                    .max(SPELL_ID_MAX)
                                    .optional(),
                                concentrationOf: z
                                    .object({
                                        casterId: z.string().max(SPELL_ID_MAX),
                                        castId: z.string().max(SPELL_ID_MAX),
                                    })
                                    .optional(),
                            })
                            .optional(),
                    })
                    .refine(
                        (c) =>
                            c.kind !== 'barrier' || c.untilRound !== undefined,
                        'battleSetup.validation.barrierNeedsDuration'
                    )
            )
            .refine(
                (t) => Object.keys(t).length <= 3600,
                'battleSetup.validation.tooManyTerrainCells'
            )
            .optional(),
        spellZones: z
            .record(
                z.string().max(SPELL_ID_MAX),
                z.object({
                    casterId: z.string().max(SPELL_ID_MAX),
                    spellId: z.string().max(SPELL_ID_MAX),
                    spellName: z.string().max(120),
                    dc: z.number().int().min(1).max(40),
                    side: z.enum(['enemies', 'all']),
                    centre: mapCellSchema.optional(),
                    triggers: z.object({
                        onEnter: ZoneTriggerSchema.optional(),
                        onTurnStart: ZoneTriggerSchema.optional(),
                        onExit: ZoneTriggerSchema.optional(),
                    }),
                    untilRound: z.number().int().min(1),
                    concentrationOf: z
                        .object({
                            casterId: z.string().max(SPELL_ID_MAX),
                            castId: z.string().max(SPELL_ID_MAX),
                        })
                        .optional(),
                })
            )
            .refine(
                (z) => Object.keys(z).length <= 200,
                'validation.tooManySpellZones'
            )
            .optional(),
        backgroundCols: z.number().positive().max(200).optional(),
        gridOffset: z
            .object({ x: z.number().min(0).lt(1), y: z.number().min(0).lt(1) })
            .optional(),
        maze: mazeSchema.nullable().optional(),
        weather: weatherKindSchema.nullable().optional(),
        motion: motionConfigSchema.nullable().optional(),
    })
    .refine((m) => hasPlayableArea(m), {
        message: 'battleSetup.validation.playableAreaTooSmall',
        path: ['blocked'],
    });

export const turnTimerSecondsSchema = z
    .number()
    .int()
    .min(TURN_TIMER_RANGE[0])
    .max(TURN_TIMER_RANGE[1]);

export const createBattleSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    participants: z.array(
        z.object({
            id: z.string(),
            type: z.enum([
                ParticipantSourceType.CHARACTER,
                ParticipantSourceType.UNIT,
            ]),
            side: z.enum([ParticipantSide.ALLY, ParticipantSide.ENEMY]),
            quantity: z.number().min(1).optional(),
            reserved: z.number().int().min(0).optional(),
        })
    ),
    map: battleMapSchema.nullable().optional(),
    turnTimerSeconds: turnTimerSecondsSchema.nullable().optional(),
});

export const moraleCheckSchema = z.object({
    participantId: z.string(),
    d10Roll: z.number().min(1).max(10),
});

export const critChoiceSchema = z.union([
    z.object({
        choices: z.record(
            z.string(),
            z.union([z.number().int(), z.literal('random')])
        ),
    }),
    z.object({ cancel: z.literal(true) }),
]);

export type CritChoiceBody = z.infer<typeof critChoiceSchema>;

export type MoraleCheckInput = z.infer<typeof moraleCheckSchema>;

export const systemInputSchema = z.object({
    key: z.string(),
    data: z.unknown(),
});

const attackBodyShape = {
    attackerId: z.string(),
    targetId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    attackId: z.string().optional(),
    d20Roll: z.number().int().min(1).max(100).optional(),
    attackRoll: z.number().int().min(1).max(100).optional(),
    attackRolls: z.array(z.number().int().min(1).max(100)).optional(),
    /** сервер кидає d20/d100 сам; кидки клієнта не потрібні й ігноруються */
    serverRoll: z.boolean().optional(),
    /** другий d20 на ціль у порядку attackRolls; сервер сам вирішує перевагу/недолік */
    secondRolls: z.array(z.number().int().min(1).max(20).nullable()).optional(),
    advantageRoll: z.number().int().min(1).max(20).optional(),
    disadvantageRoll: z.number().int().min(1).max(20).optional(),
    /** вибір гравця; сервер застосовує, лише коли навички не задають режим */
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']).optional(),
    damageRolls: z.array(z.number()).default([]),
    offHand: z.boolean().optional(),
    useInspiration: z.boolean().optional(),
    system: systemInputSchema.optional(),
    secondRoll: z.number().int().min(1).max(100).optional(),
    /** Підступний удар (Rogue): ефекти замість кубиків Прихованої атаки */
    cunningStrike: z
        .array(z.enum(CUNNING_STRIKE_EFFECTS))
        .min(1)
        .max(3)
        .optional(),
    endTurn: z.boolean().default(false),
};

// one release: flat pre-`system` request keys reach the system's input schema, nothing else passes through
const LEGACY_SYSTEM_KEYS = {
    fortune: z.unknown().optional(),
    fortuneRoll: z.unknown().optional(),
};

export const attackBodyInputSchema = z.object(attackBodyShape);

export const attackBodySchema = z
    .object({ ...attackBodyShape, ...LEGACY_SYSTEM_KEYS })
    .refine(
        (d) =>
            d.serverRoll === true ||
            d.d20Roll !== undefined ||
            d.attackRoll !== undefined ||
            (Array.isArray(d.attackRolls) && d.attackRolls.length > 0),
        { message: REJECT.rollsRequired, path: ['d20Roll'] }
    )
    .refine(
        (d) =>
            d.targetId !== undefined ||
            (d.targetIds !== undefined && d.targetIds.length > 0),
        {
            message: REJECT.oneTargetRequired,
            path: ['targetIds'],
        }
    );

export const auraZoneSchema = z.object({
    participantId: z.string(),
    auraId: z.string(),
    targetIds: z.array(z.string()).max(50),
});

export const nextTurnSchema = z.object({ auto: z.literal(true).optional() });

export const moveSchema = z.object({
    participantId: z.string(),
    to: mapCellSchema,
    free: z.boolean().optional(),
    returnToStart: z.literal(true).optional(),
});

const HAZARD_DAMAGE_TYPES = DAMAGE_ELEMENT_OPTIONS.map((o) => o.value) as [
    string,
    ...string[],
];

export const mapTerrainSchema = z.object({
    cells: z
        .array(z.string().regex(/^\d+:\d+$/))
        .min(1)
        .max(400),
    /** з terrain: null — стерти цілі зони заклинань, до яких належать клітинки */
    eraseZone: z.literal(true).optional(),
    terrain: z
        .object({
            kind: z.enum(['wall', 'barrier', 'hazard', 'difficult']),
            label: z.string().max(60).optional(),
            rounds: z.number().int().min(1).max(20).optional(),
            damage: z
                .object({
                    dice: z.string().regex(HAZARD_DICE_PATTERN),
                    type: z.enum(HAZARD_DAMAGE_TYPES),
                })
                .optional(),
        })
        .refine((t) => t.kind !== 'barrier' || t.rounds !== undefined, {
            message: REJECT.barrierDuration,
            path: ['rounds'],
        })
        .nullable(),
});

export const mapWeatherSchema = z.object({
    weather: weatherKindSchema.nullable(),
});

export const mapBackgroundBodySchema = z.object({
    background: mapBackgroundSchema,
});

export const mapMotionSchema = z.object({
    motion: motionConfigSchema.nullable(),
});

const castSpellShape = {
    casterId: z.string(),
    legendaryKey: z.string().min(1).optional(),
    spellId: z.string(),
    grantKey: z.string().min(1).max(300).optional(),
    castLevel: z.number().int().min(0).max(9).optional(),
    targetIds: z.array(z.string()).default([]),
    /** точка шаблону на карті */
    targetCell: mapCellSchema.optional(),
    diceRolls: z.array(z.number()).default([]),
    saveRolls: z
        .array(
            z.object({
                participantId: z.string(),
                roll: z.number().int().min(1).max(20),
            })
        )
        .optional(),
    attackRolls: z
        .array(
            z.object({
                participantId: z.string(),
                roll: z.number().int().min(1).max(20),
            })
        )
        .optional(),
    preview: z.boolean().optional(),
    castingRounds: z.number().int().min(1).max(144000).optional(),
    cancelCasting: z.boolean().optional(),
    free: z.boolean().optional(),
    optionIndex: z.number().int().min(0).max(6).optional(),
    inputCount: z.number().int().min(0).max(40).optional(),
    slotKey: z
        .string()
        .regex(/^([1-9]|pact)$/)
        .optional(),
    castRoll: z.number().int().min(1).max(100).optional(),
    serverRoll: z.literal(true).optional(),
    system: systemInputSchema.optional(),
    secondRoll: z.number().int().min(1).max(100).optional(),
    useIngredient: z.literal(true).optional(),
};

export const castSpellInputSchema = z.object(castSpellShape);

export const castSpellSchema = z.object({
    ...castSpellShape,
    ...LEGACY_SYSTEM_KEYS,
});

export type SpellRequestData = z.infer<typeof castSpellInputSchema>;

export const abilityActionSchema = z.object({
    participantId: z.string(),
    abilityKey: z.string(),
    targetParticipantIds: z.array(z.string()).optional(),
    targetCell: mapCellSchema.optional(),
});

export const bonusActionSchema = abilityActionSchema.extend({
    targetParticipantId: z.string().optional(),
});

export const patchParticipantSchema = z
    .object({
        lairActive: z.boolean().optional(),
        currentHp: z.number().int().min(0).optional(),
        removeFromBattle: z.boolean().optional(),
        returnToReserve: z.boolean().optional(),
        kill: z.boolean().optional(),
        revive: z.boolean().optional(),
    })
    .refine((d) => Object.keys(d).length > 0, {
        message: 'At least one field is required',
    });

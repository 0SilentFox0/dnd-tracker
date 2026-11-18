import { z } from 'zod';

import {
    HAZARD_DICE_PATTERN,
    MAP_EDGES_PER_OP,
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
import { MAP_LIMITS } from '@/lib/constants/map-limits';
import { hexColorSchema } from '@/lib/schemas/common';
import { STRIKE_RIDER_EFFECTS } from '@/lib/utils/abilities/schema';
import { FOG_MAX_VISION_RADIUS } from '@/lib/utils/battle/fog/constants';
import { inBounds } from '@/lib/utils/battle/grid/geometry';
import { hasPlayableArea } from '@/lib/utils/battle/grid/map-editor';
import { parseEdgeKey } from '@/lib/utils/battle/grid/walls';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { ZoneTriggerSchema } from '@/lib/utils/spells/model/schema';

const MAP_BACKGROUND_PATTERN =
    /^(https:\/\/\S+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

/** castId = `<caster>:<spell>@<round>#<seq>` with uuid ids, a zone appends `@<round>` or `#<i>`; summoned ids are `inline:<castId>:<n>`. */
const SPELL_ID_MAX = 200;

export const battleVersionBodySchema = z.object({
    expectedVersion: z.number().optional().catch(undefined),
});

export const weatherKindSchema = z.enum(WEATHER_KINDS);

export const mapCellSchema = z.object({
    x: z.number().int().min(0).max(59),
    y: z.number().int().min(0).max(59),
});

export const edgeKeySchema = z.string().regex(/^\d+:\d+:[es]$/);

export const doorStateSchema = z.object({
    open: z.boolean(),
    locked: z.boolean().optional(),
});

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

const illusionPairsSchema = z.array(illusionPairSchema).max(8);

const illusionGroupSchema = z.object({
    heroes: z
        .array(
            z.object({
                id: z.string().min(1).max(64),
                disguise: illusionDisguiseSchema,
            })
        )
        .min(2)
        .max(20)
        .superRefine((heroes, ctx) => {
            if (new Set(heroes.map((h) => h.id)).size !== heroes.length)
                ctx.addIssue({
                    code: 'custom',
                    message: 'battleSetup.validation.illusionDuplicate',
                });
        }),
});

const illusionGroupsSchema = z.array(illusionGroupSchema).max(8);

export const mazeSchema = z.object({
    walls: z.array(edgeKeySchema).max(MAP_LIMITS.inlineMaxEdges),
    exit: mapCellSchema.nullable(),
    difficulty: mazeDifficultySchema,
    teleports: z.array(z.tuple([mapCellSchema, mapCellSchema])).max(20),
    fog: z.array(cellKeySchema).max(MAP_LIMITS.maxTerrainCells),
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
            (m) => Object.keys(m).length <= MAP_LIMITS.maxTerrainCells,
            'battleSetup.validation.tooManyMarks'
        ),
    dark: z.boolean(),
    moved: z.boolean().optional(),
    illusionSwap: z
        .object({
            pairs: illusionPairsSchema.optional(),
            groups: illusionGroupsSchema.optional(),
        })
        .optional(),
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
    z
        .object({
            op: z.literal('illusion'),
            pairs: illusionPairsSchema.optional(),
            groups: illusionGroupsSchema.optional(),
        })
        .refine(
            (body) => body.pairs !== undefined || body.groups !== undefined
        ),
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

export const mapSide = (max: number) =>
    z.number().int().min(MAP_LIMITS.minSide).max(max);

export const battleMapObject = z.object({
    cols: mapSide(MAP_LIMITS.photoMaxSide),
    rows: mapSide(MAP_LIMITS.photoMaxSide),
    background: mapBackgroundSchema,
    source: z
        .object({
            url: z
                .string()
                .url()
                .max(2000)
                .refine((value) => value.startsWith('https://')),
            attribution: z.string().trim().min(1).max(120),
            license: z.literal('CC-BY-SA-4.0'),
        })
        .optional(),
    opacity: z.number().min(0).max(1),
    blocked: z
        .array(z.string().regex(/^\d+:\d+$/))
        .max(MAP_LIMITS.maxTerrainCells)
        .optional(),
    terrain: z
        .record(
            z.string().regex(/^\d+:\d+$/),
            z
                .object({
                    kind: z.enum(['wall', 'barrier', 'hazard', 'difficult']),
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
                            spellId: z.string().max(SPELL_ID_MAX).optional(),
                            casterId: z.string().max(SPELL_ID_MAX).optional(),
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
                    (c) => c.kind !== 'barrier' || c.untilRound !== undefined,
                    'battleSetup.validation.barrierNeedsDuration'
                )
        )
        .refine(
            (t) => Object.keys(t).length <= MAP_LIMITS.maxTerrainCells,
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
    backgroundRows: z.number().positive().max(200).optional(),
    gridOffset: z
        .object({ x: z.number().min(0).lt(1), y: z.number().min(0).lt(1) })
        .optional(),
    maze: mazeSchema.nullable().optional(),
    weather: weatherKindSchema.nullable().optional(),
    motion: motionConfigSchema.nullable().optional(),
    walls: z.array(edgeKeySchema).max(MAP_LIMITS.inlineMaxEdges).optional(),
    bars: z.array(edgeKeySchema).max(MAP_LIMITS.inlineMaxEdges).optional(),
    doors: z
        .record(edgeKeySchema, doorStateSchema)
        .refine(
            (d) => Object.keys(d).length <= MAP_LIMITS.doorsMax,
            'battleSetup.validation.tooManyDoors'
        )
        .optional(),
});

export const battleMapSchema = battleMapObject
    .superRefine((m, ctx) => {
        const walls = new Set<string>();

        for (const key of ['walls', 'bars'] as const) {
            const seen = new Set<string>();

            for (const edge of m[key] ?? []) {
                const { a, b } = parseEdgeKey(edge);

                const bad =
                    seen.has(edge) ||
                    !inBounds(m, a) ||
                    !inBounds(m, b) ||
                    (key === 'bars' && walls.has(edge));

                if (bad) {
                    ctx.addIssue({
                        code: 'custom',
                        message: 'battleSetup.validation.badEdges',
                        path: [key],
                    });

                    break;
                }

                seen.add(edge);

                if (key === 'walls') walls.add(edge);
            }
        }

        const solid = new Set([...(m.walls ?? []), ...(m.bars ?? [])]);

        for (const edge of Object.keys(m.doors ?? {})) {
            const { a, b } = parseEdgeKey(edge);

            if (solid.has(edge) || !inBounds(m, a) || !inBounds(m, b)) {
                ctx.addIssue({
                    code: 'custom',
                    message: 'battleSetup.validation.doorOnWall',
                    path: ['doors'],
                });

                break;
            }
        }
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

export const createBattleSchema = z
    .object({
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
        mapId: z.string().min(1).optional(),
        turnTimerSeconds: turnTimerSecondsSchema.nullable().optional(),
    })
    .refine((d) => !(d.map && d.mapId), {
        message: 'battleSetup.validation.mapAndMapId',
        path: ['mapId'],
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
    // the server rolls d20/d100 itself; client rolls are ignored
    serverRoll: z.boolean().optional(),
    // second d20 per target in attackRolls order; the server decides advantage/disadvantage
    secondRolls: z.array(z.number().int().min(1).max(20).nullable()).optional(),
    advantageRoll: z.number().int().min(1).max(20).optional(),
    disadvantageRoll: z.number().int().min(1).max(20).optional(),
    // player choice; applied by the server only when skills set no mode
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']).optional(),
    damageRolls: z.array(z.number()).default([]),
    offHand: z.boolean().optional(),
    useInspiration: z.boolean().optional(),
    system: systemInputSchema.optional(),
    secondRoll: z.number().int().min(1).max(100).optional(),
    // Cunning Strike (Rogue): effects instead of Sneak Attack dice
    cunningStrike: z
        .array(z.enum(STRIKE_RIDER_EFFECTS))
        .min(1)
        .max(3)
        .optional(),
    endTurn: z.boolean().default(false),
};

export const attackBodyInputSchema = z.object(attackBodyShape);

export const attackBodySchema = z
    .object(attackBodyShape)
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
    // terrain: null erases the target spell zones that own the cells
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

export const mapWallsSchema = z
    .object({
        kind: z.enum(['walls', 'bars', 'both']),
        add: z.array(edgeKeySchema).max(MAP_EDGES_PER_OP),
        remove: z.array(edgeKeySchema).max(MAP_EDGES_PER_OP),
    })
    .refine((b) => b.add.length + b.remove.length > 0)
    .refine((b) => b.kind !== 'both' || b.add.length === 0);

export const mapEdgeRemoveSchema = z.object({
    edges: z.array(edgeKeySchema).min(1).max(MAP_EDGES_PER_OP),
    restore: z.boolean().optional(),
});

const fogRunSchema = z.tuple([
    z.number().int().min(0).max(199),
    z.number().int().min(0).max(199),
    z.number().int().min(1).max(200),
]);

export const mapFogSchema = z
    .object({
        mode: z.enum(['off', 'reveal', 'vision']).optional(),
        visionRadius: z
            .number()
            .int()
            .min(1)
            .max(FOG_MAX_VISION_RADIUS)
            .optional(),
        add: z.array(fogRunSchema).max(2000).optional(),
        remove: z.array(fogRunSchema).max(2000).optional(),
    })
    .refine(
        (body) =>
            body.mode !== undefined ||
            body.visionRadius !== undefined ||
            !!body.add?.length ||
            !!body.remove?.length
    );

export const mapDoorToggleSchema = z
    .object({
        edge: edgeKeySchema,
        open: z.boolean().optional(),
        locked: z.boolean().optional(),
        actorId: z.string().min(1).optional(),
    })
    .refine((b) => b.open !== undefined || b.locked !== undefined);

export const mapUpdateSchema = z.object({});

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

export const castSpellSchema = z.object(castSpellShape);

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

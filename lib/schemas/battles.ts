import { z } from "zod";

import { HAZARD_DICE_PATTERN, MAZE_DIFFICULTIES, MAZE_LIMITS, MAZE_MARK_SYMBOLS, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { hexColorSchema } from "@/lib/schemas/common";
import { CUNNING_STRIKE_EFFECTS } from "@/lib/utils/abilities/schema";
import { hasPlayableArea } from "@/lib/utils/battle/grid/map-editor";
import { ZoneTriggerSchema } from "@/lib/utils/spells/model/schema";

const MAP_BACKGROUND_PATTERN = /^(https:\/\/\S+|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+|\/battle-maps\/[\w.-]+\.(webp|jpg|png))$/;

export const weatherKindSchema = z.enum(WEATHER_KINDS);

export const mapCellSchema = z.object({ x: z.number().int().min(0).max(59), y: z.number().int().min(0).max(59) });

const edgeKeySchema = z.string().regex(/^\d+:\d+:[es]$/);

const cellKeySchema = z.string().regex(/^\d+:\d+$/);

const mazeDifficultySchema = z.enum(MAZE_DIFFICULTIES);

const mazeMarkSymbolSchema = z.enum(MAZE_MARK_SYMBOLS);

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
      }),
    )
    .refine((m) => Object.keys(m).length <= 3600, "Забагато позначок"),
  dark: z.boolean(),
  moved: z.boolean().optional(),
});

const mazeFeatureCounts = {
  teleportPairs: z.number().int().min(0).max(MAZE_LIMITS.teleportPairs),
  fogPatches: z.number().int().min(0).max(MAZE_LIMITS.fogPatches),
};

const edgeBatch = z.array(edgeKeySchema).max(MAZE_LIMITS.wallEdgesPerOp);

export const mazeActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("generate"), difficulty: mazeDifficultySchema, ...mazeFeatureCounts, exit: mapCellSchema.nullable() }),
  z.object({ op: z.literal("reshuffle"), mode: z.enum(["walls", "scatter", "tunnel"]), ...mazeFeatureCounts }),
  z.object({ op: z.literal("walls"), add: edgeBatch, remove: edgeBatch }),
  z.object({ op: z.literal("exit"), cell: mapCellSchema }),
  z.object({ op: z.literal("teleport"), pair: z.tuple([mapCellSchema, mapCellSchema]).nullable(), removeAt: mapCellSchema.optional() }),
  z.object({ op: z.literal("fog"), cells: z.array(cellKeySchema).max(MAZE_LIMITS.fogCellsPerOp), on: z.boolean() }),
  z.object({ op: z.literal("dark"), on: z.boolean() }),
  z.object({ op: z.literal("scatterStarts") }),
]);

export const mazeMarkSchema = z.object({
  participantId: z.string(),
  symbol: mazeMarkSymbolSchema,
});

export const battleMapSchema = z.object({
  cols: z.number().int().min(4).max(60),
  rows: z.number().int().min(4).max(60),
  background: z
    .string()
    .max(7_000_000)
    .refine((v) => MAP_BACKGROUND_PATTERN.test(v), "Фон: потрібне посилання https, файл або вбудований фон")
    .nullable(),
  opacity: z.number().min(0).max(1),
  blocked: z.array(z.string().regex(/^\d+:\d+$/)).max(3600).optional(),
  terrain: z
    .record(
      z.string().regex(/^\d+:\d+$/),
      z.object({
        kind: z.enum(["wall", "barrier", "hazard", "difficult"]),
        label: z.string().max(60).optional(),
        difficult: z.literal(true).optional(),
        obscured: z.literal(true).optional(),
        zoneId: z.string().max(64).optional(),
        untilRound: z.number().int().min(1).optional(),
        damage: z
          .object({ dice: z.string().regex(HAZARD_DICE_PATTERN).optional(), amount: z.number().int().min(0).max(1000).optional(), type: z.string().min(1).max(30), spellId: z.string().max(64).optional(), casterId: z.string().max(64).optional(), concentrationOf: z.object({ casterId: z.string().max(64), castId: z.string().max(64) }).optional() })
          .optional(),
      }).refine((c) => c.kind !== "barrier" || c.untilRound !== undefined, "Барʼєру потрібен строк"),
    )
    .refine((t) => Object.keys(t).length <= 3600, "Забагато клітинок місцевості")
    .optional(),
  spellZones: z
    .record(
      z.string().max(80),
      z.object({
        casterId: z.string().max(64),
        spellId: z.string().max(64),
        spellName: z.string().max(120),
        dc: z.number().int().min(1).max(40),
        side: z.enum(["enemies", "all"]),
        centre: mapCellSchema.optional(),
        triggers: z.object({ onEnter: ZoneTriggerSchema.optional(), onTurnStart: ZoneTriggerSchema.optional(), onExit: ZoneTriggerSchema.optional() }),
        untilRound: z.number().int().min(1),
        concentrationOf: z.object({ casterId: z.string().max(64), castId: z.string().max(64) }).optional(),
      }),
    )
    .refine((z) => Object.keys(z).length <= 200, "Забагато зон заклинань")
    .optional(),
  backgroundCols: z.number().positive().max(200).optional(),
  gridOffset: z.object({ x: z.number().min(0).lt(1), y: z.number().min(0).lt(1) }).optional(),
  maze: mazeSchema.nullable().optional(),
  weather: weatherKindSchema.nullable().optional(),
}).refine((m) => hasPlayableArea(m), { message: "Ігрова зона карти замала: потрібно щонайменше 2×2 вільні клітинки", path: ["blocked"] });

export const createBattleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  participants: z.array(
    z.object({
      id: z.string(),
      type: z.enum([ParticipantSourceType.CHARACTER, ParticipantSourceType.UNIT]),
      side: z.enum([ParticipantSide.ALLY, ParticipantSide.ENEMY]),
      quantity: z.number().min(1).optional(),
      reserved: z.number().int().min(0).optional(),
    }),
  ),
  map: battleMapSchema.nullable().optional(),
});

export const moraleCheckSchema = z.object({
  participantId: z.string(),
  d10Roll: z.number().min(1).max(10),
});

export const critChoiceSchema = z.union([
  z.object({ choices: z.record(z.string(), z.union([z.number().int(), z.literal("random")])) }),
  z.object({ cancel: z.literal(true) }),
]);

export type CritChoiceBody = z.infer<typeof critChoiceSchema>;

export type MoraleCheckInput = z.infer<typeof moraleCheckSchema>;

export const attackBodySchema = z
  .object({
    attackerId: z.string(),
    targetId: z.string().optional(),
    targetIds: z.array(z.string()).optional(),
    attackId: z.string().optional(),
    d20Roll: z.number().min(1).max(20).optional(),
    attackRoll: z.number().min(1).max(20).optional(),
    attackRolls: z.array(z.number().min(1).max(20)).optional(),
    /** другий d20 на ціль у порядку attackRolls; сервер сам вирішує перевагу/недолік */
    secondRolls: z.array(z.number().min(1).max(20).nullable()).optional(),
    advantageRoll: z.number().min(1).max(20).optional(),
    disadvantageRoll: z.number().min(1).max(20).optional(),
    /** вибір гравця; сервер застосовує, лише коли навички не задають режим */
    rollMode: z.enum(["normal", "advantage", "disadvantage"]).optional(),
    damageRolls: z.array(z.number()).default([]),
    offHand: z.boolean().optional(),
    useInspiration: z.boolean().optional(),
    /** Підступний удар (Rogue): ефекти замість кубиків Прихованої атаки */
    cunningStrike: z.array(z.enum(CUNNING_STRIKE_EFFECTS)).min(1).max(3).optional(),
    endTurn: z.boolean().default(false),
  })
  .refine(
    (d) => d.d20Roll !== undefined || d.attackRoll !== undefined || (Array.isArray(d.attackRolls) && d.attackRolls.length > 0),
    { message: "d20Roll, attackRoll або attackRolls обов'язковий", path: ["d20Roll"] },
  )
  .refine((d) => d.targetId !== undefined || (d.targetIds !== undefined && d.targetIds.length > 0), {
    message: "Потрібно вказати хоча б одну ціль",
    path: ["targetIds"],
  });

export const auraZoneSchema = z.object({
  participantId: z.string(),
  auraId: z.string(),
  targetIds: z.array(z.string()).max(50),
});

export const moveSchema = z.object({
  participantId: z.string(),
  to: mapCellSchema,
  free: z.boolean().optional(),
  returnToStart: z.literal(true).optional(),
});

const HAZARD_DAMAGE_TYPES = DAMAGE_ELEMENT_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const mapTerrainSchema = z.object({
  cells: z.array(z.string().regex(/^\d+:\d+$/)).min(1).max(400),
  terrain: z
    .object({
      kind: z.enum(["wall", "barrier", "hazard", "difficult"]),
      label: z.string().max(60).optional(),
      rounds: z.number().int().min(1).max(20).optional(),
      damage: z.object({ dice: z.string().regex(HAZARD_DICE_PATTERN), type: z.enum(HAZARD_DAMAGE_TYPES) }).optional(),
    })
    .refine((t) => t.kind !== "barrier" || t.rounds !== undefined, { message: "Барʼєру потрібна тривалість у раундах", path: ["rounds"] })
    .nullable(),
});

export const mapWeatherSchema = z.object({ weather: weatherKindSchema.nullable() });

export const castSpellSchema = z.object({
  casterId: z.string(),
  legendaryKey: z.string().min(1).optional(),
  spellId: z.string(),
  grantKey: z.string().min(1).max(300).optional(),
  castLevel: z.number().int().min(0).max(9).optional(),
  targetIds: z.array(z.string()).default([]),
  /** точка шаблону на карті */
  targetCell: mapCellSchema.optional(),
  diceRolls: z.array(z.number()).default([]),
  saveRolls: z.array(z.object({ participantId: z.string(), roll: z.number().int().min(1).max(20) })).optional(),
  attackRolls: z.array(z.object({ participantId: z.string(), roll: z.number().int().min(1).max(20) })).optional(),
  preview: z.boolean().optional(),
  castingRounds: z.number().int().min(1).max(144000).optional(),
  cancelCasting: z.boolean().optional(),
  free: z.boolean().optional(),
  optionIndex: z.number().int().min(0).max(6).optional(),
  inputCount: z.number().int().min(0).max(40).optional(),
  slotKey: z.string().regex(/^([1-9]|pact)$/).optional(),
});

export type SpellRequestData = z.infer<typeof castSpellSchema>;

export const abilityActionSchema = z.object({
  participantId: z.string(),
  abilityKey: z.string(),
  targetParticipantIds: z.array(z.string()).optional(),
  targetCell: mapCellSchema.optional(),
});

export const bonusActionSchema = abilityActionSchema.extend({ targetParticipantId: z.string().optional() });

export const patchParticipantSchema = z
  .object({
    lairActive: z.boolean().optional(),
    currentHp: z.number().int().min(0).optional(),
    removeFromBattle: z.boolean().optional(),
    kill: z.boolean().optional(),
    revive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field is required" });

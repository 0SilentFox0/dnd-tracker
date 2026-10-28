import { z } from "zod";

const id = z.string().min(1);

export const coreActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["dash", "disengage", "dodge", "hide", "ready", "standUp", "escape"]), participantId: id }),
  z.object({ action: z.enum(["help", "grapple"]), participantId: id, targetId: id }),
  z.object({ action: z.literal("shove"), participantId: id, targetId: id, mode: z.enum(["prone", "push"]) }),
  z.object({ action: z.literal("readiedAttack"), participantId: id, targetId: id }),
]);

export type CoreActionBody = z.infer<typeof coreActionSchema>;

const legendaryOptionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("attack"), attackIndex: z.number().int().min(0).max(50), targetId: id }),
  z.object({ kind: z.literal("ability"), abilityKey: id, targetIds: z.array(id).max(20).optional() }),
]);

export const legendaryActionSchema = z.object({ action: z.literal("legendary"), participantId: id, option: legendaryOptionSchema });

export type LegendaryActionBody = z.infer<typeof legendaryActionSchema>;

export const coreActionRouteSchema = z.union([coreActionSchema, legendaryActionSchema]);

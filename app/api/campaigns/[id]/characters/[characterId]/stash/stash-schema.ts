import { z } from "zod";

import { COINS } from "@/lib/constants/inventory";

const amount = z.number().int().min(1).max(1_000_000);

const coin = z.enum(COINS);

const money = z.number().int().min(0).max(10_000_000);

const item = { name: z.string().trim().min(1).max(100), description: z.string().trim().max(1000).optional(), quantity: z.number().int().min(1).max(9999), consumable: z.boolean() };

const id = z.string().min(1).max(64);

export const stashActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("spend"), amount, coin, note: z.string().trim().min(1).max(200) }),
  z.object({ action: z.literal("gain"), amount, coin, note: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("setMoney"), gp: money, sp: money, cp: money }),
  z.object({ action: z.literal("addItem"), ...item }),
  z.object({ action: z.literal("editItem"), itemId: id, ...item }),
  z.object({ action: z.literal("useItem"), itemId: id }),
  z.object({ action: z.literal("removeItem"), itemId: id }),
  z.object({ action: z.literal("stash"), slot: id }),
  z.object({ action: z.literal("equip"), artifactId: id, slot: z.literal("shield").optional() }),
  z.object({ action: z.literal("grant"), artifactId: id }),
  z.object({ action: z.literal("revoke"), artifactId: id }),
]);

import { z } from "zod";

import { ITEM_LIMITS } from "@/lib/constants/artifacts";
import { COINS } from "@/lib/constants/inventory";
import { INGREDIENT_SLUG_RE } from "@/lib/constants/spell-ingredients";
import { ITEM_REF_RE } from "@/lib/utils/items/ref";

const amount = z.number().int().min(1).max(1_000_000);

const coin = z.enum(COINS);

const money = z.number().int().min(0).max(10_000_000);

const item = { name: z.string().trim().min(1).max(ITEM_LIMITS.specialName), description: z.string().trim().max(ITEM_LIMITS.specialDescription).optional(), quantity: z.number().int().min(1).max(9999), consumable: z.boolean(), worthGp: z.number().min(0).max(1_000_000).optional(), ingredient: z.string().regex(INGREDIENT_SLUG_RE).optional() };

const id = z.string().min(1).max(64);

const ref = z.string().min(1).max(129).regex(ITEM_REF_RE);

export const stashActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("spend"), amount, coin, note: z.string().trim().min(1).max(200) }),
  z.object({ action: z.literal("gain"), amount, coin, note: z.string().trim().max(200).optional() }),
  z.object({ action: z.literal("setMoney"), gp: money, sp: money, cp: money }),
  z.object({ action: z.literal("addItem"), ...item }),
  z.object({ action: z.literal("editItem"), itemId: id, ...item }),
  z.object({ action: z.literal("useItem"), itemId: id }),
  z.object({ action: z.literal("removeItem"), itemId: id }),
  z.object({ action: z.literal("stash"), slot: id }),
  z.object({ action: z.literal("equip"), artifactId: ref, slot: z.literal("shield").optional() }),
  z.object({ action: z.literal("grant"), artifactId: id, baseId: id.optional(), quantity: z.number().int().min(ITEM_LIMITS.grantQuantity[0]).max(ITEM_LIMITS.grantQuantity[1]).optional(), parameter: z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/).optional(), spellId: id.optional() }),
  z.object({ action: z.literal("revoke"), artifactId: ref }),
  z.object({ action: z.literal("attune"), ref }),
  z.object({ action: z.literal("unattune"), ref }),
]);

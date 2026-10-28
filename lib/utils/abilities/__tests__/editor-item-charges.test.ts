import { describe, expect, it } from "vitest";

import { CLASS_REF_OUTSIDE } from "@/lib/utils/abilities/class-columns";
import { validateAbilities } from "@/lib/utils/abilities/editor";

const EXPEND = { id: "charge", name: "Expend", trigger: { event: "action" }, limits: { pool: { key: "charges", cost: 1 } }, effects: [{ kind: "note", text: "x" }] };

describe("validateAbilities: item charges", () => {
  it("charges key is allowed only for an item with charges or a consumable", () => {
    expect(validateAbilities([EXPEND]).errorsByPath["0.limits.pool.key"]).toEqual([CLASS_REF_OUTSIDE]);
    expect(validateAbilities([EXPEND], { itemCharges: true }).ok).toBe(true);
    expect(validateAbilities([{ ...EXPEND, limits: { pool: { key: "rage", cost: 1 } } }], { itemCharges: true }).errorsByPath["0.limits.pool.key"]).toEqual([CLASS_REF_OUTSIDE]);
  });
});

import { describe, expect, it } from "vitest";

import { addParticipantSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/add-participant/add-participant-mutation";
import { UNIT_QUANTITY } from "@/lib/constants/battle-units";

const body = (quantity: number) => ({ sourceId: "u1", type: "unit", side: "enemy", quantity });

describe("addParticipantSchema.quantity", () => {
  it("приймає 15 юнітів і верхню межу налаштування бою", () => {
    expect(addParticipantSchema.safeParse(body(15)).success).toBe(true);
    expect(addParticipantSchema.safeParse(body(UNIT_QUANTITY.max)).success).toBe(true);
  });

  it("відхиляє max+1 і нуль", () => {
    expect(addParticipantSchema.safeParse(body(UNIT_QUANTITY.max + 1)).success).toBe(false);
    expect(addParticipantSchema.safeParse(body(0)).success).toBe(false);
  });
});

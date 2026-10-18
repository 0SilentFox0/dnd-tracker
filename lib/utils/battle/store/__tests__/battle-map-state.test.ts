import { describe, expect, it } from "vitest";

import { buildParticipantPatch } from "../participant-patch";
import { joinParticipant, splitParticipant } from "../split-participant";

import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";

const base = createMockParticipant();

const placed = { ...base, battleData: { ...base.battleData, position: { x: 3, y: 4 }, movementUsed: 2 } };

describe("позиція й рух у state", () => {
  it("живуть у state, а не в знімку, і переживають split/join", () => {
    const stored = splitParticipant(placed, { orderIndex: 0, isPending: false });

    expect(stored.state.position).toEqual({ x: 3, y: 4 });
    expect(stored.state.movementUsed).toBe(2);
    expect(JSON.stringify(stored.snapshot)).not.toContain("movementUsed");
    expect(joinParticipant(stored, "b1").battleData).toMatchObject({ position: { x: 3, y: 4 }, movementUsed: 2 });
  });

  it("крок змінює лише state — знімок і hash ті самі", () => {
    const moved = { ...placed, battleData: { ...placed.battleData, position: { x: 4, y: 4 } } };

    expect(splitParticipant(moved, { orderIndex: 0, isPending: false }).snapshotHash).toBe(splitParticipant(placed, { orderIndex: 0, isPending: false }).snapshotHash);
  });

  it("патч несе position і movementUsed", () => {
    const moved = { ...placed, battleData: { ...placed.battleData, position: { x: 4, y: 4 }, movementUsed: 3 } };

    expect(buildParticipantPatch(placed, moved)).toEqual({ id: base.basicInfo.id, battleData: { position: { x: 4, y: 4 }, movementUsed: 3 } });
  });

  it("учасник без позиції не отримує полів", () => {
    const stored = splitParticipant(base, { orderIndex: 0, isPending: false });

    expect(joinParticipant(stored, "b1").battleData).not.toHaveProperty("position");
  });
});

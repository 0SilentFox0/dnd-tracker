import { describe, expect, it } from "vitest";

import { createMockParticipant } from "../../__tests__/fixtures/mock-participant";
import { applyCondition5e } from "../../conditions";
import { turnExhausted } from "../turn-exhausted";

const used = () => {
  const p = createMockParticipant();

  return { ...p, actionFlags: { ...p.actionFlags, hasUsedAction: true, hasUsedBonusAction: true } };
};

describe("turnExhausted", () => {
  it("дію витрачено, нічого не лишилось — вичерпано", () => {
    expect(turnExhausted(used(), [])).toBe(true);
  });

  it("дію не витрачено — не вичерпано", () => {
    expect(turnExhausted(createMockParticipant(), [])).toBe(false);
  });

  it("можливе повернення на старт — не вичерпано, без нього знову вичерпано", () => {
    expect(turnExhausted(used(), [], { canReturn: true })).toBe(false);
    expect(turnExhausted(used(), [], { canReturn: false })).toBe(true);
  });
});

describe("turnExhausted · дії 5e", () => {
  const prone = () => applyCondition5e([used()], "p1", { key: "prone", rounds: 99, permanent: true, round: 1, source: { participantId: "x", name: "X" }, sourceName: "X", timedKey: "test:prone" }).participants[0];

  it("лежачий із запасом руху при ввімкнених діях ще може підвестися", () => {
    expect(turnExhausted(prone(), [], { coreActions: true })).toBe(false);
  });

  it("без правил 5e (HOMM) лежачий не впливає, Ривок теж", () => {
    expect(turnExhausted(prone(), [], { coreActions: false })).toBe(true);

    const dashed = { ...used(), battleData: { ...used().battleData, extraMovement: 6 } };

    expect(turnExhausted(dashed, [], { coreActions: false })).toBe(true);
  });

  it("5e на карті: лишок руху (Ривок, Відхід) тримає хід відкритим; без позиції чи без руху — вичерпано", () => {
    const placed = { ...used(), battleData: { ...used().battleData, position: { x: 0, y: 0 } } };

    expect(turnExhausted(placed, [], { coreActions: true })).toBe(false);
    expect(turnExhausted({ ...placed, battleData: { ...placed.battleData, movementUsed: 99 } }, [], { coreActions: true })).toBe(true);
    expect(turnExhausted({ ...used(), battleData: { ...used().battleData, extraMovement: 6, position: undefined } }, [], { coreActions: true })).toBe(true);
    expect(turnExhausted(placed, [], { coreActions: false })).toBe(true);
  });

  it("дію не витрачено — не вичерпано й при діях 5e", () => {
    expect(turnExhausted(createMockParticipant(), [], { coreActions: true })).toBe(false);
  });
});

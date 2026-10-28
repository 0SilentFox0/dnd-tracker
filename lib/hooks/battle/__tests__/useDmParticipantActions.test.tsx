// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fakeScene } from "./fake-scene";

import { useDmParticipantActions } from "@/lib/hooks/battle";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { DEFAULT_RULES } from "@/lib/utils/rules";

const noop = () => {};

describe("useDmParticipantActions: кнопка «Стани»", () => {
  it("вимкнене правило й немає станів 5e — прихована", () => {
    const { wrapper } = fakeScene({ isDM: true });

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.row.conditionsEnabled).toBe(false);
  });

  it("правило увімкнене — доступна", () => {
    const { wrapper, value } = fakeScene({ isDM: true });

    value.battle = { ...value.battle, rules: { ...DEFAULT_RULES, conditions: { ...DEFAULT_RULES.conditions, enabled: true } } };

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.row.conditionsEnabled).toBe(true);
  });

  it("стан 5e в будь-кого в бою відкриває кнопку для всіх", () => {
    const { wrapper, value, gob } = fakeScene({ isDM: true });

    const stunned = { ...gob, battleData: { ...gob.battleData, activeEffects: [makeEffect("s", { type: "condition", effects: [{ type: "stunned", value: 1 }] })] } };

    value.battle = { ...value.battle, initiativeOrder: value.battle.initiativeOrder?.map((p) => (p.basicInfo.id === "gob" ? stunned : p)) };

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.row.conditionsEnabled).toBe(true);
  });
});

// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { fakeScene } from "./fake-scene";

import { useDmParticipantActions } from "@/lib/hooks/battle";

const noop = () => {};

describe("useDmParticipantActions: легендарна дія", () => {
  it("активний бій — onLegendary відкриває діалог для учасника", () => {
    const { wrapper, gob } = fakeScene({ isDM: true });

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.legendary.target).toBeNull();

    act(() => result.current.row.onLegendary?.(gob));

    expect(result.current.legendary.target?.basicInfo.id).toBe("gob");

    act(() => result.current.legendary.close());

    expect(result.current.legendary.target).toBeNull();
  });

  it("підготовлений бій — без onLegendary", () => {
    const { wrapper } = fakeScene({ isDM: true, status: "prepared" });

    const { result } = renderHook(() => useDmParticipantActions({ onChangeHp: noop, onDone: noop }), { wrapper });

    expect(result.current.row.onLegendary).toBeUndefined();
  });
});

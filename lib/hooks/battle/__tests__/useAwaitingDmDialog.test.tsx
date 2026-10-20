// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useAwaitingDmDialog } from "../useAwaitingDmDialog";

type Props = { isDM: boolean; awaiting: "victory" | "defeat" | null };

const setup = (initial: Props) => renderHook((p: Props) => useAwaitingDmDialog(p.isDM, p.awaiting), { initialProps: initial });

describe("useAwaitingDmDialog", () => {
  it("ДМ: відкритий, після закриття — закритий, setOpen(true) відкриває знову", () => {
    const { result } = setup({ isDM: true, awaiting: "victory" });

    expect(result.current.open).toBe(true);

    act(() => result.current.setOpen(false));
    expect(result.current.open).toBe(false);

    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
  });

  it("закритий діалог відкривається сам на новий стан очікування і після його зникнення", () => {
    const { result, rerender } = setup({ isDM: true, awaiting: "victory" });

    act(() => result.current.setOpen(false));
    rerender({ isDM: true, awaiting: "defeat" });
    expect(result.current.open).toBe(true);

    act(() => result.current.setOpen(false));
    rerender({ isDM: true, awaiting: null });
    expect(result.current.open).toBe(false);

    rerender({ isDM: true, awaiting: "defeat" });
    expect(result.current.open).toBe(true);
  });

  it("гравцеві й без очікування — закритий", () => {
    expect(setup({ isDM: false, awaiting: "victory" }).result.current.open).toBe(false);
    expect(setup({ isDM: true, awaiting: null }).result.current.open).toBe(false);
  });
});

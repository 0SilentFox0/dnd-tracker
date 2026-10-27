// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMapDrawing } from "../useMapDrawing";

afterEach(cleanup);

const setup = () => {
  const actions = { onPoint: vi.fn(), onZone: vi.fn(), onEntry: vi.fn() };

  const hook = renderHook(() => useMapDrawing(actions));

  return { actions, ...hook };
};

const click = (r: ReturnType<typeof setup>["result"], x: number, y: number) => act(() => r.current.handlers.onMapClick?.({ x, y }));

const dblclick = (r: ReturnType<typeof setup>["result"], x: number, y: number) => act(() => r.current.handlers.onMapDoubleClick?.({ x, y }));

const key = (k: string, target: EventTarget = document.body) => act(() => void target.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })));

describe("useMapDrawing", () => {
  it("point click creates a point and keeps the tool", () => {
    const { result, actions } = setup();

    act(() => result.current.setTool("point"));
    click(result, 0.2, 0.3);

    expect(actions.onPoint).toHaveBeenCalledWith({ x: 0.2, y: 0.3 });
    expect(result.current.tool).toBe("point");
  });

  it("a double click on the point tool creates one marker, a later click another", () => {
    vi.useFakeTimers();

    const { result, actions } = setup();

    act(() => result.current.setTool("point"));
    click(result, 0.2, 0.3);
    click(result, 0.2, 0.3);

    expect(actions.onPoint).toHaveBeenCalledTimes(1);

    act(() => void vi.advanceTimersByTime(1000));
    click(result, 0.2, 0.3);

    expect(actions.onPoint).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("closes a zone of 3 vertices on double click despite the duplicated last click", () => {
    const { result, actions } = setup();

    act(() => result.current.setTool("zone"));
    click(result, 0.1, 0.1);
    click(result, 0.5, 0.1);
    click(result, 0.5, 0.5);
    click(result, 0.5, 0.5);
    dblclick(result, 0.5, 0.5);

    expect(actions.onZone).toHaveBeenCalledWith([[0.1, 0.1], [0.5, 0.1], [0.5, 0.5], [0.1, 0.1]]);
    expect(result.current.draft).toEqual([]);
  });

  it("keeps the draft and saves nothing for a 2-vertex zone", () => {
    const { result, actions } = setup();

    act(() => result.current.setTool("zone"));
    click(result, 0.1, 0.1);
    click(result, 0.5, 0.1);
    click(result, 0.5, 0.1);
    dblclick(result, 0.5, 0.1);

    expect(actions.onZone).not.toHaveBeenCalled();
    expect(result.current.draft.length).toBeGreaterThan(0);
  });

  it("Esc clears the draft, Backspace removes the last vertex", () => {
    const { result } = setup();

    act(() => result.current.setTool("zone"));
    click(result, 0.1, 0.1);
    click(result, 0.5, 0.1);
    key("Backspace");

    expect(result.current.draft).toEqual([{ x: 0.1, y: 0.1 }]);

    key("Escape");

    expect(result.current.draft).toEqual([]);
  });

  it("ignores Backspace while typing in a textarea", () => {
    const { result } = setup();

    const area = document.body.appendChild(document.createElement("textarea"));

    act(() => result.current.setTool("zone"));
    click(result, 0.1, 0.1);
    key("Backspace", area);

    expect(result.current.draft).toHaveLength(1);

    area.remove();
  });

  it("V/P/Z/E switch tools, also on the Ukrainian layout", () => {
    const { result } = setup();

    key("p");

    expect(result.current.tool).toBe("point");

    key("я");

    expect(result.current.tool).toBe("zone");

    key("e");

    expect(result.current.tool).toBe("entry");

    key("Escape");

    expect(result.current.tool).toBe("select");

    key("z");
    key("v");

    expect(result.current.tool).toBe("select");
  });

  it("hotkeys are ignored while typing", () => {
    const { result } = setup();

    const input = document.body.appendChild(document.createElement("input"));

    key("p", input);

    expect(result.current.tool).toBe("select");

    input.remove();
  });

  it("changing the tool resets the draft", () => {
    const { result } = setup();

    act(() => result.current.setTool("zone"));
    click(result, 0.1, 0.1);
    act(() => result.current.setTool("point"));

    expect(result.current.draft).toEqual([]);
  });

  it("entry click reports the point and returns to select", () => {
    const { result, actions } = setup();

    act(() => result.current.setTool("entry"));
    click(result, 0.4, 0.6);

    expect(actions.onEntry).toHaveBeenCalledWith({ x: 0.4, y: 0.6 });
    expect(result.current.tool).toBe("select");
  });
});

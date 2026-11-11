// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LevelBookmarks } from "../LevelBookmarks";

vi.mock("@/components/hud", () => ({ spellLevelMetal: () => "" }));

describe("LevelBookmarks", () => {
  afterEach(cleanup);

  it("shows slot counters by default", () => {
    render(<LevelBookmarks level={1} slotOf={() => Infinity} onLevel={vi.fn()} />);
    expect(screen.getAllByText("Infinity").length).toBeGreaterThan(0);
  });

  it("hideSlots drops counters for magic systems", () => {
    render(<LevelBookmarks level={1} slotOf={() => Infinity} hideSlots onLevel={vi.fn()} />);
    expect(screen.queryByText("Infinity")).toBeNull();
    expect(screen.queryByText("∞")).toBeNull();
  });
});

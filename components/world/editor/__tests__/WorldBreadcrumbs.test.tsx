// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldBreadcrumbs } from "../WorldBreadcrumbs";
import { WorldEditorContext, type WorldEditorCtx } from "../WorldEditorContext";

import { HudPageHeader } from "@/components/hud/page";

afterEach(cleanup);

const maps = [
  { id: "m1", name: "Ашан", parentMapId: null },
  { id: "m2", name: "Місто", parentMapId: "m1" },
];

describe("WorldBreadcrumbs", () => {
  it("renders clickable ancestors, is not inside a <p> in the page header and keeps the current map as plain text", () => {
    const openMap = vi.fn();

    render(
      <WorldEditorContext.Provider value={{ maps, openMap } as unknown as WorldEditorCtx}>
        <HudPageHeader title="Карта світу" subtitle={<WorldBreadcrumbs mapId="m2" />} />
      </WorldEditorContext.Provider>,
    );

    expect(screen.getByRole("navigation", { name: "Шлях по картах" }).closest("p")).toBeNull();
    expect(screen.getByText("Місто").getAttribute("aria-current")).toBe("page");

    fireEvent.click(screen.getByRole("button", { name: "Ашан" }));

    expect(openMap).toHaveBeenCalledWith("m1");
  });
});

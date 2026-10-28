// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorldEditorPageClient } from "../page-client";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/campaigns/c1/dm/world" }));
vi.mock("@/lib/hooks/world", async (importOriginal) => {
  const detail = { map: { id: "m2", name: "Печера", entryX: 0.5, entryY: 0.5 }, markers: [], heroes: [] };

  return {
    ...(await importOriginal<typeof import("@/lib/hooks/world")>()),
    useWorldMaps: () => ({ data: [{ id: "m1", name: "Світ" }, { id: "m2", name: "Печера" }], isPending: false, isError: false }),
    useWorldMap: () => ({ data: detail, isPending: false, isError: false }),
    useWorldEditor: () => ({ marker: { create: {}, update: {}, remove: {} }, map: { update: {} } }),
    useWorldHeroes: () => ({ heroes: [] }),
    useHeroEyes: () => ({ asHeroId: null, setAsHeroId: vi.fn(), view: {} }),
    useRemoveMarker: () => undefined,
  };
});
vi.mock("@/components/world/editor/WorldToolbar", () => ({
  WorldToolbar: ({ drawing }: { drawing: { tool: string; setTool(t: string): void } }) => (
    <button type="button" onClick={() => drawing.setTool("move")}>
      tool:{drawing.tool}
    </button>
  ),
  WorldToolHint: () => null,
}));
vi.mock("@/components/world/travel/TravelPanel", () => ({
  TravelPanel: ({ onMoved }: { onMoved(e: unknown): void }) => (
    <div>
      <span>travel-panel</span>
      <button type="button" onClick={() => onMoved({ kind: "exit", fromMapId: "m2", destMapId: "m1" })}>
        exit
      </button>
      <button type="button" onClick={() => onMoved({ kind: "travel", fromMapId: "m2", destMapId: "m2" })}>
        plain
      </button>
    </div>
  ),
}));
vi.mock("@/components/world/WorldMapView", () => ({ WorldMapView: () => <div>map</div> }));
vi.mock("@/components/world/editor/HeroEyesSelect", () => ({ HeroEyesSelect: () => null }));
vi.mock("@/components/world/editor/NewWorldMapDialog", () => ({ NewWorldMapDialog: () => null }));
vi.mock("@/components/world/editor/WorldBreadcrumbs", () => ({ WorldBreadcrumbs: () => null }));
vi.mock("@/components/world/editor/WorldInspectorBar", () => ({ WorldInspectorBar: () => null }));
vi.mock("@/components/world/editor/WorldMapSettings", () => ({ WorldMapSettings: () => null }));
vi.mock("@/components/world/editor/WorldMarkerPanel", () => ({ WorldMarkerPanel: () => null }));
vi.mock("@/components/ui/responsive-dialog", () => ({ ResponsiveDialog: () => null }));

afterEach(() => {
  cleanup();
  replace.mockReset();
});

describe("WorldEditorPageClient", () => {
  it("після «Вийти» відкриває батьківську карту, інструмент лишається «Переміщення»", () => {
    render(<WorldEditorPageClient campaignId="c1" campaignName="Кампанія" mapId="m2" />);

    fireEvent.click(screen.getByText("tool:select"));
    fireEvent.click(screen.getByText("exit"));

    expect(replace).toHaveBeenCalledWith("/campaigns/c1/dm/world?map=m1");
    expect(screen.getByText("tool:move")).toBeTruthy();
    expect(screen.getByText("travel-panel")).toBeTruthy();
  });

  it("звичайне переміщення карту не змінює", () => {
    render(<WorldEditorPageClient campaignId="c1" campaignName="Кампанія" mapId="m2" />);

    fireEvent.click(screen.getByText("tool:select"));
    fireEvent.click(screen.getByText("plain"));

    expect(replace).not.toHaveBeenCalled();
  });
});

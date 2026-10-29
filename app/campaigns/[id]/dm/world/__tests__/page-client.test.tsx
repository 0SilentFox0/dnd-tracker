// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldEditorPageClient } from "../page-client";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/campaigns/c1/dm/world" }));

const detail = { map: { id: "m2", name: "Печера", entryX: 0.5, entryY: 0.5 }, markers: [{ id: "k1", name: "Місто" }], heroes: [] };

vi.mock("@/lib/hooks/world/useWorldMaps", () => ({
  useWorldMaps: () => ({ data: [{ id: "m1", name: "Світ" }, { id: "m2", name: "Печера" }], isPending: false, isError: false }),
}));
vi.mock("@/lib/hooks/world/useWorldMap", () => ({ useWorldMap: () => ({ data: detail, isPending: false, isError: false }) }));
vi.mock("@/lib/hooks/world/useWorldEditor", () => ({
  useWorldEditor: () => ({ marker: { create: {}, update: {}, remove: {} }, map: { update: {} } }),
}));
vi.mock("@/lib/hooks/world/useWorldHeroes", () => ({ useWorldHeroes: () => ({ heroes: [] }) }));
vi.mock("@/lib/hooks/world/useHeroEyes", () => ({ useHeroEyes: () => ({ asHeroId: null, setAsHeroId: vi.fn(), view: {} }) }));
vi.mock("@/lib/hooks/world/useRemoveMarker", () => ({ useRemoveMarker: () => undefined }));
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
vi.mock("@/components/world/editor/WorldMarkerPanel", () => ({ WorldMarkerPanel: () => <span>marker-panel</span> }));
vi.mock("@/components/ui/responsive-dialog", () => ({ ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <>{children}</> : null) }));

beforeEach(() => {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

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

  it("initialSelectedId відкриває панель маркера", () => {
    render(<WorldEditorPageClient campaignId="c1" campaignName="Кампанія" mapId="m2" initialSelectedId="k1" />);

    expect(screen.getByText("marker-panel")).toBeTruthy();
  });

  it("без initialSelectedId маркер не вибрано", () => {
    render(<WorldEditorPageClient campaignId="c1" campaignName="Кампанія" mapId="m2" />);

    expect(screen.queryByText("marker-panel")).toBeNull();
  });

  it("звичайне переміщення карту не змінює", () => {
    render(<WorldEditorPageClient campaignId="c1" campaignName="Кампанія" mapId="m2" />);

    fireEvent.click(screen.getByText("tool:select"));
    fireEvent.click(screen.getByText("plain"));

    expect(replace).not.toHaveBeenCalled();
  });
});

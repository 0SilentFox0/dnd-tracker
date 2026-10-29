// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorldEditorContext } from "../editor/WorldEditorContext";
import { WorldMarkerPanel } from "../editor/WorldMarkerPanel";
import { WorldToolHint } from "../editor/WorldToolbar";

import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import type { WorldEditorCtx } from "@/lib/hooks/world";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { WorldMarker } from "@/types/world";

vi.unmock("next-intl");

const marker: WorldMarker = { id: "k1", mapId: "m1", kind: "zone", x: 0.5, y: 0.5, polygon: null, name: "Keep", icon: null, color: "#d3b060", dmNote: null, alwaysVisible: false, sortOrder: 0, childMapId: null };

const ctx = {
  campaignId: "c1",
  detail: { map: { id: "m1", name: "Ashan" }, markers: [marker] },
  maps: [],
  selectedId: marker.id,
  select: vi.fn(),
  openMap: vi.fn(),
  tool: "select",
  setTool: vi.fn(),
  redrawId: null,
  redraw: vi.fn(),
  editor: { marker: { update: { mutateOk: vi.fn() }, remove: { mutateOk: vi.fn() } }, map: { create: { isPending: false } } },
} as unknown as WorldEditorCtx;

describe("world en", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });

  afterEach(cleanup);

  it("WorldMarkerPanel and WorldToolHint render English labels without raw keys", async () => {
    await renderWithIntl(
      <ConfirmProvider>
        <QueryClientProvider client={new QueryClient()}>
          <WorldEditorContext.Provider value={ctx}>
            <WorldMarkerPanel />
            <WorldToolHint tool="zone" vertices={3} />
          </WorldEditorContext.Provider>
        </QueryClientProvider>
      </ConfirmProvider>,
      { locale: "en", namespaces: ["common", "validation", "world"] },
    );

    expect(screen.getByText("Zone · Ashan")).toBeInTheDocument();
    expect(screen.getByText("Redraw zone")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Click to add vertices (3) · double-click to close");
    expect(document.body.textContent).not.toMatch(/world\./);
  });
});

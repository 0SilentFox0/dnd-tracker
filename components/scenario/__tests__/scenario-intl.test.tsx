// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioBar, ScenarioIndex } from "@/components/scenario";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { ScenarioPageSummary } from "@/types/scenario";

vi.unmock("next-intl");

const page = (over: Partial<ScenarioPageSummary>): ScenarioPageSummary => ({ id: "x", kind: "scene", arc: null, title: "x", subtitle: null, status: "draft", sortOrder: 0, characterId: null, version: 0, updatedAt: "", ...over });

describe("scenario en", () => {
  afterEach(cleanup);

  it("ScenarioBar and ScenarioIndex render English labels without raw keys", async () => {
    await renderWithIntl(
      <>
        <ScenarioBar title="Book" notes={{ hidden: false, toggle: vi.fn() }} toc={{ onOpen: vi.fn() }} menu={[]} />
        <ScenarioIndex campaignId="c" pages={[page({ id: "a", title: "Monastery", status: "ready" }), page({ id: "h", kind: "hero", title: "Godric" })]} onMove={vi.fn()} />
      </>,
      { locale: "en", namespaces: ["common", "validation", "scenario"] },
    );

    expect(screen.getByRole("button", { name: "Hide notes" })).toBeInTheDocument();
    expect(screen.getByText("No arc")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move up: Monastery" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/scenario\./);
  });
});

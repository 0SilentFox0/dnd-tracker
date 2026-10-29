// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompendiumProgress } from "../CompendiumProgress";

import type { CompendiumPhase } from "@/lib/hooks/compendium-import";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { MediaProgress } from "@/types/compendium-import";

vi.unmock("next-intl");
afterEach(cleanup);

const render = (ui: React.ReactElement) => renderWithIntl(ui, { locale: "uk", namespaces: ["common", "validation", "compendium"] });

const media: MediaProgress = { runId: "r", total: 10, saved: 3, failed: 1, skipped: 0, pending: 6, retryable: 1, failures: [] };

describe("CompendiumProgress", () => {
  it.each([["reading", "Читання файла…"], ["previewing", "Перевірка імпорту…"], ["confirming", "Застосування змін…"], ["opening", "Відкриття звіту…"]] as const)("shows the %s caption in a polite status", async (phase: CompendiumPhase, text) => {
    await render(<CompendiumProgress phase={phase} media={null} />);

    const status = screen.getAllByRole("status")[0];

    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain(text);
  });

  it("shows a progressbar with N of M while images are saved", async () => {
    await render(<CompendiumProgress phase="media" media={media} />);

    const bar = screen.getByRole("progressbar");

    expect(bar.getAttribute("aria-valuenow")).toBe("4");
    expect(bar.getAttribute("aria-valuemax")).toBe("10");
    expect(screen.getByRole("status").textContent).toContain("Збереження зображень: 4 із 10");
  });

  it("renders nothing when idle", async () => {
    const { container } = await render(<CompendiumProgress phase="idle" media={null} />);

    expect(container.textContent).toBe("");
  });
});

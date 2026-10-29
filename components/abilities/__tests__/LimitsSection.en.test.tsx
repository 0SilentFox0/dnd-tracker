// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilityEditorProvider } from "../editor-context";
import { LimitsSection } from "../sections/LimitsSection";

import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.unmock("next-intl");

afterEach(cleanup);

const ability = { id: "a", name: "Expend", trigger: { event: "action" as const }, effects: [{ kind: "note" as const, text: "x" }] };

describe("LimitsSection (en)", () => {
  it("renders English labels without raw keys", async () => {
    const { container } = await renderWithIntl(
      <AbilityEditorProvider value={{ campaignId: "c", errorsByPath: {}, itemCharges: true }}>
        <LimitsSection ability={ability} path="0" onChange={vi.fn()} />
      </AbilityEditorProvider>,
      { locale: "en", namespaces: ["common", "validation", "abilities"] },
    );

    expect(screen.getByText("Uses per battle")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Spends item charges" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/abilities\./);
  });
});

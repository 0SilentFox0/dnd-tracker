// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChoiceListEditor } from "@/components/choices/ChoiceListEditor";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { Choice } from "@/types/choices";

vi.unmock("next-intl");
vi.mock("@/components/abilities", () => ({ AbilityListEditor: () => <div /> }));
vi.mock("@/lib/hooks/spells", () => ({ useSpells: () => ({ data: [] }) }));

const choices: Choice[] = [
  { id: "a", label: "A", level: 1, count: 1, kind: "skill" },
  { id: "b", label: "B", level: 1, count: 1, kind: "feat", featTypes: ["general"] },
];

describe("ChoiceListEditor (en)", () => {
  afterEach(cleanup);

  it("renders English text without raw keys", async () => {
    const { container } = await renderWithIntl(<ChoiceListEditor campaignId="c1" owner="class" value={choices} onChange={vi.fn()} />, { locale: "en", namespaces: ["common", "gameTerms", "validation", "feats", "choices"] });

    expect(screen.getByRole("button", { name: "Add choice" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Choice kind")).toHaveLength(2);
    expect(screen.getByText("Empty — any skill")).toBeInTheDocument();
    expect(screen.getByText("Acrobatics")).toBeInTheDocument();
    expect(screen.getByLabelText("General")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b(choices|feats|common)\./);
  });
});

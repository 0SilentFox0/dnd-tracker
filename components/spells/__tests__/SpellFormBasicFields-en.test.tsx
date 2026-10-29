// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellFormBasicFields } from "@/components/spells/form/SpellFormBasicFields";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { defaultSpellForm } from "@/lib/utils/spells/model/form";

vi.unmock("next-intl");

afterEach(cleanup);

describe("SpellFormBasicFields in en", () => {
  it("renders English labels and level options", async () => {
    await renderWithIntl(<SpellFormBasicFields formData={{ ...defaultSpellForm(), cost: "reaction" }} setFormData={vi.fn()} spellGroups={[]} />, { locale: "en", namespaces: ["common", "gameTerms", "spells", "spellEditor"] });

    expect(screen.getByText(/^Spell name/)).toBeInTheDocument();
    expect(screen.getByText("Level (slot) *")).toBeInTheDocument();
    expect(screen.getByText("1st level")).toBeInTheDocument();
    expect(screen.getByLabelText("Reaction trigger")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\p{Script=Cyrillic}|spellEditor\./u);
  });
});

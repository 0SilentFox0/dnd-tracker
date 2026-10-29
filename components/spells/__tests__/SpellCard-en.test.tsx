// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellCard } from "@/components/spells/list/SpellCard";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { Spell } from "@/types/spells";

vi.unmock("next-intl");
vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));

afterEach(cleanup);

const spell = { id: "s1", name: "Spark", level: 1, description: null, dice: 2, cost: "bonusAction", targeting: { kind: "enemy" }, resolution: { kind: "save", ability: "dexterity", onSuccess: "half" }, spellGroup: null } as unknown as Spell;

describe("SpellCard in en", () => {
  it("renders English level, mechanics and actions", async () => {
    await renderWithIntl(<SpellCard spell={spell} campaignId="c1" spellGroups={[]} onRemoveFromGroup={vi.fn()} onMoveToGroup={vi.fn()} />, { locale: "en", namespaces: ["common", "spells"] });

    expect(screen.getByText("1st level")).toBeInTheDocument();
    expect(screen.getByText("2 dice")).toBeInTheDocument();
    expect(screen.getByText("Dexterity saving throw (half damage)")).toBeInTheDocument();
    expect(screen.getByText("bonus action")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\p{Script=Cyrillic}|spells\./u);
  });
});

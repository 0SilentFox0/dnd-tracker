// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SpellCard } from "@/components/spells/list/SpellCard";
import type { Spell } from "@/types/spells";

vi.mock("@/components/common/OptimizedImage", () => ({ OptimizedImage: () => null }));

afterEach(cleanup);

const spell = { id: "s1", name: "Іскра", level: 1, type: "target", damageType: "damage", spellGroup: { id: "g1", name: "Вогонь" } } as unknown as Spell;

describe("SpellCard icon buttons", () => {
  it("мають aria-label, а не лише title", () => {
    render(<SpellCard spell={spell} campaignId="c1" spellGroups={[]} onRemoveFromGroup={vi.fn()} onMoveToGroup={vi.fn()} />);

    for (const label of ["Видалити з групи", "Перемістити в групу", "Копіювати ID"]) {
      const button = screen.getByTitle(label);

      expect(button).toHaveAttribute("aria-label", label);
    }
  });
});

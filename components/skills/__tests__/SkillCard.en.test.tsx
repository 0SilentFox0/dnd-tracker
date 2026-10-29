/**
 * @vitest-environment happy-dom
 */
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkillCard } from "@/components/skills/list/SkillCard";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import type { Skill } from "@/types/skills";

vi.unmock("next-intl");

vi.mock("@/lib/hooks/skills", () => ({
  useMainSkills: () => ({ data: [] }),
  useUpdateSkill: () => ({ mutate: vi.fn(), isPending: false }),
}));

const skill = { id: "s1", campaignId: "c1", name: "Strike", description: "", icon: null, spellId: null, spellGroupId: null, createdAt: new Date(), spell: { id: "sp", name: "Bolt" }, spellGroup: null } as unknown as Skill;

describe("SkillCard en", () => {
  afterEach(cleanup);

  it("renders English labels without raw keys or Cyrillic", async () => {
    await renderWithIntl(
      <ConfirmProvider>
        <SkillCard skill={skill} campaignId="c1" actions={{ onDelete: vi.fn() }} />
      </ConfirmProvider>,
      { locale: "en", namespaces: ["common", "validation", "skills"] },
    );

    expect(screen.getByText("Spell upgrade:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Actions menu")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\p{Script=Cyrillic}|skills\./u);
  });
});

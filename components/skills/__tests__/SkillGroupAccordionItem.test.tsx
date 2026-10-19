/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach,describe, expect, it, vi } from "vitest";

import { SkillGroupAccordionItem } from "@/components/skills/list/SkillGroupAccordionItem";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { Accordion } from "@/components/ui/accordion";
import type { GroupedSkill } from "@/types/skills";

function renderItem(props: React.ComponentProps<typeof SkillGroupAccordionItem>) {
  return renderWithConfirm(
    <Accordion type="single" collapsible>
      <SkillGroupAccordionItem {...props} />
    </Accordion>,
  );
}

vi.mock("@/lib/hooks/skills", () => ({
  useMainSkills: () => ({ data: [] }),
  useUpdateSkill: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/common/OptimizedImage", () => ({
  OptimizedImage: ({
    alt,
    fallback,
  }: {
    alt: string;
    fallback: React.ReactNode;
  }) => <span data-testid="skill-icon" title={alt}>{fallback}</span>,
}));

function minimalGroupedSkill(overrides: Partial<GroupedSkill> = {}): GroupedSkill {
  return {
    id: "skill-1",
    campaignId: "c1",
    basicInfo: { name: "Скіл у групі", description: "Опис", icon: undefined },
    spellData: {},
   
    mainSkillData: {},
    createdAt: new Date(),
    spell: null,
    spellGroup: null,
    ...overrides,
  };
}

describe("SkillGroupAccordionItem", () => {
  afterEach(cleanup);

  it("рендерить назву групи та кількість скілів", () => {
    renderItem({
      groupName: "Бойові скіли",
      totalSkills: 2,
      groupMenu: { onRename: vi.fn(), onRemoveAll: vi.fn() },
      skills: [
        minimalGroupedSkill({ id: "s1", basicInfo: { name: "Удар", description: undefined, icon: undefined } }),
        minimalGroupedSkill({ id: "s2", basicInfo: { name: "Блок", description: undefined, icon: undefined } }),
      ],
      campaignId: "c1",
    });
    expect(screen.getByText("Бойові скіли")).toBeInTheDocument();
    expect(screen.getByText("2 скілів")).toBeInTheDocument();
  });

  it("рендерить скіли всередині групи", () => {
    renderItem({
      groupName: "Група",
      totalSkills: 1,
      groupMenu: undefined,
      skills: [minimalGroupedSkill({ basicInfo: { name: "Єдиний скіл", description: undefined, icon: undefined } })],
      campaignId: "c1",
    });
    fireEvent.click(screen.getByRole("button", { name: /Група/i }));
    expect(screen.getByText("Єдиний скіл")).toBeInTheDocument();
  });

  it("не показує меню групи для isUngrouped або без groupId", () => {
    renderItem({
      groupName: "Без групи",
      totalSkills: 0,
      groupMenu: undefined,
      skills: [],
      campaignId: "c1",
    });
    expect(screen.queryByRole("button", { name: /more|меню/i })).not.toBeInTheDocument();
  });

  it("показує кнопку меню для групи з groupId", () => {
    renderItem({
      groupName: "Група з меню",
      totalSkills: 0,
      groupMenu: { onRename: vi.fn(), onRemoveAll: vi.fn() },
      skills: [],
      campaignId: "c1",
    });

    const buttons = screen.getAllByRole("button");

    const accordionTrigger = screen.getByRole("button", { name: /Група з меню/i });

    expect(accordionTrigger).toBeInTheDocument();

    const menuTrigger = buttons.find((b) => b !== accordionTrigger);

    expect(menuTrigger).toBeDefined();
    expect(menuTrigger).toBeInTheDocument();
  });
});

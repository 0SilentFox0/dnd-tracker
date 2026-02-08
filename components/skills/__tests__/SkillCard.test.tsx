/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

import { SkillCard } from "@/components/skills/list/SkillCard";
import type { GroupedSkill } from "@/types/skills";

vi.mock("@/lib/hooks/useMainSkills", () => ({
  useMainSkills: () => ({ data: [] }),
}));

vi.mock("@/lib/hooks/useSkills", () => ({
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
    basicInfo: { name: "Тестовий скіл", description: "Опис", icon: undefined },
    bonuses: {},
    combatStats: {},
    spellData: {},
    spellEnhancementData: {},
    mainSkillData: {},
    skillTriggers: [],
    image: null,
    createdAt: new Date(),
    spell: null,
    spellGroup: null,
    ...overrides,
  };
}

describe("SkillCard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("рендерить назву скіла", () => {
    const skill = minimalGroupedSkill({ basicInfo: { name: "Вогняна куля" } });
    render(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Вогняна куля")).toBeInTheDocument();
  });

  it("рендерить опис, якщо він є", () => {
    const skill = minimalGroupedSkill({
      basicInfo: { name: "Скіл", description: "Короткий опис скіла" },
    });
    render(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Короткий опис скіла")).toBeInTheDocument();
  });

  it("рендерить кнопку Редагувати з посиланням на сторінку скіла", () => {
    const skill = minimalGroupedSkill();
    render(<SkillCard skill={skill} campaignId="camp-123" />);
    const links = screen.getAllByRole("link", { name: /редагувати/i });
    const link = links.find((el) => el.getAttribute("href") === "/campaigns/camp-123/dm/skills/skill-1");
    expect(link).toBeDefined();
    expect(link).toHaveAttribute("href", "/campaigns/camp-123/dm/skills/skill-1");
  });

  it("не рендерить блок опису, якщо опису немає", () => {
    const skill = minimalGroupedSkill({
      basicInfo: { name: "СкілБезОпису", description: "" },
    });
    render(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("СкілБезОпису")).toBeInTheDocument();
    expect(screen.queryByText("Опис скіла")).not.toBeInTheDocument();
  });

  it("рендерить тригери, якщо вони є", () => {
    const skill = minimalGroupedSkill({
      basicInfo: { name: "СкілЗТригером", description: undefined },
      skillTriggers: [
        { type: "simple", trigger: "onHit", modifiers: undefined },
      ],
    });
    render(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("СкілЗТригером")).toBeInTheDocument();
    expect(screen.getByText(/Тригери/)).toBeInTheDocument();
    expect(screen.getByText("При влучанні")).toBeInTheDocument();
  });

  it("рендерить бонуси, якщо вони є", () => {
    const skill = minimalGroupedSkill({
      bonuses: { strength: 2 },
    });
    render(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Бонуси:")).toBeInTheDocument();
  });
});

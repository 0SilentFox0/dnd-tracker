/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { SkillCard } from "@/components/skills/list/SkillCard";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { GroupedSkill } from "@/types/skills";

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

Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => {}, setPointerCapture: () => {}, scrollIntoView: () => {} });

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

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Вогняна куля")).toBeInTheDocument();
  });

  it("рендерить опис, якщо він є", () => {
    const skill = minimalGroupedSkill({
      basicInfo: { name: "Скіл", description: "Короткий опис скіла" },
    });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Короткий опис скіла")).toBeInTheDocument();
  });

  it("рендерить кнопку Редагувати з посиланням на сторінку скіла", () => {
    const skill = minimalGroupedSkill();

    renderWithConfirm(<SkillCard skill={skill} campaignId="camp-123" />);

    const links = screen.getAllByRole("link", { name: /редагувати/i });

    const link = links.find((el) => el.getAttribute("href") === "/campaigns/camp-123/dm/skills/skill-1");

    expect(link).toBeDefined();
    expect(link).toHaveAttribute("href", "/campaigns/camp-123/dm/skills/skill-1");
  });

  it("не рендерить блок опису, якщо опису немає", () => {
    const skill = minimalGroupedSkill({
      basicInfo: { name: "СкілБезОпису", description: "" },
    });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("СкілБезОпису")).toBeInTheDocument();
    expect(screen.queryByText("Опис скіла")).not.toBeInTheDocument();
  });

  it("показує опис умінь", () => {
    const skill = minimalGroupedSkill({ abilitySummary: ["Пасивно · шкода (ближня) +10%"] });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Пасивно · шкода (ближня) +10%")).toBeInTheDocument();
  });

  it("не показує старий перемикач «Впливає на шкоду»", () => {
    renderWithConfirm(<SkillCard skill={minimalGroupedSkill()} campaignId="c1" />);
    expect(screen.queryByText("Впливає на шкоду")).not.toBeInTheDocument();
  });

  const openDelete = async () => {
    fireEvent.pointerDown(screen.getByLabelText("Меню дій"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("menuitem", { name: /Видалити/ }));

    return screen.findByRole("dialog");
  };

  it("видаляє після підтвердження", async () => {
    const onRemove = vi.fn(async () => {});

    renderWithConfirm(<SkillCard skill={minimalGroupedSkill()} campaignId="c1" onRemove={onRemove} />);
    fireEvent.click(within(await openDelete()).getByRole("button", { name: "Видалити" }));

    await vi.waitFor(() => expect(onRemove).toHaveBeenCalledWith("skill-1"));
  });

  it("помилка видалення лишається в діалозі", async () => {
    const onRemove = vi.fn(async () => {
      throw new Error("Скіл використовується");
    });

    renderWithConfirm(<SkillCard skill={minimalGroupedSkill()} campaignId="c1" onRemove={onRemove} />);

    const dialog = await openDelete();

    fireEvent.click(within(dialog).getByRole("button", { name: "Видалити" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Скіл використовується");
  });
});

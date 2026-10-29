/**
 * @vitest-environment happy-dom
 */
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import { SkillCard } from "@/components/skills/list/SkillCard";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import type { Skill } from "@/types/skills";

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

function minimalSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: "skill-1",
    campaignId: "c1",
    name: "Тестовий скіл",
    description: "Опис",
    icon: null,
    spellId: null,
    spellGroupId: null,
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
    const skill = minimalSkill({ name: "Вогняна куля" });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Вогняна куля")).toBeInTheDocument();
  });

  it("рендерить опис, якщо він є", () => {
    const skill = minimalSkill({
      name: "Скіл", description: "Короткий опис скіла",
    });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("Короткий опис скіла")).toBeInTheDocument();
  });

  it("рендерить кнопку Редагувати з посиланням на сторінку скіла", () => {
    const skill = minimalSkill();

    renderWithConfirm(<SkillCard skill={skill} campaignId="camp-123" />);

    const links = screen.getAllByRole("link", { name: "common.actions.edit" });

    const link = links.find((el) => el.getAttribute("href") === "/campaigns/camp-123/dm/skills/skill-1");

    expect(link).toBeDefined();
    expect(link).toHaveAttribute("href", "/campaigns/camp-123/dm/skills/skill-1");
  });

  it("не рендерить блок опису, якщо опису немає", () => {
    const skill = minimalSkill({
      name: "СкілБезОпису", description: "",
    });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText("СкілБезОпису")).toBeInTheDocument();
    expect(screen.queryByText("Опис скіла")).not.toBeInTheDocument();
  });

  it("показує опис умінь", () => {
    const skill = minimalSkill({ abilitySummary: [{ when: [{ key: "summary.text", params: { value: "шкода +10%" } }], if: [], then: [], limits: [] }] });

    renderWithConfirm(<SkillCard skill={skill} campaignId="c1" />);
    expect(screen.getByText('abilityRegistry.summary.text {"value":"шкода +10%"}')).toBeInTheDocument();
  });

  it("не показує старий перемикач «Впливає на шкоду»", () => {
    renderWithConfirm(<SkillCard skill={minimalSkill()} campaignId="c1" />);
    expect(screen.queryByText("Впливає на шкоду")).not.toBeInTheDocument();
  });

  const openDelete = async () => {
    fireEvent.pointerDown(screen.getByLabelText("skills.card.menu"), { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "common.actions.delete" }));

    return screen.findByRole("alertdialog");
  };

  it("видаляє після підтвердження", async () => {
    const onRemove = vi.fn(async () => {});

    renderWithConfirm(<SkillCard skill={minimalSkill()} campaignId="c1" actions={{ onDelete: onRemove }} />);
    fireEvent.click(within(await openDelete()).getByRole("button", { name: "common.actions.delete" }));

    await vi.waitFor(() => expect(onRemove).toHaveBeenCalledWith("skill-1"));
  });

  it("помилка видалення лишається в діалозі", async () => {
    const onRemove = vi.fn(async () => {
      throw new Error("Скіл використовується");
    });

    renderWithConfirm(<SkillCard skill={minimalSkill()} campaignId="c1" actions={{ onDelete: onRemove }} />);

    const dialog = await openDelete();

    fireEvent.click(within(dialog).getByRole("button", { name: "common.actions.delete" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Скіл використовується");
  });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SkillTreeEditor } from "@/components/skill-tree/editor";
import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";
import { buildTreeJson, normalizeTree } from "@/lib/utils/skills/progression";

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

const actions = { setCell: vi.fn(), addBranch: vi.fn(), createBranch: vi.fn(), removeBranch: vi.fn(), moveBranch: vi.fn(), save: vi.fn(), cancel: vi.fn() };

const raw = buildTreeJson({ id: "row", race: "Ельф", branches: [{ id: "attack", name: "Напад", color: "red", outer: ["o1"] }] });

let errors: Array<{ code: string; ref: string }> = [];

vi.mock("@/lib/hooks/skills", () => ({
  useSkillTreeEditor: () => ({
    races: [{ id: "r", name: "Ельф" }],
    race: "Ельф",
    setRace: vi.fn(),
    raw,
    tree: normalizeTree({ id: "row", skills: raw }),
    errors,
    dirty: true,
    saving: false,
    locations: new Map([["o1", [{ kind: "slot", branchId: "attack", circle: "outer", index: 0 }]]]),
    librarySkills: [{ id: "o1", name: "Кровопуск", icon: null, mainSkillId: "attack", summary: [] }, { id: "o2", name: "Шквал", icon: null, mainSkillId: "attack", summary: ["1/бій"] }, { id: "x", name: "Чужий", icon: null, mainSkillId: "defense", summary: [] }],
    availableBranches: [{ id: "defense", name: "Захист", color: "blue", icon: null }],
    actions,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  errors = [];
});

describe("SkillTreeEditor", () => {
  it("клітинка → пікер скілів гілки; вже використаний недоступний; «Поставити»", () => {
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "Напад · Зовнішнє 2" }));

    const picker = screen.getByRole("dialog");

    expect(within(picker).queryByText("Чужий")).toBeNull();
    expect(within(picker).getByRole("option", { name: /Кровопуск/ }).getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(within(picker).getByRole("option", { name: /Шквал/ }));
    fireEvent.click(within(picker).getByRole("button", { name: "Поставити" }));

    expect(actions.setCell).toHaveBeenCalledWith({ kind: "slot", branchId: "attack", circle: "outer", index: 1 }, "o2");
  });

  it("«+ Додати гілку» → вибір існуючої", () => {
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);
    fireEvent.click(screen.getByRole("button", { name: "+ Додати гілку" }));
    fireEvent.click(screen.getByRole("button", { name: "Захист" }));

    expect(actions.addBranch).toHaveBeenCalledWith("defense");
  });

  it("помилки валідації блокують «Зберегти»", () => {
    errors = [{ code: "duplicateSkill", ref: "o1" }];
    renderWithConfirm(<SkillTreeEditor campaignId="c" />);

    expect((screen.getByRole("button", { name: "Зберегти" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Цей скіл уже стоїть в іншому місці дерева/)).toBeTruthy();
  });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderSkillTree } from "./render-intl";

import { ProgressionPanel } from "@/components/skill-tree/progression";
import { buildTreeJson, normalizeTree, progressionView, rankOffers, resolveLearned } from "@/lib/utils/skills/progression";

vi.unmock("next-intl");
vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "", HUD_SURFACE: "hud-surface" }));

const learn = vi.fn(async () => true);

const unlearn = vi.fn(async () => true);

const RAW = buildTreeJson({
  id: "t",
  race: "Ельф",
  branches: [
    { id: "attack", name: "Напад", color: "red", levels: { basic: "atk-b" }, outer: ["o1", "o2"], middle: ["m1"], inner: ["i1"] },
    { id: "defense", name: "Захист", color: "blue", outer: ["d1"] },
  ],
});

let unlocked = ["attack_basic_level", "o1"];

const dto = () => ({
  treeId: "t",
  tree: RAW,
  race: "Ельф",
  level: 4,
  seenLevel: 4,
  isOwner: true,
  isDM: false,
  unlocked,
  skills: Object.fromEntries(["atk-b", "o1", "o2", "m1", "i1", "d1"].map((id) => [id, { name: `Скіл ${id}`, icon: null, summary: [{ when: [{ key: "summary.text", params: { value: `опис ${id}` } }], if: [], then: [], limits: [] }], description: `повний ${id}`, spellGroupId: null, grantedSpellId: null, damageAffinity: { affectsDamage: false, damageType: null } }])),
  branches: { attack: { name: "Напад", color: "red", icon: null, spellGroupId: null }, defense: { name: "Захист", color: "blue", icon: null, spellGroupId: null } },
});

vi.mock("@/lib/hooks/skills", () => ({
  useCharacterProgression: () => {
    const data = dto();

    const tree = normalizeTree({ id: "t", skills: RAW });

    return { query: { isPending: false, isError: false, data }, data, tree, view: progressionView(tree, data.unlocked, data.level), offers: rankOffers(tree, data.unlocked, data.level), learned: resolveLearned(tree, { t: { unlockedSkills: data.unlocked } }) };
  },
  useProgressionActions: () => ({ learn, unlearn, reset: vi.fn(), pendingNodeId: null }),
}));

afterEach(cleanup);

beforeEach(() => {
  unlocked = ["attack_basic_level", "o1"];
  vi.clearAllMocks();
});

describe("ProgressionPanel", () => {
  it("очки, рядок гілки, пропозиції в порядку", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />);

    expect(screen.getByText(/2 вільні очки/)).toBeTruthy();
    expect(screen.getByRole("group", { name: "Напад · Основи" })).toBeTruthy();

    const offers = within(screen.getByRole("list", { name: "Вивчити" })).getAllByRole("listitem");

    expect(offers.map((li) => li.textContent)).toEqual([expect.stringContaining("Напад → Просунутий"), expect.stringContaining("Скіл m1"), expect.stringContaining("Захист → Основи")]);
  });

  it("тап по вивченому — шторка з описом без «Вивчити»", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Скіл o1" }));

    expect(screen.getByText("повний o1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Вивчити" })).toBeNull();
  });

  it("золотий «?» фільтрує пропозиції до слота; «Вивчити» викликає learn", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Вивчити: Скіл m1" }));

    expect(within(screen.getByRole("list", { name: "Вивчити" })).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(within(screen.getByRole("list", { name: "Вивчити" })).getByRole("button"));
    fireEvent.click(screen.getByRole("button", { name: "Вивчити" }));

    expect(learn).toHaveBeenCalledWith("m1");
  });

  it("закритий «?» — причина", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Закрито: Скіл o2" }));

    expect(screen.getByText(/Зовнішніх умінь у гілці не більше/)).toBeTruthy();
  });

  it("DM бачить «Розвчити»", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" canManage />);
    fireEvent.click(screen.getByRole("button", { name: "Скіл o1" }));

    expect(screen.getByRole("button", { name: "Розвчити" })).toBeTruthy();
  });

  it("вивчений скіл без іконки показує першу літеру, не «?»", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />);

    expect(screen.getByRole("button", { name: "Скіл o1" }).textContent).toBe("С");
  });

  it("тап по рамці гілки відкриває вивчений рівень гілки", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />);
    fireEvent.click(screen.getByRole("button", { name: "Рівень гілки: Напад · Основи" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(within(screen.getByRole("dialog")).getByText("Напад → Основи")).toBeTruthy();
  });

  it("«Застарілі вузли · Прибрати» — один виклик з усіма сиротами", async () => {
    unlocked = ["attack_basic_level", "o1", "gone-1", "gone-2"];
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" canManage />);

    fireEvent.click(screen.getByRole("button", { name: /Застарілі вузли: 2/ }));

    expect(unlearn).toHaveBeenCalledTimes(1);
    expect(unlearn).toHaveBeenCalledWith(["gone-1", "gone-2"]);
  });
});

describe("ProgressionPanel en", () => {
  it("renders English labels without raw keys", async () => {
    await renderSkillTree(<ProgressionPanel campaignId="c" characterId="ch" />, "en");

    expect(screen.getByText("Progression · level 4")).toBeTruthy();
    expect(screen.getByText(/2 free points/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Branch tier: Напад · Basics" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/skillTree\./);
  });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ScenarioPageView } from "@/components/scenario";
import type { ScenarioPlay } from "@/lib/hooks/scenario";
import type { ScenarioPage, ScenarioRow } from "@/types/scenario";

afterEach(cleanup);

const p = (text: string) => ({ type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text }] }] });

const page = (kind: ScenarioPage["kind"]): ScenarioPage => ({
  id: "p1", kind, arc: null, title: "Монастир Світла", subtitle: "Сцена перша", status: "ready", sortOrder: 0, characterId: null, version: 1, updatedAt: "",
  content: { legend: [{ kind: "read", label: "Читати вголос" }], sections: [{ id: "s10", title: "1.0 Собор", played: false, revealedAt: null, rows: [{ id: "r1", story: p("Дзвони"), notes: p("Шрам не пояснюй") }] }] },
});

describe("ScenarioPageView", () => {
  it("заголовок розділу з іконкою за типом і ручною іконкою", () => {
    const pg = page("scene");

    pg.content.sections.push({ id: "s11", title: "1.1 Бій", played: false, rows: [{ id: "r2", story: p("x"), notes: p(""), battleId: "b1" }] });
    pg.content.sections.push({ id: "s12", title: "1.2 Привал", played: false, icon: "rest", rows: [] });

    const { container } = render(<ScenarioPageView page={pg} campaignId="c" />);

    expect(container.querySelector("#sec-s10 [data-section-icon]")?.getAttribute("data-section-icon")).toBe("scene");
    expect(container.querySelector("#sec-s11 [data-section-icon]")?.getAttribute("data-section-icon")).toBe("battle");
    expect(container.querySelector("#sec-s12 [data-section-icon]")?.getAttribute("data-section-icon")).toBe("rest");
    expect(container.querySelector("#sec-s10 h2")?.textContent).toBe("1.0 Собор");
  });

  it("заголовок, легенда, розділ з якорем, story і notes", () => {
    const { container } = render(<ScenarioPageView page={page("scene")} campaignId="c" />);

    expect(screen.getByRole("heading", { level: 1, name: "Монастир Світла" })).toBeTruthy();
    expect(screen.getByText("Читати вголос")).toBeTruthy();
    expect(container.querySelector("section#sec-s10 h2")?.textContent).toContain("1.0 Собор");
    expect(container.querySelector(".row .story")?.textContent).toBe("Дзвони");
    expect(container.querySelector(".row aside.notes")?.textContent).toBe("Шрам не пояснюй");
  });

  it("кнопка «Зіграно» на сцені; «Відкрити гравцеві» на героєві", () => {
    const onPlayed = vi.fn();

    const onRevealed = vi.fn();

    const { rerender } = render(<ScenarioPageView page={page("scene")} campaignId="c" progress={{ onPlayed, onRevealed, pending: false }} />);

    fireEvent.click(screen.getByRole("button", { name: /Зіграно/ }));
    expect(onPlayed).toHaveBeenCalledWith("s10", true);

    rerender(<ScenarioPageView page={page("hero")} campaignId="c" progress={{ onPlayed, onRevealed, pending: false }} />);
    fireEvent.click(screen.getByRole("button", { name: /Відкрити гравцеві/ }));
    expect(onRevealed).toHaveBeenCalledWith("s10", true);
  });

  it("глава, відкрита зіграним розділом, показує «Відкрито (після розділу)»", () => {
    const hero = page("hero");

    hero.content.sections[0].reveal = { mode: "afterSection", pageId: "sc1", sectionId: "x1" };

    const onRevealed = vi.fn();

    render(<ScenarioPageView page={hero} campaignId="c" progress={{ onPlayed: vi.fn(), onRevealed, pending: false, played: (p, s) => p === "sc1" && s === "x1" }} />);

    fireEvent.click(screen.getByRole("button", { name: "✓ Відкрито (після розділу)" }));
    expect(onRevealed).toHaveBeenCalledWith("s10", true);
  });
});

describe("ScenarioPageView — режим гри", () => {
  const mention = { type: "doc" as const, content: [{ type: "paragraph" as const, content: [{ type: "mention" as const, attrs: { type: "unit", id: "u1", label: "Вовк" } }] }] };

  const pageWith = (rows: ScenarioRow[]): ScenarioPage => ({ ...page("scene"), content: { legend: [], sections: [{ id: "s1", title: "Розділ", played: false, rows }] } });

  const play = (over: Partial<ScenarioPlay> = {}): ScenarioPlay => ({
    lookup: {
      decks: new Map([["d1", [{ id: "slide-a", imageUrl: "https://x/a.webp" }]]]),
      battles: new Map([["b1", { id: "b1", name: "Засідка", status: "prepared" }], ["b3", { id: "b3", name: "Старий", status: "completed" }]]),
      show: null,
    },
    showSlide: vi.fn(),
    runBattle: vi.fn(),
    pending: false,
    control: { send: vi.fn(), pending: false },
    ...over,
  } as ScenarioPlay);

  it("клік по рядку зі слайдом — showSlide; по згадці — ні", () => {
    const pl = play();

    const row = { id: "r1", story: mention, notes: p(""), slide: { deckId: "d1", slideId: "slide-a" } };

    render(<ScenarioPageView page={pageWith([row])} campaignId="c" play={pl} />);

    fireEvent.click(screen.getByText("Вовк"));
    expect(pl.showSlide).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Показати слайд" }));
    expect(pl.showSlide).toHaveBeenCalledWith(row);
  });

  it("подвійний клік по тілу рядка — showSlide; одинарний і по кнопці — ні", () => {
    const pl = play();

    const row = { id: "r1", story: p("Дзвони б'ють"), notes: p(""), slide: { deckId: "d1", slideId: "slide-a" } };

    render(<ScenarioPageView page={pageWith([row])} campaignId="c" play={pl} />);

    fireEvent.click(screen.getByText("Дзвони б'ють"));
    expect(pl.showSlide).not.toHaveBeenCalled();

    fireEvent.doubleClick(screen.getByText("Дзвони б'ють"));
    expect(pl.showSlide).toHaveBeenCalledWith(row);

    fireEvent.doubleClick(screen.getByRole("button", { name: "Показати слайд" }));
    expect(pl.showSlide).toHaveBeenCalledTimes(1);
  });

  it("прив'язки стоять перед текстом рядка: мініатюра і назва слайда, статус бою", () => {
    const pl = play();

    const { container } = render(
      <ScenarioPageView page={pageWith([{ id: "r1", story: p("Текст рядка"), notes: p(""), slide: { deckId: "d1", slideId: "slide-a" }, battleId: "b1" }])} campaignId="c" play={pl} />,
    );

    const story = container.querySelector(".story");

    expect(story?.firstElementChild?.classList.contains("sb-play")).toBe(true);
    expect(screen.getByText("Слайд")).toBeTruthy();
    expect(screen.getByText(/підготовлений/)).toBeTruthy();
  });

  it("слайд на екрані — «На екрані» замість кнопки; під заглушкою — знову кнопка", () => {
    const base = play();

    const shown = { deckId: "d1", deckTitle: "Ліс", slide: { id: "slide-a", imageUrl: "https://x/a.webp" }, nextImageUrl: null, audio: null, seq: 1 };

    const row = { id: "r1", story: p("Текст"), notes: p(""), slide: { deckId: "d1", slideId: "slide-a" } };

    const { unmount } = render(<ScenarioPageView page={pageWith([row])} campaignId="c" play={play({ lookup: { ...base.lookup, show: shown } } as never)} />);

    expect(screen.getByText("● На екрані")).toBeTruthy();
    unmount();

    render(<ScenarioPageView page={pageWith([row])} campaignId="c" play={play({ lookup: { ...base.lookup, show: { ...shown, curtain: true } } } as never)} />);
    expect(screen.getByRole("button", { name: "Показати слайд" })).toBeTruthy();
  });

  it("активний рядок має is-current", () => {
    const base = play();

    const pl = play({ lookup: { ...base.lookup, show: { deckId: "d1", deckTitle: "Ліс", slide: { id: "slide-a", imageUrl: "https://x/a.webp" }, nextImageUrl: null, audio: null, seq: 1 } } as never });

    const { container } = render(<ScenarioPageView page={pageWith([{ id: "r1", story: p("Текст"), notes: p(""), slide: { deckId: "d1", slideId: "slide-a" } }])} campaignId="c" play={pl} />);

    expect(container.querySelector(".row.is-current")).toBeTruthy();
  });

  it("кнопки бою за статусом; завершений — неактивна", () => {
    const pl = play();

    render(<ScenarioPageView page={pageWith([{ id: "r1", story: p("А"), notes: p(""), battleId: "b1" }, { id: "r2", story: p("Б"), notes: p(""), battleId: "b3" }])} campaignId="c" play={pl} />);

    fireEvent.click(screen.getByRole("button", { name: "Почати бій" }));
    expect(pl.runBattle).toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Бій завершено" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("висяче посилання — «недоступно», без кнопки", () => {
    const base = play();

    render(<ScenarioPageView page={pageWith([{ id: "r1", story: p("А"), notes: p(""), slide: { deckId: "gone", slideId: "x" } }])} campaignId="c" play={play({ lookup: { ...base.lookup, decks: new Map([["gone", null]]) } })} />);

    expect(screen.getByText("Слайд недоступний")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Показати слайд" })).toBeNull();
  });
});

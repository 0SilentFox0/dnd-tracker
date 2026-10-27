// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PlayerHeroCard } from "@/components/campaigns/dashboard/PlayerHeroCard";
import { CharacterStatus } from "@/lib/constants/characters";
import type { DashboardHero, PlayerDashboardData } from "@/types/campaigns";

afterEach(cleanup);

const hero: DashboardHero = { id: "h1", name: "Зехір", level: 3, race: "Ельф", class: "Маг", avatar: null, armorClass: 14, speed: 30, status: CharacterStatus.ACTIVE, reviewNote: null, seenLevel: 3 };

const data = (over: Partial<DashboardHero> = {}, activeBattle: PlayerDashboardData["activeBattle"] = null): PlayerDashboardData => ({ hero: { ...hero, ...over }, activeBattle });

describe("PlayerHeroCard", () => {
  it("offers creation when there is no hero", () => {
    render(<PlayerHeroCard campaignId="c1" data={{ hero: null, activeBattle: null }} />);

    expect(screen.getByRole("link", { name: "Створити персонажа" }).getAttribute("href")).toBe("/campaigns/c1/character");
  });

  it("shows hero stats and the initial fallback without avatar", () => {
    render(<PlayerHeroCard campaignId="c1" data={data()} />);

    expect(screen.getByText("З")).toBeTruthy();
    expect(screen.getByText("Ельф · Маг")).toBeTruthy();
    expect(screen.getByText("Рівень 3 · КБ 14 · Швидкість 30")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Відкрити героя" }).getAttribute("href")).toBe("/campaigns/c1/character");
    expect(screen.queryByText("До бою")).toBeNull();
  });

  it("empty avatar string falls back to the initial", () => {
    render(<PlayerHeroCard campaignId="c1" data={data({ avatar: "" })} />);

    expect(screen.getByText("З")).toBeTruthy();
  });

  it("pending without note is awaiting approval", () => {
    render(<PlayerHeroCard campaignId="c1" data={data({ status: CharacterStatus.PENDING })} />);

    expect(screen.getByText("На схваленні")).toBeTruthy();
    expect(screen.queryByText("Повернуто ДМ")).toBeNull();
  });

  it("pending with note is returned by the DM with the note", () => {
    render(<PlayerHeroCard campaignId="c1" data={data({ status: CharacterStatus.PENDING, reviewNote: "Додай біографію" })} />);

    expect(screen.getByText("Повернуто ДМ")).toBeTruthy();
    expect(screen.getByText("Додай біографію")).toBeTruthy();
    expect(screen.queryByText("На схваленні")).toBeNull();
  });

  it("flags a new level", () => {
    render(<PlayerHeroCard campaignId="c1" data={data({ seenLevel: 2, level: 3 })} />);

    expect(screen.getByText("Новий рівень")).toBeTruthy();
  });

  it("shows HP and battle link when in an active battle", () => {
    render(<PlayerHeroCard campaignId="c1" data={data({}, { battleId: "b1", hp: { current: 23, max: 40, temp: 5 } })} />);

    expect(screen.getByText(/23\/40/)).toBeTruthy();
    expect(screen.getByText(/\+5/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "До бою" }).getAttribute("href")).toBe("/campaigns/c1/battles/b1");
  });
});

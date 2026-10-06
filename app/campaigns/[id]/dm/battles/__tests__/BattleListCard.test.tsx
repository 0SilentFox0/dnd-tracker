// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BattleListCard } from "@/app/campaigns/[id]/dm/battles/BattleListCard";

afterEach(cleanup);

const battle = { id: "b1", name: "Засідка", description: "На тракті", currentRound: 3, participants: [{ id: "p1" }, { id: "p2" }] };

const hrefOf = (name: string) => screen.getByRole("link", { name }).getAttribute("href");

describe("BattleListCard", () => {
  it("active: раунд, золоте світіння й перехід до бою", () => {
    const { container } = render(<BattleListCard battle={battle} campaignId="c1" kind="active" />);

    expect((container.firstElementChild as HTMLElement).dataset.tone).toBe("active");
    expect(screen.getByText("Активний")).toBeTruthy();
    expect(screen.getByText("Раунд:")).toBeTruthy();
    expect(screen.getByText("На тракті")).toBeTruthy();
    expect(hrefOf("Перейти до бою")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("prepared: учасники, редагування й запуск", () => {
    render(<BattleListCard battle={battle} campaignId="c1" kind="prepared" />);

    expect(screen.getByText("Підготовлено")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("Раунд:")).toBeNull();
    expect(hrefOf("Редагувати")).toBe("/campaigns/c1/dm/battles/b1");
    expect(hrefOf("Запустити")).toBe("/campaigns/c1/battles/b1");
  });

  it("completed: приглушена картка лише з переглядом", () => {
    const { container } = render(<BattleListCard battle={battle} campaignId="c1" kind="completed" />);

    expect((container.firstElementChild as HTMLElement).dataset.tone).toBe("muted");
    expect(screen.getByText("Завершено")).toBeTruthy();
    expect(hrefOf("Переглянути")).toBe("/campaigns/c1/dm/battles/b1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

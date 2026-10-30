// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleListCard } from "@/components/battle/list/BattleListCard";

const onDelete = vi.fn();

vi.mock("@/lib/hooks/battles", () => ({ useDeleteBattleCard: () => ({ isDeleting: false, onDelete }) }));

afterEach(cleanup);

const battle = { id: "b1", name: "Засідка", description: "На тракті", currentRound: 3, participants: [{ id: "p1" }, { id: "p2" }] };

const hrefOf = (name: string) => screen.getByRole("link", { name }).getAttribute("href");

describe("BattleListCard", () => {
  it("active: раунд, золоте світіння й перехід до бою", () => {
    const { container } = render(<BattleListCard battle={battle} campaignId="c1" kind="active" />);

    expect((container.firstElementChild as HTMLElement).dataset.tone).toBe("active");
    expect(screen.getByText("battleSetup.list.status.active")).toBeTruthy();
    expect(screen.getByText("battleSetup.list.card.round")).toBeTruthy();
    expect(screen.getByText("На тракті")).toBeTruthy();
    expect(hrefOf("battleSetup.list.card.play")).toBe("/campaigns/c1/battles/b1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("кнопка видалення викликає onDelete", () => {
    render(<BattleListCard battle={battle} campaignId="c1" kind="completed" />);

    fireEvent.click(screen.getByRole("button", { name: "battleSetup.list.card.delete" }));

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("prepared: учасники, редагування й запуск", () => {
    render(<BattleListCard battle={battle} campaignId="c1" kind="prepared" />);

    expect(screen.getByText("battleSetup.list.status.prepared")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.queryByText("battleSetup.list.card.round")).toBeNull();
    expect(hrefOf("battleSetup.list.card.edit")).toBe("/campaigns/c1/dm/battles/b1");
    expect(hrefOf("battleSetup.list.card.start")).toBe("/campaigns/c1/battles/b1");
  });

  it("completed: приглушена картка лише з переглядом", () => {
    const { container } = render(<BattleListCard battle={battle} campaignId="c1" kind="completed" />);

    expect((container.firstElementChild as HTMLElement).dataset.tone).toBe("muted");
    expect(screen.getByText("battleSetup.list.status.completed")).toBeTruthy();
    expect(hrefOf("battleSetup.list.card.view")).toBe("/campaigns/c1/dm/battles/b1");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

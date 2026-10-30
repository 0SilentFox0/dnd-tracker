// @vitest-environment happy-dom
import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JoinBattleButton } from "@/components/campaigns/JoinBattleButton";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";

vi.mock("@/lib/hooks/campaigns", () => ({ useJoinBattle: () => ({ href: "/campaigns/c1/battles/b1" }) }));

vi.unmock("next-intl");

afterEach(cleanup);

describe("JoinBattleButton", () => {
  it("renders the uk label and aria text", async () => {
    await renderWithIntl(<JoinBattleButton />);

    expect(screen.getByText("ДО БОЮ")).toBeTruthy();
    expect(screen.getByText("Приєднатися до бою")).toBeTruthy();
  });

  it("renders the en label and aria text", async () => {
    await renderWithIntl(<JoinBattleButton />, { locale: "en" });

    expect(screen.getByText("JOIN BATTLE")).toBeTruthy();
    expect(screen.getByText("Join the battle")).toBeTruthy();
  });
});

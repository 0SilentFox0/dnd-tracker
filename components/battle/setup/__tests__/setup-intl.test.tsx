// @vitest-environment happy-dom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleListCard } from "@/components/battle/list/BattleListCard";
import { BalanceSummary } from "@/components/battle/setup/BalanceSummary";
import { XpBalanceSummary } from "@/components/battle/setup/XpBalanceSummary";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { textOf } from "@/lib/i18n/test/text";
import { textRef } from "@/lib/i18n/text-ref";
import type { FairScaling, PartyPower } from "@/lib/utils/battle/balance";
import { computeXpBudget } from "@/lib/utils/battle/balance/xp-budget";

vi.unmock("next-intl");

afterEach(cleanup);

const NAMESPACES = ["common", "validation", "battleSetup", "battleTerms", "gameTerms"] as const;

const party = { dpr: 14, hp: 60 } as PartyPower;

const scaling = { verdict: "weak", base: { dpr: 5, hp: 20 }, reached: { dpr: 6, hp: 30 }, fixed: { dpr: 0, hp: 0 }, hpScale: 1.5, dmgScale: 1.25, hint: { kind: "weak", changes: [{ name: "Orc", delta: 2 }] } } as unknown as FairScaling;

const battle = { id: "b1", name: "Ambush", description: null, currentRound: 3, participants: [{ id: "p1" }] };

describe("battle setup and list on real catalogs", () => {
  it.each([
    ["en", "Battle balance", "Too weak: add Orc ×2", "Round:", "Active"],
    ["uk", "Баланс бою", "Слабко: додайте Orc ×2", "Раунд:", "Активний"],
  ] as const)("%s: balance summary and list card without raw keys", async (locale, title, hint, round, status) => {
    const { container } = await renderWithIntl(
      <>
        <BalanceSummary fair={{ party, scaling }} />
        <BattleListCard battle={battle} campaignId="c1" kind="active" />
      </>,
      { locale, namespaces: NAMESPACES },
    );

    expect(container.textContent).toContain(title);
    expect(container.textContent).toContain(hint);
    expect(container.textContent).toContain(round);
    expect(container.textContent).toContain(status);
    expect(container.textContent).not.toMatch(/battleSetup\.|battleTerms\./);
  });

  it.each([
    ["en", "Difficulty: Hard", "Enemy XP 900 × 1.5 = 1350"],
    ["uk", "Складність: Складна", "XP ворогів 900 × 1.5 = 1350"],
  ] as const)("%s: XP summary", async (locale, difficulty, xpLine) => {
    const xp = computeXpBudget({ edition: "2014", heroLevels: [3, 3, 3, 3], enemies: [{ unitId: "ogre", quantity: 2, xp: 450 }] });

    const { container } = await renderWithIntl(<XpBalanceSummary xp={xp} units={[]} />, { locale, namespaces: NAMESPACES });

    expect(container.textContent).toContain(difficulty);
    expect(container.textContent).toContain(xpLine);
  });

  it.each([
    ["en", "Melee 10, ranged 4 → physical DPR = 10"],
    ["uk", "Ближній бій 10, дальній 4 → фізичний DPR = 10"],
  ] as const)("%s: DPR breakdown line", (locale, line) => {
    expect(textOf(textRef("battleSetup.dprBreakdown.physical", { melee: "10", ranged: "4", physical: "10" }), locale)).toBe(line);
  });
});

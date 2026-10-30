// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LogEntryCard } from "@/components/battle/log/LogEntryCard";
import { BattleTopBar } from "@/components/battle/scene/BattleTopBar";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import { BATTLE_NAMESPACES,CAMPAIGN_NAMESPACES } from "@/lib/i18n/scopes";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { textRef } from "@/lib/i18n/text-ref";
import type { BattleAction } from "@/types/battle";

vi.unmock("next-intl");

vi.mock("@/components/hud/fonts", () => ({ hudFontClassName: "" }));

afterEach(cleanup);

const NAMESPACES = [...CAMPAIGN_NAMESPACES, ...BATTLE_NAMESPACES];

const structured = {
  actionIndex: 1,
  actionType: "attack",
  actorName: "Арвен",
  actorSide: "ally",
  targets: [],
  hpChanges: [],
  resultText: "",
  log: [textRef("battleLog.attack.miss", { attacker: "Арвен", target: "Гоблін" })],
} as unknown as BattleAction;

const legacy = { ...structured, resultText: "Арвен → Гоблін: промах | Деталь", log: undefined } as unknown as BattleAction;

const renderCard = (entry: BattleAction, locale: "uk" | "en") => renderWithIntl(<LogEntryCard entry={entry} actor={undefined} open={false} onToggle={() => undefined} />, { locale, namespaces: NAMESPACES });

describe("LogEntryCard", () => {
  it("en: structured entry in the viewer's language, no raw keys", async () => {
    const { container } = await renderCard(structured, "en");

    expect(container.textContent).toContain("Арвен → Гоблін: miss");
    expect(container.textContent).toContain("triggers");
    expect(container.textContent).not.toMatch(/battle(Log|Common|)\./);
  });

  it("uk: same entry, word for word", async () => {
    const { container } = await renderCard(structured, "uk");

    expect(container.textContent).toContain("Арвен → Гоблін: промах");
    expect(container.textContent).toContain("тригери");
  });

  it("legacy entry is shown as stored", async () => {
    const { container } = await renderCard(legacy, "en");

    expect(container.textContent).toContain("Арвен → Гоблін: промах");
    expect(container.textContent).toContain("Деталь");
  });
});

describe("BattleTopBar", () => {
  it.each([["en", "Round"], ["uk", "Раунд"]] as const)("%s: translated, no raw keys", async (locale, round) => {
    const { container } = render(<BattleTopBar />, { wrapper: fakeScene({ locale }).wrapper });

    expect(container.textContent).toContain(round);
    expect(container.textContent).not.toMatch(/battle\./);
  });

  it.each([["system", "System", "Система"], ["dm", "DM", "ДМ"]])("service actor %s is named by actorId, with an empty or legacy stored name", async (actorId, en, legacyName) => {
    for (const actorName of ["", legacyName]) {
      const { container } = await renderCard({ ...structured, actorId, actorName } as BattleAction, "en");

      expect(container.textContent).toContain(en);
      expect(container.textContent).not.toContain(legacyName);

      cleanup();
    }
  });
});

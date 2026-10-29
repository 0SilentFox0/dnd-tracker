// @vitest-environment happy-dom
import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbilitySummary } from "@/components/abilities/AbilitySummary";
import { LogEntryDetails } from "@/components/battle/log/LogEntryDetails";
import { renderWithIntl } from "@/lib/i18n/test/render-with-intl";
import { textRef } from "@/lib/i18n/text-ref";
import type { BattleAction } from "@/types/battle";

vi.unmock("next-intl");

afterEach(cleanup);

const NAMESPACES = ["common", "validation", "battleCommon", "battleTerms"] as const;

const action = {
  actionType: "attack",
  actorName: "Арвен",
  targets: [{ participantId: "t", participantName: "Гоблін" }],
  actionDetails: {
    isHit: true,
    criticalEffect: { id: 1, type: "success", source: "attack", flavorIndex: 1 },
    damageRows: [{ label: textRef("battleCommon.actors.system"), value: "+2", tone: "step" }],
  },
  hpChanges: [],
  resultText: "",
  log: [textRef("battleCommon.actors.dm"), "Гоблін"],
} as unknown as BattleAction;

describe("LogEntryDetails: структурований лог", () => {
  it("en: текст з battleTerms і battleCommon, без сирих ключів", async () => {
    const { container } = await renderWithIntl(<LogEntryDetails action={action} />, { locale: "en", namespaces: NAMESPACES });

    expect(container.textContent).toContain("System");
    expect(container.textContent).toContain("DM | Гоблін");
    expect(container.textContent).not.toMatch(/battleTerms\.|battleCommon\./);
  });

  it("uk: ті самі рядки українською", async () => {
    const { container } = await renderWithIntl(<LogEntryDetails action={action} />, { locale: "uk", namespaces: NAMESPACES });

    expect(container.textContent).toContain("Подвійний урон — Урон подвоюється (x2)");
    expect(container.textContent).toContain("Система");
    expect(container.textContent).not.toMatch(/battleTerms\.|battleCommon\./);
  });
});

describe("AbilitySummary: рядки-ref", () => {
  it("рендерить TextRef і звичайні рядки", async () => {
    const { container } = await renderWithIntl(<AbilitySummary lines={[textRef("battleCommon.actors.system"), "legacy"]} />, { locale: "en", namespaces: NAMESPACES });

    expect(container.textContent).toBe("Systemlegacy");
  });
});

// @vitest-environment happy-dom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LogEntryDetails } from "@/components/battle/log/LogEntryDetails";
import type { BattleAction } from "@/types/battle";

afterEach(cleanup);

const action = {
  actionType: "attack",
  actorName: "Айвен",
  targets: [],
  actionDetails: {
    attackKind: "ranged",
    weaponName: "Звичайний постріл",
    isHit: true,
    damageBreakdown: "Сума кубиків: 7; + бонус 2 (Спритність); = 9 (база); Бонус зі скілів: +15% (Відплата); ──────────; Сума 10.3 = 10 шкоди",
  },
  hpChanges: [{ participantName: "Цербер #1", change: 10 }],
  resultText: "",
} as unknown as BattleAction;

describe("LogEntryDetails", () => {
  it("урон — таблицею: крок і значення окремо, джерело бонусу, розділювач", () => {
    const { container } = render(<LogEntryDetails action={action} />);

    const table = container.querySelector("dl[aria-label='Розклад шкоди']");

    const rows = [...(table?.querySelectorAll("dt") ?? [])].map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);

    expect(rows).toEqual([
      ["Кубики", "7"],
      ["Спритність", "+2"],
      ["База", "9"],
      ["Відплата· Бонус зі скілів", "+15%"],
      ["Сума", "10"],
    ]);
    expect(table?.querySelectorAll("[role=separator]")).toHaveLength(1);
  });

  it("інші рядки — «мітка: значення»", () => {
    const { container } = render(<LogEntryDetails action={action} />);

    expect(container.textContent).toContain("Зброя: Звичайний постріл");
    expect(container.textContent).toContain("Цербер #1: -10 HP");
  });
});

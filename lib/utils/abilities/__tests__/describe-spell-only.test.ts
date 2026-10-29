import { describe, expect, it } from "vitest";

import { enT, ukT } from "./describe-fixtures";

import { describeEffect } from "@/lib/utils/abilities/registry/effects";
import { renderSegments } from "@/lib/utils/abilities/segments";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

const duration = { rounds: 10 };

const TRIGGER = { save: { ability: "charisma" as const }, effects: [{ kind: "applyCondition" as const, condition: "prone" as const, duration: { rounds: 1 } }] };

const CAST = { targeting: { kind: "enemy" as const, range: 30 }, resolution: { kind: "attack" as const }, dice: 2, effects: [{ kind: "dealDamage" as const, amount: "1d6" }] };

const CASES: [SpellEffect, string][] = [
  [{ kind: "inputDice", label: "Висота", max: 20 }, "кубики з введення (до 20): Висота"],
  [{ kind: "grantCast", label: "Укус", cost: "reaction", uses: 2, duration, cast: CAST }, "підкаст «Укус» (реакція, ×2) на 10 р."],
  [{ kind: "grantCast", label: "Удар", cost: "bonusAction", duration, cast: CAST }, "підкаст «Удар» (бонусна дія) на 10 р."],
  [{ kind: "hitRider", attackKind: "melee", extraDice: "1d6", damageType: "force", charges: 3, consumeOnMiss: true, duration, save: { ability: "strength", onFail: [{ kind: "push", feet: 10, from: "caster" }] } }, "заряди ×3: +1d6 force на ближню атаку (і промах), СК strength: відштовхнути на 10 фт від кастера"],
  [{ kind: "hitRider", attackKind: "any", extraDice: "1d4", damageType: "fire", charges: 1, duration }, "заряди ×1: +1d4 fire на будь-яку атаку"],
  [{ kind: "anchoredZone", radiusFeet: 20, side: "enemies", excludeBearer: true, endsWhenStartOutside: true, duration, onEnter: TRIGGER, onTurnStart: { effects: [{ kind: "heal", amount: 2 }] } }, "аура 20 фт на цілі (вороги, крім носія) на 10 р.; вхід: повалений × 1 р.; початок ходу: лікування 2; закінчується, якщо хід починається поза аурою"],
  [{ kind: "summonInline", name: "Вартовий", size: "medium", ac: "spellDc", hp: null, count: 2, upcastEvery: 2, aura: { radiusFeet: 10, side: "enemies", onTurnStart: { attack: "spell", effects: [] } }, duration }, "викликає 2× «Вартовий» (предмет, КЗ = СК) на 10 р.; +1 за кожні 2 кола слота; аура 10 фт (атака заклинанням)"],
  [{ kind: "summonInline", name: "Дух", size: "small", ac: 14, hp: 12, count: 1, duration }, "викликає 1× «Дух» (12 HP, КЗ 14) на 10 р."],
  [{ kind: "transform", unitId: "u1", revertAtZero: true, duration }, "перетворює ціль на форму юніта на 10 р.; на 0 HP форми — відкат, надлишок шкоди переходить на звичайну форму"],
  [{ kind: "moveSelf", to: "adjacentToTarget" }, "кастер переміщується до цілі"],
  [{ kind: "createTerrain", terrain: "wall", shape: "line", cells: 4, rounds: 10 }, "стіна: лінія до цілі (до 4) на 10 р."],
  [{ kind: "createTerrain", terrain: "difficult", shape: "cell", cells: 6, rounds: 3 }, "складна місцевість: клітинки області (до 6) на 3 р."],
  [{ kind: "chooseOne", options: [{ kind: "heal", amount: 5 }, { kind: "heal", amount: 7, revive: true }] }, "на вибір: лікування 5 / воскресіння 7"],
];

describe("describeEffect for spell-only kinds", () => {
  it.each(CASES.map(([e, text]) => [e.kind, e, text] as const))("uk %s", async (_k, effect, text) => {
    const t = await ukT();

    expect(renderSegments(t, describeEffect(effect)).join(" · ")).toBe(text);
  });

  it("en has no cyrillic or raw ICU", async () => {
    const t = await enT();

    for (const [e] of CASES.filter(([x]) => x.kind !== "inputDice" && x.kind !== "grantCast" && x.kind !== "summonInline")) {
      const text = renderSegments(t, describeEffect(e)).join(" · ");

      expect(text, e.kind).not.toMatch(/[А-Яа-яІіЇїЄєҐґ]/);
      expect(text, e.kind).not.toMatch(/[{}]/);
    }
  });
});

import { describe, expect, it } from "vitest";

import { PERSONAL } from "@/data/library/personal";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { bakePassives } from "@/lib/utils/abilities/build/bake";

const zehir = (level: number) => {
  const abilities = (PERSONAL.find((p) => p.key === "personal-zehir")?.abilities ?? []).map((a) => resolved(a));

  const p = makeParticipant({ id: "zehir", level, abilities });

  return bakePassives({ ...p, spellcasting: { ...p.spellcasting, spellSlots: { "1": { max: 4, current: 4 }, "2": { max: 3, current: 3 } } } });
};

describe("Зехір: магічний запас", () => {
  it("до 4 рівня слотів 3–4 кола немає", () => {
    const slots = zehir(3).spellcasting.spellSlots;

    expect(slots["3"]?.max ?? 0).toBe(0);
    expect(slots["4"]?.max ?? 0).toBe(0);
  });

  it("з 4 рівня: +2 слоти 3 кола і +1 слот 4 кола", () => {
    const slots = zehir(4).spellcasting.spellSlots;

    expect(slots["3"]).toEqual({ max: 2, current: 2 });
    expect(slots["4"]).toEqual({ max: 1, current: 1 });
  });
});

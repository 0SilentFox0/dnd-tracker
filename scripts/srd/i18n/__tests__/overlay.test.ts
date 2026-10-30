import { describe, expect, it } from "vitest";

import type { SrdData } from "../../lib/types";
import { hashText } from "../catalog";
import { applyOverlay } from "../overlay";

const data = (over: Record<string, unknown[]>) => ({ "spell-groups": [], spells: [], races: [], classes: [], feats: [], backgrounds: [], units: [], artifacts: [], ...over }) as unknown as SrdData;

const n = (en: string, uk: string) => [hashText("n", en), uk] as const;

const d = (en: string, uk: string) => [hashText("d", en), uk] as const;

describe("applyOverlay", () => {
  it("перекладає опис вибору в options і лишає id", () => {
    const src = data({ races: [{ slug: "r", name: "Elf", choices: [{ id: "lineage", label: "Lineage", options: [{ id: "high", label: "High Elf", description: "Learn a cantrip" }] }] }] });

    const out = applyOverlay(src, Object.fromEntries([n("Elf", "Ельф"), n("Lineage", "Лінія"), n("High Elf", "Високий ельф"), d("Learn a cantrip", "Вивчи заклинання")])) as any;

    expect(out.races[0]).toMatchObject({ slug: "r", name: "Ельф", choices: [{ id: "lineage", label: "Лінія", options: [{ id: "high", label: "Високий ельф", description: "Вивчи заклинання" }] }] });
  });

  it("переписує посилання за назвою за мапою виду, рядок і масив", () => {
    const src = data({ spells: [{ slug: "s", name: "Fireball", lists: ["Wizard", "Cleric"] }], classes: [{ slug: "c", name: "Wizard" }, { slug: "c2", name: "Cleric" }], units: [{ slug: "u", name: "Mage", spellId: "Fireball" }] });

    const out = applyOverlay(src, Object.fromEntries([n("Fireball", "Вогняна куля"), n("Wizard", "Чарівник")])) as any;

    expect(out.spells[0].lists).toEqual(["Чарівник", "Cleric"]);
    expect(out.units[0].spellId).toBe("Вогняна куля");
  });

  it("без перекладу лишає англійське і не мутує вхід", () => {
    const src = data({ feats: [{ slug: "f", name: "Alert", description: "Stay alert" }] });

    const copy = JSON.parse(JSON.stringify(src));

    expect(applyOverlay(src, {})).toEqual(copy);
    expect(src).toEqual(copy);
  });

  it("колізія перекладених назв одного виду кидає помилку", () => {
    const src = data({ feats: [{ slug: "a", name: "Alert" }, { slug: "b", name: "Lucky" }] });

    expect(() => applyOverlay(src, Object.fromEntries([n("Alert", "Той самий"), n("Lucky", "Той самий")]))).toThrow(/Колізія назв \(feats\)/);
  });
});

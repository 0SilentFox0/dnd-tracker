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

    const out = applyOverlay(src, Object.fromEntries([n("Elf", "Ельф"), n("Lineage", "Лінія"), n("High Elf", "Високий ельф"), d("Learn a cantrip", "Вивчи заклинання")]));

    expect(out.races[0]).toMatchObject({ slug: "r", name: "Ельф", choices: [{ id: "lineage", label: "Лінія", options: [{ id: "high", label: "Високий ельф", description: "Вивчи заклинання" }] }] });
  });

  it("переписує посилання за назвою за мапою виду, рядок і масив", () => {
    const src = data({ spells: [{ slug: "s", name: "Fireball", lists: ["Wizard", "Cleric"] }], classes: [{ slug: "c", name: "Wizard" }, { slug: "c2", name: "Cleric" }], units: [{ slug: "u", name: "Mage", spellId: "Fireball" }] });

    const out = applyOverlay(src, Object.fromEntries([n("Fireball", "Вогняна куля"), n("Wizard", "Чарівник")]));

    expect(out.spells[0].lists).toEqual(["Чарівник", "Cleric"]);
    expect(out.units[0]).toMatchObject({ spellId: "Вогняна куля" });
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

describe("nested overlay references", () => {
  it("localizes nested features and owning attack references without touching mechanics", () => {
    const src = data({ classes: [{ name: "Wizard", features: [{ abilities: [{ id: "rage", name: "Rage", formula: "level + strength" }] }], spellList: "Wizard", choices: [{ spells: { lists: ["Wizard"] } }] }], units: [{ name: "Mage", attacks: [{ name: "Bite", type: "melee", damageDice: "1d6" }], abilities: [{ perform: { kind: "attack", attack: "bite" } }] }], artifacts: [{ name: "Sword", item: { property: { appliesTo: { bases: ["Sword"] }, nameTemplate: "{base} of {param}" } } }] });

    const tr = Object.fromEntries([n("Rage", "Лють"), n("Bite", "Укус"), n("Wizard", "Чарівник"), n("Sword", "Меч"), n("{base} of {param}", "{base} із {param}"), d("level + strength", "wrong")]);

    const copy = structuredClone(src);

    const out = applyOverlay(src, tr);

    expect(out.classes[0].features[0].abilities[0].name).toBe("Лють");
    expect(out.classes[0]).toMatchObject({ spellList: "Чарівник", choices: [{ spells: { lists: ["Чарівник"] } }], features: [{ abilities: [{ id: "rage", formula: "level + strength" }] }] });
    expect(out.units[0].abilities[0].perform).toMatchObject({ attack: out.units[0].attacks[0].name });
    expect(out.artifacts[0].item?.property).toMatchObject({ appliesTo: { bases: ["Меч"] }, nameTemplate: "{base} із {param}" });
    expect(applyOverlay(out, tr)).toEqual(out);
    expect(src).toEqual(copy);
  });

  it("rejects ambiguous translated attack names ignoring case", () => {
    const src = data({ units: [{ name: "Wolf", attacks: [{ name: "Bite" }, { name: "Claw" }] }] });

    expect(() => applyOverlay(src, Object.fromEntries([n("Bite", "Strike"), n("Claw", "STRIKE")]))).toThrow(/Колізія/);
  });

  it("falls back when a translation changes template placeholders", () => {
    const src = data({ artifacts: [{ name: "Sword", item: { property: { nameTemplate: "{base} of {param}" } } }] });

    expect(applyOverlay(src, Object.fromEntries([n("{base} of {param}", "Меч")]))).toEqual(src);
  });
});

it("translates contextual prose while retaining identically spelled mechanics", () => {
  const src = data({ classes: [{ name: "Wizard", proficiencies: { tools: ["Artisan tools"], armor: ["Light armor"], weapons: ["Simple weapons"], multiclass: { weapons: ["Simple weapons"], skills: { from: ["acrobatics"] } } }, tools: ["Artisan tools"] }], backgrounds: [{ name: "Sage", toolProficiencies: ["Artisan tools"] }], units: [{ name: "Mage", statblock: { languages: "Common", alignment: "lawful good" }, languages: "Common", attacks: [{ name: "Bite", properties: "extra acid damage", damageType: "acid" }] }], artifacts: [{ name: "Sword", weapon: { properties: "extra acid damage" }, properties: "extra acid damage" }], spells: [{ name: "Shield", casting: { text: "reaction", trigger: "When attacked" }, trigger: { event: "reaction" } }] });

  const tr = Object.fromEntries([d("Artisan tools", "Інструменти ремісника"), d("Light armor", "Легкі обладунки"), d("Simple weapons", "Проста зброя"), d("Common", "Спільна"), d("lawful good", "законно добрий"), d("extra acid damage", "додаткова кислотна шкода"), d("When attacked", "Коли атакують"), d("reaction", "wrong"), d("acrobatics", "wrong"), d("acid", "wrong")]);

  const out = applyOverlay(src, tr);

  expect(out.classes[0]).toMatchObject({ proficiencies: { tools: ["Інструменти ремісника"], armor: ["Легкі обладунки"], weapons: ["Проста зброя"], multiclass: { weapons: ["Проста зброя"], skills: { from: ["acrobatics"] } } }, tools: ["Artisan tools"] });
  expect(out.backgrounds[0].toolProficiencies).toEqual(["Інструменти ремісника"]);
  expect(out.units[0]).toMatchObject({ statblock: { languages: "Спільна", alignment: "законно добрий" }, languages: "Common", attacks: [{ properties: "додаткова кислотна шкода", damageType: "acid" }] });
  expect(out.artifacts[0]).toMatchObject({ weapon: { properties: "додаткова кислотна шкода" }, properties: "extra acid damage" });
  expect(out.spells[0]).toMatchObject({ casting: { text: "reaction", trigger: "Коли атакують" }, trigger: { event: "reaction" } });
});

it("rejects artifact base-name collisions with whitespace and case differences", () => {
  const src = data({ artifacts: [{ name: "Sword" }, { name: "Axe" }] });

  expect(() => applyOverlay(src, Object.fromEntries([n("Sword", " Меч "), n("Axe", "МЕЧ")]))).toThrow(/Колізія/);
});

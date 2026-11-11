import { describe, expect, it } from "vitest";

import type { TranslationsV2 } from "../keys";
import { applyOverlay } from "../overlay";

const KINDS = ["spell-groups", "spells", "races", "classes", "feats", "backgrounds", "units", "artifacts"] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rows = Record<string, any[]>;

const data = (over: Rows): Rows => ({ "spell-groups": [], spells: [], races: [], classes: [], feats: [], backgrounds: [], units: [], artifacts: [], ...over });

const overlay = (src: Rows, tr: TranslationsV2) => applyOverlay(src, tr, KINDS) as Rows;

const t = (...entries: [key: string, en: string, uk: string][]): TranslationsV2 => Object.fromEntries(entries.map(([key, en, uk]) => [key, { text: uk, en }]));

describe("applyOverlay", () => {
  it("translates choice options and keeps ids", () => {
    const src = data({ races: [{ slug: "r", name: "Elf", choices: [{ id: "lineage", label: "Lineage", options: [{ id: "high", label: "High Elf", description: "Learn a cantrip" }] }] }] });

    const out = overlay(src, t(["races/r/name", "Elf", "Ельф"], ["races/r/choices[#lineage].label", "Lineage", "Лінія"], ["races/r/choices[#lineage].options[#high].label", "High Elf", "Високий ельф"], ["races/r/choices[#lineage].options[#high].description", "Learn a cantrip", "Вивчи заклинання"]));

    expect(out.races[0]).toMatchObject({ slug: "r", name: "Ельф", choices: [{ id: "lineage", label: "Лінія", options: [{ id: "high", label: "Високий ельф", description: "Вивчи заклинання" }] }] });
  });

  it("rewrites name references using the kind's name map, string and array", () => {
    const src = data({ spells: [{ slug: "s", name: "Fireball", lists: ["Wizard", "Cleric"] }], classes: [{ slug: "c", name: "Wizard" }, { slug: "c2", name: "Cleric" }], units: [{ slug: "u", name: "Mage", spellId: "Fireball" }] });

    const out = overlay(src, t(["spells/s/name", "Fireball", "Вогняна куля"], ["classes/c/name", "Wizard", "Чарівник"]));

    expect(out.spells[0].lists).toEqual(["Чарівник", "Cleric"]);
    expect(out.units[0]).toMatchObject({ spellId: "Вогняна куля" });
  });

  it("keeps English without translations and does not mutate the input", () => {
    const src = data({ feats: [{ slug: "f", name: "Alert", description: "Stay alert" }] });

    const copy = JSON.parse(JSON.stringify(src));

    expect(overlay(src, {})).toEqual(copy);
    expect(src).toEqual(copy);
  });

  it("throws on colliding translated names of one kind", () => {
    const src = data({ feats: [{ slug: "a", name: "Alert" }, { slug: "b", name: "Lucky" }] });

    expect(() => overlay(src, t(["feats/a/name", "Alert", "Той самий"], ["feats/b/name", "Lucky", "Той самий"]))).toThrow(/Колізія назв \(feats\)/);
  });
});

describe("nested overlay references", () => {
  it("localizes nested features and owning attack references without touching mechanics", () => {
    const src = data({ classes: [{ slug: "wizard", name: "Wizard", features: [{ abilities: [{ id: "rage", name: "Rage", formula: "level + strength" }] }], spellList: "Wizard", choices: [{ spells: { lists: ["Wizard"] } }] }], units: [{ slug: "mage", name: "Mage", attacks: [{ name: "Bite", type: "melee", damageDice: "1d6" }], abilities: [{ perform: { kind: "attack", attack: "bite" } }] }], artifacts: [{ slug: "sword", name: "Sword", item: { property: { appliesTo: { bases: ["Sword"] }, nameTemplate: "{base} of {param}" } } }] });

    const tr = t(["classes/wizard/features[0].abilities[#rage].name", "Rage", "Лють"], ["units/mage/attacks[=bite].name", "Bite", "Укус"], ["classes/wizard/name", "Wizard", "Чарівник"], ["artifacts/sword/name", "Sword", "Меч"], ["artifacts/sword/item.property.nameTemplate", "{base} of {param}", "{base} із {param}"], ["classes/wizard/features[0].abilities[#rage].formula", "level + strength", "wrong"]);

    const copy = structuredClone(src);

    const out = overlay(src, tr);

    expect(out.classes[0].features[0].abilities[0].name).toBe("Лють");
    expect(out.classes[0]).toMatchObject({ spellList: "Чарівник", choices: [{ spells: { lists: ["Чарівник"] } }], features: [{ abilities: [{ id: "rage", formula: "level + strength" }] }] });
    expect(out.units[0].abilities[0].perform).toMatchObject({ attack: out.units[0].attacks[0].name });
    expect(out.artifacts[0].item?.property).toMatchObject({ appliesTo: { bases: ["Меч"] }, nameTemplate: "{base} із {param}" });
    expect(overlay(out, tr)).toEqual(out);
    expect(src).toEqual(copy);
  });

  it("rejects ambiguous translated attack names ignoring case", () => {
    const src = data({ units: [{ slug: "wolf", name: "Wolf", attacks: [{ name: "Bite" }, { name: "Claw" }] }] });

    expect(() => overlay(src, t(["units/wolf/attacks[=bite].name", "Bite", "Strike"], ["units/wolf/attacks[=claw].name", "Claw", "STRIKE"]))).toThrow(/Колізія/);
  });

  it("falls back when a translation changes template placeholders", () => {
    const src = data({ artifacts: [{ slug: "sword", name: "Sword", item: { property: { nameTemplate: "{base} of {param}" } } }] });

    expect(overlay(src, t(["artifacts/sword/item.property.nameTemplate", "{base} of {param}", "Меч"]))).toEqual(src);
  });
});

it("translates contextual prose while retaining identically spelled mechanics", () => {
  const src = data({ classes: [{ slug: "wizard", name: "Wizard", proficiencies: { tools: ["Artisan tools"], armor: ["Light armor"], weapons: ["Simple weapons"], multiclass: { weapons: ["Simple weapons"], skills: { from: ["acrobatics"] } } }, tools: ["Artisan tools"] }], backgrounds: [{ slug: "sage", name: "Sage", toolProficiencies: ["Artisan tools"] }], units: [{ slug: "mage", name: "Mage", statblock: { languages: "Common", alignment: "lawful good" }, languages: "Common", attacks: [{ name: "Bite", properties: "extra acid damage", damageType: "acid" }] }], artifacts: [{ slug: "sword", name: "Sword", weapon: { properties: "extra acid damage" }, properties: "extra acid damage" }], spells: [{ slug: "shield", name: "Shield", casting: { text: "reaction", trigger: "When attacked" }, trigger: { event: "reaction" } }] });

  const tr = t(
    ["classes/wizard/proficiencies.tools[0]", "Artisan tools", "Інструменти ремісника"], ["classes/wizard/proficiencies.armor[0]", "Light armor", "Легкі обладунки"], ["classes/wizard/proficiencies.weapons[0]", "Simple weapons", "Проста зброя"],
    ["classes/wizard/proficiencies.multiclass.weapons[0]", "Simple weapons", "Проста зброя"], ["classes/wizard/tools[0]", "Artisan tools", "wrong"], ["backgrounds/sage/toolProficiencies[0]", "Artisan tools", "Інструменти ремісника"],
    ["units/mage/statblock.languages", "Common", "Спільна"], ["units/mage/statblock.alignment", "lawful good", "законно добрий"], ["units/mage/languages", "Common", "wrong"],
    ["units/mage/attacks[=bite].properties", "extra acid damage", "додаткова кислотна шкода"], ["artifacts/sword/weapon.properties", "extra acid damage", "додаткова кислотна шкода"], ["artifacts/sword/properties", "extra acid damage", "wrong"],
    ["spells/shield/casting.trigger", "When attacked", "Коли атакують"], ["spells/shield/casting.text", "reaction", "wrong"],
  );

  const out = overlay(src, tr);

  expect(out.classes[0]).toMatchObject({ proficiencies: { tools: ["Інструменти ремісника"], armor: ["Легкі обладунки"], weapons: ["Проста зброя"], multiclass: { weapons: ["Проста зброя"], skills: { from: ["acrobatics"] } } }, tools: ["Artisan tools"] });
  expect(out.backgrounds[0].toolProficiencies).toEqual(["Інструменти ремісника"]);
  expect(out.units[0]).toMatchObject({ statblock: { languages: "Спільна", alignment: "законно добрий" }, languages: "Common", attacks: [{ properties: "додаткова кислотна шкода", damageType: "acid" }] });
  expect(out.artifacts[0]).toMatchObject({ weapon: { properties: "додаткова кислотна шкода" }, properties: "extra acid damage" });
  expect(out.spells[0]).toMatchObject({ casting: { text: "reaction", trigger: "Коли атакують" }, trigger: { event: "reaction" } });
});

it("rejects artifact base-name collisions with whitespace and case differences", () => {
  const src = data({ artifacts: [{ slug: "sword", name: "Sword" }, { slug: "axe", name: "Axe" }] });

  expect(() => overlay(src, t(["artifacts/sword/name", "Sword", " Меч "], ["artifacts/axe/name", "Axe", "МЕЧ"]))).toThrow(/Колізія/);
});

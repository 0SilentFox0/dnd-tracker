import { describe, expect, it } from "vitest";

import { emptyBundle } from "../bundle";
import { localizeRules, localizeSrdBundle } from "../localize-srd-bundle";
import { remapIds } from "../remap-ids";

import { hashText } from "@/lib/srd/i18n/catalog";
import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";

const tr = Object.fromEntries([
  [hashText("n", "Wizard"), "Чарівник"], [hashText("n", "Fireball"), "Вогняна куля"],
  [hashText("n", "Alert"), "Пильний"], [hashText("n", "Sword"), "Меч"],
  [hashText("n", "{base} of {param}"), "{base} із {param}"], [hashText("n", "Fire"), "Вогонь"],
  [hashText("d", "Mastery: Vex"), "Майстерність: Докучання"], [hashText("n", "Bite"), "Укус"],
  [hashText("n", "Rage"), "Лють"], [hashText("d", "When attacked"), "Коли атакують"],
]);

function fixture() {
  const bundle = emptyBundle();

  bundle.classes = [{ id: "class-id", name: "Wizard", spellList: "Wizard", features: [{ abilities: [{ id: "rage", name: "Rage" }] }], choices: [{ spells: { lists: ["Wizard"] } }] }];
  bundle.spells = [{ id: "spell-id", name: "Fireball", groupId: "Fireball", lists: ["Wizard"], casting: { text: "reaction", trigger: "When attacked" } }];
  bundle.backgrounds = [{ id: "background-id", originFeatId: "Alert" }];
  bundle.units = [{ id: "unit-id", name: "Mage", attacks: [{ name: "Bite", damageDice: "1d6" }], abilities: [{ perform: { kind: "attack", attack: "bite" } }, { perform: { kind: "spell", spellId: "Fireball" } }] }];
  bundle.artifacts = [{ id: "artifact-id", name: "Sword", ...weaponStatsColumns({ damageDice: "1d8", properties: "Mastery: Vex", traits: ["twoHanded"] }), modifiers: [
    ...weaponStatsColumns({ damageDice: "1d8", properties: "Mastery: Vex", traits: ["twoHanded"] }).modifiers,
    ...itemStatsColumns({ property: { appliesTo: { kinds: ["weapon"], bases: ["Sword"] }, nameTemplate: "{base} of {param}" }, parameter: { kind: "damageType", options: [{ key: "fire", label: "Fire" }] }, spells: [{ spellId: "Fireball", cost: 0 }] }).modifiers,
  ] }];

  return bundle;
}

describe("localizeSrdBundle", () => {
  it("localizes DB prose and name references while retaining all ID references", () => {
    const src = fixture();

    const original = structuredClone(src);

    const out = localizeSrdBundle(src, tr);

    expect(out.classes[0]).toMatchObject({ id: "class-id", name: "Чарівник", spellList: "Чарівник", features: [{ abilities: [{ id: "rage", name: "Лють" }] }], choices: [{ spells: { lists: ["Чарівник"] } }] });
    expect(out.spells[0]).toMatchObject({ id: "spell-id", name: "Вогняна куля", groupId: "Fireball", lists: ["Чарівник"], casting: { text: "reaction", trigger: "Коли атакують" } });
    expect(out.backgrounds[0].originFeatId).toBe("Alert");
    expect(out.units[0]).toMatchObject({ attacks: [{ name: "Укус", damageDice: "1d6" }], abilities: [{ perform: { attack: "Укус" } }, { perform: { spellId: "Fireball" } }] });

    const modifiers = out.artifacts[0].modifiers as Array<{ type: string; value: string }>;

    expect(modifiers.find((m) => m.type === "properties")?.value).toBe("Майстерність: Докучання");
    expect(modifiers.find((m) => m.type === "traits")?.value).toBe("twoHanded");

    const stats = JSON.parse(modifiers.find((m) => m.type === "itemStats")?.value ?? "null");

    expect(stats).toMatchObject({ property: { appliesTo: { bases: ["Меч"], kinds: ["weapon"] }, nameTemplate: "{base} із {param}" }, parameter: { kind: "damageType", options: [{ key: "fire", label: "Вогонь" }] }, spells: [{ spellId: "Fireball" }] });

    const remapped = remapIds(out, new Map([["Fireball", "local-spell"]]));

    expect(JSON.parse((remapped.artifacts[0].modifiers as typeof modifiers).find((m) => m.type === "itemStats")?.value ?? "null").spells[0].spellId).toBe("local-spell");
    expect(localizeSrdBundle(out, tr)).toEqual(out);
    expect(src).toEqual(original);
  });

  it("preserves opaque sections, malformed records, unknown fields and unchanged serialization", () => {
    const src = fixture();

    const records = [
      { type: "itemStats", value: '  { "unique": false, "future": { "name": "Fireball", "spellId": "Fireball" } } ' },
      { type: "itemStats", value: "{broken", name: "Fireball" },
      { type: "future", value: '{ "name": "Fireball" }', name: "Fireball" },
      { type: "itemStats", value: ' [ { "name": "Fireball" } ] ' },
    ];

    src.artifacts[0].modifiers = records;
    src.rules = { name: "Fireball" };
    src.credits = "Fireball";
    src.mainSkills = [{ id: "main", name: "Fireball" }];

    const out = localizeSrdBundle(src, tr);

    expect(out.artifacts[0].modifiers).toEqual(records);
    expect(out.rules).toBe(src.rules);
    expect(out.settings).toBe(src.settings);
    expect(out.mainSkills).toBe(src.mainSkills);
    expect(out.credits).toBe("Fireball");
    expect(localizeSrdBundle(src, {})).toBe(src);
    expect(localizeSrdBundle(src, { [hashText("n", "Missing")]: "Відсутній" })).toEqual(src);
  });

  it("keeps unknown serialized fields when a recognized item field changes", () => {
    const src = emptyBundle();

    src.artifacts = [{ id: "a", modifiers: [{ type: "itemStats", value: '{"property":{"nameTemplate":"{base} of {param}","future":{"label":"Fire"}},"future":{"name":"Fireball"}}' }] }];

    const out = localizeSrdBundle(src, tr);

    const record = (out.artifacts[0].modifiers as Array<{ value: string }>)[0];

    expect(JSON.parse(record.value)).toEqual({ property: { nameTemplate: "{base} із {param}", future: { label: "Fire" } }, future: { name: "Fireball" } });
  });

  it("rejects class/base and case-insensitive attack translation collisions", () => {
    for (const table of ["classes", "artifacts"] as const) {
      const src = emptyBundle();

      src[table] = [{ id: "a", name: "Wizard" }, { id: "b", name: "Fireball" }];
      expect(() => localizeSrdBundle(src, { ...tr, [hashText("n", "Fireball")]: "Чарівник" })).toThrow(/Колізія/);
    }

    const src = fixture();

    src.units[0].attacks = [{ name: "Bite" }, { name: "Claw" }];
    expect(() => localizeSrdBundle(src, { ...tr, [hashText("n", "Claw")]: "УКУС" })).toThrow(/Колізія/);
  });
});

it("rejects artifact collisions using the base-item resolver's trimmed case-insensitive names", () => {
  const src = emptyBundle();

  src.artifacts = [{ id: "a", name: "Sword" }, { id: "b", name: "Axe" }];
  expect(() => localizeSrdBundle(src, { [hashText("n", "Sword")]: " Меч ", [hashText("n", "Axe")]: "МЕЧ" })).toThrow(/Колізія/);
});

it("localizes case-insensitive artifact bases while keeping unmatched fallback spelling", () => {
  const src = emptyBundle();

  src.artifacts = [{ id: "a", name: "Sword", ...itemStatsColumns({ property: { appliesTo: { kinds: ["weapon"], bases: [" sword ", "AXE"] } } }) }];

  const out = localizeSrdBundle(src, tr);

  expect(JSON.parse((out.artifacts[0].modifiers as Array<{ value: string }>)[0].value).property.appliesTo.bases).toEqual(["Меч", "AXE"]);
});

describe("Grim bundle", () => {
  const grimTr = Object.fromEntries([
    [hashText("n", "Archivist"), "Архіваріус"], [hashText("n", "Copyist"), "Переписувач"], [hashText("n", "Academic"), "Учені"],
    [hashText("d", "Quill and ink"), "Перо й чорнило"], [hashText("d", "A smell of scorched hair."), "Запах паленого волосся."],
    [hashText("n", "School of Embers"), "Школа Жару"], [hashText("n", "Ember Dart"), "Жарова стріла"],
  ]);

  it("localizes career names, class, tier names and trappings only", () => {
    const src = emptyBundle();

    src.careers = [{ id: "career-id", name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", status: "Brass 3", characteristics: ["int"], skills: ["lore:herbs"], talents: ["feat-id"], trappings: ["Quill and ink"] }] }];

    expect(localizeSrdBundle(src, grimTr).careers[0]).toEqual({ id: "career-id", name: "Архіваріус", class: "Учені", tiers: [{ name: "Переписувач", status: "Brass 3", characteristics: ["int"], skills: ["lore:herbs"], talents: ["feat-id"], trappings: ["Перо й чорнило"] }] });
  });
  it("leaves species profiles untouched", () => {
    const src = emptyBundle();

    const profile = { careerTable: [{ careerId: "career-id", max: 50 }], talents: ["feat-id"] };

    src.races = [{ id: "r", name: "Archivist", profile }];
    expect(localizeSrdBundle(src, grimTr).races[0].profile).toEqual(profile);
  });
  it("localizes rule table text without touching effects or other rules", () => {
    const effects = [{ type: "condition", key: "deafened", levels: 1 }];

    const rules = { advancement: { x: 1 }, tables: { miscastMinor: [{ max: 100, text: "A smell of scorched hair.", effects }] } };

    expect(localizeRules(rules, grimTr)).toEqual({ advancement: { x: 1 }, tables: { miscastMinor: [{ max: 100, text: "Запах паленого волосся.", effects }] } });

    const plain = { advancement: {} };

    expect(localizeRules(plain, grimTr)).toBe(plain);
  });
  it("localizes spell list names without classes and rejects colliding lists", () => {
    const src = emptyBundle();

    src.spells = [{ id: "s", name: "Ember Dart", lists: ["School of Embers"] }];
    expect(localizeSrdBundle(src, grimTr).spells[0]).toMatchObject({ name: "Жарова стріла", lists: ["Школа Жару"] });

    src.spells = [{ id: "s", name: "A", lists: ["School of Embers"] }, { id: "t", name: "B", lists: ["Ember Dart"] }];
    expect(() => localizeSrdBundle(src, { ...grimTr, [hashText("n", "Ember Dart")]: "Школа Жару" })).toThrow(/spell lists/);
  });
});

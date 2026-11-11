import { describe, expect, it } from "vitest";

import { emptyBundle } from "../bundle";
import { localizeRules, localizeTemplateBundle } from "../localize-template-bundle";
import { remapIds } from "../remap-ids";

import { weaponStatsColumns } from "@/lib/utils/artifacts/weapon-stats";
import { itemStatsColumns } from "@/lib/utils/items/item-stats";
import type { TranslationsV2 } from "@/lib/utils/templates/i18n/keys";

const entry = (key: string, text: string, en: string) => [key, { text, en }] as const;

const dict = (...entries: (readonly [string, { text: string; en: string }])[]): TranslationsV2 => Object.fromEntries(entries);

const tr = dict(
  entry("classes/wizard/name", "Чарівник", "Wizard"), entry("spells/fireball/name", "Вогняна куля", "Fireball"),
  entry("feats/alert/name", "Пильний", "Alert"), entry("artifacts/sword/name", "Меч", "Sword"),
  entry("artifacts/sword/item.property.nameTemplate", "{base} із {param}", "{base} of {param}"), entry("artifacts/sword/item.parameter.options[0].label", "Вогонь", "Fire"),
  entry("artifacts/sword/weapon.properties", "Майстерність: Докучання", "Mastery: Vex"), entry("units/mage/attacks[=bite].name", "Укус", "Bite"),
  entry("classes/wizard/features[0].abilities[#rage].name", "Лють", "Rage"), entry("spells/fireball/casting.trigger", "Коли атакують", "When attacked"),
);

function fixture() {
  const bundle = emptyBundle();

  bundle.classes = [{ id: "class-id", slug: "wizard", name: "Wizard", spellList: "Wizard", features: [{ abilities: [{ id: "rage", name: "Rage" }] }], choices: [{ spells: { lists: ["Wizard"] } }] }];
  bundle.spells = [{ id: "spell-id", slug: "fireball", name: "Fireball", groupId: "Fireball", lists: ["Wizard"], casting: { text: "reaction", trigger: "When attacked" } }];
  bundle.backgrounds = [{ id: "background-id", slug: "sage", originFeatId: "Alert" }];
  bundle.units = [{ id: "unit-id", slug: "mage", name: "Mage", attacks: [{ name: "Bite", damageDice: "1d6" }], abilities: [{ perform: { kind: "attack", attack: "bite" } }, { perform: { kind: "spell", spellId: "Fireball" } }] }];
  bundle.artifacts = [{ id: "artifact-id", slug: "sword", name: "Sword", ...weaponStatsColumns({ damageDice: "1d8", properties: "Mastery: Vex", traits: ["twoHanded"] }), modifiers: [
    ...weaponStatsColumns({ damageDice: "1d8", properties: "Mastery: Vex", traits: ["twoHanded"] }).modifiers,
    ...itemStatsColumns({ property: { appliesTo: { kinds: ["weapon"], bases: ["Sword"] }, nameTemplate: "{base} of {param}" }, parameter: { kind: "damageType", options: [{ key: "fire", label: "Fire" }] }, spells: [{ spellId: "Fireball", cost: 0 }] }).modifiers,
  ] }];

  return bundle;
}

describe("localizeTemplateBundle", () => {
  it("maps race and main-skill names kept as strings in ability JSON and skill trees (D30)", () => {
    const bundle = emptyBundle();

    bundle.races = [{ id: "r", slug: "demons", name: "Demons" }];
    bundle.mainSkills = [{ id: "m", slug: "attack", name: "Attack" }];
    bundle.units = [{ id: "u", slug: "imp", name: "Imp", abilities: [{ id: "a", condition: { type: "targetRace", races: ["Demons", "Elves"] }, effects: [{ kind: "summon", group: "Demons", tier: 1 }] }] }];
    bundle.skillTrees = [{ id: "t", slug: "demons", race: "Demons", skills: { id: "t", race: "Demons", mainSkills: [{ id: "attack", name: "Attack" }, { id: "racial", name: "Missing" }] } }];

    const out = localizeTemplateBundle(bundle, dict(entry("races/demons/name", "Демони", "Demons"), entry("main-skills/attack/name", "Напад", "Attack")));

    expect(out.units[0].abilities).toEqual([{ id: "a", condition: { type: "targetRace", races: ["Демони", "Elves"] }, effects: [{ kind: "summon", group: "Демони", tier: 1 }] }]);
    expect(out.skillTrees[0]).toMatchObject({ race: "Демони", skills: { id: "t", race: "Демони", mainSkills: [{ id: "attack", name: "Напад" }, { id: "racial", name: "Missing" }] } });
  });

  it("localizes mainSkills, skills and artifactSets rows by <kind>/<slug> keys", () => {
    const bundle = emptyBundle();

    bundle.mainSkills = [{ id: "m", slug: "might", name: "Might" }];
    bundle.skills = [{ id: "s", slug: "cleave", name: "Cleave" }];
    bundle.artifactSets = [{ id: "a", slug: "dragon", name: "Dragon" }];

    const out = localizeTemplateBundle(bundle, dict(entry("main-skills/might/name", "Міць", "Might"), entry("skills/cleave/name", "Розруб", "Cleave"), entry("artifact-sets/dragon/name", "Дракон", "Dragon")));

    expect([out.mainSkills[0].name, out.skills[0].name, out.artifactSets[0].name]).toEqual(["Міць", "Розруб", "Дракон"]);
  });

  it("localizes DB prose and name references while retaining all ID references", () => {
    const src = fixture();

    const original = structuredClone(src);

    const out = localizeTemplateBundle(src, tr);

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
    expect(localizeTemplateBundle(out, tr)).toEqual(out);
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
    src.mainSkills = [{ id: "main", slug: "fireball", name: "Fireball" }];

    const out = localizeTemplateBundle(src, tr);

    expect(out.artifacts[0].modifiers).toEqual(records);
    expect(out.rules).toBe(src.rules);
    expect(out.settings).toBe(src.settings);
    expect(out.mainSkills).toEqual(src.mainSkills);
    expect(out.credits).toBe("Fireball");
    expect(localizeTemplateBundle(src, {})).toBe(src);
    expect(localizeTemplateBundle(src, dict(entry("spells/missing/name", "Відсутній", "Missing")))).toEqual(src);
  });

  it("keeps unknown serialized fields when a recognized item field changes", () => {
    const src = emptyBundle();

    src.artifacts = [{ id: "a", slug: "sword", modifiers: [{ type: "itemStats", value: '{"property":{"nameTemplate":"{base} of {param}","future":{"label":"Fire"}},"future":{"name":"Fireball"}}' }] }];

    const out = localizeTemplateBundle(src, tr);

    const record = (out.artifacts[0].modifiers as Array<{ value: string }>)[0];

    expect(JSON.parse(record.value)).toEqual({ property: { nameTemplate: "{base} із {param}", future: { label: "Fire" } }, future: { name: "Fireball" } });
  });

  it("rejects class/base and case-insensitive attack translation collisions", () => {
    for (const table of ["classes", "artifacts"] as const) {
      const src = emptyBundle();

      src[table] = [{ id: "a", slug: "wizard", name: "Wizard" }, { id: "b", slug: "fireball", name: "Fireball" }];
      expect(() => localizeTemplateBundle(src, { ...tr, [`${table}/wizard/name`]: { text: "Чарівник", en: "Wizard" }, [`${table}/fireball/name`]: { text: "Чарівник", en: "Fireball" } })).toThrow(/Колізія/);
    }

    const src = fixture();

    src.units[0].attacks = [{ name: "Bite" }, { name: "Claw" }];
    expect(() => localizeTemplateBundle(src, { ...tr, "units/mage/attacks[=claw].name": { text: "УКУС", en: "Claw" } })).toThrow(/Колізія/);
  });

  describe("keyed translation", () => {
    it("gives rows with the same English name in different kinds different translations", () => {
      const src = emptyBundle();

      src.spells = [{ id: "s", slug: "light", name: "Light" }];
      src.classes = [{ id: "c", slug: "light", name: "Light" }];

      const out = localizeTemplateBundle(src, dict(entry("spells/light/name", "Світло", "Light"), entry("classes/light/name", "Легкий", "Light")));

      expect([out.spells[0].name, out.classes[0].name]).toEqual(["Світло", "Легкий"]);
    });

    it("leaves a row without a slug in English", () => {
      const src = emptyBundle();

      src.spells = [{ id: "s", name: "Fireball" }];
      expect(localizeTemplateBundle(src, tr).spells[0].name).toBe("Fireball");
    });

    it("keeps the translation when the English name changes under the same slug (stale)", () => {
      const src = emptyBundle();

      src.spells = [{ id: "s", slug: "fireball", name: "Great Fireball" }];
      expect(localizeTemplateBundle(src, tr).spells[0].name).toBe("Вогняна куля");
    });

    it("falls back to English when placeholders differ", () => {
      const src = emptyBundle();

      src.artifacts = [{ id: "a", slug: "sword", modifiers: [{ type: "itemStats", value: '{"property":{"nameTemplate":"{base} of {param}"}}' }] }];

      const out = localizeTemplateBundle(src, dict(entry("artifacts/sword/item.property.nameTemplate", "{base} із {x}", "{base} of {param}")));

      expect(out.artifacts[0].modifiers).toEqual(src.artifacts[0].modifiers);
    });
  });
});

it("rejects artifact collisions using the base-item resolver's trimmed case-insensitive names", () => {
  const src = emptyBundle();

  src.artifacts = [{ id: "a", slug: "sword", name: "Sword" }, { id: "b", slug: "axe", name: "Axe" }];
  expect(() => localizeTemplateBundle(src, dict(entry("artifacts/sword/name", " Меч ", "Sword"), entry("artifacts/axe/name", "МЕЧ", "Axe")))).toThrow(/Колізія/);
});

it("localizes case-insensitive artifact bases while keeping unmatched fallback spelling", () => {
  const src = emptyBundle();

  src.artifacts = [{ id: "a", slug: "sword", name: "Sword", ...itemStatsColumns({ property: { appliesTo: { kinds: ["weapon"], bases: [" sword ", "AXE"] } } }) }];

  const out = localizeTemplateBundle(src, tr);

  expect(JSON.parse((out.artifacts[0].modifiers as Array<{ value: string }>)[0].value).property.appliesTo.bases).toEqual(["Меч", "AXE"]);
});

describe("Grim bundle", () => {
  const grimTr = dict(
    entry("careers/archivist/name", "Архіваріус", "Archivist"), entry("careers/archivist/tiers[=copyist].name", "Переписувач", "Copyist"), entry("careers/archivist/class", "Учені", "Academic"),
    entry("careers/archivist/tiers[=copyist].trappings[0]", "Перо й чорнило", "Quill and ink"), entry("rules/_/miscastMinor[0].text", "Запах паленого волосся.", "A smell of scorched hair."),
    entry("spellLists/school-of-embers/name", "Школа Жару", "School of Embers"), entry("spells/ember-dart/name", "Жарова стріла", "Ember Dart"),
  );

  it("localizes career names, class, tier names and trappings only", () => {
    const src = emptyBundle();

    src.careers = [{ id: "career-id", slug: "archivist", name: "Archivist", class: "Academic", tiers: [{ name: "Copyist", status: "Brass 3", characteristics: ["int"], skills: ["lore:herbs"], talents: ["feat-id"], trappings: ["Quill and ink"] }] }];

    expect(localizeTemplateBundle(src, grimTr).careers[0]).toEqual({ id: "career-id", slug: "archivist", name: "Архіваріус", class: "Учені", tiers: [{ name: "Переписувач", status: "Brass 3", characteristics: ["int"], skills: ["lore:herbs"], talents: ["feat-id"], trappings: ["Перо й чорнило"] }] });
  });
  it("leaves species profiles untouched", () => {
    const src = emptyBundle();

    const profile = { careerTable: [{ careerId: "career-id", max: 50 }], talents: ["feat-id"] };

    src.races = [{ id: "r", slug: "archivist", name: "Archivist", profile }];
    expect(localizeTemplateBundle(src, grimTr).races[0].profile).toEqual(profile);
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

    src.spells = [{ id: "s", slug: "ember-dart", name: "Ember Dart", lists: ["School of Embers"] }];
    expect(localizeTemplateBundle(src, grimTr).spells[0]).toMatchObject({ name: "Жарова стріла", lists: ["Школа Жару"] });

    src.spells = [{ id: "s", slug: "a", name: "A", lists: ["School of Embers"] }, { id: "t", slug: "b", name: "B", lists: ["Ember Dart"] }];
    expect(() => localizeTemplateBundle(src, { ...grimTr, "spellLists/ember-dart/name": { text: "Школа Жару", en: "Ember Dart" } })).toThrow(/spell lists/);
  });
});

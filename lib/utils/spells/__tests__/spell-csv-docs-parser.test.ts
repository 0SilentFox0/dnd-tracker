import { describe, expect,it } from "vitest";

import {
  type DocsSpellRow,
  parseDocsSpellRow,
} from "../spell-csv-docs-parser";

describe("parseDocsSpellRow", () => {
  it("парсить рядок без урону (Weakness)", () => {
    const row: DocsSpellRow = {
      Spell_Name: "Weakness",
      Level: "1",
      Spell_School: "Dark_Magic",
      Casting_Time: "1 action",
      Range: "60 feet",
      Duration: "1 minute",
      Save_Type: "Constitution",
      Target_AoE: "Single target",
      Damage_Heal: "None",
      Additional_Effects: "Target deals half damage on all weapon attacks",
      Image: "https://example.com/weakness.png",
    };

    const spell = parseDocsSpellRow(row);

    expect(spell.name).toBe("Weakness");
    expect(spell.level).toBe(1);
    expect(spell.school).toBe("Dark Magic");
    expect(spell.type).toBe("target");
    expect(spell.damageType).toBe("damage");
    expect(spell.damageDice).toBeUndefined();
    expect(spell.damageElement).toBeUndefined();
    expect(spell.savingThrowAbility).toBe("constitution");
    expect(spell.savingThrowOnSuccess).toBe("half");
    expect(spell.castingTime).toBe("1 action");
    expect(spell.range).toBe("60 feet");
    expect(spell.duration).toBe("1 minute");
    expect(spell.description).toBe("Target deals half damage on all weapon attacks");
    expect(spell.icon).toBe("https://example.com/weakness.png");
    expect(spell.concentration).toBe(false);
  });

  it("парсить рядок з уроном та елементом (Decay)", () => {
    const row: DocsSpellRow = {
      Spell_Name: "Decay",
      Level: "2",
      Spell_School: "Dark_Magic",
      Casting_Time: "1 action",
      Range: "60 feet",
      Duration: "1 minute",
      Save_Type: "Constitution",
      Target_AoE: "Single target",
      Damage_Heal: "3d8 necrotic (per turn)",
      Additional_Effects: "Damage at start of each target's turn",
      Image: "https://example.com/decay.png",
    };

    const spell = parseDocsSpellRow(row);

    expect(spell.name).toBe("Decay");
    expect(spell.level).toBe(2);
    expect(spell.damageType).toBe("damage");
    expect(spell.damageDice).toBeDefined();
    expect(spell.damageDice).toMatch(/^\d+d\d+/);
    expect(spell.damageElement).toBe("necrotic");
  });

  it("парсить AOE заклинання (Curse of Netherworld)", () => {
    const row: DocsSpellRow = {
      Spell_Name: "Curse_of_Netherworld",
      Level: "5",
      Spell_School: "Dark_Magic",
      Target_AoE: "60-foot radius",
      Damage_Heal: "8d6 necrotic",
      Save_Type: "Constitution",
      Duration: "Instantaneous",
    };

    const spell = parseDocsSpellRow(row);

    expect(spell.name).toBe("Curse_of_Netherworld");
    expect(spell.type).toBe("aoe");
    expect(spell.level).toBe(5);
    expect(spell.damageDice).toBeDefined();
    expect(spell.damageElement).toBe("necrotic");
  });

  it("парсить лікувальне заклинання (Regeneration)", () => {
    const row: DocsSpellRow = {
      Spell_Name: "Regeneration",
      Level: "2",
      Spell_School: "Light_Magic",
      Damage_Heal: "2d8+4 HP (per turn)",
      Target_AoE: "Single ally",
      Save_Type: "None",
    };

    const spell = parseDocsSpellRow(row);

    expect(spell.name).toBe("Regeneration");
    expect(spell.damageType).toBe("heal");
    expect(spell.type).toBe("target");
    expect(spell.savingThrowAbility).toBeUndefined();
  });

  it("парсить bonus action (Teleportation)", () => {
    const row: DocsSpellRow = {
      Spell_Name: "Teleportation",
      Level: "4",
      Spell_School: "Light_Magic",
      Casting_Time: "1 bonus action",
      Target_AoE: "Single ally",
    };

    const spell = parseDocsSpellRow(row);

    expect(spell.castingTime).toBe("1 bonus action");
  });

  it("нормалізує школу (underscore → пробіл)", () => {
    const row: DocsSpellRow = {
      Spell_Name: "Fireball",
      Level: "3",
      Spell_School: "Chaos_Magic",
      Target_AoE: "20-foot radius",
      Damage_Heal: "8d6 fire",
    };

    const spell = parseDocsSpellRow(row);

    expect(spell.school).toBe("Chaos Magic");
  });

  it("обробляє порожні/відсутні поля", () => {
    const spell = parseDocsSpellRow({});

    expect(spell.name).toBe("");
    expect(spell.level).toBe(0);
    expect(spell.school).toBeUndefined();
    expect(spell.type).toBe("aoe"); // порожній Target_AoE → не single target/ally → aoe
    expect(spell.damageType).toBe("damage");
    expect(spell.concentration).toBe(false);
  });

  it("обмежує level до 0–5", () => {
    expect(parseDocsSpellRow({ Spell_Name: "X", Level: "10" }).level).toBe(5);
    expect(parseDocsSpellRow({ Spell_Name: "Y", Level: "-1" }).level).toBe(0);
  });
});

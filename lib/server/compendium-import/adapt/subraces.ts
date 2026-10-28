import { fixedAbilityBonuses, lineageSpells, raceTraits } from "../adapters/character-traits";
import { array, description, object, str, unsupported } from "../adapters/shared";
import { nestedId, stableJson } from "../identity";
import { issue } from "../types";
import { type AdaptState, addEntry, isEnabled } from "./state";


const HANDLED = ["raceName", "raceSource", "ability", "size", "speed", "darkvision", "blindsight", "tremorsense", "truesight", "languageProficiencies", "resist", "lineage", "traitTags", "age", "additionalSpells"];

export function attachSubraces(state: AdaptState) {
  if (!isEnabled(state, "subrace")) return;

  array(state.root.subrace).map(object).forEach((row, i) => {
    const parent = [str(row.raceName), str(row.raceSource)];

    const entry = addEntry(state, "subrace", row, `subrace[${i}]`, (_r, ctx) => {
      const traits = raceTraits(row, ctx);

      const spells = lineageSpells(row.additionalSpells, ctx);

      if (spells.manual.length > 0) ctx.issues.push(issue("MANUAL_RACE_SPELLS", `${ctx.path}.additionalSpells`, "warning", "Частину заклинань лінії (без обмежень, вибір, розширений список) рушій не моделює: застосовуйте за описом"));

      const option = { id: nestedId(ctx.key), name: row.name, description: [traits.head.join("\n"), description(row, ctx)].filter(Boolean).join("\n\n"), abilities: [...fixedAbilityBonuses(row.ability, ctx), ...traits.abilities], ...(spells.spells.length > 0 && { spells: spells.spells }) };

      return {
        kind: "races",
        body: { choices: [{ id: "import-lineage", label: "Походження", kind: "option", count: 1, lineage: true, options: [option] }] },
        refs: spells.refs,
        notes: [unsupported(row, HANDLED, ctx), spells.manual.length > 0 ? `additionalSpells: ${stableJson(spells.manual)}` : ""].filter(Boolean).join("\n"),
      };
    }, parent);

    if (entry) entry.mergeParent = { path: [], kind: "race", name: parent[0], source: parent[1], edition: entry.edition };
  });
}

import { background, feat, gameClass, race } from "../adapters/characters";
import { item, materialPage, monster, spell } from "../adapters/content";
import { array, object } from "../adapters/shared";
import { resolveCompendiumFeatures } from "../feature-resolution";
import { canonicalKey } from "../identity";
import { type AdaptedEntry, type Adapter, issue } from "../types";
import { type AdaptState, addEntry, isEnabled } from "./state";

const adapters: Record<string, Adapter> = {
  spell,
  monster,
  item,
  baseitem: item,
  race,
  background,
  feat,
  class: gameClass,
  table: materialPage,
  reward: materialPage,
  condition: materialPage,
  skill: materialPage,
  language: materialPage,
  itemProperty: materialPage,
  itemType: materialPage,
};

const nestedKinds = new Set(["subclass", "subclassFeature", "classFeature", "subrace", "optionalfeature", "book", "adventure", "bookData", "adventureData"]);

function addSpellSchool(state: AdaptState, entry: AdaptedEntry, school: string) {
  const key = canonicalKey("spellSchool", school, "5etools-format", "unknown");

  if (!state.entries.some((e) => e.key === key))
    state.entries.push({ key, inputKind: "spellSchool", name: school, source: "5etools-format", edition: "unknown", kind: "spell-groups", body: { name: school }, refs: [], notes: "", issues: [] });

  entry.refs.push({ path: ["groupId"], kind: "spellSchool", name: school, source: "5etools-format", edition: "unknown" });
}

export function adaptTopLevel(state: AdaptState) {
  for (const [kind, raw] of Object.entries(state.root)) {
    if (kind === "_meta" || !isEnabled(state, kind)) continue;

    if (!adapters[kind] && !nestedKinds.has(kind)) {
      state.issues.push(issue("UNSUPPORTED_CATEGORY", kind, "warning", "Перенесіть потрібні матеріали вручну"));
      continue;
    }

    if (!adapters[kind]) continue;

    array(raw).forEach((value, i) => {
      const row = object(value);

      const entry = addEntry(state, kind, row, `${kind}[${i}]`, adapters[kind]);

      if (kind === "spell" && entry && typeof row.school === "string") addSpellSchool(state, entry, row.school);
    });
  }

  for (const entry of state.entries.filter((e) => e.inputKind === "class")) {
    const row = state.sourceRows.get(entry.key);

    entry.body.features = resolveCompendiumFeatures(row?.classFeatures, "classFeature", `${entry.key}.classFeatures`, state.featureContext, entry.edition);
  }
}

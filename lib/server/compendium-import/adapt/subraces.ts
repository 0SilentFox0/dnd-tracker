import { array, description, object, str, unsupported } from "../adapters/shared";
import { nestedId } from "../identity";
import { type AdaptState, addEntry, isEnabled } from "./state";

export function attachSubraces(state: AdaptState) {
  if (!isEnabled(state, "subrace")) return;

  array(state.root.subrace).map(object).forEach((row, i) => {
    const parent = [str(row.raceName), str(row.raceSource)];

    const entry = addEntry(state, "subrace", row, `subrace[${i}]`, (_r, ctx) => ({
      kind: "races",
      body: {
        choices: [{
          id: "import-lineage",
          label: "Походження",
          kind: "option",
          count: 1,
          lineage: true,
          options: [{ id: nestedId(ctx.key), name: row.name, description: description(row, ctx), abilities: [] }],
        }],
      },
      notes: unsupported(row, ["raceName", "raceSource"], ctx),
    }), parent);

    if (entry) entry.mergeParent = { path: [], kind: "race", name: parent[0], source: parent[1], edition: entry.edition };
  });
}

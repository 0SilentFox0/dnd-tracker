import { array, description, object, str, unsupported } from "../adapters/shared";
import { resolveCompendiumFeatures } from "../feature-resolution";
import { nestedId } from "../identity";
import { type AdaptState, addEntry, isEnabled } from "./state";

export function attachSubclasses(state: AdaptState) {
  if (!isEnabled(state, "subclass")) return;

  array(state.root.subclass).map(object).forEach((row, i) => {
    const parent = [str(row.className), str(row.classSource)];

    const entry = addEntry(state, "subclass", row, `subclass[${i}]`, (_r, ctx) => ({
      kind: "classes",
      body: {
        subclasses: [{
          id: nestedId(ctx.key),
          name: row.name,
          features: resolveCompendiumFeatures(row.subclassFeatures, "subclassFeature", `${ctx.key}.subclassFeatures`, state.featureContext),
        }],
      },
      notes: [description(row, ctx), unsupported(row, ["className", "classSource", "shortName", "subclassFeatures"], ctx)].filter(Boolean).join("\n"),
    }), parent);

    if (entry) entry.mergeParent = { path: [], kind: "class", name: parent[0], source: parent[1], edition: entry.edition };
  });
}

import { materialPage } from "../adapters/content";
import { array, object, str } from "../adapters/shared";
import { issue } from "../types";
import { type AdaptState, addEntry, isEnabled } from "./state";

export function adaptBooks(state: AdaptState) {
  const { root, issues } = state;

  for (const kind of ["book", "adventure"] as const) {
    if (!isEnabled(state, kind)) continue;

    array(root[kind]).map(object).forEach((manifest, index) => {
      const data = array(root[`${kind}Data`]).map(object).filter((d) => d.id === manifest.id && (!d.source || d.source === manifest.source));

      if (data.length !== 1) {
        issues.push(issue("CORPUS_DATA_MISSING", `${kind}[${index}]`, "warning", "Додайте відповідні дані глав або матеріали вручну"));

        return;
      }

      array(data[0].data).forEach((chapter, i) =>
        addEntry(state, `${kind}Chapter`, {
          ...object(chapter),
          name: `${str(manifest.name)} — ${str(object(chapter).name) || i + 1}`,
          source: manifest.source,
          edition: manifest.edition,
        }, `${kind}[${index}].data[${i}]`, materialPage, [str(manifest.id), String(i)]),
      );
    });
  }
}

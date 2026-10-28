import { array, effectiveEdition, object, str } from "../adapters/shared";
import { canonicalKey } from "../identity";
import { issue } from "../types";
import { type AdaptState, isEnabled } from "./state";

export function adaptOptionalFeatures(state: AdaptState) {
  if (!isEnabled(state, "optionalfeature")) return;

  array(state.root.optionalfeature).map(object).forEach((row, i) => {
    const key = canonicalKey("optionalfeature", str(row.name), str(row.source), effectiveEdition(row.edition, state.meta.edition));

    if (!state.usedOptionals.has(key))
      state.issues.push(issue("OPTIONAL_FEATURE_WITHOUT_OWNER", `optionalfeature[${i}]`, "warning", "Прив'яжіть особливість до вибору класу або використовуйте її опис вручну"));
  });
}

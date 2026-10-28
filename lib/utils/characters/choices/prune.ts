import { backgroundFields } from "@/lib/utils/backgrounds/selection";
import { type ChoiceRefs, forEachChoiceOwner } from "@/lib/utils/characters/choices/walk";
import type { Choice, ChoicePick, ChoicesState, Picks } from "@/types/choices";
import type { CharacterClassEntry } from "@/types/classes";

function known(choice: Choice, pick: ChoicePick, refs: ChoiceRefs): boolean {
  if (choice.kind === "option") return !!choice.options?.some((o) => o.id === pick.id);

  if (choice.kind === "feat") return !!refs.featsById[pick.id] || !!choice.options?.some((o) => o.id === pick.id);

  if (choice.kind === "spell") return !!refs.spellsById[pick.id];

  return true;
}

function prune(defs: readonly Choice[], picks: Picks, refs: ChoiceRefs, count: { n: number }, nested: boolean): Picks {
  const byId = new Map(defs.map((c) => [c.id, c]));

  return Object.fromEntries(
    Object.entries(picks).flatMap(([id, list]) => {
      const choice = byId.get(id);

      if (!choice) {
        count.n += list.length;

        return [];
      }

      const kept = list.flatMap((p) => {
        if (!known(choice, p, refs)) {
          count.n += 1;

          return [];
        }

        const feat = choice.kind === "feat" && nested ? refs.featsById[p.id] : undefined;

        return [feat && p.picks ? { ...p, picks: prune(feat.choices, p.picks, refs, count, false) } : p];
      });

      return kept.length > 0 ? [[id, kept]] : [];
    }),
  );
}

export function prunePicks(state: ChoicesState, refs: ChoiceRefs): { state: ChoicesState; dropped: number } {
  const count = { n: 0 };

  const pruned = new Map<unknown, Picks>();

  forEachChoiceOwner(state, refs, ({ owner, defs, picks }) => {
    const key = owner.kind === "class" ? owner.entry : owner.kind === "feat" ? owner.entry : owner.kind;

    pruned.set(key, prune(defs, picks, refs, count, owner.kind !== "feat" && owner.kind !== "backgroundFeat"));
  }, { level: 0, classMode: true });

  const prunedOrDropAll = (key: unknown, picks: Picks) => pruned.get(key) ?? prune([], picks, refs, count, false);

  const raceChoices = prunedOrDropAll("race", state.raceChoices);

  const classes = state.classes.map((e) => {
    const picks = pruned.get(e);

    if (!picks || !e.choices) return e;

    return Object.keys(picks).length > 0 ? { ...e, choices: picks } : { classId: e.classId, level: e.level, ...(e.subclassId && { subclassId: e.subclassId }) };
  });

  const feats = state.feats.flatMap((f) => {
    const picks = pruned.get(f);

    if (!picks) {
      count.n += 1;

      return [];
    }

    return [f.picks ? { ...f, picks } : f];
  });

  const backgroundFields = state.backgroundId !== undefined ? {
    backgroundChoices: prunedOrDropAll("background", state.backgroundChoices ?? {}),
    backgroundFeatPicks: prunedOrDropAll("backgroundFeat", state.backgroundFeatPicks ?? {}),
  } : {};

  return { state: { ...state, ...backgroundFields, raceChoices, feats, classes }, dropped: count.n };
}

interface FormWithChoices {
  basicInfo: { classes?: CharacterClassEntry[] };
  choices?: Partial<Pick<ChoicesState, "backgroundId" | "backgroundChoices" | "backgroundFeatPicks">> & { raceChoices: Picks; feats: ChoicesState["feats"] };
}

/** Прибирає піки, яких більше немає в обраній расі/класі (зміна раси, реролл), перед відправкою форми. */
export function pruneFormChoices<T extends FormWithChoices>(data: T, refs: ChoiceRefs): T {
  const classes = data.basicInfo.classes ?? [];

  if (!data.choices && !classes.some((e) => e.choices)) return data;

  const { state } = prunePicks({ ...data.choices, raceChoices: data.choices?.raceChoices ?? {}, feats: data.choices?.feats ?? [], classes }, refs);

  return {
    ...data,
    ...(data.choices && { choices: { ...data.choices, ...backgroundFields(state), raceChoices: state.raceChoices, feats: state.feats } }),
    basicInfo: { ...data.basicInfo, ...(data.basicInfo.classes && { classes: state.classes }) },
  };
}

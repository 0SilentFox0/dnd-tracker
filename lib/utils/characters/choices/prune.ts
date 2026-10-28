import { backgroundFields } from "@/lib/utils/backgrounds/selection";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import type { ChoiceRefs } from "@/lib/utils/characters/choices/walk";
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

  const raceChoices = prune(refs.race?.choices ?? [], state.raceChoices, refs, count, true);

  const classes = state.classes.map((e) => {
    const cls = refs.classesById[e.classId];

    if (!cls || !e.choices) return e;

    const picks = prune(classChoiceDefs(cls, cls.subclasses.find((s) => s.id === e.subclassId) ?? null), e.choices, refs, count, true);

    return Object.keys(picks).length > 0 ? { ...e, choices: picks } : { classId: e.classId, level: e.level, ...(e.subclassId && { subclassId: e.subclassId }) };
  });

  const feats = state.feats.flatMap((f) => {
    const feat = refs.featsById[f.id];

    if (!feat) {
      count.n += 1;

      return [];
    }

    return [f.picks ? { ...f, picks: prune(feat.choices, f.picks, refs, count, false) } : f];
  });

  const background = state.backgroundId ? refs.backgroundsById?.[state.backgroundId] : null;

  const backgroundFeat = background?.originFeatId ? refs.featsById[background.originFeatId] : null;

  const backgroundFields = state.backgroundId !== undefined ? {
    backgroundChoices: prune(background?.choices ?? [], state.backgroundChoices ?? {}, refs, count, true),
    backgroundFeatPicks: prune(backgroundFeat?.choices ?? [], state.backgroundFeatPicks ?? {}, refs, count, false),
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

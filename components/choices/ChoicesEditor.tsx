"use client";

import { ChoicePicker,type PickerContext } from "./ChoicePicker";

import { HudSection } from "@/components/hud/form";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceRefsView } from "@/lib/hooks/characters";
import { abilityPicksOf, abilityScoreDelta } from "@/lib/utils/characters/choices/ability";
import { classChoiceDefs } from "@/lib/utils/characters/choices/class-choices";
import { isChoiceOpen } from "@/lib/utils/characters/choices/count";
import { skillFlags, skillPicksOf, visitPicks } from "@/lib/utils/characters/choices/walk";
import { maxSlotLevelFor } from "@/lib/utils/spells/class-slots";
import type { Choice, ChoiceIssue, ChoicePick, ChoicesState, Picks } from "@/types/choices";

interface ChoicesEditorProps {
  state: { data: ChoicesState; set: (next: ChoicesState) => void };
  refs: ChoiceRefsView;
  hero: { level: number; scores: Record<AbilityKey, number>; skills: unknown; classMode: boolean };
  issues?: ChoiceIssue[];
  /** збережені вибори, чий приріст уже входить у hero.scores */
  saved?: ChoicesState;
  only?: { classId: string; level: number };
}

const issueFor = (issues: ChoiceIssue[] | undefined, path: string) => issues?.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message;

export function ChoicesEditor({ state: { data, set }, refs, hero, issues, saved, only }: ChoicesEditorProps) {
  const visits = visitPicks(data, refs, { level: hero.level, classMode: hero.classMode });

  const delta = abilityScoreDelta(saved ? abilityPicksOf(visitPicks(saved, refs, { level: hero.level, classMode: hero.classMode })) : [], abilityPicksOf(visits));

  const scoreAfter = Object.fromEntries(ABILITY_KEYS.map((k) => [k, hero.scores[k] + (delta[k] ?? 0)])) as Record<AbilityKey, number>;

  const base: Omit<PickerContext, "level" | "columns" | "maxSlotLevel"> = {
    totalLevel: hero.level,
    feats: refs.feats,
    featsById: refs.featsById,
    spells: refs.spells,
    proficient: new Set([...skillFlags(hero.skills), ...skillPicksOf(visits, "skill")]),
    scores: hero.scores,
    scoreAfter,
  };

  const pickers = (defs: readonly Choice[], picks: Picks, ctx: PickerContext, path: string, onPicks: (next: Picks) => void, filter: (c: Choice) => boolean) =>
    defs.filter(filter).map((c) => (
      <ChoicePicker key={c.id} choice={c} value={picks[c.id] ?? []} onChange={(list: ChoicePick[]) => onPicks({ ...picks, [c.id]: list })} ctx={ctx} error={issueFor(issues, `${path}.${c.id}`)} />
    ));

  const raceDefs = refs.race?.choices ?? [];

  const originFeats = refs.feats.filter((f) => f.type === "origin");

  const origin = data.feats.find((f) => f.source === "origin");

  return (
    <div className="space-y-4">
      {!only && raceDefs.length > 0 && (
        <HudSection title={`Раса: ${refs.race?.name}`}>
          <div className="space-y-4">
            {pickers(raceDefs, data.raceChoices, { ...base, level: hero.level, maxSlotLevel: 0 }, "raceChoices", (raceChoices) => set({ ...data, raceChoices }), (c) => isChoiceOpen(c, hero.level, "race"))}
          </div>
        </HudSection>
      )}

      {!only && hero.classMode && originFeats.length > 0 && (
        <HudSection title="Риса походження">
          <ChoicePicker
            choice={{ id: "origin", label: "Риса походження", level: 1, count: 1, kind: "feat", featTypes: ["origin"] }}
            value={origin ? [{ id: origin.id, ...(origin.picks && { picks: origin.picks }) }] : []}
            onChange={(list) => set({ ...data, feats: [...data.feats.filter((f) => f.source !== "origin"), ...list.map((p) => ({ id: p.id, source: "origin" as const, ...(p.picks && { picks: p.picks }) }))] })}
            ctx={{ ...base, level: hero.level, maxSlotLevel: 0 }}
            error={issueFor(issues, "feats")}
          />
        </HudSection>
      )}

      {hero.classMode &&
        data.classes
          .filter((e) => !only || e.classId === only.classId)
          .map((entry) => {
            const cls = refs.classesById[entry.classId];

            if (!cls) return null;

            const subclass = cls.subclasses.find((s) => s.id === entry.subclassId) ?? null;

            const defs = classChoiceDefs(cls, subclass);

            const ctx: PickerContext = { ...base, level: entry.level, columns: cls.columns ?? [], maxSlotLevel: maxSlotLevelFor({ ...entry, class: cls, subclass }) };

            const setPicks = (choices: Picks) => set({ ...data, classes: data.classes.map((e) => (e.classId === entry.classId ? { ...e, choices } : e)) });

            const filter = only ? (c: Choice) => c.level <= only.level && (c.level === only.level || typeof c.count !== "number") : (c: Choice) => isChoiceOpen(c, entry.level, "class");

            const list = pickers(defs, entry.choices ?? {}, ctx, `classes.${entry.classId}`, setPicks, filter);

            return list.length > 0 ? (
              <HudSection key={entry.classId} title={`${cls.name} ${entry.level}`}>
                <div className="space-y-4">{list}</div>
              </HudSection>
            ) : null;
          })}
    </div>
  );
}

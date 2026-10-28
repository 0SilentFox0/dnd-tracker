"use client";

import { useTranslations } from "next-intl";

import { ChoicePicker,type PickerContext } from "./ChoicePicker";

import { HUD_SELECT_CLASS, HudSection } from "@/components/hud/form";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import type { ChoiceRefsView } from "@/lib/hooks/characters";
import { useTranslator } from "@/lib/i18n/use-translator";
import { mergeBackground } from "@/lib/utils/backgrounds/selection";
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
  only?: { classId: string; level: number; multiclass?: boolean };
}

const issueFor = (issues: ChoiceIssue[] | undefined, path: string) => issues?.find((i) => i.path === path || i.path.startsWith(`${path}.`))?.message;

export function ChoicesEditor({ state: { data, set }, refs, hero, issues, saved, only }: ChoicesEditorProps) {
  const t = useTranslations("choices");

  const tc = useTranslator("common");

  const visits = visitPicks(data, refs, { level: hero.level, classMode: hero.classMode });

  const delta = abilityScoreDelta(saved ? abilityPicksOf(visitPicks(saved, refs, { level: hero.level, classMode: hero.classMode })) : [], abilityPicksOf(visits));

  const scoreAfter = Object.fromEntries(ABILITY_KEYS.map((k) => [k, hero.scores[k] + (delta[k] ?? 0)])) as Record<AbilityKey, number>;

  const base: Omit<PickerContext, "level" | "columns" | "maxSlotLevel"> = {
    totalLevel: hero.level,
    feats: refs.feats,
    featsById: refs.featsById,
    spells: refs.spells,
    proficient: new Set([...(data.backgroundId ? refs.backgroundsById?.[data.backgroundId]?.skillProficiencies ?? [] : []), ...skillFlags(hero.skills), ...skillPicksOf(visits, "skill")]),
    scores: hero.scores,
    scoreAfter,
  };

  const pickers = (defs: readonly Choice[], picks: Picks, ctx: PickerContext, path: string, onPicks: (next: Picks) => void, filter: (c: Choice) => boolean) =>
    defs.filter(filter).map((c) => (
      <ChoicePicker key={c.id} choice={c} value={picks[c.id] ?? []} onChange={(list: ChoicePick[]) => onPicks({ ...picks, [c.id]: list })} ctx={ctx} error={issueFor(issues, `${path}.${c.id}`)} />
    ));

  const raceDefs = refs.race?.choices ?? [];

  const background = data.backgroundId ? refs.backgroundsById?.[data.backgroundId] : null;

  const backgroundFeat = background?.originFeatId ? refs.featsById[background.originFeatId] : null;

  const originFeats = refs.feats.filter((f) => f.type === "origin");

  const origin = data.feats.find((f) => f.source === "origin");

  return (
    <div className="space-y-4">
      {!only && hero.classMode && (
        <HudSection title={t("editor.background")}>
          <label className="block space-y-2">{t("editor.background")}
            <select aria-label={t("editor.background")} className={`${HUD_SELECT_CLASS} w-full`} value={data.backgroundId ?? ""} onChange={(e) => set({ ...data, ...mergeBackground(data, { backgroundId: e.target.value || null }) })}>
              <option value="">{t("editor.noBackground")}</option>
              {Object.values(refs.backgroundsById ?? {}).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <p className="text-xs text-hud-muted">{t("editor.backgroundHint")}</p>
          {background && <div className="space-y-3">
            {background.description && <p className="whitespace-pre-line text-sm">{background.description}</p>}
            <p>{background.skillProficiencies.map((s) => tc(`dndSkills.${s}`)).join(", ")}</p>
            <p>{background.toolProficiencies.join(", ")}</p>
            {background.equipmentText && <p className="whitespace-pre-line text-sm">{background.equipmentText}</p>}
            {origin && <div role="alert" className="text-sm text-hud-danger">{t("editor.originFirst")}
              <button type="button" className="ml-2 underline" onClick={() => set({ ...data, feats: data.feats.filter((f) => f.source !== "origin") })}>{t("editor.replaceOrigin")}</button>
            </div>}
            {pickers(background.choices, data.backgroundChoices ?? {}, { ...base, level: hero.level, maxSlotLevel: 0 }, "backgroundChoices", (backgroundChoices) => set({ ...data, backgroundChoices }), (c) => isChoiceOpen(c, hero.level, "background"))}
            {backgroundFeat && <div className="space-y-3"><p className="hud-sc">{t("editor.backgroundFeat", { name: backgroundFeat.name })}</p>
              {pickers(backgroundFeat.choices, data.backgroundFeatPicks ?? {}, { ...base, level: hero.level, maxSlotLevel: 0 }, "backgroundFeatPicks", (backgroundFeatPicks) => set({ ...data, backgroundFeatPicks }), () => true)}
            </div>}
          </div>}
          {issueFor(issues, "backgroundId") && <p role="alert">{issueFor(issues, "backgroundId")}</p>}
        </HudSection>
      )}
      {!only && raceDefs.length > 0 && (
        <HudSection title={t("editor.race", { name: refs.race?.name ?? "" })}>
          <div className="space-y-4">
            {pickers(raceDefs, data.raceChoices, { ...base, level: hero.level, maxSlotLevel: 0 }, "raceChoices", (raceChoices) => set({ ...data, raceChoices }), (c) => isChoiceOpen(c, hero.level, "race"))}
          </div>
        </HudSection>
      )}

      {!only && !background && hero.classMode && originFeats.length > 0 && (
        <HudSection title={t("editor.originFeat")}>
          <ChoicePicker
            choice={{ id: "origin", label: t("editor.originFeat"), level: 1, count: 1, kind: "feat", featTypes: ["origin"] }}
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

            const defs = classChoiceDefs(cls, subclass, only ? !!only.multiclass : data.classes.indexOf(entry) > 0);

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

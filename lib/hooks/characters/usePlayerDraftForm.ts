import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";
import { draftPortraitsQuery, useDraftPortraits } from "./useDraftPortraits";
import { type RollStep, useRollReveal } from "./useRollReveal";

import { createDraft, generateBackstory, generateDraftAvatar, getBackstoryAvailability, updateDraft } from "@/lib/api/characters";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { ALIGNMENTS } from "@/lib/constants/alignment";
import { HERO_ARCHETYPE_KEYS, HERO_ARCHETYPE_OPTIONS } from "@/lib/constants/hero-archetypes";
import { useClassMode } from "@/lib/hooks/classes";
import { useOptionalNotify } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import { classModeOf } from "@/lib/utils/characters/classes";
import {
  type AbilityMethod,
  type AbilityScores,
  ARCHETYPE_CLASS,
  ARCHETYPE_PRIMARY,
  assignByPriority,
  assignStandardArray,
  classPrimaryAbilities,
  createRng,
  generateBackstory as generateLocalBackstory,
  generateCharacter,
  generateName,
  pick,
  pointBuySpent,
  STANDARD_ARRAY,
  validateAbilityScores,
} from "@/lib/utils/characters/generate";
import type { DraftInput } from "@/types/characters";

export type RollKey = "race" | "avatar" | "archetype" | "class" | "alignment" | "name" | "background" | AbilityKey;

const standardScores = (): AbilityScores => Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, STANDARD_ARRAY[i]])) as AbilityScores;

const EMPTY_DRAFT: DraftInput = { name: "", race: "", class: ARCHETYPE_CLASS.warrior, archetype: "warrior", method: "standard", ...standardScores(), goals: [] };

const ARCHETYPE_LABEL = Object.fromEntries(HERO_ARCHETYPE_OPTIONS.map((o) => [o.value, o.label]));

const seedNow = () => Date.now();

const scoresOf = (v: DraftInput): AbilityScores => Object.fromEntries(ABILITY_KEYS.map((k) => [k, v[k]])) as AbilityScores;

export interface PlayerDraftFormOptions {
  campaignId: string;
  characterId?: string;
  initial?: "generate" | DraftInput;
}

export function usePlayerDraftForm({ campaignId, characterId, initial }: PlayerDraftFormOptions) {
  const router = useRouter();

  const notify = useOptionalNotify();

  const queryClient = useQueryClient();

  const { data: raceList } = useRaces(campaignId);

  const classMode = useClassMode(campaignId);

  const classBased = classModeOf(classMode.enabled, classMode.classes.length);

  const raceNames = useMemo(() => (raceList ?? []).map((r) => r.name), [raceList]);

  const [values, setValues] = useState<DraftInput>(typeof initial === "object" ? initial : EMPTY_DRAFT);

  const reveal = useRollReveal<RollKey>();

  const { start } = reveal;

  const set = useCallback(<K extends keyof DraftInput>(key: K, value: DraftInput[K]) => setValues((prev) => ({ ...prev, [key]: value })), []);

  const setScore = useCallback((key: AbilityKey, value: number) => {
    setValues((prev) => {
      const holder = prev.method === "standard" ? ABILITY_KEYS.find((k) => k !== key && prev[k] === value) : undefined;

      return { ...prev, [key]: value, ...(holder && { [holder]: prev[key] }) };
    });
  }, []);

  const setMethod = useCallback((method: AbilityMethod) => {
    setValues((prev) => ({ ...prev, method, ...(method === "pointBuy" ? Object.fromEntries(ABILITY_KEYS.map((k) => [k, 8])) : standardScores()) }));
  }, []);

  const raceStep = useCallback((race: string): RollStep<RollKey> => ({ key: "race", pool: () => (raceNames.length ? pick(Math.random, raceNames) : race), final: race }), [raceNames]);

  const scoreSteps = (scores: AbilityScores): Array<RollStep<RollKey>> => ABILITY_KEYS.map((key) => ({ key, pool: () => pick(Math.random, STANDARD_ARRAY), final: scores[key] }));

  const nameStep = (name: string, race: string): RollStep<RollKey> => ({ key: "name", pool: () => generateName(race, Math.random), final: name });

  const backgroundStep = (background: string): RollStep<RollKey> => ({ key: "background", pool: () => "", final: background });

  const portraitPools = useDraftPortraits(campaignId);

  const portraitPool = useCallback((race: string) => queryClient.getQueryData<Record<string, string[]>>(characterKeys.draftPortraits(campaignId))?.[race] ?? [], [queryClient, campaignId]);

  const canReroll = (portraitPools.data?.[values.race]?.length ?? 0) > 0;

  const avatarStep = (url: string, pool: string[]): RollStep<RollKey> => ({ key: "avatar", pool: () => pick(Math.random, pool), final: url });

  const all = useCallback(() => {
    const seed = seedNow();

    const g = generateCharacter({ races: raceNames, seed, classes: classBased ? classMode.classes : undefined });

    const pool = portraitPool(g.race);

    const portrait = pool.length ? pick(createRng(seed), pool) : undefined;

    if (!pool.length && g.race) {
      queryClient
        .fetchQuery(draftPortraitsQuery(campaignId))
        .then((pools) => {
          const loaded = pools[g.race] ?? [];

          if (loaded.length) setValues((prev) => (prev.race === g.race ? { ...prev, avatar: pick(createRng(seed), loaded) } : prev));
        })
        .catch(() => undefined);
    }

    setValues((prev) => ({
      ...prev,
      name: g.name,
      race: g.race,
      archetype: g.archetype,
      class: g.class,
      classId: g.classId,
      alignment: g.alignment,
      method: g.method,
      ...g.scores,
      primaryAbility: g.primaryAbility,
      background: g.background,
      goals: g.goals,
      ...(portrait && { avatar: portrait }),
    }));

    start([
      raceStep(g.race),
      ...(portrait ? [avatarStep(portrait, pool)] : []),
      ...(classBased ? [] : [{ key: "archetype" as const, pool: () => ARCHETYPE_LABEL[pick(Math.random, HERO_ARCHETYPE_KEYS)], final: ARCHETYPE_LABEL[g.archetype] }]),
      { key: "class", pool: () => (classBased ? pick(Math.random, classMode.classes).name : ARCHETYPE_CLASS[pick(Math.random, HERO_ARCHETYPE_KEYS)]), final: g.class },
      { key: "alignment", pool: () => pick(Math.random, ALIGNMENTS), final: g.alignment },
      nameStep(g.name, g.race),
      ...scoreSteps(g.scores),
      backgroundStep(g.background),
    ]);
  }, [raceNames, raceStep, start, portraitPool, queryClient, campaignId, classBased, classMode.classes]);

  const name = useCallback(() => {
    const next = generateName(values.race, Math.random);

    setValues((prev) => ({ ...prev, name: next }));

    start([nameStep(next, values.race)]);
  }, [start, values.race]);

  const scores = useCallback(() => {
    const cls = classBased ? classMode.classes.find((c) => c.id === values.classId) : undefined;

    const priority = cls ? classPrimaryAbilities(cls) : ARCHETYPE_PRIMARY[values.archetype];

    const next = cls ? assignByPriority(priority, Math.random) : assignStandardArray(values.archetype, Math.random);

    setValues((prev) => ({ ...prev, method: "standard", ...next, primaryAbility: priority[0] ?? ARCHETYPE_PRIMARY[prev.archetype][0] }));

    start(scoreSteps(next));
  }, [start, values.archetype, values.classId, classBased, classMode.classes]);

  const setClass = useCallback(
    (classId: string) => setValues((prev) => ({ ...prev, classId, class: classMode.classes.find((c) => c.id === classId)?.name ?? prev.class })),
    [classMode.classes],
  );

  const backstory = useCallback(() => {
    const next = generateLocalBackstory({ name: values.name || "Герой", raceName: values.race, archetype: values.archetype }, Math.random);

    setValues((prev) => ({ ...prev, ...next }));

    start([backgroundStep(next.background)]);
  }, [start, values.archetype, values.name, values.race]);

  const portrait = useCallback(() => {
    const pool = portraitPool(values.race);

    const options = pool.length > 1 ? pool.filter((url) => url !== values.avatar) : pool;

    if (!options.length) return;

    const next = pick(createRng(seedNow()), options);

    setValues((prev) => ({ ...prev, avatar: next }));
    start([avatarStep(next, pool)]);
  }, [portraitPool, start, values.race, values.avatar]);

  const availability = useQuery({ queryKey: characterKeys.backstoryAvailability(campaignId), queryFn: () => getBackstoryAvailability(campaignId), staleTime: 5 * 60_000 });

  const aiMutation = useMutation({
    mutationFn: () => generateBackstory(campaignId, { name: values.name, race: values.race, archetype: values.archetype, class: values.class, background: values.background || undefined }),
    onError: (error) => notify(error.message || "Не вдалося згенерувати передісторію"),
    onSuccess: (res) => {
      setValues((prev) => ({ ...prev, background: res.background, goals: res.goals }));
      start([backgroundStep(res.background)]);
    },
  });

  const avatarMutation = useMutation({
    mutationFn: () => generateDraftAvatar(campaignId, { name: values.name, race: values.race, archetype: values.archetype, class: values.class }),
    onError: (error) => notify(error.message || "Не вдалося згенерувати аватар"),
    onSuccess: (res) => setValues((prev) => ({ ...prev, avatar: res.url })),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const body: DraftInput = { ...values, alignment: values.alignment || undefined, background: values.background || undefined, avatar: values.avatar };

      return characterId ? updateDraft(campaignId, characterId, body) : createDraft(campaignId, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: characterKeys.sheet(campaignId) });
      router.push(`/campaigns/${campaignId}/character`);
    },
  });

  const autoGenerated = useRef(false);

  useEffect(() => {
    if (initial !== "generate" || autoGenerated.current || raceList === undefined || portraitPools.isPending || classMode.pending) return;

    autoGenerated.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot generation once the races have loaded
    all();
  }, [initial, raceList, portraitPools.isPending, classMode.pending, all]);

  const scoreStatus = useMemo(() => {
    const scoreValues = scoresOf(values);

    return { valid: validateAbilityScores(scoreValues, values.method), spent: values.method === "pointBuy" ? pointBuySpent(scoreValues) : undefined };
  }, [values]);

  return {
    form: { values, set, setScore, classes: classBased ? { list: classMode.classes, set: setClass } : null, method: values.method, setMethod },
    generate: { all, name, scores, backstory, portrait, canPortrait: canReroll },
    ai: {
      available: availability.data?.available === true,
      run: () => aiMutation.mutate(),
      isPending: aiMutation.isPending,
      avatar: { available: availability.data?.image === true, run: () => avatarMutation.mutate(), isPending: avatarMutation.isPending },
    },
    submit: { run: () => submitMutation.mutate(), isPending: submitMutation.isPending, error: submitMutation.error instanceof Error ? submitMutation.error.message : null },
    scoreStatus,
    reveal,
  };
}

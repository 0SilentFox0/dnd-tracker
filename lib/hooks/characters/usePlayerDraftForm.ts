import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { characterKeys } from "./keys";
import { type RollStep, useRollReveal } from "./useRollReveal";

import { createDraft, generateBackstory, getBackstoryAvailability, updateDraft } from "@/lib/api/characters";
import { ABILITY_KEYS, type AbilityKey } from "@/lib/constants/abilities";
import { ALIGNMENTS } from "@/lib/constants/alignment";
import { HERO_ARCHETYPE_KEYS, HERO_ARCHETYPE_OPTIONS } from "@/lib/constants/hero-archetypes";
import { useRaces } from "@/lib/hooks/races";
import {
  type AbilityMethod,
  type AbilityScores,
  ARCHETYPE_CLASS,
  ARCHETYPE_PRIMARY,
  assignStandardArray,
  generateBackstory as generateLocalBackstory,
  generateCharacter,
  generateName,
  pick,
  pointBuySpent,
  STANDARD_ARRAY,
  validateAbilityScores,
} from "@/lib/utils/characters/generate";
import type { DraftInput } from "@/types/characters";

export type RollKey = "race" | "archetype" | "class" | "alignment" | "name" | "background" | AbilityKey;

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

  const queryClient = useQueryClient();

  const { data: raceList } = useRaces(campaignId);

  const raceNames = useMemo(() => (raceList ?? []).map((r) => r.name), [raceList]);

  const [values, setValues] = useState<DraftInput>(typeof initial === "object" ? initial : EMPTY_DRAFT);

  const reveal = useRollReveal<RollKey>();

  const set = useCallback(<K extends keyof DraftInput>(key: K, value: DraftInput[K]) => setValues((prev) => ({ ...prev, [key]: value })), []);

  const setScore = useCallback((key: AbilityKey, value: number) => setValues((prev) => ({ ...prev, [key]: value })), []);

  const setMethod = useCallback((method: AbilityMethod) => {
    setValues((prev) => ({ ...prev, method, ...(method === "pointBuy" ? Object.fromEntries(ABILITY_KEYS.map((k) => [k, 8])) : standardScores()) }));
  }, []);

  const raceStep = useCallback((race: string): RollStep<RollKey> => ({ key: "race", pool: () => (raceNames.length ? pick(Math.random, raceNames) : race), final: race }), [raceNames]);

  const scoreSteps = (scores: AbilityScores): Array<RollStep<RollKey>> => ABILITY_KEYS.map((key) => ({ key, pool: () => pick(Math.random, STANDARD_ARRAY), final: scores[key] }));

  const nameStep = (name: string, race: string): RollStep<RollKey> => ({ key: "name", pool: () => generateName(race, Math.random), final: name });

  const backgroundStep = (background: string): RollStep<RollKey> => ({ key: "background", pool: () => "", final: background });

  const all = useCallback(() => {
    const g = generateCharacter({ races: raceNames, seed: seedNow() });

    setValues((prev) => ({
      ...prev,
      name: g.name,
      race: g.race,
      archetype: g.archetype,
      class: g.class,
      alignment: g.alignment,
      method: g.method,
      ...g.scores,
      primaryAbility: g.primaryAbility,
      background: g.background,
      goals: g.goals,
    }));

    reveal.start([
      raceStep(g.race),
      { key: "archetype", pool: () => ARCHETYPE_LABEL[pick(Math.random, HERO_ARCHETYPE_KEYS)], final: ARCHETYPE_LABEL[g.archetype] },
      { key: "class", pool: () => ARCHETYPE_CLASS[pick(Math.random, HERO_ARCHETYPE_KEYS)], final: g.class },
      { key: "alignment", pool: () => pick(Math.random, ALIGNMENTS), final: g.alignment },
      nameStep(g.name, g.race),
      ...scoreSteps(g.scores),
      backgroundStep(g.background),
    ]);
  }, [raceNames, raceStep, reveal]);

  const name = useCallback(() => {
    const next = generateName(values.race, Math.random);

    setValues((prev) => ({ ...prev, name: next }));

    reveal.start([nameStep(next, values.race)]);
  }, [reveal, values.race]);

  const scores = useCallback(() => {
    const next = assignStandardArray(values.archetype, Math.random);

    setValues((prev) => ({ ...prev, method: "standard", ...next, primaryAbility: ARCHETYPE_PRIMARY[prev.archetype][0] }));

    reveal.start(scoreSteps(next));
  }, [reveal, values.archetype]);

  const backstory = useCallback(() => {
    const next = generateLocalBackstory({ name: values.name || "Герой", raceName: values.race, archetype: values.archetype }, Math.random);

    setValues((prev) => ({ ...prev, ...next }));

    reveal.start([backgroundStep(next.background)]);
  }, [reveal, values.archetype, values.name, values.race]);

  const availability = useQuery({ queryKey: ["draft-backstory-available", campaignId], queryFn: () => getBackstoryAvailability(campaignId), staleTime: 5 * 60_000 });

  const aiMutation = useMutation({
    mutationFn: () => generateBackstory(campaignId, { name: values.name, race: values.race, archetype: values.archetype, class: values.class, background: values.background || undefined }),
    onSuccess: (res) => {
      setValues((prev) => ({ ...prev, background: res.background, goals: res.goals }));
      reveal.start([backgroundStep(res.background)]);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const body: DraftInput = { ...values, alignment: values.alignment || undefined, background: values.background || undefined, avatar: values.avatar || undefined };

      return characterId ? updateDraft(campaignId, characterId, body) : createDraft(campaignId, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: characterKeys.sheet(campaignId) });
      router.push(`/campaigns/${campaignId}/character`);
    },
  });

  const autoGenerated = useRef(false);

  useEffect(() => {
    if (initial !== "generate" || autoGenerated.current || raceList === undefined) return;

    autoGenerated.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot generation once the races have loaded
    all();
  }, [initial, raceList, all]);

  const scoreStatus = useMemo(() => {
    const scoreValues = scoresOf(values);

    return { valid: validateAbilityScores(scoreValues, values.method), spent: values.method === "pointBuy" ? pointBuySpent(scoreValues) : undefined };
  }, [values]);

  return {
    form: { values, set, setScore, method: values.method, setMethod },
    generate: { all, name, scores, backstory },
    ai: { available: availability.data?.available === true, run: () => aiMutation.mutate(), isPending: aiMutation.isPending },
    submit: { run: () => submitMutation.mutate(), isPending: submitMutation.isPending, error: submitMutation.error instanceof Error ? submitMutation.error.message : null },
    scoreStatus,
    reveal,
  };
}

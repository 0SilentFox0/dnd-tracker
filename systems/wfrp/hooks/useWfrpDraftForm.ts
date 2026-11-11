import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createWfrpDraft, updateWfrpDraftIdentity } from "@/lib/api/characters";
import { ApiError } from "@/lib/api/client";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCareers } from "@/lib/hooks/careers";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { useRollReveal } from "@/lib/hooks/characters/useRollReveal";
import { useFeats } from "@/lib/hooks/feats";
import { useRaceProfiles, useRaces } from "@/lib/hooks/races";
import { useRuleSystem } from "@/lib/hooks/systems/useRuleSystem";
import { cryptoRandom } from "@/lib/utils/common/dice";
import type { Rng } from "@/lib/utils/common/rng";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";
import type { WfrpDraftIdentityInput, WfrpDraftInput } from "@/systems/wfrp/api/types";
import { CHARACTERISTIC_KEYS } from "@/systems/wfrp/rules/characteristics/keys";
import { type CreationPicks, type CreationRolls, isUsableProfile, planDraft, type PlanDraftResult, rollCreation, type SpeciesProfile } from "@/systems/wfrp/rules/creation";
import type { Race } from "@/types/races";

export type WfrpDraftStepId = "species" | "career" | "stats" | "talents" | "identity";

type StatsMode = CreationPicks["stats"]["mode"];

type CareerMode = CreationPicks["career"]["mode"];

const FULL_STEPS: WfrpDraftStepId[] = ["species", "career", "stats", "talents", "identity"];

const STAT_COUNT = CHARACTERISTIC_KEYS.length;

const VISIBLE_STEP_ERRORS = new Set(["CAREER_UNKNOWN", "FEAT_UNKNOWN", "PROFILE_NOT_READY"]);

const STEP_ERRORS: Record<WfrpDraftStepId, (code: string) => boolean> = {
  species: (c) => c === "PROFILE_NOT_READY",
  career: (c) => c.startsWith("CAREER_"),
  stats: (c) => c.startsWith("STATS_") || c.startsWith("POINTS_"),
  talents: (c) => c.startsWith("TALENT_") || c === "FEAT_UNKNOWN",
  identity: () => false,
};

export interface WfrpDraftFormOptions {
  campaignId: string;
  characterId?: string;
  initialIdentity?: WfrpDraftIdentityInput;
  rng?: Rng;
}

export function useWfrpDraftForm({ campaignId, characterId, initialIdentity, rng = cryptoRandom }: WfrpDraftFormOptions) {
  const router = useRouter();

  const queryClient = useQueryClient();

  const { system } = useRuleSystem({ campaignId });

  const rules = useCampaignRules(campaignId).data?.advancement;

  const races = useRaces(campaignId);

  const profiles = useRaceProfiles(campaignId);

  const careers = useCareers(campaignId);

  const feats = useFeats(campaignId);

  const reveal = useRollReveal<string>();

  const identityOnly = !!characterId;

  const steps = identityOnly ? (["identity"] as WfrpDraftStepId[]) : FULL_STEPS;

  const [index, setIndex] = useState(0);

  const [speciesId, setSpeciesId] = useState<string>();

  const [careerMode, setCareerModeState] = useState<CareerMode>("rolled");

  const [careerId, setCareerId] = useState<string>();

  const [careerRolls, setCareerRolls] = useState<CreationRolls["careerRolls"]>([]);

  const [statsMode, setStatsMode] = useState<StatsMode>("rolled");

  const [statRolls, setStatRolls] = useState<number[]>([]);

  const [arranged, setArranged] = useState<number[]>([]);

  const [points, setPoints] = useState<number[]>(() => Array.from({ length: STAT_COUNT }, () => 10));

  const [rolledTalents, setRolledTalents] = useState<string[]>([]);

  const [identity, setIdentity] = useState<WfrpDraftIdentityInput>(initialIdentity ?? { name: "" });

  const creation = system?.creation;

  const species = useMemo(() => {
    if (!creation) return [];

    const byRace = new Map((profiles.data ?? []).map((p) => [p.raceId, p.profile]));

    return (races.data ?? []).flatMap((race): { race: Race; profile: SpeciesProfile }[] => {
      const profile = byRace.get(race.id);

      return profile && isUsableProfile(profile) ? [{ race, profile }] : [];
    });
  }, [creation, profiles.data, races.data]);

  const selected = species.find((s) => s.race.id === speciesId);

  const profile = selected?.profile;

  const talentCount = profile && profile.randomTalents.length ? profile.randomTalentCount : 0;

  const careerName = useCallback((id: string) => careers.data?.find((c) => c.id === id)?.name ?? id, [careers.data]);

  const featName = useCallback((id: string) => feats.data?.find((f) => f.id === id)?.name ?? id, [feats.data]);

  const picks = useMemo<CreationPicks>(
    () => ({
      career: { mode: careerMode, careerId: careerId ?? "" },
      stats: statsMode === "free" ? { mode: "free", points } : statsMode === "rearranged" ? { mode: "rearranged", rolls: statRolls, arranged } : { mode: "rolled", rolls: statRolls },
      talents: rolledTalents,
    }),
    [careerMode, careerId, statsMode, points, statRolls, arranged, rolledTalents],
  );

  const preview: PlanDraftResult | undefined = useMemo(() => {
    if (identityOnly || !creation || !profile || !rules) return undefined;

    return planDraft(picks, { profile, rules, careerIds: new Set((careers.data ?? []).map((c) => c.id)), featIds: new Set((feats.data ?? []).map((f) => f.id)) });
  }, [identityOnly, creation, profile, rules, picks, careers.data, feats.data]);

  const errorsFor = (id: WfrpDraftStepId) => (preview && !preview.ok ? preview.errors.filter(STEP_ERRORS[id]) : []);

  const stepId = steps[index];

  const valid: Record<WfrpDraftStepId, boolean> = {
    species: !!profile,
    career: !!careerId && errorsFor("career").length === 0 && careerPickValid(careerMode, careerId, careerRolls),
    stats: !!preview && errorsFor("stats").length === 0,
    talents: !!preview && errorsFor("talents").length === 0 && rolledTalents.length === talentCount,
    identity: identity.name.trim().length > 0 && (identityOnly || (!!preview && preview.ok)),
  };

  const stepErrors = (id: WfrpDraftStepId) => errorsFor(id).filter((c) => VISIBLE_STEP_ERRORS.has(c) && (c !== "CAREER_UNKNOWN" || !!careerId));

  const rollAll = useCallback(() => (profile && creation ? rollCreation(rng, profile) : undefined), [creation, profile, rng]);

  const selectSpecies = useCallback((raceId: string) => {
    if (raceId === speciesId) return;

    setSpeciesId(raceId);
    setCareerId(undefined);
    setCareerRolls([]);
    setStatRolls([]);
    setArranged([]);
    setRolledTalents([]);
  }, [speciesId]);

  const setCareerMode = useCallback(
    (mode: CareerMode) => {
      setCareerModeState(mode);
      setCareerId((prev) => (mode === "rolled" ? careerRolls[0]?.careerId : mode === "choice" ? (careerRolls.some((r) => r.careerId === prev) ? prev : undefined) : prev));
    },
    [careerRolls],
  );

  const rollCareer = useCallback(() => {
    if (careerRolls.length) return;

    const rolled = rollAll();

    if (!rolled) return;

    setCareerRolls(rolled.careerRolls);
    setCareerId(careerMode === "rolled" ? rolled.careerRolls[0]?.careerId : undefined);
    reveal.start(rolled.careerRolls.map((r, i) => ({ key: `career${i}`, pool: () => careerName((profile?.careerTable[Math.floor(rng() * profile.careerTable.length)] ?? r).careerId), final: careerName(r.careerId) })));
  }, [careerRolls.length, careerMode, rollAll, reveal, careerName, profile, rng]);

  const rollStats = useCallback(() => {
    if (statRolls.length) return;

    const rolled = rollAll();

    if (!rolled) return;

    setStatRolls(rolled.statRolls);
    setArranged(rolled.statRolls);
    reveal.start(rolled.statRolls.map((v, i) => ({ key: `stat${i}`, pool: () => 2 + Math.floor(rng() * 19), final: v })));
  }, [statRolls.length, rollAll, reveal, rng]);

  const swap = useCallback((i: number, j: number) => setArranged((prev) => prev.map((v, k) => (k === i ? prev[j] : k === j ? prev[i] : v))), []);

  const setPoint = useCallback((i: number, v: number) => setPoints((prev) => prev.map((p, k) => (k === i ? v : p))), []);

  const rollTalents = useCallback(() => {
    if (rolledTalents.length) return;

    const rolled = rollAll();

    if (!rolled) return;

    setRolledTalents(rolled.randomTalents);
    reveal.start(rolled.randomTalents.map((f, i) => ({ key: `talent${i}`, pool: () => featName((profile?.randomTalents[Math.floor(rng() * profile.randomTalents.length)] ?? { featId: f }).featId), final: featName(f) })));
  }, [rolledTalents.length, rollAll, reveal, featName, profile, rng]);

  const mutation = useMutation({
    mutationFn: () => {
      if (characterId) return updateWfrpDraftIdentity(campaignId, characterId, cleanIdentity(identity));

      const body: WfrpDraftInput = { ...cleanIdentity(identity), speciesId: speciesId ?? "", career: picks.career, stats: picks.stats, talents: picks.talents };

      return createWfrpDraft(campaignId, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: characterKeys.sheet(campaignId) });
      router.push(`/campaigns/${campaignId}/character`);
    },
  });

  return {
    step: { id: stepId, index, total: steps.length, canNext: valid[stepId], hideNext: stepId === "species" && (races.isPending || profiles.isPending || species.length === 0), next: () => setIndex((i) => Math.min(i + 1, steps.length - 1)), back: () => setIndex((i) => Math.max(i - 1, 0)) },
    species: { data: species, selected: speciesId, select: selectSpecies, loading: races.isPending || profiles.isPending },
    career: { mode: careerMode, setMode: setCareerMode, rolls: careerRolls, roll: rollCareer, careerId, pick: setCareerId, table: profile?.careerTable ?? [], all: careers.data ?? [] },
    stats: { mode: statsMode, setMode: setStatsMode, rolls: statRolls, roll: rollStats, arranged, swap, points, setPoint, budget: rules?.creation.freeBudget ?? 0 },
    talents: { fixed: profile?.talents ?? [], count: talentCount, rolled: rolledTalents, roll: rollTalents, names: featName },
    careerName,
    profile,
    xp: rules?.creation,
    shown: (key: string, final: string | number) => (reveal.rolling && !reveal.settled.has(key) && key in reveal.display ? reveal.display[key] ?? final : final),
    preview,
    stepErrors,
    identity: { values: identity, set: (patch: Partial<WfrpDraftIdentityInput>) => setIdentity((prev) => ({ ...prev, ...patch })) },
    reveal,
    submit: { run: () => mutation.mutate(), isPending: mutation.isPending, error: mutation.error, issueCodes: serverIssueCodes(mutation.error), canRun: valid.identity },
  };
}

const careerPickValid = (mode: CareerMode, careerId: string, rolls: CreationRolls["careerRolls"]) => (mode === "rolled" ? careerId === rolls[0]?.careerId : mode === "choice" ? rolls.some((r) => r.careerId === careerId) : true);

const cleanIdentity = ({ name, alignment, background, avatar, goals }: WfrpDraftIdentityInput): WfrpDraftIdentityInput => ({
  name: name.trim(),
  ...(alignment && RULE_SYSTEM_REGISTRY.wfrp.identity.alignments && { alignment }),
  ...(background && { background }),
  ...(avatar && { avatar }),
  ...(goals?.length && { goals }),
});

const serverIssueCodes = (error: unknown): string[] => {
  const issues = error instanceof ApiError ? (error.body as { issues?: unknown } | undefined)?.issues : undefined;

  return Array.isArray(issues) ? [...new Set(issues.filter((i): i is string => typeof i === "string"))] : [];
};

"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useMainSkills } from "./useMainSkills";
import { useSkills } from "./useSkills";

import { createMainSkill } from "@/lib/api/main-skills";
import { getSkillTrees, updateSkillTree } from "@/lib/api/skill-trees";
import { useNotify } from "@/lib/hooks/common";
import { useRaces } from "@/lib/hooks/races";
import type { CellRef, RawTree } from "@/lib/utils/skills/progression";
import { RACIAL_BRANCH_ID } from "@/lib/utils/skills/progression";
import * as edit from "@/lib/utils/skills/progression";

export function useSkillTreeEditor(campaignId: string) {
  const queryClient = useQueryClient();

  const notify = useNotify();

  const { data: races = [], isPending: racesPending } = useRaces(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const { data: skills = [] } = useSkills(campaignId);

  const trees = useQuery({ queryKey: ["skill-trees", campaignId], queryFn: () => getSkillTrees(campaignId), enabled: !!campaignId });

  const [race, setRace] = useState<string | null>(null);

  const [draft, setDraft] = useState<{ key: string; treeId: string; raw: RawTree } | null>(null);

  const [saving, setSaving] = useState(false);

  const activeRace = race ?? races[0]?.name ?? null;

  const serverRow = trees.data?.find((t) => t.race === activeRace) ?? null;

  const seedKey = activeRace && trees.isSuccess ? `${activeRace}:${serverRow?.id ?? "new"}` : null;

  const seeded = useMemo(() => {
    if (!seedKey || !activeRace) return null;

    const starting = ((races.find((r) => r.name === activeRace)?.availableSkills as string[] | undefined) ?? [])
      .map((id) => mainSkills.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => !!m)
      .map((m) => ({ id: m.id, name: m.name, color: m.color, icon: m.icon ?? null, spellGroupId: m.spellGroupId ?? null }));

    return { key: seedKey, treeId: serverRow?.id ?? "new", raw: serverRow ? edit.readTreeJson(serverRow.skills) : edit.emptyTree(activeRace, starting) };
  }, [seedKey, activeRace, serverRow, races, mainSkills]);

  // правки живуть у чернетці свого ключа (раса + id дерева); рефетч оновлює лише незмінене
  const current = draft && draft.key === seedKey ? draft : seeded;

  const baseline = useMemo(() => (seedKey && serverRow ? JSON.stringify(edit.readTreeJson(serverRow.skills)) : null), [seedKey, serverRow]);

  const update = (fn: (raw: RawTree) => RawTree) => {
    if (current) setDraft({ ...current, raw: fn(current.raw) });
  };

  const raw = current?.raw ?? null;

  const treeId = current?.treeId ?? null;

  const tree = useMemo(() => (raw && treeId ? edit.normalizeTree({ id: treeId, race: activeRace ?? "", skills: raw }) : null), [raw, treeId, activeRace]);

  const errors = useMemo(
    () => (raw ? edit.validateTree(raw, { mainSkillIds: new Set(mainSkills.map((m) => m.id)), skillIds: new Set(skills.map((s) => s.id)) }) : []),
    [raw, mainSkills, skills],
  );

  const skillName = (s: (typeof skills)[number]) => (s as { basicInfo?: { name?: string } }).basicInfo?.name ?? s.name ?? s.id;

  const save = async () => {
    if (!current || !activeRace || errors.length > 0) return;

    setSaving(true);
    try {
      const saved = await updateSkillTree({ campaignId, treeId: current.treeId, race: activeRace, skills: current.raw });

      setDraft({ key: `${activeRace}:${saved.id}`, treeId: saved.id, raw: edit.readTreeJson(saved.skills) });
      await queryClient.invalidateQueries({ queryKey: ["skill-trees", campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["character-progression", campaignId] });
    } catch (error) {
      await notify((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return {
    races: races.map((r) => ({ id: r.id, name: r.name })),
    race: activeRace,
    setRace: (next: string) => {
      setRace(next);
      setDraft(null);
    },
    raw,
    tree,
    errors,
    loading: racesPending || trees.isPending,
    dirty:
      !!current &&
      (draft?.key === seedKey ? JSON.stringify(current.raw) !== baseline : baseline === null && current.raw.mainSkills.some((b) => b.id !== RACIAL_BRANCH_ID)),
    saving,
    locations: raw ? edit.skillLocations(raw) : new Map<string, CellRef[]>(),
    librarySkills: skills.map((s) => ({ id: s.id, name: skillName(s), icon: s.icon ?? null, mainSkillId: s.mainSkillId ?? null, summary: (s as { abilitySummary?: string[] }).abilitySummary ?? [] })),
    availableBranches: mainSkills.filter((m) => !tree?.branches.some((b) => b.id === m.id)).map((m) => ({ id: m.id, name: m.name, color: m.color, icon: m.icon ?? null })),
    actions: {
      setCell: (ref: CellRef, skillId: string | null) => {
        const skill = skillId ? skills.find((s) => s.id === skillId) : null;

        update((r) => edit.setCellSkill(r, ref, skill ? { id: skill.id, name: skillName(skill), icon: skill.icon ?? null } : null));
      },
      addBranch: (mainSkillId: string) => {
        const m = mainSkills.find((x) => x.id === mainSkillId);

        if (m) update((r) => edit.addBranch(r, { id: m.id, name: m.name, color: m.color, icon: m.icon ?? null, spellGroupId: m.spellGroupId ?? null }));
      },
      createBranch: async (input: { name: string; color: string; icon?: string | null }) => {
        const created = await createMainSkill(campaignId, { name: input.name, color: input.color, ...(input.icon && { icon: input.icon }) });

        await queryClient.invalidateQueries({ queryKey: ["main-skills", campaignId] });
        update((r) => edit.addBranch(r, { id: created.id, name: created.name, color: created.color, icon: created.icon ?? null }));
      },
      removeBranch: (branchId: string) => update((r) => edit.removeBranch(r, branchId)),
      moveBranch: (branchId: string, dir: -1 | 1) => update((r) => edit.moveBranch(r, branchId, dir)),
      save,
      cancel: () => setDraft(null),
    },
  };
}

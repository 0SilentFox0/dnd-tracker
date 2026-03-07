"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AttackType } from "@/lib/constants/battle";
import { getHeroDamageComponents } from "@/lib/constants/hero-scaling";
import { useSkills } from "@/lib/hooks/useSkills";
import type { SkillTreeProgress } from "@/lib/hooks/useCharacterView";

import {
  fetchDamagePreview,
  parseDiceFormulaToSides,
  type SkillAffectingDamage,
} from "@/components/characters/stats/damage-calculator-utils";

/** Формат ID рівня основної навички: ${mainSkillId}_basic_level, _advanced_level, _expert_level */
const MAIN_SKILL_LEVEL_RE = /_(basic|advanced|expert)_level$/;

function parseMainSkillLevelId(
  id: string,
): { mainSkillId: string; level: string } | null {
  const match = id.match(MAIN_SKILL_LEVEL_RE);
  if (!match) return null;
  const level = match[1];
  const mainSkillId = id.slice(0, match.index);
  return mainSkillId ? { mainSkillId, level } : null;
}

/** Визначає рівень скіла за назвою (Напад — Експерт → expert) */
function inferLevelFromSkillName(name: string): string | null {
  const n = (name ?? "").toLowerCase();
  if (n.includes("експерт") || n.includes("expert")) return "expert";
  if (n.includes("просунут") || n.includes("advanced")) return "advanced";
  if (n.includes("базов") || n.includes("основ") || n.includes("basic")) return "basic";
  return null;
}

/** Розв'язує id з unlockedSkills (прямий id або mainSkillId_level) у скіл зі списку */
function resolveUnlockedIdToSkill(
  unlockedId: string,
  skillsList: Array<{
    id: string;
    basicInfo?: { name?: string };
    name?: string;
    mainSkillData?: { mainSkillId?: string };
    combatStats?: unknown;
    bonuses?: Record<string, number>;
  }>,
): typeof skillsList[0] | undefined {
  const byId = skillsList.find((s) => s.id === unlockedId);
  if (byId) return byId;
  const parsed = parseMainSkillLevelId(unlockedId);
  if (!parsed) return undefined;
  const { mainSkillId, level } = parsed;
  return skillsList.find((s) => {
    const msId = (s.mainSkillData as { mainSkillId?: string } | undefined)?.mainSkillId ?? (s as { mainSkillId?: string }).mainSkillId;
    if (msId !== mainSkillId) return false;
    const name = (s.basicInfo as { name?: string } | undefined)?.name ?? (s as { name?: string }).name ?? "";
    return inferLevelFromSkillName(name) === level;
  });
}

export interface UseDamageCalculatorProps {
  campaignId: string;
  characterId: string;
  level: number;
  scalingCoefficients?: {
    meleeMultiplier?: number;
    rangedMultiplier?: number;
  };
  skillTreeProgress: SkillTreeProgress;
  knownSpellIds: string[];
}

export function useDamageCalculator({
  campaignId,
  characterId,
  level,
  scalingCoefficients = {},
  skillTreeProgress,
  knownSpellIds,
}: UseDamageCalculatorProps) {
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
  const [meleeDiceValues, setMeleeDiceValues] = useState<number[]>([]);
  const [rangedDiceValues, setRangedDiceValues] = useState<number[]>([]);
  const [magicDiceValues, setMagicDiceValues] = useState<number[]>([]);
  const [meleeSum, setMeleeSumState] = useState<number | null>(null);
  const [rangedSum, setRangedSumState] = useState<number | null>(null);
  const [magicSum, setMagicSumState] = useState<number | null>(null);

  const meleeMult = scalingCoefficients.meleeMultiplier ?? 1;
  const rangedMult = scalingCoefficients.rangedMultiplier ?? 1;

  const { data: damagePreview } = useQuery({
    queryKey: [
      "character-damage-preview",
      campaignId,
      characterId,
      meleeMult,
      rangedMult,
      meleeSum,
      rangedSum,
    ],
    queryFn: () =>
      fetchDamagePreview(
        campaignId,
        characterId,
        meleeMult,
        rangedMult,
        meleeSum,
        rangedSum,
      ),
    enabled: !!campaignId && !!characterId,
  });

  const { data: skillsList = [] } = useSkills(campaignId);

  const { data: spellsList = [] } = useQuery({
    queryKey: ["spells", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/spells`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!campaignId && knownSpellIds.length > 0,
  });

  const heroMelee = getHeroDamageComponents(level, AttackType.MELEE);
  const heroRanged = getHeroDamageComponents(level, AttackType.RANGED);

  const meleeDiceSides = useMemo(() => {
    if (!damagePreview) return [];
    const formula = [damagePreview.melee.diceFormula, heroMelee.diceNotation]
      .filter(Boolean)
      .join("+");
    return parseDiceFormulaToSides(formula);
  }, [damagePreview, heroMelee.diceNotation]);

  const rangedDiceSides = useMemo(() => {
    if (!damagePreview) return [];
    const formula = [damagePreview.ranged.diceFormula, heroRanged.diceNotation]
      .filter(Boolean)
      .join("+");
    return parseDiceFormulaToSides(formula);
  }, [damagePreview, heroRanged.diceNotation]);

  const unlockedSkillIds = useMemo(() => {
    const ids = new Set<string>();
    if (!skillTreeProgress || typeof skillTreeProgress !== "object") return ids;
    for (const entry of Object.values(skillTreeProgress)) {
      if (!entry || typeof entry !== "object") continue;
      const list = (entry as { unlockedSkills?: unknown }).unlockedSkills;
      if (Array.isArray(list)) {
        for (const id of list) {
          if (typeof id === "string" && id.trim()) ids.add(id.trim());
        }
      }
    }
    return ids;
  }, [skillTreeProgress]);

  /** Реальні id скілів після розв'язки mainSkillId_level → скіл з бібліотеки */
  const resolvedSkillIds = useMemo(() => {
    const set = new Set<string>();
    for (const unlockedId of unlockedSkillIds) {
      const skill = resolveUnlockedIdToSkill(unlockedId, skillsList);
      if (skill) set.add(skill.id);
    }
    return set;
  }, [unlockedSkillIds, skillsList]);

  /** Чи скіл позначено як впливає на шкоду (affectsDamage) — приймає boolean, "true", 1 з БД/API */
  function isAffectsDamage(skill: { combatStats?: unknown; affectsDamage?: unknown }): boolean {
    const cs = skill.combatStats as { affectsDamage?: unknown } | undefined;
    const val = cs?.affectsDamage ?? (skill as { affectsDamage?: unknown }).affectsDamage;
    if (val === true || val === 1) return true;
    if (typeof val === "string" && val.toLowerCase() === "true") return true;
    return false;
  }

  /** Скіли з позначкою «впливає на шкоду» (affectsDamage) серед прокачаних (з урахуванням розв'язки mainSkillId_level) */
  const skillsAffectingDamage = useMemo((): SkillAffectingDamage[] => {
    return skillsList
      .filter(
        (s: {
          id: string;
          combatStats?: unknown;
          affectsDamage?: unknown;
        }) => {
          if (!resolvedSkillIds.has(s.id)) return false;
          return isAffectsDamage(s);
        },
      )
      .map(
        (s: {
          id: string;
          basicInfo?: { name?: string };
          name?: string;
          combatStats?: { damageType?: string | null };
        }) => ({
          id: s.id,
          name:
            (s.basicInfo as { name?: string } | undefined)?.name ?? (s as { name?: string }).name ?? "—",
          damageType: (s.combatStats?.damageType as "melee" | "ranged" | "magic" | null) ?? null,
        }),
      );
  }, [skillsList, resolvedSkillIds]);

  // Вивести всі прокачані скіли героя в консоль (після розв'язки mainSkillId_level → назва, affectsDamage, ефекти)
  useEffect(() => {
    const ids = Array.from(unlockedSkillIds);
    if (ids.length === 0) {
      console.log("[Калькулятор шкоди] Прокачані скіли героя: немає (unlockedSkillIds порожні)");
      return;
    }
    type SkillItem = {
      id: string;
      unlockedId: string;
      name: string;
      affectsDamage: boolean;
      damageType: string | null;
      effects: string;
    };
    const list: SkillItem[] = ids.map((unlockedId) => {
      const s = resolveUnlockedIdToSkill(unlockedId, skillsList) as {
        id: string;
        basicInfo?: { name?: string };
        name?: string;
        combatStats?: {
          affectsDamage?: unknown;
          damageType?: string | null;
          effects?: Array<{ stat?: string; type?: string; value?: unknown }>;
        };
        bonuses?: Record<string, number>;
      } | undefined;
      const name =
        (s?.basicInfo as { name?: string } | undefined)?.name ??
        (s as { name?: string } | undefined)?.name ??
        unlockedId;
      const affectsDamage = s ? isAffectsDamage(s) : false;
      const damageType =
        (s?.combatStats?.damageType as "melee" | "ranged" | "magic" | null) ?? null;
      let effects = "";
      if (s?.combatStats?.effects?.length) {
        effects = s.combatStats.effects
          .map((e) => `${e.stat ?? "?"}: ${String(e.value ?? "")}${e.type === "percent" ? "%" : ""}`)
          .join("; ");
      } else if (s?.bonuses && Object.keys(s.bonuses).length > 0) {
        effects = Object.entries(s.bonuses)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ");
      }
      return {
        id: s?.id ?? unlockedId,
        unlockedId,
        name,
        affectsDamage,
        damageType,
        effects,
      };
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    console.log("[Калькулятор шкоди] Всі прокачані скіли героя:", list);
  }, [unlockedSkillIds, skillsList]);

  useEffect(() => {
    if (skillsAffectingDamage.length === 0) return;
    const byType = {
      melee: skillsAffectingDamage.filter(
        (s) => !s.damageType || s.damageType === "melee",
      ),
      ranged: skillsAffectingDamage.filter(
        (s) => !s.damageType || s.damageType === "ranged",
      ),
      magic: skillsAffectingDamage.filter(
        (s) => !s.damageType || s.damageType === "magic",
      ),
    };
    console.log(
      "[Калькулятор шкоди] Навички, що враховуються для героя при розрахунку:",
      {
        всі_з_приміткою_affectsDamage: skillsAffectingDamage.map((s) => ({
          name: s.name,
          damageType: s.damageType ?? "усі",
        })),
        для_ближнього_бою: byType.melee.map((s) => s.name),
        для_дальнього_бою: byType.ranged.map((s) => s.name),
        для_магії: byType.magic.map((s) => s.name),
      },
    );
  }, [skillsAffectingDamage]);

  const knownSpells = useMemo(() => {
    return spellsList.filter((s: { id: string }) => knownSpellIds.includes(s.id));
  }, [spellsList, knownSpellIds]);

  const skillsAffectingSpell = useMemo(() => {
    if (!selectedSpellId) return [];
    const spell = knownSpells.find((s: { id: string }) => s.id === selectedSpellId);
    const groupId = spell?.spellGroup?.id ?? spell?.groupId ?? null;
    if (!groupId) return [];
    return skillsList
      .filter(
        (s: {
          id: string;
          spellGroupId?: string | null;
          spellGroup?: { id: string } | null;
        }) => {
          if (!unlockedSkillIds.has(s.id)) return false;
          const sid = s.spellGroupId ?? s.spellGroup?.id ?? null;
          return sid === groupId;
        },
      )
      .map(
        (s: {
          id: string;
          basicInfo?: { name?: string };
          name?: string;
          spellEnhancementData?: { spellEffectIncrease?: number };
        }) => ({
          name:
            (s.basicInfo as { name?: string } | undefined)?.name ?? (s as { name?: string }).name ?? "—",
          bonus:
            (s.spellEnhancementData as { spellEffectIncrease?: number } | undefined)
              ?.spellEffectIncrease ?? 0,
        }),
      )
      .filter((x: { bonus: number }) => x.bonus > 0);
  }, [selectedSpellId, knownSpells, skillsList, unlockedSkillIds]);

  const selectedSpell = useMemo(() => {
    if (!selectedSpellId) return null;
    return knownSpells.find((s: { id: string }) => s.id === selectedSpellId);
  }, [selectedSpellId, knownSpells]);

  const magicDiceSides = useMemo(() => {
    if (!selectedSpell) return [];
    const c = selectedSpell.diceCount ?? 0;
    const t = selectedSpell.diceType;
    const sides = t ? parseInt(String(t).replace(/\D/g, "") || "6", 10) : 6;
    return Array.from({ length: c }, () => sides);
  }, [selectedSpell?.id, selectedSpell?.diceCount, selectedSpell?.diceType]);

  useEffect(() => {
    if (meleeDiceSides.length === 0) return;
    setMeleeDiceValues((prev) =>
      meleeDiceSides.map((s, i) =>
        prev[i] !== undefined && prev[i] >= 1 && prev[i] <= s ? prev[i] : 1,
      ),
    );
  }, [meleeDiceSides.join(",")]);

  useEffect(() => {
    if (rangedDiceSides.length === 0) return;
    setRangedDiceValues((prev) =>
      rangedDiceSides.map((s, i) =>
        prev[i] !== undefined && prev[i] >= 1 && prev[i] <= s ? prev[i] : 1,
      ),
    );
  }, [rangedDiceSides.join(",")]);

  useEffect(() => {
    if (magicDiceSides.length === 0) {
      setMagicDiceValues([]);
      return;
    }
    setMagicDiceValues((prev) =>
      magicDiceSides.map((s, i) =>
        prev[i] !== undefined && prev[i] >= 1 && prev[i] <= s ? prev[i] : 1,
      ),
    );
  }, [magicDiceSides.join(",")]);

  const setMeleeDiceAt = (index: number, value: number) => {
    setMeleeDiceValues((prev) =>
      meleeDiceSides.map((s, j) => (j === index ? value : prev[j] ?? 1)),
    );
  };
  const setRangedDiceAt = (index: number, value: number) => {
    setRangedDiceValues((prev) =>
      rangedDiceSides.map((s, j) => (j === index ? value : prev[j] ?? 1)),
    );
  };
  const setMagicDiceAt = (index: number, value: number) => {
    setMagicDiceValues((prev) =>
      magicDiceSides.map((s, j) => (j === index ? value : prev[j] ?? 1)),
    );
  };

  const handleCalculateMelee = () =>
    setMeleeSumState(meleeDiceValues.reduce((a, b) => a + b, 0));
  const handleCalculateRanged = () =>
    setRangedSumState(rangedDiceValues.reduce((a, b) => a + b, 0));
  const handleCalculateMagic = () =>
    setMagicSumState(magicDiceValues.reduce((a, b) => a + b, 0));

  return {
    damagePreview,
    heroMelee,
    heroRanged,
    meleeDiceSides,
    rangedDiceSides,
    magicDiceSides,
    meleeDiceValues,
    rangedDiceValues,
    magicDiceValues,
    meleeSum,
    rangedSum,
    magicSum,
    setMeleeSum: handleCalculateMelee,
    setRangedSum: handleCalculateRanged,
    setMagicSum: handleCalculateMagic,
    setMeleeDiceAt,
    setRangedDiceAt,
    setMagicDiceAt,
    selectedSpellId,
    setSelectedSpellId,
    knownSpells,
    skillsAffectingDamage,
    skillsAffectingSpell,
    selectedSpell,
  };
}

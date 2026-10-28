"use client";

import { useMemo, useState } from "react";

import { groupSpellsBySchool } from "@/lib/utils/spells/group-by-school";
import type { BookSpell } from "@/types/spells";

export const ALL_SCHOOLS = "__all";

export function useSchoolFilter(byLevel: Record<number, BookSpell[]>, level: number) {
  const [school, setSchool] = useState(ALL_SCHOOLS);

  const schools = useMemo(() => groupSpellsBySchool(Object.values(byLevel).flat()).map(({ name, color }) => ({ name, color })), [byLevel]);

  const groups = useMemo(() => groupSpellsBySchool(byLevel[level] ?? []), [byLevel, level]);

  const counts = useMemo(() => new Map(groups.map((g) => [g.name, g.spells.length])), [groups]);

  const shown = useMemo(() => (school === ALL_SCHOOLS ? groups : groups.filter((g) => g.name === school)), [groups, school]);

  return { school, setSchool, schools, shown, isAll: school === ALL_SCHOOLS, countOf: (name: string) => counts.get(name) ?? 0 };
}

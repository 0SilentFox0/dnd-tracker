"use client";

import { useMemo } from "react";

import { getStatLabel } from "@/lib/constants/skill-effects";
import type { SkillTreeProgress } from "@/lib/hooks/useCharacterView";
import { useSkills } from "@/lib/hooks/useSkills";

interface CharacterLeveledSkillsTableProps {
  campaignId: string;
  skillTreeProgress: SkillTreeProgress;
}

type SkillEffectLike = {
  stat: string;
  type?: string;
  value?: number | string | boolean;
};

/** Форматує бонуси з об'єкта bonuses (легасі). */
function formatBonusesMap(bonuses: Record<string, number>): string[] {
  return Object.entries(bonuses)
    .filter(([, v]) => v !== 0)
    .map(([stat, value]) => {
      const label = getStatLabel(stat);

      if (typeof value === "number" && Number.isInteger(value)) {
        return value > 0 ? `+${value}% ${label}` : `${value}% ${label}`;
      }

      return `${label}: ${value}`;
    });
}

/** Форматує бонуси з масиву effects (combatStats.effects). */
function formatEffectsBonusSummary(effects: SkillEffectLike[]): string[] {
  if (!Array.isArray(effects)) return [];

  const parts: string[] = [];

  for (const e of effects) {
    if (!e?.stat) continue;

    const label = getStatLabel(e.stat);

    const val = e.value;

    if (e.type === "percent" && typeof val === "number") {
      parts.push(val > 0 ? `+${val}% ${label}` : `${val}% ${label}`);
    } else if (typeof val === "number") {
      parts.push(val >= 0 ? `+${val} ${label}` : `${val} ${label}`);
    } else if (val !== undefined && val !== null) {
      parts.push(`${label}: ${String(val)}`);
    }
  }

  return parts;
}

/** Збирає єдиний опис бонусів з bonuses і combatStats.effects. */
function formatBonusSummary(
  bonuses: Record<string, number>,
  combatStats?: { effects?: SkillEffectLike[] } | null,
): string {
  const fromBonuses = formatBonusesMap(bonuses ?? {});

  const fromEffects = formatEffectsBonusSummary(combatStats?.effects ?? []);

  const combined = [...fromBonuses];

  for (const p of fromEffects) {
    if (!combined.includes(p)) combined.push(p);
  }

  return combined.length > 0 ? combined.join(", ") : "—";
}

export function CharacterLeveledSkillsTable({
  campaignId,
  skillTreeProgress,
}: CharacterLeveledSkillsTableProps) {
  const { data: skillsList = [] } = useSkills(campaignId);

  const rows = useMemo(() => {
    const skillIds = new Set<string>();

    for (const entry of Object.values(skillTreeProgress)) {
      const list = entry?.unlockedSkills;

      if (Array.isArray(list)) list.forEach((id) => skillIds.add(id));
    }

    const byId = new Map(
      skillsList.map(
        (s: {
          id: string;
          basicInfo?: { name?: string };
          name?: string;
          bonuses?: Record<string, number>;
          combatStats?: { effects?: SkillEffectLike[] } | null;
        }) => [
          s.id,
          {
            name:
              (s.basicInfo as { name?: string } | undefined)?.name ??
              s.name ??
              "—",
            bonuses: (s.bonuses as Record<string, number>) ?? {},
            combatStats: s.combatStats ?? null,
          },
        ],
      ),
    );

    return Array.from(skillIds)
      .map((id) => {
        const row = byId.get(id);

        if (!row) return { id, name: "—", summary: "—" };

        return {
          id,
          name: row.name,
          summary: formatBonusSummary(row.bonuses, row.combatStats),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [skillTreeProgress, skillsList]);

  if (rows.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Прокачані уміння</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Уміння</th>
              <th className="px-4 py-2 text-left font-medium">Бонуси</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{row.name}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {row.summary}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

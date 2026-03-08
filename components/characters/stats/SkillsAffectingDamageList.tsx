"use client";

import type { SkillAffectingDamage } from "./damage-calculator-utils";

interface SkillsAffectingDamageListProps {
  skills: SkillAffectingDamage[];
  mode: "melee" | "ranged" | "magic";
}

const MODE_LABELS: Record<string, string> = {
  melee: "ближній бій",
  ranged: "дальній бій",
  magic: "магія",
};

export function SkillsAffectingDamageList({
  skills,
  mode,
}: SkillsAffectingDamageListProps) {
  const filtered = skills.filter((s) => {
    if (s.damageType == null) return true;
    return s.damageType === mode;
  });

  if (filtered.length === 0) return null;

  const label = MODE_LABELS[mode] ?? mode;

  return (
    <div>
      <p className="text-sm font-medium mb-1">
        Скіли, що впливають на шкоду ({label})
      </p>
      <ul className="list-inside list-disc text-sm text-muted-foreground">
        {filtered.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
}

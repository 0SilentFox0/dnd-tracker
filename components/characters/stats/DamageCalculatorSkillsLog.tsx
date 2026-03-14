"use client";

import type { SkillAffectingDamage } from "./damage-calculator-utils";

interface DamageCalculatorSkillsLogProps {
  skills: SkillAffectingDamage[];
}

function byMode(skills: SkillAffectingDamage[]) {
  const melee = skills.filter((s) => !s.damageType || s.damageType === "melee");

  const ranged = skills.filter(
    (s) => !s.damageType || s.damageType === "ranged",
  );

  const magic = skills.filter((s) => !s.damageType || s.damageType === "magic");

  return { melee, ranged, magic };
}

export function DamageCalculatorSkillsLog({
  skills,
}: DamageCalculatorSkillsLogProps) {
  const { melee, ranged, magic } = byMode(skills);

  const hasAny = melee.length > 0 || ranged.length > 0 || magic.length > 0;

  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-3 text-sm">
      <p className="mb-2 font-medium text-muted-foreground">
        При розрахунку шкоди враховуються навички:
      </p>
      {hasAny ? (
        <ul className="space-y-1.5 text-muted-foreground">
          {melee.length > 0 && (
            <li>
              <span className="font-medium">Ближній бій:</span>{" "}
              {melee.map((s) => s.name).join(", ")}
            </li>
          )}
          {ranged.length > 0 && (
            <li>
              <span className="font-medium">Дальній бій:</span>{" "}
              {ranged.map((s) => s.name).join(", ")}
            </li>
          )}
          {magic.length > 0 && (
            <li>
              <span className="font-medium">Магія:</span>{" "}
              {magic.map((s) => s.name).join(", ")}
            </li>
          )}
        </ul>
      ) : (
        <p className="text-muted-foreground italic">
          Немає прокачаних навичок з позначкою «впливає на шкоду».
        </p>
      )}
    </div>
  );
}

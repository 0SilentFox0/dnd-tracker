"use client";

import { FieldRenderer } from "@/components/abilities/fields/FieldRenderer";
import { AttackType } from "@/lib/constants/battle";
import { getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { FLAG_FIELDS, FLAG_LABELS } from "@/lib/utils/abilities/registry/effects";
import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "@/lib/utils/abilities/registry/fields";
import type { Effect, FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";

const DEFAULTS: Record<FlagKey, Record<string, unknown>> = {
  advantage: { attackKind: "all" },
  disadvantage: {},
  disadvantageForAttackers: {},
  guaranteedHit: {},
  resistance: { damageType: "physical", percent: 25 },
  spellImmunity: { spellIds: [] },
  spellTargeting: { mode: "area" },
  counterAttack: { attackKinds: [AttackType.MELEE], bonusPercent: 15 },
  seeEnemyHp: {},
  noNegativeMorale: {},
  ignoreMorale: {},
  minMorale: { value: 1 },
  conditionImmunity: { conditions: "all" },
};

const FLAG_META: FieldMeta = {
  name: "flag",
  label: "Прапорець",
  input: "select",
  options: Object.entries(FLAG_LABELS).map(([value, label]) => ({ value, label })),
};

export function FlagEditor({ effect, path, onChange }: { effect: FlagEffect; path: string; onChange: (e: Effect) => void }) {
  const changeFlag = (flag: unknown) => {
    if (typeof flag !== "string" || flag === effect.flag) return;

    const next = flag as FlagKey;

    onChange({
      kind: "flag",
      flag: next,
      ...DEFAULTS[next],
      ...(effect.target && { target: effect.target }),
      ...(effect.duration && { duration: effect.duration }),
    } as Effect);
  };

  const fields = [...FLAG_FIELDS[effect.flag], TARGET_FIELD, DURATION_FIELD];

  return (
    <>
      <FieldRenderer meta={FLAG_META} path={`${path}.flag`} value={effect.flag} onChange={changeFlag} />
      {fields.map((f) => (
        <FieldRenderer key={f.name} meta={f} path={`${path}.${f.name}`} value={getAtPath(effect, f.name)} onChange={(v) => onChange(setAtPath(effect, f.name, v))} />
      ))}
    </>
  );
}

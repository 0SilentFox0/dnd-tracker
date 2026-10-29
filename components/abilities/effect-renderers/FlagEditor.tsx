"use client";

import { useTranslations } from "next-intl";

import { FieldRenderer } from "@/components/abilities/fields/FieldRenderer";
import { useTranslator } from "@/lib/i18n/use-translator";
import { getAtPath, setAtPath } from "@/lib/utils/abilities/editor";
import { FLAG_DEFAULTS, FLAG_FIELDS, FLAG_LABELS } from "@/lib/utils/abilities/registry/effects/flags";
import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "@/lib/utils/abilities/registry/fields";
import type { Effect, FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";

export function FlagEditor({ effect, path, onChange }: { effect: FlagEffect; path: string; onChange: (e: Effect) => void }) {
  const t = useTranslations("abilities.fields");

  const tr = useTranslator("abilityRegistry");

  const flagOptions = Object.keys(FLAG_LABELS).map((value) => ({ value, label: tr(`flags.${value}.label`) }));

  const flagMeta: FieldMeta = { name: "flag", label: t("flag"), input: "select", options: flagOptions };

  const changeFlag = (flag: unknown) => {
    if (typeof flag !== "string" || flag === effect.flag) return;

    const next = flag as FlagKey;

    onChange({
      kind: "flag",
      flag: next,
      ...FLAG_DEFAULTS[next],
      ...(effect.target && { target: effect.target }),
      ...(effect.duration && { duration: effect.duration }),
    } as Effect);
  };

  const fields = [...FLAG_FIELDS[effect.flag], TARGET_FIELD, DURATION_FIELD];

  return (
    <>
      <FieldRenderer meta={flagMeta} path={`${path}.flag`} value={effect.flag} onChange={changeFlag} />
      {fields.map((f) => (
        <FieldRenderer key={f.name} meta={f} owner={`flags.${effect.flag}`} path={`${path}.${f.name}`} value={getAtPath(effect, f.name)} onChange={(v) => onChange(setAtPath(effect, f.name, v))} />
      ))}
    </>
  );
}

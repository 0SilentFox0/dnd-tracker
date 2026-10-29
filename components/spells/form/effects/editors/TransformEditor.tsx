"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";
import { SpellOnlyField } from "../SpellOnlyField";

import { useTranslator } from "@/lib/i18n/use-translator";

export function TransformEditor({ effect, path, onChange }: SpellOnlyEditorProps<"transform">) {
  const t = useTranslator("editors");

  const owner = { kind: "transform", effect, path } as const;

  return (
    <>
      <SpellOnlyField owner={owner} field={{ name: "unitId", input: "unit" }} onChange={onChange} />
      <SpellOnlyField owner={owner} field={{ name: "duration", input: "duration" }} onChange={onChange} />
      <p className="col-span-6 text-xs text-muted-foreground">{t("spellEffects.hints.revertAtZero")}</p>
    </>
  );
}

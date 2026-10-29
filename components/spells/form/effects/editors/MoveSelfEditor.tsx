"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";

import { useTranslator } from "@/lib/i18n/use-translator";

export function MoveSelfEditor(_props: SpellOnlyEditorProps<"moveSelf">) {
  const t = useTranslator("editors");

  return <p className="col-span-6 text-xs text-muted-foreground">{t("spellEffects.hints.moveSelf")}</p>;
}

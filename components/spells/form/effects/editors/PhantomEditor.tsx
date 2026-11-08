"use client";

import type { SpellOnlyEditorProps } from "../spell-only-types";

import { useTranslator } from "@/lib/i18n/use-translator";

export function PhantomEditor(_props: SpellOnlyEditorProps<"phantom">) {
  const t = useTranslator("editors");

  return <p className="col-span-6 text-xs text-muted-foreground">{t("spellEffects.hints.phantom")}</p>;
}

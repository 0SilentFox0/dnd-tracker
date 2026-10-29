"use client";

import { useCallback } from "react";

import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { SpellFormIssue } from "@/lib/utils/spells/model/form";

export function useSpellIssueText() {
  const t = useTranslator();

  return useCallback(
    (issue: SpellFormIssue): string => {
      const message = translateIssue(t, issue);

      return issue.fieldKey ? t("spellEditor.validation.problem", { field: t(issue.fieldKey), message }) : message;
    },
    [t],
  );
}

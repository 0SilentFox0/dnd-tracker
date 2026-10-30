"use client";

import { translateIssue } from "@/lib/i18n/translate-issue";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { AbilityError } from "@/lib/utils/abilities/editor";

export function FieldErrors({ errors, testId, id }: { errors: AbilityError[]; testId?: string; id?: string }) {
  const t = useTranslator();

  if (!errors.length) return null;

  const texts = [...new Set(errors.map((e) => translateIssue(t, typeof e === "string" ? { message: e } : e)))];

  return (
    <div id={id} data-testid={testId} className="space-y-0.5">
      {texts.map((text) => (
        <p key={text} className="text-xs text-destructive">
          {text}
        </p>
      ))}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";

import { useTranslator } from "@/lib/i18n/use-translator";
import { cn } from "@/lib/utils";
import type { Requirement } from "@/lib/utils/characters/choices/requirements";

interface RequirementListProps {
  items: Requirement[];
  names?: Record<string, string>;
}

export function RequirementList({ items, names }: RequirementListProps) {
  const t = useTranslations("choices");

  const tg = useTranslator("gameTerms");

  const text = (r: Requirement) => {
    if (r.kind === "level") return t("requirement.level", { need: r.need, have: r.have });

    if (r.kind === "ability") return t("requirement.ability", { abilities: r.abilities.map((a) => tg(`abilities.${a}.label`)).join(" / "), need: r.need, have: r.have });

    if (r.kind === "option") return t("requirement.option", { list: r.missing.map((id) => names?.[id] ?? id).join(", ") });

    if (r.kind === "manual") return t("requirement.manual", { text: r.text });

    return r.text;
  };

  if (items.length === 0) return null;

  return (
    <ul className="space-y-0.5 px-2 pt-1 text-xs">
      {items.map((r, i) => (
        <li key={i} className={cn(r.met ? "text-hud-muted" : "text-hud-danger")}>
          {r.met && <span aria-hidden="true">✓ </span>}
          {text(r)}
        </li>
      ))}
    </ul>
  );
}

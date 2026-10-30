"use client";

import { useTranslations } from "next-intl";

import { useTranslator } from "@/lib/i18n/use-translator";
import type { MulticlassReason } from "@/lib/utils/characters/classes/multiclass";

export function MulticlassReasons({ reasons }: { reasons: MulticlassReason[] }) {
  const t = useTranslations("characterProfile.classLevelUp");

  const tc = useTranslations("choices");

  const tg = useTranslator("gameTerms");

  const unique = reasons.filter((r, i) => reasons.findIndex((o) => o.className === r.className && o.abilities.join() === r.abilities.join()) === i);

  if (unique.length === 0) return null;

  return (
    <div className="text-xs text-hud-danger">
      <p>{t("blockedHint")}</p>
      <ul className="space-y-0.5">
        {unique.map((r) => (
          <li key={`${r.className}:${r.abilities.join()}`}>
            {r.className}: {tc("requirement.ability", { abilities: r.abilities.map((a) => tg(`abilities.${a}.label`)).join(" / "), need: r.need, have: r.have })}
          </li>
        ))}
      </ul>
    </div>
  );
}

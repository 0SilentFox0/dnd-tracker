"use client";

import { useTranslations } from "next-intl";

import { signed } from "@/lib/utils/common/format";
import type { MutationEffect } from "@/lib/utils/rules/systems";

export function MutationEffects({ effects }: { effects: MutationEffect[] }) {
  const t = useTranslations("wfrpCorruption.effects");

  const tg = useTranslations("gameTerms");

  return (
    <ul className="flex flex-wrap gap-1 text-xs">
      {effects.map((e, i) => (
        <li key={i} className="rounded border border-hud-border px-1.5 py-0.5 text-hud-bone">
          {e.type === "characteristic" ? t("characteristic", { name: tg(`characteristics.${e.key}.short`), amount: signed(e.amount) }) : t(e.type, { amount: signed(e.amount) })}
        </li>
      ))}
    </ul>
  );
}

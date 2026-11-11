"use client";

import { useTranslations } from "next-intl";

import { AdvanceRow } from "./AdvanceRow";

import { type AdvancementRules, type CareerPrice, talentCost } from "@/systems/wfrp/rules/advancement";
import type { FeatData } from "@/types/choices";

interface Props {
  feats: FeatData[];
  talents: Record<string, number>;
  rules: AdvancementRules;
  available: number;
  pending: boolean;
  price: (featId: string, base: number) => CareerPrice;
  onBuy: (featId: string) => void;
}

export function TalentRows({ feats, talents, rules, available, pending, price, onBuy }: Props) {
  const t = useTranslations("wfrpAdvancement.ui");

  const shown = feats.filter((f) => f.xpCost != null || talents[f.id]);

  const known = new Set(feats.map((f) => f.id));

  const orphans = Object.entries(talents).filter(([id]) => !known.has(id));

  if (shown.length === 0 && orphans.length === 0) return <p className="text-sm text-hud-muted">{t("noTalents")}</p>;

  return (
    <ul>
      {shown.map((feat) => {
        const rank = talents[feat.id] ?? 0;

        const max = feat.maxRank ?? 1;

        const priced = rank >= max || feat.xpCost == null ? null : price(feat.id, talentCost(feat.xpCost, rank, rules));

        return (
          <AdvanceRow
            key={feat.id}
            label={feat.name}
            value={t("rank", { rank, max })}
            hint={feat.description}
            cost={priced?.cost ?? null}
            outOfCareer={priced?.outOfCareer}
            limitLabel={rank >= max ? t("maxRank") : t("noCost")}
            available={available}
            pending={pending}
            onBuy={() => onBuy(feat.id)}
          />
        );
      })}
      {orphans.map(([id, rank]) => (
        <li key={id} className="flex justify-between gap-2 border-b border-hud-line py-1.5 text-sm text-hud-muted last:border-b-0">
          <span>{t("unknownTalent")}</span>
          <b className="tabular-nums">{t("rankOnly", { rank })}</b>
        </li>
      ))}
    </ul>
  );
}

import { useTranslations } from "next-intl";

import { MONSTER_SENSE_LABELS, MONSTER_SIZE_LABELS } from "@/lib/constants/monster";
import type { UnitStatblock } from "@/types/units";

export function MonsterStatblock({ block }: { block: UnitStatblock }) {
  const t = useTranslations("common.monster");

  const senses = Object.entries(MONSTER_SENSE_LABELS).flatMap(([key, label]) => {
    const value = block.senses?.[key as keyof typeof MONSTER_SENSE_LABELS];

    return value === undefined ? [] : [t("distance", { label, value })];
  });

  if (block.senses?.passivePerception !== undefined) senses.push(t("passivePerception", { value: block.senses.passivePerception }));

  const movement = Object.entries({ fly: t("fly"), swim: t("swim"), climb: t("climb"), burrow: t("burrow") }).flatMap(([key, label]) => {
    const value = block.movement?.[key as "fly" | "swim" | "climb" | "burrow"];

    return value === undefined ? [] : [t("distance", { label, value })];
  });

  if (block.movement?.hover) movement.push(t("hover"));

  return <div className="space-y-1 text-xs text-muted-foreground">
    <div className="flex flex-wrap items-center gap-1.5">{block.creatureType && <span className="rounded border px-1.5 py-0.5">{block.creatureType}</span>}{block.size && <span>{MONSTER_SIZE_LABELS[block.size]}</span>}{block.alignment && <span>{block.alignment}</span>}</div>
    {senses.length > 0 && <p>{senses.join(" · ")}</p>}
    {movement.length > 0 && <p>{movement.join(" · ")}</p>}
    {block.languages && <p>{t("languages", { value: block.languages })}</p>}
    {block.telepathy !== undefined && <p>{t("telepathy", { value: block.telepathy })}</p>}
  </div>;
}

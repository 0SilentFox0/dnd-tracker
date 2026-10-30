import { useTranslations } from "next-intl";

import { MONSTER_SENSE_KEYS } from "@/lib/constants/monster";
import { useCreatureTypeLabel } from "@/lib/i18n/use-creature-type";
import type { UnitStatblock } from "@/types/units";

export function MonsterStatblock({ block }: { block: UnitStatblock }) {
  const t = useTranslations("gameTerms.monster");

  const creatureTypeLabel = useCreatureTypeLabel();

  const senses = MONSTER_SENSE_KEYS.flatMap((key) => {
    const value = block.senses?.[key];

    return value === undefined ? [] : [t("distance", { label: t(`senses.${key}`), value })];
  });

  if (block.senses?.passivePerception !== undefined) senses.push(t("passivePerception", { value: block.senses.passivePerception }));

  const movement = Object.entries({ fly: t("fly"), swim: t("swim"), climb: t("climb"), burrow: t("burrow") }).flatMap(([key, label]) => {
    const value = block.movement?.[key as "fly" | "swim" | "climb" | "burrow"];

    return value === undefined ? [] : [t("distance", { label, value })];
  });

  if (block.movement?.hover) movement.push(t("hover"));

  return <div className="space-y-1 text-xs text-muted-foreground">
    <div className="flex flex-wrap items-center gap-1.5">{block.creatureType && <span className="rounded border px-1.5 py-0.5">{creatureTypeLabel(block.creatureType)}</span>}{block.size && <span>{t(`sizes.${block.size}`)}</span>}{block.alignment && <span>{block.alignment}</span>}</div>
    {senses.length > 0 && <p>{senses.join(" · ")}</p>}
    {movement.length > 0 && <p>{movement.join(" · ")}</p>}
    {block.languages && <p>{t("languages", { value: block.languages })}</p>}
    {block.telepathy !== undefined && <p>{t("telepathy", { value: block.telepathy })}</p>}
  </div>;
}

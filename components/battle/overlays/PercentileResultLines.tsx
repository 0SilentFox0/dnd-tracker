import { useTranslations } from "next-intl";

import type { PercentileAttackDetails } from "@/lib/utils/battle/types/attack";

/** `defender` is absent when the viewer may not see the target's defense, so only the net result shows. */
export function PercentileResultLines({ p, hit }: { p: PercentileAttackDetails; hit: boolean }) {
  const t = useTranslations("battleWizards.attack.summary.d100");

  return (
    <div className="mt-1 space-y-0.5 text-sm text-hud-soft">
      <div>{t("roll", { roll: p.roll, target: p.target })}</div>
      <div>{p.defender ? t("sl", { sl: p.sl, defSl: p.defender.sl, net: p.netSl }) : t("net", { net: p.netSl })}</div>
      {hit && <div>{t("location", { location: t(`locations.${p.location}`) })}</div>}
      {p.momentumUsed && <div className="text-hud-gold">{t("momentum.spent")}</div>}
      {hit && p.defender && <div className="text-hud-gold">{t("momentum.gained")}</div>}
    </div>
  );
}

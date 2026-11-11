"use client";

import { useTranslations } from "next-intl";

import { dynamicTextRef } from "@/lib/i18n/text-ref";
import { useText } from "@/lib/i18n/use-text";
import type { PeriodSummary } from "@/lib/utils/rules/systems";
import { RULE_SYSTEM_REGISTRY } from "@/lib/utils/rules/systems";

type Test = NonNullable<PeriodSummary["endeavour"]>["test"];

export function PeriodSummaryView({ summary }: { summary: PeriodSummary }) {
  const t = useTranslations("wfrpDowntime.summary");

  const te = useTranslations("wfrpDowntime.endeavours");

  const text = useText();

  const labelKeys = RULE_SYSTEM_REGISTRY.wfrp.currency?.labelKeys;

  const test = (x: Test) => x && t("test", { roll: x.roll, target: x.target, outcome: x.outcome, sl: x.sl });

  const { endeavour, event } = summary;

  const coin = endeavour?.coins;

  return (
    <ul className="space-y-1 text-sm text-hud-bone">
      {summary.skipped === "dead" && <li>{t("skippedDead")}</li>}
      {summary.skipped === "incapacitated" && <li>{t("skippedIncapacitated")}</li>}
      {summary.healed > 0 && <li>{t("healed", { count: summary.healed })}</li>}
      {endeavour && (
        <li>
          {te(endeavour.kind)}
          {endeavour.test && <span className="text-hud-muted"> · {test(endeavour.test)}</span>}
        </li>
      )}
      {coin && coin.amount > 0 && <li>{t("coins", { amount: coin.amount, coin: labelKeys ? text(dynamicTextRef(labelKeys[coin.coin])) : coin.coin })}</li>}
      {!!endeavour?.discount && <li>{t("discount", { count: endeavour.discount })}</li>}
      {endeavour?.skipped === "patientAbsent" && <li>{t("patientAbsent")}</li>}
      {summary.ailments.map((a) => (
        <li key={a.id}>
          {a.expired ? t("expired", { label: a.label }) : t("daysLeft", { label: a.label, count: a.daysLeft })}
          {a.test && <span className="text-hud-muted"> · {test(a.test)}</span>}
          {!!a.wounds && <span className="text-hud-muted"> · {t("wounds", { count: a.wounds })}</span>}
        </li>
      ))}
      {event && <li>{t("event", { roll: event.roll, text: text(event.text) })}</li>}
    </ul>
  );
}

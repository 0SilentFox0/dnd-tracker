import { useTranslations } from "next-intl";

export function CritWaitingNote() {
  const t = useTranslations("battle.critChoice");

  return <p className="mt-2 text-sm italic text-[var(--hud-muted)]">{t("waitingNote")}</p>;
}

import Link from "next/link";

import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { HelpSettings } from "@/components/onboarding/HelpSettings";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { HELP_ARTICLES } from "@/lib/onboarding/help";
import type { OnboardingRole } from "@/lib/onboarding/types";

const GROUPS: { audience: OnboardingRole; titleKey: string }[] = [
  { audience: "dm", titleKey: "ui.forDm" },
  { audience: "player", titleKey: "ui.forPlayers" },
];

export default async function HelpPage() {
  const locale = await getRequestLocale();

  const [t, ui] = await Promise.all([getTranslator(locale, "help"), getTranslator(locale, "onboarding")]);

  return (
    <HudPage>
      <HudPageHeader title={ui("ui.helpTitle")} subtitle={ui("ui.helpSubtitle")} />
      {GROUPS.map((g) => (
        <HudPanel key={g.audience}>
          <h2 className="hud-sc mb-2 text-hud-gold">{ui(g.titleKey)}</h2>
          <ul className="space-y-3">
            {HELP_ARTICLES.filter((a) => a.audience === g.audience || a.audience === "all").map((a) => (
              <li key={a.slug}>
                <Link href={`/help/${a.slug}`} className="text-hud-ink hover:text-hud-gold-strong hover:underline">
                  {t(`${a.slug}.title`)}
                </Link>
                <p className="text-xs text-hud-muted">{t(`${a.slug}.summary`)}</p>
              </li>
            ))}
          </ul>
        </HudPanel>
      ))}
      <HudPanel>
        <h2 className="hud-sc mb-2 text-hud-gold">{ui("ui.hintsHeading")}</h2>
        <HelpSettings />
      </HudPanel>
    </HudPage>
  );
}

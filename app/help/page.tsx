import Link from "next/link";

import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { HelpSettings } from "@/components/onboarding/HelpSettings";
import { HELP_ARTICLES } from "@/lib/onboarding/help";
import type { OnboardingRole } from "@/lib/onboarding/types";

const GROUPS: { audience: OnboardingRole; title: string }[] = [
  { audience: "dm", title: "Для ДМ" },
  { audience: "player", title: "Для гравців" },
];

export default function HelpPage() {
  return (
    <HudPage>
      <HudPageHeader title="Довідка" subtitle="Як провести першу гру й що вміє застосунок" />
      {GROUPS.map((g) => (
        <HudPanel key={g.audience}>
          <h2 className="hud-sc mb-2 text-hud-gold">{g.title}</h2>
          <ul className="space-y-3">
            {HELP_ARTICLES.filter((a) => a.audience === g.audience || a.audience === "all").map((a) => (
              <li key={a.slug}>
                <Link href={`/help/${a.slug}`} className="text-hud-ink hover:text-hud-gold-strong hover:underline">
                  {a.title}
                </Link>
                <p className="text-xs text-hud-muted">{a.summary}</p>
              </li>
            ))}
          </ul>
        </HudPanel>
      ))}
      <HudPanel>
        <h2 className="hud-sc mb-2 text-hud-gold">Підказки</h2>
        <HelpSettings />
      </HudPanel>
    </HudPage>
  );
}

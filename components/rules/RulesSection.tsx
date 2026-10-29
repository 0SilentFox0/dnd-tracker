import type { ReactNode } from "react";

import { HudSection } from "@/components/hud/form";
import { useTranslator } from "@/lib/i18n/use-translator";
import type { MECHANIC_REGISTRY } from "@/lib/utils/rules";

export function RulesSection({ mechanic, children }: { mechanic: keyof typeof MECHANIC_REGISTRY; children: ReactNode }) {
  const t = useTranslator("rules");

  return (
    <HudSection title={t(`mechanics.${mechanic}.label`)}>
      <p className="mb-3 text-sm text-hud-muted">{t(`mechanics.${mechanic}.description`)}</p>
      {children}
    </HudSection>
  );
}

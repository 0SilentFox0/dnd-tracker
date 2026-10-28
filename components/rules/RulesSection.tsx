import type { ReactNode } from "react";

import { HudSection } from "@/components/hud/form";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";

export function RulesSection({ mechanic, children }: { mechanic: keyof typeof MECHANIC_REGISTRY; children: ReactNode }) {
  const { label, description } = MECHANIC_REGISTRY[mechanic];

  return (
    <HudSection title={label}>
      <p className="mb-3 text-sm text-hud-muted">{description}</p>
      {children}
    </HudSection>
  );
}

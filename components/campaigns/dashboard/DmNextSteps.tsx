import Link from "next/link";
import { ScrollText } from "lucide-react";

import { HudSection } from "@/components/hud/form";
import { HudPanel, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { BATTLE_STATUS_LABEL } from "@/lib/constants/battle";
import type { DmDashboardData } from "@/types/campaigns";

const ROW = "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-hud-ink hover:bg-white/5";

export function DmNextSteps({ campaignId, data }: { campaignId: string; data: DmDashboardData }) {
  const base = `/campaigns/${campaignId}`;

  const hasPrep = data.pendingDrafts > 0 || data.scenarioPages.length > 0 || data.battles.length > 0;

  return (
    <HudPanel className="shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)]">
      <HudSection title="Що далі">
        {hasPrep && (
          <div className="mb-3">
            <h3 className="hud-sc mb-1 text-xs text-hud-muted">Підготовка</h3>
            <ul>
              {data.pendingDrafts > 0 && (
                <li>
                  <Link href={`${base}/dm/characters`} className={ROW}>
                    <span className="truncate">На схваленні: {data.pendingDrafts}</span>
                  </Link>
                </li>
              )}
              {data.scenarioPages.map((p) => (
                <li key={p.id}>
                  <Link href={`${base}/dm/scenario/${p.id}`} className={ROW}>
                    <ScrollText className="size-4 shrink-0 text-hud-gold" aria-hidden />
                    <span className="min-w-0 truncate">{p.title}</span>
                  </Link>
                </li>
              ))}
              {data.battles.map((b) => (
                <li key={b.id}>
                  <Link href={`${base}/battles/${b.id}`} className={ROW}>
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    <HudPill tone="accent">{BATTLE_STATUS_LABEL[b.status]}</HudPill>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3 className="hud-sc mb-1 text-xs text-hud-muted">Сесія</h3>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`${base}/dm/show`}>Показ</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/dm/music`}>Музика</Link>
            </Button>
          </div>
        </div>
      </HudSection>
    </HudPanel>
  );
}

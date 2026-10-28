"use client";

import { useState } from "react";

import { useProfile } from "../ProfileContext";
import { TransferArtifactDialog } from "../TransferArtifactDialog";
import { GrantArtifactDialog } from "./GrantArtifactDialog";

import { EntityIcon } from "@/components/common/EntityIcon";
import { HudSection } from "@/components/hud/form";
import { HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { ARTIFACT_RARITY_COLOR, ArtifactSlot,artifactSlotLabel } from "@/lib/constants/artifacts";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useStashAction } from "@/lib/hooks/characters";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { cn } from "@/lib/utils";
import type { StashArtifact, StashView } from "@/types/inventory";

interface StashArtifactsPanelProps {
  view: StashView;
  canAct: boolean;
  isDM: boolean;
}

export function StashArtifactsPanel({ view, canAct, isDM }: StashArtifactsPanelProps) {
  const { campaignId, characterId } = useProfile();

  const action = useStashAction(campaignId, characterId);

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const confirm = useConfirm();

  const notify = useNotify();

  const [transfer, setTransfer] = useState<StashArtifact | null>(null);

  const [grantOpen, setGrantOpen] = useState(false);

  const run = (input: Parameters<typeof action.mutateAsync>[0]) =>
    action.mutateAsync(input).catch((e: Error) => notify(e.message || "Не вдалося виконати дію"));

  const revoke = (a: StashArtifact) =>
    void confirm({ title: `Забрати «${a.name}»?`, confirmLabel: "Забрати", onConfirm: () => run({ action: "revoke", artifactId: a.id }) });

  return (
    <HudPanel>
      <HudSection
        title="АРТЕФАКТИ В ПІДСУМКУ"
        action={isDM && <Button size="sm" variant="outline" onClick={() => setGrantOpen(true)}>Видати артефакт</Button>}
      >
        {view.attunement && <p className="mb-2 text-xs text-hud-muted">{`Налаштування ${view.attunement.used}/${view.attunement.limit}`}</p>}
        {view.artifacts.length === 0 && <p className="text-sm text-hud-muted">Підсумок порожній.</p>}
        <ul className="space-y-2">
          {view.artifacts.map((a) => (
            <li key={a.id} className="rounded-lg bg-[rgba(20,16,12,.85)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]">
              <div className="flex items-center gap-3">
                <span className={cn("size-10 shrink-0 overflow-hidden rounded-md border-2", ARTIFACT_RARITY_COLOR[a.rarity ?? ""] ?? "border-hud-line")}>
                  <EntityIcon src={a.icon} name={a.name} size={40} className="hud-sc size-full rounded-none bg-transparent text-inherit" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-hud-ink">{a.name}</span>
                  <span className="block text-xs text-hud-muted">{artifactSlotLabel(a.slot)}</span>
                  {(a.carried || a.attunement || a.charges) && (
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-hud-muted">
                      {a.carried && <span>Носиться</span>}
                      {a.attunement === "attuned" && <span>Налаштовано</span>}
                      {a.attunement === "required" && <span>Не діє без налаштування</span>}
                      {a.charges && <span>{`Заряди ${a.charges.left}/${a.charges.max}`}</span>}
                    </span>
                  )}
                </span>
              </div>
              {canAct && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.slot !== ArtifactSlot.ITEM && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "equip", artifactId: a.id })}>Вдягнути</Button>}
                  {classesEnabled && a.light && (
                    <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "equip", artifactId: a.id, slot: "shield" })}>У другу руку</Button>
                  )}
                  {a.attunement === "required" && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "attune", ref: a.id })}>Налаштувати</Button>}
                  {a.attunement === "attuned" && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => void run({ action: "unattune", ref: a.id })}>Зняти налаштування</Button>}
                  <Button size="sm" variant="outline" onClick={() => setTransfer(a)}>Передати</Button>
                  {isDM && <Button size="sm" variant="outline" onClick={() => revoke(a)}>Забрати</Button>}
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-hud-muted">Зміни під час бою діють з наступного бою.</p>
      </HudSection>
      <TransferArtifactDialog artifact={transfer} source={{ artifactId: transfer?.id ?? "" }} open={!!transfer} onOpenChange={(o) => !o && setTransfer(null)} />
      {isDM && <GrantArtifactDialog open={grantOpen} onOpenChange={setGrantOpen} />}
    </HudPanel>
  );
}

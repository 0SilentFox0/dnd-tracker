"use client";

import { useProfile } from "../ProfileContext";
import { InventoryLogPanel } from "./InventoryLogPanel";
import { PursePanel } from "./PursePanel";
import { SpecialItemsPanel } from "./SpecialItemsPanel";
import { StashArtifactsPanel } from "./StashArtifactsPanel";

import { EmptyState, QueryState } from "@/components/common/states";
import { useStash } from "@/lib/hooks/characters";

export function StashTab() {
  const { campaignId, characterId, sheet } = useProfile();

  const pending = !!sheet.review?.pending;

  const stash = useStash(campaignId, characterId, { enabled: !pending });

  if (pending) return <EmptyState title="Підсумок з'явиться після схвалення персонажа" />;

  const { isDM, isOwner } = sheet.viewer;

  return (
    <QueryState query={stash}>
      {(view) => (
        <div className="space-y-4">
          <PursePanel purse={view.purse} canAct={isDM || isOwner} isDM={isDM} />
          <StashArtifactsPanel view={view} canAct={isDM || isOwner} isDM={isDM} />
          <SpecialItemsPanel items={view.items} canAct={isDM || isOwner} />
          <InventoryLogPanel />
        </div>
      )}
    </QueryState>
  );
}

"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { UseQueryResult } from "@tanstack/react-query";

import { useStash, useStashAction } from "./useStash";

import { ARTIFACT_GRID_9, type ArtifactGridSlotKey, type ArtifactSlot } from "@/lib/constants/artifacts";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { DESKTOP_QUERY, useConfirm, useMediaQuery, useNotify } from "@/lib/hooks/common";
import { type BackpackCell, buildBackpackCells, type DragPayload, dropAction, type DropTarget } from "@/lib/utils/inventory/backpack";
import type { StashAction } from "@/lib/utils/inventory/stash-actions";
import type { CharacterSheet, SheetArtifact } from "@/types/characters";
import type { Purse, SpecialItem, StashArtifact, StashView } from "@/types/inventory";

export type SelectionKey = { kind: "artifact" | "item"; id: string };

export type InventorySelection =
  | { kind: "equipped"; slot: ArtifactGridSlotKey; artifact: SheetArtifact }
  | { kind: "backpack"; artifact: StashArtifact }
  | { kind: "item"; item: SpecialItem };

export interface EquipmentCell {
  key: ArtifactGridSlotKey;
  slotType: ArtifactSlot;
  artifact: SheetArtifact | null;
}

export interface InventoryModel {
  equipment: EquipmentCell[];
  backpack: { cells: BackpackCell[]; query: UseQueryResult<StashView> } | null;
  purse: Purse | null;
  access: { canAct: boolean; isDM: boolean; pending: boolean };
  layout: { desktop: boolean };
  rules: { offHand: boolean };
  selection: { value: InventorySelection | null; set: (key: SelectionKey | null) => void };
  drag: { value: DragPayload | null; set: (p: DragPayload | null) => void };
  actions: {
    equip: (artifactId: string, slot?: "shield") => Promise<void>;
    attune: (ref: string, on: boolean) => Promise<void>;
    unequip: (slot: ArtifactGridSlotKey) => Promise<void>;
    drop: (target: DropTarget) => Promise<void>;
    use: (itemId: string) => Promise<void>;
    revoke: (artifact: StashArtifact) => void;
    remove: (item: SpecialItem) => void;
  };
  isPending: boolean;
}

const MIN_ROWS = 3;

function resolveSelection(key: SelectionKey | null, equipment: EquipmentCell[], cells: BackpackCell[], view: StashView | undefined): InventorySelection | null {
  if (!key) return null;

  if (key.kind === "item") {
    const item = view?.items.find((i) => i.id === key.id);

    return item ? { kind: "item", item } : null;
  }

  const equipped = equipment.find((cell) => cell.artifact?.id === key.id);

  if (equipped?.artifact) return { kind: "equipped", slot: equipped.key, artifact: equipped.artifact };

  for (const cell of cells) {
    if (cell.kind === "artifact" && cell.artifact.id === key.id) return { kind: "backpack", artifact: cell.artifact };
  }

  return null;
}

export function useInventory(campaignId: string, characterId: string, sheet: CharacterSheet): InventoryModel {
  const t = useTranslations("inventory");

  const { isDM, isOwner } = sheet.viewer;

  const pending = sheet.review.pending;

  const canAct = !pending && (isDM || isOwner);

  const desktop = useMediaQuery(DESKTOP_QUERY);

  const columns = desktop ? 6 : 5;

  const offHand = !!useCampaignRules(campaignId).data?.classes.enabled;

  const query = useStash(campaignId, characterId, { enabled: !pending });

  const { mutateAsync, isPending } = useStashAction(campaignId, characterId);

  const confirm = useConfirm();

  const notify = useNotify();

  const [selectedKey, setSelectedKey] = useState<SelectionKey | null>(null);

  const [drag, setDrag] = useState<DragPayload | null>(null);

  const view = query.data;

  const equipment = useMemo<EquipmentCell[]>(
    () => ARTIFACT_GRID_9.map((cell) => ({ key: cell.key, slotType: cell.slotType, artifact: sheet.items.grid[cell.key] ?? null })),
    [sheet.items.grid],
  );

  const cells = useMemo(
    () => (pending || !view ? [] : buildBackpackCells(view, { columns, minRows: MIN_ROWS, withAdd: canAct })),
    [pending, view, columns, canAct],
  );

  const selection = resolveSelection(selectedKey, equipment, cells, view);

  const run = useCallback(
    async (action: StashAction, clearSelection: boolean) => {
      if (!canAct) return;

      try {
        await mutateAsync(action);

        if (clearSelection) setSelectedKey(null);
      } catch (e) {
        void notify(e instanceof Error && e.message ? e.message : t("errors.actionFailed"));
      }
    },
    [canAct, mutateAsync, notify, t],
  );

  const drop = useCallback(
    async (target: DropTarget) => {
      if (isPending) return;

      const payload = drag;

      setDrag(null);

      const action = payload && dropAction(payload, target);

      if (action) await run(action, true);
    },
    [drag, run, isPending],
  );

  const ask = useCallback(
    (title: string, confirmLabel: string, action: StashAction) => {
      if (!canAct) return;

      void confirm({ title, confirmLabel, destructive: true }).then((ok) => (ok ? run(action, true) : undefined));
    },
    [canAct, confirm, run],
  );

  return {
    equipment,
    backpack: pending ? null : { cells, query },
    purse: view?.purse ?? null,
    access: { canAct, isDM, pending },
    layout: { desktop },
    rules: { offHand },
    selection: { value: selection, set: setSelectedKey },
    drag: { value: drag, set: setDrag },
    actions: {
      equip: (artifactId, slot) => run({ action: "equip", artifactId, ...(slot && { slot }) }, true),
      attune: (ref, on) => run({ action: on ? "attune" : "unattune", ref }, true),
      unequip: (slot) => run({ action: "stash", slot }, true),
      drop,
      use: (itemId) => run({ action: "useItem", itemId }, false),
      revoke: (artifact) => ask(t("confirm.revokeTitle", { name: artifact.name }), t("confirm.revoke"), { action: "revoke", artifactId: artifact.id }),
      remove: (item) => ask(t("confirm.removeTitle", { name: item.name }), t("confirm.remove"), { action: "removeItem", itemId: item.id }),
    },
    isPending,
  };
}

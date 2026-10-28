import { ARTIFACT_GRID_9, type ArtifactGridSlotKey } from "@/lib/constants/artifacts";
import type { StashAction } from "@/lib/utils/inventory/stash-actions";
import type { SpecialItem, StashArtifact, StashView } from "@/types/inventory";

export type BackpackCell =
  | { kind: "artifact"; key: string; artifact: StashArtifact }
  | { kind: "item"; key: string; item: SpecialItem }
  | { kind: "add"; key: "add" }
  | { kind: "empty"; key: string };

export type DragPayload = { from: "backpack"; artifactId: string; slotType: string } | { from: "slot"; slot: ArtifactGridSlotKey };

export type DropTarget = { kind: "slot"; slot: ArtifactGridSlotKey } | { kind: "backpack" };

export function buildBackpackCells(
  view: Pick<StashView, "artifacts" | "items">,
  opts: { columns: number; minRows: number; withAdd: boolean },
): BackpackCell[] {
  const content: BackpackCell[] = [
    ...view.artifacts.map((artifact): BackpackCell => ({ kind: "artifact", key: `artifact-${artifact.id}`, artifact })),
    ...view.items.map((item): BackpackCell => ({ kind: "item", key: `item-${item.id}`, item })),
  ];

  const used = content.length + (opts.withAdd ? 1 : 0);

  const total = Math.max(opts.minRows * opts.columns, Math.ceil(used / opts.columns) * opts.columns);

  const cells = [...content];

  for (let i = content.length; i < total - (opts.withAdd ? 1 : 0); i++) cells.push({ kind: "empty", key: `empty-${i}` });

  if (opts.withAdd) cells.push({ kind: "add", key: "add" });

  return cells;
}

export function slotAccepts(payload: DragPayload, slot: ArtifactGridSlotKey): boolean {
  return payload.from === "backpack" && ARTIFACT_GRID_9.find((cell) => cell.key === slot)?.slotType === payload.slotType;
}

export function dropAction(payload: DragPayload, target: DropTarget): StashAction | null {
  if (payload.from === "backpack" && target.kind === "slot") return slotAccepts(payload, target.slot) ? { action: "equip", artifactId: payload.artifactId } : null;

  if (payload.from === "slot" && target.kind === "backpack") return { action: "stash", slot: payload.slot };

  return null;
}

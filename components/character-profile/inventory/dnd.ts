import type { DragEvent } from "react";

import type { InventoryModel } from "@/lib/hooks/characters";
import { type DragPayload, dropAction, type DropTarget } from "@/lib/utils/inventory/backpack";

export const dragProps = (inv: InventoryModel, payload: DragPayload) =>
  inv.access.canAct
    ? {
        draggable: true,
        onDragStart: (e: DragEvent) => {
          e.dataTransfer?.setData("text/plain", "inventory");

          if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";

          inv.drag.set(payload);
        },
        onDragEnd: () => inv.drag.set(null),
      }
    : { draggable: false };

export const dropProps = (inv: InventoryModel, target: DropTarget) => ({
  onDragOver: (e: DragEvent) => {
    if (inv.drag.value && dropAction(inv.drag.value, target)) e.preventDefault();
  },
  onDrop: (e: DragEvent) => {
    e.preventDefault();
    void inv.actions.drop(target);
  },
});

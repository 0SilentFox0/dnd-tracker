import { dragProps, dropProps } from "./dnd";
import { InventoryCell } from "./InventoryCell";

import { ArtifactSlot } from "@/lib/constants/artifacts";
import type { InventoryModel } from "@/lib/hooks/characters";
import { cn } from "@/lib/utils";

export function BackpackGrid({ inv, onAdd, newIds }: { inv: InventoryModel; onAdd: () => void; newIds?: ReadonlySet<string> }) {
  if (!inv.backpack) return null;

  const { selection } = inv;

  const selectedId = selection.value?.kind === "backpack" ? selection.value.artifact.id : selection.value?.kind === "item" ? selection.value.item.id : null;

  const drop = dropProps(inv, { kind: "backpack" });

  const receiving = inv.drag.value?.from === "slot";

  return (
    <div role="group" aria-label="Рюкзак" {...drop} className={cn("grid grid-cols-5 gap-1.5 rounded-lg p-1 lg:grid-cols-6", receiving && "bg-hud-gold-strong/10 ring-1 ring-hud-gold-strong/50")}>
      {inv.backpack.cells.map((cell) => {
        if (cell.kind === "artifact") {
          const { artifact } = cell;

          return (
            <InventoryCell
              key={cell.key}
              label={artifact.name}
              thing={{ name: artifact.name, icon: artifact.icon, rarity: artifact.rarity }}
              state={{ selected: selectedId === artifact.id, drop: null }}
              dnd={artifact.slot === ArtifactSlot.ITEM ? { draggable: false } : dragProps(inv, { from: "backpack", artifactId: artifact.id, slotType: artifact.slot })}
              onClick={() => selection.set({ kind: "artifact", id: artifact.id })}
              isNew={newIds?.has(artifact.id)}
            />
          );
        }

        if (cell.kind === "item") {
          const { item } = cell;

          const badge = item.consumable ? (item.quantity > 1 ? `×${item.quantity} ⟳` : "⟳") : item.quantity > 1 ? `×${item.quantity}` : undefined;

          return (
            <InventoryCell
              key={cell.key}
              label={item.name}
              thing={{ name: item.name, icon: null, rarity: null, badge }}
              state={{ selected: selectedId === item.id, drop: null }}
              dnd={{ draggable: false }}
              onClick={() => selection.set({ kind: "item", id: item.id })}
            />
          );
        }

        if (cell.kind === "add") return <InventoryCell key={cell.key} label="Додати" placeholder={<span className="text-2xl leading-none">+</span>} state={{ selected: false, drop: null }} dnd={{ draggable: false }} onClick={onAdd} />;

        return <InventoryCell key={cell.key} label="Порожня клітинка" state={{ selected: false, drop: null }} dnd={{ draggable: false }} />;
      })}
    </div>
  );
}

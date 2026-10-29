import { useTranslations } from "next-intl";

import { dragProps, dropProps } from "./dnd";
import { InventoryCell } from "./InventoryCell";
import { SLOT_SILHOUETTES } from "./slot-silhouettes";

import type { InventoryModel } from "@/lib/hooks/characters";
import { slotAccepts } from "@/lib/utils/inventory/backpack";

export function EquipmentGrid({ inv }: { inv: InventoryModel }) {
  const t = useTranslations("inventory.grid");

  const dragging = inv.drag.value;

  return (
    <div className="mx-auto grid w-[216px] max-w-full grid-cols-3 gap-1.5 sm:w-[264px]">
      {inv.equipment.map(({ key, artifact }) => (
        <InventoryCell
          key={key}
          label={artifact ? t("filled", { slot: t(`slots.${key}`), name: artifact.name }) : t("empty", { slot: t(`slots.${key}`) })}
          thing={artifact ? { name: artifact.name, icon: artifact.icon, rarity: artifact.rarity } : undefined}
          placeholder={SLOT_SILHOUETTES[key]}
          state={{
            selected: inv.selection.value?.kind === "equipped" && inv.selection.value.slot === key,
            drop: dragging?.from === "backpack" ? (slotAccepts(dragging, key) ? "accept" : "dim") : null,
          }}
          dnd={{ ...(artifact ? dragProps(inv, { from: "slot", slot: key }) : {}), ...dropProps(inv, { kind: "slot", slot: key }) }}
          onClick={artifact ? () => inv.selection.set({ kind: "artifact", id: artifact.id }) : undefined}
        />
      ))}
    </div>
  );
}

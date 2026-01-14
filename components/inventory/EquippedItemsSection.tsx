/**
 * Компонент для екіпірованих предметів
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EQUIPMENT_SLOTS } from "@/lib/constants/equipment";
import { EquippedItems } from "@/lib/types/inventory";

interface EquippedItemsSectionProps {
  equipped: EquippedItems;
  onUpdate: (slot: string, value: string) => void;
}

export function EquippedItemsSection({
  equipped,
  onUpdate,
}: EquippedItemsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Екіпіровані предмети</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EQUIPMENT_SLOTS.map((slot) => (
          <div key={slot.key} className="w-full min-w-0">
            <Label htmlFor={`equipped-${slot.key}`}>{slot.label}</Label>
            <Input
              id={`equipped-${slot.key}`}
              value={equipped[slot.key] || ""}
              onChange={(e) => onUpdate(slot.key, e.target.value)}
              placeholder="Назва предмета"
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

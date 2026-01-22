/**
 * Компонент для валюти в інвентарі
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InventoryFormData } from "@/types/inventory";

interface CurrencySectionProps {
  formData: InventoryFormData;
  onUpdate: (field: keyof InventoryFormData, value: number) => void;
}

export function CurrencySection({ formData, onUpdate }: CurrencySectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Валюта</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="w-full min-w-0">
          <Label htmlFor="gold">Золото (GP)</Label>
          <Input
            id="gold"
            type="number"
            min="0"
            value={formData.gold}
            onChange={(e) => onUpdate("gold", parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>
        <div className="w-full min-w-0">
          <Label htmlFor="silver">Срібло (SP)</Label>
          <Input
            id="silver"
            type="number"
            min="0"
            value={formData.silver}
            onChange={(e) => onUpdate("silver", parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>
        <div className="w-full min-w-0">
          <Label htmlFor="copper">Мідь (CP)</Label>
          <Input
            id="copper"
            type="number"
            min="0"
            value={formData.copper}
            onChange={(e) => onUpdate("copper", parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

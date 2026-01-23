/**
 * Компонент для списку предметів (рюкзак або інші предмети)
 */

import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/types/inventory";

interface ItemListSectionProps {
  title: string;
  items: InventoryItem[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  emptyMessage: string;
}

export function ItemListSection({
  title,
  items,
  onAdd,
  onRemove,
  emptyMessage,
}: ItemListSectionProps) {
  const getItemDisplayName = (item: InventoryItem, index: number): string => {
    if (typeof item === "string") {
      return item;
    }

    const name = item.name || `Предмет ${index + 1}`;

    const quantity = item.quantity ? ` (x${item.quantity})` : "";

    return `${name}${quantity}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          + Додати предмет
        </Button>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 border rounded"
            >
              <span className="text-sm">{getItemDisplayName(item, index)}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
              >
                Видалити
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}

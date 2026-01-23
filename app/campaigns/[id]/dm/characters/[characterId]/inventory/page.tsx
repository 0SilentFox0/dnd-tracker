"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CurrencySection } from "@/components/inventory/CurrencySection";
import { EquippedItemsSection } from "@/components/inventory/EquippedItemsSection";
import { ItemListSection } from "@/components/inventory/ItemListSection";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCharacter } from "@/lib/api/characters";
import { getInventory, updateInventory } from "@/lib/api/inventory";
import { useInventory } from "@/lib/hooks/useInventory";

export default function CharacterInventoryPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const { id, characterId } = use(params);

  const router = useRouter();

  const {
    formData,
    loading,
    error,
    updateField,
    updateEquipped,
    addBackpackItem,
    removeBackpackItem,
    addItem,
    removeItem,
    handleSubmit,
    setFormData,
  } = useInventory({
    onSubmit: async (data) => {
      await updateInventory(id, characterId, data);
      router.push(`/campaigns/${id}/dm/characters`);
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [character, inventory] = await Promise.all([
          getCharacter(id, characterId).catch(() => null),
          getInventory(id, characterId).catch(() => null),
        ]);

        if (inventory) {
          setFormData({
            gold: inventory.gold,
            silver: inventory.silver,
            copper: inventory.copper,
            equipped: inventory.equipped || {},
            backpack: inventory.backpack || [],
            items: inventory.items || [],
          });
        } else if (character) {
          // Створюємо порожній інвентар якщо його немає
          setFormData({
            gold: 0,
            silver: 0,
            copper: 0,
            equipped: {},
            backpack: [],
            items: [],
          });
        }
      } catch (err) {
        console.error("Error fetching inventory:", err);
      }
    };

    fetchData();
  }, [id, characterId, setFormData]);

  if (
    loading &&
    formData.gold === 0 &&
    formData.silver === 0 &&
    formData.copper === 0
  ) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Інвентар</CardTitle>
          <CardDescription>Управління інвентарем персонажа</CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-hidden">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6 w-full">
            <CurrencySection formData={formData} onUpdate={updateField} />

            <EquippedItemsSection
              equipped={formData.equipped}
              onUpdate={updateEquipped}
            />

            <ItemListSection
              title="Рюкзак"
              items={formData.backpack}
              onAdd={addBackpackItem}
              onRemove={removeBackpackItem}
              emptyMessage="Рюкзак порожній"
            />

            <ItemListSection
              title="Інші предмети"
              items={formData.items}
              onAdd={addItem}
              onRemove={removeItem}
              emptyMessage="Немає предметів"
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Збереження..." : "Зберегти інвентар"}
              </Button>
              <Link href={`/campaigns/${id}/dm/characters`}>
                <Button type="button" variant="outline">
                  Скасувати
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

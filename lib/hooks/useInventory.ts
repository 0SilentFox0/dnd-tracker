/**
 * Хук для управління інвентарем персонажа
 */

import { useState, useCallback } from "react";
import { InventoryFormData } from "@/types/inventory";

export interface UseInventoryOptions {
  initialData?: Partial<InventoryFormData>;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  onCancel?: () => void;
}

const defaultInventoryData: InventoryFormData = {
  gold: 0,
  silver: 0,
  copper: 0,
  equipped: {},
  backpack: [],
  items: [],
};

export function useInventory(options: UseInventoryOptions) {
  const [formData, setFormData] = useState<InventoryFormData>(() => ({
    ...defaultInventoryData,
    ...options.initialData,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(<K extends keyof InventoryFormData>(
    field: K,
    value: InventoryFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateEquipped = useCallback((slot: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [slot]: value || undefined,
      },
    }));
  }, []);

  const addBackpackItem = useCallback(() => {
    const name = prompt("Назва предмета:");
    if (name && name.trim()) {
      setFormData((prev) => ({
        ...prev,
        backpack: [...prev.backpack, { name: name.trim(), quantity: 1 }],
      }));
    }
  }, []);

  const removeBackpackItem = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      backpack: prev.backpack.filter((_, i) => i !== index),
    }));
  }, []);

  const addItem = useCallback(() => {
    const name = prompt("Назва предмета:");
    if (name && name.trim()) {
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, { name: name.trim(), quantity: 1 }],
      }));
    }
  }, []);

  const removeItem = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);
      try {
        await options.onSubmit(formData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [formData, options]
  );

  const handleCancel = useCallback(() => {
    if (options.onCancel) {
      options.onCancel();
    }
  }, [options]);

  return {
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
    handleCancel,
    setFormData,
  };
}

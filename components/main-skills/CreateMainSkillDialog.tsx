"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateMainSkill } from "@/lib/hooks/useMainSkills";
import type { MainSkillFormData } from "@/lib/types/main-skills";

interface CreateMainSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function CreateMainSkillDialog({
  open,
  onOpenChange,
  campaignId,
}: CreateMainSkillDialogProps) {
  const router = useRouter();
  const createMainSkillMutation = useCreateMainSkill(campaignId);
  const [formData, setFormData] = useState<MainSkillFormData>({
    name: "",
    color: "#000000",
    icon: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Відправляємо undefined замість порожнього рядка для icon
      const dataToSend = {
        ...formData,
        icon: formData.icon?.trim() || undefined,
      };
      await createMainSkillMutation.mutateAsync(dataToSend);
      setFormData({ name: "", color: "#000000", icon: "" });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating main skill:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Помилка при створенні основного навику";
      alert(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Створити основний навик</DialogTitle>
          <DialogDescription>
            Основні навики використовуються для групування скілів в дереві прокачки
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Назва *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              placeholder="Наприклад: Напад, Захист, Магія"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Колір сегменту *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, color: e.target.value }))
                }
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, color: e.target.value }))
                }
                placeholder="#000000"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Колір використовується для відображення сегменту в дереві прокачки
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon">Іконка (URL)</Label>
            <Input
              id="icon"
              type="url"
              value={formData.icon || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, icon: e.target.value }))
              }
              placeholder="https://example.com/icon.png"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={createMainSkillMutation.isPending}
            >
              {createMainSkillMutation.isPending
                ? "Створення..."
                : "Створити"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

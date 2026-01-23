"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { updateCampaign } from "@/lib/api/campaigns";

interface CampaignSettingsDialogProps {
  campaignId: string;
  initialName: string;
  initialDescription: string | null;
  initialMaxLevel: number;
  initialXpMultiplier: number;
  initialAllowPlayerEdit: boolean;
  initialStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function CampaignSettingsDialog({
  campaignId,
  initialName,
  initialDescription,
  initialMaxLevel,
  initialXpMultiplier,
  initialAllowPlayerEdit,
  initialStatus,
  open,
  onOpenChange,
  onUpdated,
}: CampaignSettingsDialogProps) {
  const [name, setName] = useState(initialName);

  const [description, setDescription] = useState(initialDescription || "");

  const [maxLevel, setMaxLevel] = useState(initialMaxLevel);

  const [xpMultiplier, setXpMultiplier] = useState(initialXpMultiplier);

  const [allowPlayerEdit, setAllowPlayerEdit] = useState(initialAllowPlayerEdit);

  const [status, setStatus] = useState(initialStatus);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription || "");
      setMaxLevel(initialMaxLevel);
      setXpMultiplier(initialXpMultiplier);
      setAllowPlayerEdit(initialAllowPlayerEdit);
      setStatus(initialStatus);
      setError(null);
    }
  }, [
    open,
    initialName,
    initialDescription,
    initialMaxLevel,
    initialXpMultiplier,
    initialAllowPlayerEdit,
    initialStatus,
  ]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await updateCampaign(campaignId, {
        name: name.trim(),
        description: description.trim() || null,
        maxLevel,
        xpMultiplier,
        allowPlayerEdit,
        status,
      });
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка збереження";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Налаштування кампанії</DialogTitle>
          <DialogDescription>Оновіть основні параметри кампанії</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <LabeledInput
            id="campaign-name"
            label="Назва"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
          />
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Опис</Label>
            <Textarea
              id="campaign-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              id="campaign-max-level"
              label="Макс. рівень"
              type="number"
              min="1"
              max="30"
              value={maxLevel}
              onChange={(e) => setMaxLevel(parseInt(e.target.value) || 1)}
              disabled={isSaving}
            />
            <LabeledInput
              id="campaign-xp"
              label="Множник XP"
              type="number"
              min="1"
              max="10"
              step="0.1"
              value={xpMultiplier}
              onChange={(e) =>
                setXpMultiplier(parseFloat(e.target.value) || 1)
              }
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allow-player-edit"
              checked={allowPlayerEdit}
              onChange={(e) => setAllowPlayerEdit(e.target.checked)}
              disabled={isSaving}
              className="rounded"
            />
            <Label htmlFor="allow-player-edit">
              Дозволити гравцям редагувати своїх персонажів
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="campaign-status"
              checked={status === "active"}
              onChange={(e) => setStatus(e.target.checked ? "active" : "archived")}
              disabled={isSaving}
              className="rounded"
            />
            <Label htmlFor="campaign-status">Кампанія активна</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Збереження..." : "Зберегти"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

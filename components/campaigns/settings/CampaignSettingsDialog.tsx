"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateCampaign } from "@/lib/hooks/campaigns";
import type { CampaignSettings } from "@/types/campaigns";

interface CampaignSettingsDialogProps {
  campaignId: string;
  campaign: CampaignSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toFields = (c: CampaignSettings) => ({ ...c, description: c.description || "" });

export function CampaignSettingsDialog({ campaignId, campaign, open, onOpenChange }: CampaignSettingsDialogProps) {
  const update = useUpdateCampaign(campaignId);

  const [fields, setFields] = useState(() => toFields(campaign));

  const [error, setError] = useState<string | null>(null);

  const isSaving = update.isPending;

  const set = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) => setFields((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    setError(null);
    update.mutate(
      { ...fields, name: fields.name.trim(), description: fields.description.trim() || null },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err) => setError(err instanceof Error ? err.message : "Помилка збереження"),
      },
    );
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Налаштування кампанії"
      description="Оновіть основні параметри кампанії"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !fields.name.trim()}>
            {isSaving ? "Збереження..." : "Зберегти"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <LabeledInput id="campaign-name" label="Назва" value={fields.name} onChange={(e) => set("name", e.target.value)} disabled={isSaving} />
        <div className="space-y-2">
          <Label htmlFor="campaign-description">Опис</Label>
          <Textarea
            id="campaign-description"
            value={fields.description}
            onChange={(e) => set("description", e.target.value)}
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
            value={fields.maxLevel}
            onChange={(e) => set("maxLevel", parseInt(e.target.value) || 1)}
            disabled={isSaving}
          />
          <LabeledInput
            id="campaign-xp"
            label="Множник XP"
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={fields.xpMultiplier}
            onChange={(e) => set("xpMultiplier", parseFloat(e.target.value) || 1)}
            disabled={isSaving}
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="allow-player-edit"
            checked={fields.allowPlayerEdit}
            onChange={(e) => set("allowPlayerEdit", e.target.checked)}
            disabled={isSaving}
            className="rounded"
          />
          <Label htmlFor="allow-player-edit">Дозволити гравцям редагувати своїх персонажів</Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="campaign-status"
            checked={fields.status === "active"}
            onChange={(e) => set("status", e.target.checked ? "active" : "archived")}
            disabled={isSaving}
            className="rounded"
          />
          <Label htmlFor="campaign-status">Кампанія активна</Label>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </ResponsiveDialog>
  );
}

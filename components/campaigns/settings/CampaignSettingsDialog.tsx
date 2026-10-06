"use client";

import { useState } from "react";

import { HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
      hud
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
      <HudSection title="Кампанія">
        <div className="space-y-4">
          <LabeledInput id="campaign-name" label="Назва" value={fields.name} onChange={(e) => set("name", e.target.value)} disabled={isSaving} />
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Опис</Label>
            <Textarea id="campaign-description" value={fields.description} onChange={(e) => set("description", e.target.value)} disabled={isSaving} rows={3} />
          </div>
        </div>
      </HudSection>
      <HudSection title="Правила">
        <div className="space-y-4">
          <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
            <LabeledInput
              id="campaign-max-level"
              label="Макс. рівень"
              labelClassName="text-xs leading-tight"
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
              labelClassName="text-xs leading-tight"
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
            <Checkbox id="allow-player-edit" checked={fields.allowPlayerEdit} onCheckedChange={(v) => set("allowPlayerEdit", v === true)} disabled={isSaving} />
            <Label htmlFor="allow-player-edit">Дозволити гравцям редагувати своїх персонажів</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="campaign-status" checked={fields.status === "active"} onCheckedChange={(v) => set("status", v === true ? "active" : "archived")} disabled={isSaving} />
            <Label htmlFor="campaign-status">Кампанія активна</Label>
          </div>
        </div>
      </HudSection>
      {error && (
        <p role="alert" className="mt-4 rounded-md border border-[#d0705c]/50 bg-[#d0705c]/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {error}
        </p>
      )}
    </ResponsiveDialog>
  );
}

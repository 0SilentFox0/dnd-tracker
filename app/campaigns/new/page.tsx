"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { HudForm, HudFormPage, HudSection } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCampaign } from "@/lib/hooks/campaigns";
import { useNotify } from "@/lib/hooks/common";

export default function NewCampaignPage() {
  const notify = useNotify();

  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    maxLevel: 20,
    xpMultiplier: 2.5,
    allowPlayerEdit: true,
  });

  const create = useCreateCampaign();

  const loading = create.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(formData, {
      onSuccess: (campaign) => router.push(`/campaigns/${campaign.id}`),
      onError: () => void notify("Помилка при створенні кампанії"),
    });
  };

  return (
    <HudFormPage title="Створити нову кампанію" aside="Станьте Dungeon Master">
      <HudForm
        id="campaign-form"
        onSubmit={handleSubmit}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/campaigns">Скасувати</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Створення..." : "Створити кампанію"}
            </Button>
          </>
        }
      >
        <HudSection title="Кампанія">
          <div className="space-y-4">
            <LabeledInput
              id="name"
              label="Назва кампанії"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Назва вашої кампанії"
            />
            <div>
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Короткий опис кампанії (опціонально)"
                rows={3}
              />
            </div>
          </div>
        </HudSection>
        <HudSection title="Правила">
          <div className="space-y-4">
            <div className="grid grid-cols-3 items-end gap-2 sm:grid-cols-4">
              <LabeledInput
                id="maxLevel"
                label="Максимальний рівень"
                labelClassName="text-xs leading-tight"
                type="number"
                min="1"
                max="30"
                value={formData.maxLevel}
                onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) })}
              />
              <LabeledInput
                id="xpMultiplier"
                label="Множник досвіду"
                labelClassName="text-xs leading-tight"
                type="number"
                min="1"
                max="10"
                step="0.1"
                value={formData.xpMultiplier}
                onChange={(e) => setFormData({ ...formData, xpMultiplier: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="allowPlayerEdit" checked={formData.allowPlayerEdit} onCheckedChange={(v) => setFormData({ ...formData, allowPlayerEdit: v === true })} />
              <Label htmlFor="allowPlayerEdit">Дозволити гравцям редагувати своїх персонажів</Label>
            </div>
          </div>
        </HudSection>
      </HudForm>
    </HudFormPage>
  );
}

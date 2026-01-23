"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { Textarea } from "@/components/ui/textarea";

interface ArtifactSetOption {
  id: string;
  name: string;
}

interface ArtifactCreateFormProps {
  campaignId: string;
  artifactSets: ArtifactSetOption[];
}

const RARITY_OPTIONS = [
  { value: "common", label: "Звичайний" },
  { value: "uncommon", label: "Незвичайний" },
  { value: "rare", label: "Рідкісний" },
  { value: "epic", label: "Епічний" },
  { value: "legendary", label: "Легендарний" },
] as const;

const SLOT_OPTIONS = [
  { value: "weapon", label: "Зброя" },
  { value: "shield", label: "Щит" },
  { value: "cloak", label: "Плащ" },
  { value: "ring", label: "Кільце" },
  { value: "helmet", label: "Шолом" },
  { value: "amulet", label: "Амулет" },
  { value: "item", label: "Предмет" },
] as const;

export function ArtifactCreateForm({
  campaignId,
  artifactSets,
}: ArtifactCreateFormProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [rarity, setRarity] = useState<string>("common");

  const [slot, setSlot] = useState<string>("item");

  const [icon, setIcon] = useState("");

  const [setId, setSetId] = useState<string | null>(null);

  const [effectName, setEffectName] = useState("");

  const [effectDescription, setEffectDescription] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        rarity,
        slot,
        icon: icon.trim() || null,
        setId: setId || undefined,
        bonuses: {},
        modifiers: [],
        passiveAbility:
          effectName.trim() || effectDescription.trim()
            ? {
                name: effectName.trim() || "Ефект",
                description: effectDescription.trim() || "",
              }
            : undefined,
      };

      const response = await fetch(`/api/campaigns/${campaignId}/artifacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();

        throw new Error(data.error || "Не вдалося створити артефакт");
      }

      router.push(`/campaigns/${campaignId}/dm/artifacts`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка створення";

      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Створити артефакт</CardTitle>
        <CardDescription>
          Додайте артефакт і його особливий ефект
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <LabeledInput
              id="artifact-name"
              label="Назва"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Кільце Сар Ісси"
              required
            />
            <div className="space-y-2">
              <Label htmlFor="artifact-rarity">Рідкість</Label>
              <SelectField
                id="artifact-rarity"
                value={rarity}
                onValueChange={setRarity}
                placeholder="Виберіть рідкість"
                options={RARITY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-slot">Слот</Label>
              <SelectField
                id="artifact-slot"
                value={slot}
                onValueChange={setSlot}
                placeholder="Виберіть слот"
                options={SLOT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-set">Сет</Label>
              <SelectField
                id="artifact-set"
                value={setId || ""}
                onValueChange={(value) => setSetId(value || null)}
                placeholder="Без сету"
                options={artifactSets.map(set => ({ value: set.id, label: set.name }))}
                allowNone
                noneLabel="Без сету"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="artifact-description">Опис</Label>
            <Textarea
              id="artifact-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Короткий опис артефакту"
              rows={3}
            />
          </div>

          <LabeledInput
            id="artifact-icon"
            label="Іконка (URL)"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="https://example.com/icon.png"
          />

          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-semibold">Ефект артефакту</p>
            <div className="space-y-2">
              <Label htmlFor="artifact-effect-name">Назва ефекту</Label>
              <Input
                id="artifact-effect-name"
                value={effectName}
                onChange={(e) => setEffectName(e.target.value)}
                placeholder="Наприклад: Полум'я Сар Ісси"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-effect-description">Опис ефекту</Label>
              <Textarea
                id="artifact-effect-description"
                value={effectDescription}
                onChange={(e) => setEffectDescription(e.target.value)}
                placeholder="Опис ефекту артефакту"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Створення..." : "Створити артефакт"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}/dm/artifacts`)}
              disabled={isSaving}
            >
              Скасувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

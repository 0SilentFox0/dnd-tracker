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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
            <div className="space-y-2">
              <Label htmlFor="artifact-name">Назва *</Label>
              <Input
                id="artifact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Наприклад: Кільце Сар Ісси"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-rarity">Рідкість</Label>
              <Select value={rarity} onValueChange={setRarity}>
                <SelectTrigger id="artifact-rarity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RARITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-slot">Слот</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger id="artifact-slot">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="artifact-set">Сет</Label>
              <Select
                value={setId || "none"}
                onValueChange={(value) =>
                  setSetId(value === "none" ? null : value)
                }
              >
                <SelectTrigger id="artifact-set">
                  <SelectValue placeholder="Без сету" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без сету</SelectItem>
                  {artifactSets.map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="space-y-2">
            <Label htmlFor="artifact-icon">Іконка (URL)</Label>
            <Input
              id="artifact-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
          </div>

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

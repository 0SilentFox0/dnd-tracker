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
import { Checkbox } from "@/components/ui/checkbox";
import { RACE_OPTIONS, BONUS_ATTRIBUTES } from "@/lib/types/skills";
import { createSkill, updateSkill } from "@/lib/api/skills";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SpellOption {
  id: string;
  name: string;
}

interface SpellGroupOption {
  id: string;
  name: string;
}

interface SkillCreateFormProps {
  campaignId: string;
  spells: SpellOption[];
  spellGroups: SpellGroupOption[];
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    races: unknown;
    isRacial: boolean;
    bonuses: unknown;
    damage: number | null;
    armor: number | null;
    speed: number | null;
    physicalResistance: number | null;
    magicalResistance: number | null;
    spellId: string | null;
    spellGroupId: string | null;
  };
}

export function SkillCreateForm({
  campaignId,
  spells,
  spellGroups,
  initialData,
}: SkillCreateFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!initialData;

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [icon, setIcon] = useState(initialData?.icon || "");
  const [selectedRaces, setSelectedRaces] = useState<string[]>(
    (initialData?.races && Array.isArray(initialData.races)
      ? initialData.races
      : []) as string[]
  );
  const [isRacial, setIsRacial] = useState(initialData?.isRacial || false);
  const [bonuses, setBonuses] = useState<Record<string, number>>(
    (initialData?.bonuses &&
    typeof initialData.bonuses === "object" &&
    !Array.isArray(initialData.bonuses)
      ? initialData.bonuses
      : {}) as Record<string, number>
  );
  const [damage, setDamage] = useState(
    initialData?.damage?.toString() || ""
  );
  const [armor, setArmor] = useState(initialData?.armor?.toString() || "");
  const [speed, setSpeed] = useState(initialData?.speed?.toString() || "");
  const [physicalResistance, setPhysicalResistance] = useState(
    initialData?.physicalResistance?.toString() || ""
  );
  const [magicalResistance, setMagicalResistance] = useState(
    initialData?.magicalResistance?.toString() || ""
  );
  const [spellId, setSpellId] = useState<string | null>(
    initialData?.spellId || null
  );
  const [spellGroupId, setSpellGroupId] = useState<string | null>(
    initialData?.spellGroupId || null
  );
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [localSpellGroups, setLocalSpellGroups] = useState(spellGroups);

  const handleRaceToggle = (race: string) => {
    setSelectedRaces((prev) =>
      prev.includes(race)
        ? prev.filter((r) => r !== race)
        : [...prev, race]
    );
  };

  const handleBonusChange = (attr: string, value: string) => {
    const numValue = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(numValue)) return;
    setBonuses((prev) => ({
      ...prev,
      [attr]: numValue,
    }));
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setIsCreatingGroup(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/spells/groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newGroupName.trim() }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create group");
      }

      const newGroup = await response.json();
      setLocalSpellGroups((prev) => [...prev, newGroup]);
      setSpellGroupId(newGroup.id);
      setIsGroupDialogOpen(false);
      setNewGroupName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Помилка створення";
      setError(message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon.trim() || undefined,
        races: selectedRaces,
        isRacial,
        bonuses: Object.fromEntries(
          Object.entries(bonuses).filter(([_, v]) => v !== 0)
        ),
        damage: damage ? parseInt(damage, 10) : undefined,
        armor: armor ? parseInt(armor, 10) : undefined,
        speed: speed ? parseInt(speed, 10) : undefined,
        physicalResistance: physicalResistance
          ? parseInt(physicalResistance, 10)
          : undefined,
        magicalResistance: magicalResistance
          ? parseInt(magicalResistance, 10)
          : undefined,
        spellId: spellId || undefined,
        spellGroupId: spellGroupId || undefined,
      };

      if (isEdit && initialData) {
        await updateSkill(campaignId, initialData.id, payload);
      } else {
        await createSkill(campaignId, payload);
      }

      router.push(`/campaigns/${campaignId}/dm/skills`);
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
        <CardTitle>{isEdit ? "Редагувати скіл" : "Створити скіл"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Оновіть інформацію про скіл"
            : "Додайте новий скіл з його характеристиками та ефектами"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Назва *</Label>
            <Input
              id="skill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Майстерність з мечем"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-description">Опис</Label>
            <Textarea
              id="skill-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опис скіла"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-icon">Іконка (URL)</Label>
            <Input
              id="skill-icon"
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="https://example.com/icon.png"
            />
            {icon && (
              <div className="mt-2">
                <div className="w-16 h-16 rounded border overflow-hidden bg-muted flex items-center justify-center">
                  <OptimizedImage
                    src={icon}
                    alt="Preview"
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-xs text-muted-foreground">
                          Помилка завантаження
                        </span>
                      </div>
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Раси (для яких підходить скіл)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {RACE_OPTIONS.map((race) => (
                <div key={race.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`race-${race.value}`}
                    checked={selectedRaces.includes(race.value)}
                    onCheckedChange={() => handleRaceToggle(race.value)}
                  />
                  <Label
                    htmlFor={`race-${race.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {race.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is-racial"
              checked={isRacial}
              onCheckedChange={(checked) => setIsRacial(checked === true)}
            />
            <Label htmlFor="is-racial" className="text-sm font-normal cursor-pointer">
              Рассовий навик
            </Label>
          </div>

          <div className="rounded-md border p-4 space-y-3">
            <p className="text-sm font-semibold">Бонуси до характеристик</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {BONUS_ATTRIBUTES.map((attr) => (
                <div key={attr.value} className="space-y-1">
                  <Label htmlFor={`bonus-${attr.value}`} className="text-xs">
                    {attr.label}
                  </Label>
                  <Input
                    id={`bonus-${attr.value}`}
                    type="number"
                    value={bonuses[attr.value] || ""}
                    onChange={(e) => handleBonusChange(attr.value, e.target.value)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="skill-damage">Шкода</Label>
              <Input
                id="skill-damage"
                type="number"
                value={damage}
                onChange={(e) => setDamage(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-armor">Броня</Label>
              <Input
                id="skill-armor"
                type="number"
                value={armor}
                onChange={(e) => setArmor(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-speed">Швидкість</Label>
              <Input
                id="skill-speed"
                type="number"
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-physical-resistance">Резист фізичний</Label>
              <Input
                id="skill-physical-resistance"
                type="number"
                value={physicalResistance}
                onChange={(e) => setPhysicalResistance(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-magical-resistance">Резист магічний</Label>
              <Input
                id="skill-magical-resistance"
                type="number"
                value={magicalResistance}
                onChange={(e) => setMagicalResistance(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="skill-spell">Покращення спела</Label>
              <Select
                value={spellId || "none"}
                onValueChange={(value) =>
                  setSpellId(value === "none" ? null : value)
                }
              >
                <SelectTrigger id="skill-spell">
                  <SelectValue placeholder="Без спела" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без спела</SelectItem>
                  {spells.map((spell) => (
                    <SelectItem key={spell.id} value={spell.id}>
                      {spell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="skill-spell-group">Група заклинань</Label>
                <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">
                      + Створити групу
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Створити нову групу</DialogTitle>
                      <DialogDescription>
                        Введіть назву нової групи заклинань
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-group-name">Назва групи</Label>
                        <Input
                          id="new-group-name"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="Назва групи"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateGroup();
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsGroupDialogOpen(false);
                            setNewGroupName("");
                          }}
                        >
                          Скасувати
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCreateGroup}
                          disabled={isCreatingGroup || !newGroupName.trim()}
                        >
                          {isCreatingGroup ? "Створення..." : "Створити"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Select
                value={spellGroupId || "none"}
                onValueChange={(value) =>
                  setSpellGroupId(value === "none" ? null : value)
                }
              >
                <SelectTrigger id="skill-spell-group">
                  <SelectValue placeholder="Без групи" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без групи</SelectItem>
                  {localSpellGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? isEdit
                  ? "Збереження..."
                  : "Створення..."
                : isEdit
                  ? "Зберегти зміни"
                  : "Створити скіл"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}/dm/skills`)}
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

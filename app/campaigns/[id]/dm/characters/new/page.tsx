"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

export default function NewCharacterPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "player" as "player" | "npc_hero",
    controlledBy: "",
    level: 1,
    class: "",
    subclass: "",
    race: "",
    subrace: "",
    alignment: "",
    background: "",
    experience: 0,
    avatar: "",
    
    // Ability Scores
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    
    // Бойові параметри
    armorClass: 10,
    initiative: 0,
    speed: 30,
    maxHp: 10,
    currentHp: 10,
    tempHp: 0,
    hitDice: "1d8",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/campaigns/${params.id}/characters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          savingThrows: {},
          skills: {},
          spellSlots: {},
          knownSpells: [],
          languages: [],
          proficiencies: {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create character");
      }

      const character = await response.json();
      router.push(`/campaigns/${params.id}/dm/characters`);
    } catch (error) {
      console.error("Error creating character:", error);
      alert("Помилка при створенні персонажа: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Link href={`/campaigns/${params.id}/dm/characters`}>
          <Button variant="ghost">← Назад</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Створити нового персонажа</CardTitle>
          <CardDescription>
            Заповніть основну інформацію про персонажа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Загальна інформація */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Загальна інформація</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Ім'я *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Ім'я персонажа"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Тип *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "player" | "npc_hero") =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="player">Гравець</SelectItem>
                      <SelectItem value="npc_hero">NPC Герой</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="race">Раса *</Label>
                  <Input
                    id="race"
                    value={formData.race}
                    onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                    required
                    placeholder="Наприклад: Ельф"
                  />
                </div>

                <div>
                  <Label htmlFor="subrace">Підраса</Label>
                  <Input
                    id="subrace"
                    value={formData.subrace}
                    onChange={(e) => setFormData({ ...formData, subrace: e.target.value })}
                    placeholder="Наприклад: Темний Ельф"
                  />
                </div>

                <div>
                  <Label htmlFor="class">Клас *</Label>
                  <Input
                    id="class"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    required
                    placeholder="Наприклад: Паладин"
                  />
                </div>

                <div>
                  <Label htmlFor="subclass">Підклас</Label>
                  <Input
                    id="subclass"
                    value={formData.subclass}
                    onChange={(e) => setFormData({ ...formData, subclass: e.target.value })}
                    placeholder="Наприклад: Клятва Месника"
                  />
                </div>

                <div>
                  <Label htmlFor="level">Рівень</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="30"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <Label htmlFor="experience">Досвід (XP)</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Ability Scores */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Основні характеристики</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: "strength", label: "Сила (STR)" },
                  { key: "dexterity", label: "Спритність (DEX)" },
                  { key: "constitution", label: "Статура (CON)" },
                  { key: "intelligence", label: "Інтелект (INT)" },
                  { key: "wisdom", label: "Мудрість (WIS)" },
                  { key: "charisma", label: "Харизма (CHA)" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      min="1"
                      max="30"
                      value={formData[key as keyof typeof formData] as number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [key]: parseInt(e.target.value) || 10,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Бойові параметри */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Бойові параметри</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="armorClass">Клас Броні (AC)</Label>
                  <Input
                    id="armorClass"
                    type="number"
                    min="0"
                    value={formData.armorClass}
                    onChange={(e) =>
                      setFormData({ ...formData, armorClass: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="initiative">Ініціатива</Label>
                  <Input
                    id="initiative"
                    type="number"
                    value={formData.initiative}
                    onChange={(e) =>
                      setFormData({ ...formData, initiative: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="speed">Швидкість</Label>
                  <Input
                    id="speed"
                    type="number"
                    min="0"
                    value={formData.speed}
                    onChange={(e) =>
                      setFormData({ ...formData, speed: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="hitDice">Кістки Здоров'я</Label>
                  <Input
                    id="hitDice"
                    value={formData.hitDice}
                    onChange={(e) => setFormData({ ...formData, hitDice: e.target.value })}
                    placeholder="1d8"
                  />
                </div>

                <div>
                  <Label htmlFor="maxHp">Макс. HP</Label>
                  <Input
                    id="maxHp"
                    type="number"
                    min="1"
                    value={formData.maxHp}
                    onChange={(e) =>
                      setFormData({ ...formData, maxHp: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="currentHp">Поточне HP</Label>
                  <Input
                    id="currentHp"
                    type="number"
                    min="0"
                    value={formData.currentHp}
                    onChange={(e) =>
                      setFormData({ ...formData, currentHp: parseInt(e.target.value) || 10 })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="tempHp">Тимчасове HP</Label>
                  <Input
                    id="tempHp"
                    type="number"
                    min="0"
                    value={formData.tempHp}
                    onChange={(e) =>
                      setFormData({ ...formData, tempHp: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Створення..." : "Створити персонажа"}
              </Button>
              <Link href={`/campaigns/${params.id}/dm/characters`}>
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

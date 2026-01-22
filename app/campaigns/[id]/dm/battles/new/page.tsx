"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

interface Character {
  id: string;
  name: string;
  type: string;
  controlledBy: string | null;
  avatar: string | null;
}

interface Unit {
  id: string;
  name: string;
  groupId: string | null;
  avatar: string | null;
}

interface Participant {
  id: string;
  type: "character" | "unit";
  side: "ally" | "enemy";
  quantity?: number;
}

export default function NewBattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Завантажуємо персонажів та юнітів
  useEffect(() => {
    async function loadData() {
      try {
        // Завантажуємо персонажів
        const charactersRes = await fetch(`/api/campaigns/${id}/characters`);
        if (charactersRes.ok) {
          const chars = await charactersRes.json();
          setCharacters(chars);
        }

        // Завантажуємо юнітів
        const unitsRes = await fetch(`/api/campaigns/${id}/units`);
        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(unitsData);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [id]);

  const handleParticipantToggle = (
    participantId: string,
    type: "character" | "unit",
    checked: boolean
  ) => {
    if (checked) {
      // Додаємо як союзника за замовчуванням
      setParticipants([
        ...participants,
        { id: participantId, type, side: "ally" },
      ]);
    } else {
      // Видаляємо
      setParticipants(participants.filter((p) => p.id !== participantId));
    }
  };

  const handleSideChange = (participantId: string, side: "ally" | "enemy") => {
    setParticipants(
      participants.map((p) =>
        p.id === participantId ? { ...p, side } : p
      )
    );
  };

  const handleQuantityChange = (
    participantId: string,
    quantity: number
  ) => {
    setParticipants(
      participants.map((p) =>
        p.id === participantId ? { ...p, quantity } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (participants.length === 0) {
      alert("Оберіть хоча б одного учасника");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/campaigns/${id}/battles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          participants,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Помилка при створенні бою");
      }

      const battle = await response.json();
      router.push(`/campaigns/${id}/dm/battles/${battle.id}`);
    } catch (error) {
      console.error("Error creating battle:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Помилка при створенні бою"
      );
    } finally {
      setLoading(false);
    }
  };

  const isParticipantSelected = (id: string) => {
    return participants.some((p) => p.id === id);
  };

  const getParticipantSide = (id: string): "ally" | "enemy" | null => {
    const participant = participants.find((p) => p.id === id);
    return participant?.side || null;
  };

  const getParticipantQuantity = (id: string): number => {
    const participant = participants.find((p) => p.id === id);
    return participant?.quantity || 1;
  };

  // Розділяємо персонажів на Player Characters та NPC Heroes
  const playerCharacters = characters.filter(
    (c) => c.type === "player" && c.controlledBy !== null
  );
  const npcCharacters = characters.filter((c) => c.type === "npc");

  if (loadingData) {
    return (
      <div className="container mx-auto p-4">
        <p>Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Створити сцену бою</h1>
          <p className="text-muted-foreground mt-1">
            Оберіть учасників та розподіліть їх на союзників та ворогів
          </p>
        </div>
        <Link href={`/campaigns/${id}/dm/battles`}>
          <Button variant="outline">Назад</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Основна інформація */}
        <Card>
          <CardHeader>
            <CardTitle>Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Назва битви *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Назва битви"
              />
            </div>

            <div>
              <Label htmlFor="description">Опис</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Опис битви (опціонально)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Розподіл на сторони */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Союзники */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 dark:text-green-400">
                ✅ Союзники
              </CardTitle>
              <CardDescription>
                Учасники на вашій стороні
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {/* Персонажі-союзники */}
              {participants
                .filter((p) => p.side === "ally" && p.type === "character")
                .length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Персонажі
                  </h4>
                  <div className="space-y-2">
                    {participants
                      .filter(
                        (p) => p.side === "ally" && p.type === "character"
                      )
                      .map((participant) => {
                        const entity = characters.find(
                          (c) => c.id === participant.id
                        );
                        if (!entity) return null;

                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 border rounded bg-green-50 dark:bg-green-950/20"
                          >
                            <div className="flex items-center gap-2">
                              {entity.avatar && (
                                <img
                                  src={entity.avatar}
                                  alt={entity.name}
                                  className="w-8 h-8 rounded"
                                />
                              )}
                              <span className="text-sm font-medium">
                                {entity.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleSideChange(participant.id, "enemy")
                              }
                            >
                              →
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Юніти-союзники */}
              {participants
                .filter((p) => p.side === "ally" && p.type === "unit")
                .length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Юніти
                  </h4>
                  <div className="space-y-2">
                    {participants
                      .filter((p) => p.side === "ally" && p.type === "unit")
                      .map((participant) => {
                        const entity = units.find(
                          (u) => u.id === participant.id
                        );
                        if (!entity) return null;

                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 border rounded bg-green-50 dark:bg-green-950/20"
                          >
                            <div className="flex items-center gap-2">
                              {entity.avatar && (
                                <img
                                  src={entity.avatar}
                                  alt={entity.name}
                                  className="w-8 h-8 rounded"
                                />
                              )}
                              <span className="text-sm font-medium">
                                {entity.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                (x{participant.quantity || 1})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleSideChange(participant.id, "enemy")
                              }
                            >
                              →
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {participants.filter((p) => p.side === "ally").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Оберіть учасників зі списку нижче
                </p>
              )}
            </CardContent>
          </Card>

          {/* Вороги */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">
                ⚔️ Вороги
              </CardTitle>
              <CardDescription>
                Противники в битві
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {/* Персонажі-вороги */}
              {participants
                .filter((p) => p.side === "enemy" && p.type === "character")
                .length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Персонажі
                  </h4>
                  <div className="space-y-2">
                    {participants
                      .filter(
                        (p) => p.side === "enemy" && p.type === "character"
                      )
                      .map((participant) => {
                        const entity = characters.find(
                          (c) => c.id === participant.id
                        );
                        if (!entity) return null;

                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 border rounded bg-red-50 dark:bg-red-950/20"
                          >
                            <div className="flex items-center gap-2">
                              {entity.avatar && (
                                <img
                                  src={entity.avatar}
                                  alt={entity.name}
                                  className="w-8 h-8 rounded"
                                />
                              )}
                              <span className="text-sm font-medium">
                                {entity.name}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleSideChange(participant.id, "ally")
                              }
                            >
                              ←
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Юніти-вороги */}
              {participants
                .filter((p) => p.side === "enemy" && p.type === "unit")
                .length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    Юніти
                  </h4>
                  <div className="space-y-2">
                    {participants
                      .filter((p) => p.side === "enemy" && p.type === "unit")
                      .map((participant) => {
                        const entity = units.find(
                          (u) => u.id === participant.id
                        );
                        if (!entity) return null;

                        return (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-2 border rounded bg-red-50 dark:bg-red-950/20"
                          >
                            <div className="flex items-center gap-2">
                              {entity.avatar && (
                                <img
                                  src={entity.avatar}
                                  alt={entity.name}
                                  className="w-8 h-8 rounded"
                                />
                              )}
                              <span className="text-sm font-medium">
                                {entity.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                (x{participant.quantity || 1})
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleSideChange(participant.id, "ally")
                              }
                            >
                              ←
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {participants.filter((p) => p.side === "enemy").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Оберіть учасників зі списку нижче
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Список доступних учасників */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* ПЕРСОНАЖІ */}
          <Card>
            <CardHeader>
              <CardTitle>👥 Персонажі</CardTitle>
              <CardDescription>
                Гравці та NPC герої
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {/* Player Characters */}
              {playerCharacters.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
                    Гравці ({playerCharacters.length})
                  </h3>
                  <div className="space-y-2">
                    {playerCharacters.map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between p-2 border rounded hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox
                            checked={isParticipantSelected(character.id)}
                            onCheckedChange={(checked) =>
                              handleParticipantToggle(
                                character.id,
                                "character",
                                checked as boolean
                              )
                            }
                          />
                          {character.avatar && (
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {character.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NPC Heroes */}
              {npcCharacters.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
                    NPC Герої ({npcCharacters.length})
                  </h3>
                  <div className="space-y-2">
                    {npcCharacters.map((character) => (
                      <div
                        key={character.id}
                        className="flex items-center justify-between p-2 border rounded hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Checkbox
                            checked={isParticipantSelected(character.id)}
                            onCheckedChange={(checked) =>
                              handleParticipantToggle(
                                character.id,
                                "character",
                                checked as boolean
                              )
                            }
                          />
                          {character.avatar && (
                            <img
                              src={character.avatar}
                              alt={character.name}
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <span className="text-sm font-medium">
                            {character.name}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {playerCharacters.length === 0 &&
                npcCharacters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Немає доступних персонажів
                  </p>
                )}
            </CardContent>
          </Card>

          {/* ЮНІТИ */}
          <Card>
            <CardHeader>
              <CardTitle>⚔️ Юніти</CardTitle>
              <CardDescription>
                NPC юніти з можливістю вибору кількості
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
              {units.length > 0 ? (
                <div className="space-y-2">
                  {units.map((unit) => {
                    const isSelected = isParticipantSelected(unit.id);
                    const quantity = getParticipantQuantity(unit.id);

                    return (
                      <div
                        key={unit.id}
                        className="flex flex-col gap-2 p-3 border rounded hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleParticipantToggle(
                                unit.id,
                                "unit",
                                checked as boolean
                              )
                            }
                          />
                          {unit.avatar && (
                            <img
                              src={unit.avatar}
                              alt={unit.name}
                              className="w-8 h-8 rounded"
                            />
                          )}
                          <span className="text-sm font-medium flex-1">
                            {unit.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2 pl-6">
                            <Label
                              htmlFor={`quantity-${unit.id}`}
                              className="text-sm text-muted-foreground"
                            >
                              Кількість:
                            </Label>
                            <Input
                              id={`quantity-${unit.id}`}
                              type="number"
                              min="1"
                              max="20"
                              value={quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  unit.id,
                                  Math.max(1, parseInt(e.target.value) || 1)
                                )
                              }
                              className="w-24"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Немає доступних юнітів
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Кнопки */}
        <div className="flex gap-4 justify-end">
          <Link href={`/campaigns/${id}/dm/battles`}>
            <Button type="button" variant="outline">
              Скасувати
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Створення..." : "Створити сцену бою"}
          </Button>
        </div>
      </form>
    </div>
  );
}

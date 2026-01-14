"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface InitiativeParticipant {
  participantId: string;
  participantType: "character" | "unit";
  instanceId?: string;
  initiative: number;
  name: string;
  avatar?: string;
  side: "ally" | "enemy";
  currentHp: number;
  maxHp: number;
  tempHp: number;
  status: "active" | "dead" | "unconscious";
  activeEffects: Array<{
    name: string;
    type: "buff" | "debuff" | "condition";
    duration: number;
    effect: object;
    description?: string;
  }>;
}

interface BattleScene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  status: "prepared" | "active" | "completed";
  participants: Array<{
    id: string;
    type: "character" | "unit";
    side: "ally" | "enemy";
    quantity?: number;
  }>;
  currentRound: number;
  currentTurnIndex: number;
  initiativeOrder: InitiativeParticipant[];
  battleLog: Array<{
    round: number;
    timestamp: string;
    actorName: string;
    action: string;
    target?: string;
    result: string;
    damage?: number;
    healing?: number;
  }>;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export default function BattlePage({
  params,
}: {
  params: { id: string; battleId: string };
}) {
  const router = useRouter();
  const [battle, setBattle] = useState<BattleScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [attackDialogOpen, setAttackDialogOpen] = useState(false);
  const [spellDialogOpen, setSpellDialogOpen] = useState(false);
  const [selectedAttacker, setSelectedAttacker] = useState<InitiativeParticipant | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<InitiativeParticipant | null>(null);
  const [attackRoll, setAttackRoll] = useState("");
  const [damageRolls, setDamageRolls] = useState<string[]>([]);

  useEffect(() => {
    fetchBattle();
    
    // Налаштування Pusher для real-time оновлень
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_PUSHER_KEY) {
      let pusher: any = null;
      
      import("@/lib/pusher").then(({ getPusherClient }) => {
        pusher = getPusherClient();
        
        if (pusher) {
          const channel = pusher.subscribe(`battle-${params.battleId}`);
          
          channel.bind("battle-updated", (data: BattleScene) => {
            setBattle(data);
          });
          
          channel.bind("battle-started", (data: BattleScene) => {
            setBattle(data);
          });
        }
      });
      
      return () => {
        if (pusher) {
          pusher.unsubscribe(`battle-${params.battleId}`);
        }
      };
    }
  }, [params.battleId]);

  const fetchBattle = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.id}/battles/${params.battleId}`);
      if (!response.ok) throw new Error("Failed to fetch battle");
      const data = await response.json();
      setBattle(data);
    } catch (error) {
      console.error("Error fetching battle:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextTurn = async () => {
    if (!battle) return;
    
    try {
      const response = await fetch(`/api/campaigns/${params.id}/battles/${params.battleId}/next-turn`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to advance turn");
      const updatedBattle = await response.json();
      setBattle(updatedBattle);
    } catch (error) {
      console.error("Error advancing turn:", error);
    }
  };

  const handleAttack = async () => {
    if (!battle || !selectedAttacker || !selectedTarget || !attackRoll) return;

    try {
      const response = await fetch(`/api/campaigns/${params.id}/battles/${params.battleId}/attack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attackerId: selectedAttacker.participantId,
          attackerType: selectedAttacker.participantType,
          targetId: selectedTarget.participantId,
          targetType: selectedTarget.participantType,
          attackRoll: parseInt(attackRoll),
          damageRolls: damageRolls.map(r => parseInt(r)).filter(n => !isNaN(n)),
        }),
      });

      if (!response.ok) throw new Error("Failed to process attack");
      const updatedBattle = await response.json();
      setBattle(updatedBattle);
      setAttackDialogOpen(false);
      setAttackRoll("");
      setDamageRolls([]);
    } catch (error) {
      console.error("Error processing attack:", error);
      alert("Помилка при обробці атаки");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p>Завантаження...</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="container mx-auto p-4">
        <p>Бій не знайдено</p>
        <Link href={`/campaigns/${params.id}`}>
          <Button variant="outline">Назад</Button>
        </Link>
      </div>
    );
  }

  const currentParticipant = battle.initiativeOrder[battle.currentTurnIndex];
  const allies = battle.initiativeOrder.filter(p => p.side === "ally");
  const enemies = battle.initiativeOrder.filter(p => p.side === "enemy");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{battle.name}</h1>
          {battle.description && (
            <p className="text-muted-foreground mt-1">{battle.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={battle.status === "active" ? "default" : "secondary"}>
            {battle.status === "active" ? "Активний" : battle.status === "prepared" ? "Підготовлено" : "Завершено"}
          </Badge>
          <Link href={`/campaigns/${params.id}`}>
            <Button variant="outline">Назад</Button>
          </Link>
        </div>
      </div>

      {/* Поточний раунд та хід */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Раунд {battle.currentRound}</CardTitle>
            <Button onClick={handleNextTurn}>Наступний хід</Button>
          </div>
        </CardHeader>
        <CardContent>
          {currentParticipant && (
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={currentParticipant.avatar} />
                <AvatarFallback>
                  {currentParticipant.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{currentParticipant.name}</h3>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>HP: {currentParticipant.currentHp}/{currentParticipant.maxHp}</span>
                  {currentParticipant.tempHp > 0 && (
                    <span>Temp HP: {currentParticipant.tempHp}</span>
                  )}
                  <span>AC: {currentParticipant.side === "ally" ? "?" : "?"}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog open={attackDialogOpen} onOpenChange={setAttackDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setSelectedAttacker(currentParticipant);
                        setSelectedTarget(null);
                      }}
                    >
                      Атака
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Атака</DialogTitle>
                      <DialogDescription>
                        {selectedAttacker?.name} атакує {selectedTarget?.name || "ціль"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Ціль</Label>
                        <Select
                          value={selectedTarget?.participantId}
                          onValueChange={(value) => {
                            const target = battle.initiativeOrder.find(
                              p => p.participantId === value
                            );
                            setSelectedTarget(target || null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Оберіть ціль" />
                          </SelectTrigger>
                          <SelectContent>
                            {enemies.map((enemy) => (
                              <SelectItem key={enemy.participantId} value={enemy.participantId}>
                                {enemy.name} (HP: {enemy.currentHp}/{enemy.maxHp})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Результат кидка d20</Label>
                        <Input
                          type="number"
                          min="1"
                          max="20"
                          value={attackRoll}
                          onChange={(e) => setAttackRoll(e.target.value)}
                          placeholder="Введіть результат кидка"
                        />
                      </div>
                      {selectedTarget && (
                        <div>
                          <Label>AC цілі: {selectedTarget.side === "enemy" ? "?" : "?"}</Label>
                        </div>
                      )}
                      <Button
                        onClick={handleAttack}
                        disabled={!selectedTarget || !attackRoll}
                        className="w-full"
                      >
                        Застосувати атаку
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline">Заклинання</Button>
                <Button variant="outline">Ефект</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Шкала ініціативи */}
      <Card>
        <CardHeader>
          <CardTitle>Черга ходів</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {battle.initiativeOrder.map((participant, index) => {
              const isCurrentTurn = index === battle.currentTurnIndex;
              return (
                <div
                  key={`${participant.participantId}-${participant.instanceId || ""}`}
                  className={`flex items-center gap-4 p-3 border rounded-lg ${
                    isCurrentTurn ? "bg-primary/10 border-primary" : ""
                  }`}
                >
                  <div className="w-12 text-center">
                    <Badge variant={isCurrentTurn ? "default" : "outline"}>
                      {participant.initiative}
                    </Badge>
                  </div>
                  <Avatar>
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>
                      {participant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{participant.name}</span>
                      <Badge variant={participant.side === "ally" ? "default" : "destructive"}>
                        {participant.side === "ally" ? "Союзник" : "Ворог"}
                      </Badge>
                      {participant.status === "dead" && (
                        <Badge variant="outline">Мертвий</Badge>
                      )}
                      {participant.status === "unconscious" && (
                        <Badge variant="outline">Непритомний</Badge>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>HP: {participant.currentHp}/{participant.maxHp}</span>
                      {participant.tempHp > 0 && (
                        <span>Temp HP: {participant.tempHp}</span>
                      )}
                    </div>
                    {participant.activeEffects.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {participant.activeEffects.map((effect, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {effect.name} ({effect.duration})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {isCurrentTurn && (
                    <Badge className="animate-pulse">Хід</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Лог бою */}
      <Card>
        <CardHeader>
          <CardTitle>Лог подій</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {battle.battleLog.length === 0 ? (
              <p className="text-muted-foreground text-sm">Поки немає подій</p>
            ) : (
              battle.battleLog.map((log, index) => (
                <div key={index} className="text-sm border-b pb-2">
                  <span className="font-semibold">{log.actorName}</span>{" "}
                  <span>{log.action}</span>
                  {log.target && (
                    <>
                      {" "}→ <span className="font-semibold">{log.target}</span>
                    </>
                  )}
                  {log.damage && (
                    <span className="text-red-600 ml-2">-{log.damage} HP</span>
                  )}
                  {log.healing && (
                    <span className="text-green-600 ml-2">+{log.healing} HP</span>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    Раунд {log.round} • {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
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
import { useBattle, useNextTurn, useAttack } from "@/lib/hooks/useBattles";
import type { BattleParticipant, BattleScene } from "@/lib/api/battles";

export default function BattlePage({
  params,
}: {
  params: Promise<{ id: string; battleId: string }>;
}) {
  const { id, battleId } = use(params);
  const router = useRouter();
  const [attackDialogOpen, setAttackDialogOpen] = useState(false);
  const [spellDialogOpen, setSpellDialogOpen] = useState(false);
  const [selectedAttacker, setSelectedAttacker] = useState<BattleParticipant | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<BattleParticipant | null>(null);
  const [attackRoll, setAttackRoll] = useState("");
  const [damageRolls, setDamageRolls] = useState<string[]>([]);

  const { data: battle, isLoading: loading } = useBattle(id, battleId);
  const nextTurnMutation = useNextTurn(id, battleId);
  const attackMutation = useAttack(id, battleId);

  useEffect(() => {
    // Налаштування Pusher для real-time оновлень
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_PUSHER_KEY) {
      let pusher: ReturnType<typeof import("@/lib/pusher").getPusherClient> = null;
      
      import("@/lib/pusher").then(({ getPusherClient }) => {
        pusher = getPusherClient();
        
        if (pusher) {
          const channel = pusher.subscribe(`battle-${battleId}`);
          
          channel.bind("battle-updated", (data: BattleScene) => {
            // Оновлюємо через queryClient в хуку
          });
          
          channel.bind("battle-started", (data: BattleScene) => {
            // Оновлюємо через queryClient в хуку
          });
        }
      });
      
      return () => {
        if (pusher) {
          pusher.unsubscribe(`battle-${battleId}`);
        }
      };
    }
  }, [battleId]);

  const handleNextTurn = async () => {
    if (!battle) return;
    nextTurnMutation.mutate();
  };

  const handleAttack = async () => {
    if (!battle || !selectedAttacker || !selectedTarget || !attackRoll) return;

    attackMutation.mutate(
      {
        attackerId: selectedAttacker.sourceId,
        attackerType: selectedAttacker.sourceType,
        targetId: selectedTarget.sourceId,
        targetType: selectedTarget.sourceType,
        attackRoll: parseInt(attackRoll),
        damageRolls: damageRolls.map((r) => parseInt(r)).filter((n) => !isNaN(n)),
      },
      {
        onSuccess: () => {
          setAttackDialogOpen(false);
          setAttackRoll("");
          setDamageRolls([]);
        },
        onError: (error) => {
          console.error("Error processing attack:", error);
          alert("Помилка при обробці атаки");
        },
      }
    );
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
      </div>
    );
  }

  const currentParticipant = battle.initiativeOrder[battle.currentTurnIndex];
  const allies = battle.initiativeOrder.filter(p => p.side === "ally");
  const enemies = battle.initiativeOrder.filter(p => p.side === "enemy");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold">{battle.name}</h1>
          {battle.description && (
            <p className="text-muted-foreground mt-1">{battle.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge variant={battle.status === "active" ? "default" : "secondary"}>
            {battle.status === "active" ? "Активний" : battle.status === "prepared" ? "Підготовлено" : "Завершено"}
          </Badge>
        </div>
      </div>

      {/* Поточний раунд та хід */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Раунд {battle.currentRound}</CardTitle>
            <Button onClick={handleNextTurn} className="whitespace-nowrap w-full sm:w-auto">Наступний хід</Button>
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
                          value={selectedTarget?.id}
                          onValueChange={(value) => {
                            const target = battle.initiativeOrder.find(
                              p => p.id === value
                            );
                            setSelectedTarget(target || null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Оберіть ціль" />
                          </SelectTrigger>
                          <SelectContent>
                            {enemies.map((enemy) => (
                              <SelectItem key={enemy.id} value={enemy.id}>
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
                  key={`${participant.id}-${participant.instanceId || ""}`}
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

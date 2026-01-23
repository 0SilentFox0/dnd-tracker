"use client";

import { use, useEffect, useMemo,useState } from "react";

import { ActionPanel } from "@/components/battle/ActionPanel";
import { AttackDialog } from "@/components/battle/AttackDialog";
import { BattleHeader } from "@/components/battle/BattleHeader";
import { BattleInitiativeBar } from "@/components/battle/BattleInitiativeBar";
import { MoraleCheckDialog } from "@/components/battle/MoraleCheckDialog";
import { ParticipantCard } from "@/components/battle/ParticipantCard";
import { SpellDialog } from "@/components/battle/SpellDialog";
import { Card, CardContent } from "@/components/ui/card";
import { useAttack, useBattle, useCastSpell,useMoraleCheck, useNextTurn } from "@/lib/hooks/useBattles";
import type { BattleParticipant } from "@/types/battle";

export default function BattlePage({
  params,
}: {
  params: Promise<{ id: string; battleId: string }>;
}) {
  const { id, battleId } = use(params);

  const [attackDialogOpen, setAttackDialogOpen] = useState(false);

  const [spellDialogOpen, setSpellDialogOpen] = useState(false);

  const [moraleDialogOpen, setMoraleDialogOpen] = useState(false);

  const [selectedAttacker, setSelectedAttacker] = useState<BattleParticipant | null>(null);

  const [selectedCaster, setSelectedCaster] = useState<BattleParticipant | null>(null);

  const [participantForMorale, setParticipantForMorale] = useState<BattleParticipant | null>(null);
  
  // Відстежуємо, для якого учасника вже було закрито діалог моралі (щоб не відкривати знову)
  const [moraleDialogDismissedFor, setMoraleDialogDismissedFor] = useState<string | null>(null);

  const { data: battle, isLoading: loading } = useBattle(id, battleId);

  const nextTurnMutation = useNextTurn(id, battleId);

  const attackMutation = useAttack(id, battleId);

  const spellMutation = useCastSpell(id, battleId);

  const moraleCheckMutation = useMoraleCheck(id, battleId);

  useEffect(() => {
    // Налаштування Pusher для real-time оновлень
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_PUSHER_KEY) {
      let pusher: ReturnType<typeof import("@/lib/pusher").getPusherClient> = null;
      
      import("@/lib/pusher").then(({ getPusherClient }) => {
        pusher = getPusherClient();
        
        if (pusher) {
          const channel = pusher.subscribe(`battle-${battleId}`);
          
          channel.bind("battle-updated", () => {
            // Оновлюємо через queryClient в хуку
          });
          
          channel.bind("battle-started", () => {
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

  // Перевірка моралі для нового учасника після переходу ходу
  useEffect(() => {
    if (!battle || battle.status !== "active") return;

    if (moraleDialogOpen) return; // Не показуємо діалог якщо він вже відкритий
    
    const currentParticipant = battle.initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant) return;

    // Якщо для цього учасника вже було закрито діалог, не відкриваємо знову
    if (moraleDialogDismissedFor === currentParticipant.id) {
      return;
    }

    console.log("Checking morale for participant:", currentParticipant.name, "morale:", currentParticipant.morale);

    // Перевіряємо чи потрібна перевірка моралі для поточного учасника
    // Виконуємо відразу, оскільки processStartOfTurn вже виконався на бекенді
    if (currentParticipant.morale !== 0) {
      // Перевіряємо расові модифікатори
      let currentMorale = currentParticipant.morale;

      if (currentParticipant.race === "human" && currentMorale < 0) {
        currentMorale = 0;
      }

      if (currentParticipant.race === "necromancer") {
        // Некроманти пропускають перевірку
        console.log("Necromancer - skipping morale check");

        return;
      }
      
      // Якщо мораль не 0, показуємо діалог перевірки моралі
      if (currentMorale !== 0) {
        console.log("Showing morale check dialog for:", currentParticipant.name, "morale:", currentMorale);
        setParticipantForMorale(currentParticipant);
        setMoraleDialogOpen(true);
      }
    } else {
      console.log("Participant has neutral morale (0) - no check needed");
    }
  }, [battle, moraleDialogOpen, moraleDialogDismissedFor]);

  const handleNextTurn = async () => {
    if (!battle) return;

    // Скидаємо відстеження закритого діалогу при переході ходу
    setMoraleDialogDismissedFor(null);
    
    // Просто переходимо до наступного ходу
    // Перевірка моралі буде виконана після оновлення через useEffect
    nextTurnMutation.mutate();
  };

  const handleMoraleCheck = (d10Roll: number) => {
    if (!participantForMorale) return;
    
    moraleCheckMutation.mutate(
      {
        participantId: participantForMorale.id,
        d10Roll,
      },
      {
        onSuccess: (result: { battle: typeof battle; moraleResult: { shouldSkipTurn: boolean; hasExtraTurn: boolean; message: string } }) => {
          console.log("Morale check result:", result.moraleResult);
          
          // Якщо треба пропустити хід, одразу переходимо до наступного
          if (result.moraleResult.shouldSkipTurn) {
            console.log("Skipping turn due to morale");
            setMoraleDialogOpen(false);
            // Скидаємо відстеження закритого діалогу при переході ходу
            setMoraleDialogDismissedFor(null);
            setParticipantForMorale(null);
            // Невелика затримка перед переходом
            setTimeout(() => {
              nextTurnMutation.mutate();
            }, 500);
          } else {
            // Якщо є додатковий хід або просто продовжуємо, залишаємося на тому ж учаснику
            // (hasExtraTurn вже встановлено в API)
            console.log("Morale check passed, continuing turn");
            setMoraleDialogOpen(false);
            // Скидаємо відстеження закритого діалогу після підтвердження
            setMoraleDialogDismissedFor(null);
            setParticipantForMorale(null);
          }
        },
        onError: (error: unknown) => {
          console.error("Error processing morale check:", error);
          alert("Помилка при обробці перевірки моралі");
        },
      }
    );
  };


  // Перевіряємо чи є скіл для перегляду HP ворогів
  const canSeeEnemyHp = useMemo(() => {
    if (!battle) return false;

    const isDM = battle.isDM || false;

    if (isDM) return true;
    
    // Перевіряємо чи є спеціальний скіл у поточного учасника
    const currentParticipant = battle.initiativeOrder?.[battle.currentTurnIndex];

    if (!currentParticipant) return false;
    
    // Шукаємо скіл який дозволяє бачити HP ворогів
    const hasSeeEnemyHpSkill = currentParticipant.activeSkills?.some(
      (skill: { name?: string; effects?: Array<{ type: string }> }) => 
        skill.name?.toLowerCase().includes("enemy hp") || 
        skill.name?.toLowerCase().includes("detect") ||
        skill.effects?.some((e: { type: string }) => e.type === "see_enemy_hp")
    );
    
    return hasSeeEnemyHpSkill || false;
  }, [battle]);

  // Визначаємо доступні цілі для атаки/заклинання
  const availableTargets = useMemo(() => {
    if (!battle) return [];

    const selectedParticipant = selectedAttacker || selectedCaster;

    if (!selectedParticipant) return [];
    
    const participantSide = selectedParticipant.side;

    const friendlyFire = battle.campaign?.friendlyFire || false;
    
    if (friendlyFire) {
      // Якщо friendlyFire увімкнено - можна атакувати всіх
      return battle.initiativeOrder.filter((p: BattleParticipant) => p.id !== selectedParticipant.id && p.status === "active");
    } else {
      // Якщо вимкнено - тільки ворогів
      return battle.initiativeOrder.filter(
        (p: BattleParticipant) => p.side !== participantSide && p.id !== selectedParticipant.id && p.status === "active"
      );
    }
  }, [battle, selectedAttacker, selectedCaster]);

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

  const isDM = battle.isDM || false;

  const currentParticipant = battle.initiativeOrder[battle.currentTurnIndex];

  const allies = battle.initiativeOrder.filter((p: BattleParticipant) => p.side === "ally");

  const enemies = battle.initiativeOrder.filter((p: BattleParticipant) => p.side === "enemy");

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <BattleHeader battle={battle} onNextTurn={handleNextTurn} />

      {/* Панель дій для поточного учасника */}
      {currentParticipant && battle.status === "active" && !moraleDialogOpen && (
        <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm z-40 px-2 sm:px-4 py-2">
          <ActionPanel
            participant={currentParticipant}
            onAttack={() => {
              if (currentParticipant.attacks && currentParticipant.attacks.length > 0) {
                setSelectedAttacker(currentParticipant);
                setAttackDialogOpen(true);
              } else {
                console.warn("Cannot attack - no attacks available:", {
                  participant: currentParticipant.name,
                  hasAttacks: currentParticipant.attacks?.length > 0,
                  attacks: currentParticipant.attacks,
                });
                alert("Немає доступних атак");
              }
            }}
            onSpell={() => {
              if (currentParticipant.knownSpells && currentParticipant.knownSpells.length > 0) {
                setSelectedCaster(currentParticipant);
                setSpellDialogOpen(true);
              } else {
                console.warn("Cannot cast spell - no spells available:", {
                  participant: currentParticipant.name,
                  hasSpells: currentParticipant.knownSpells?.length > 0,
                });
                alert("Немає доступних заклинань");
              }
            }}
            onBonusAction={() => {
              // TODO: Реалізувати бонус дію
              alert("Бонус дія (буде реалізовано)");
            }}
          />
        </div>
      )}

      {/* Основний контент - 2 колонки (Союзники | Вороги) */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4 overflow-y-auto">
          {/* Союзники */}
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              Союзники ({allies.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {allies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Немає союзників
                  </CardContent>
                </Card>
              ) : (
                allies.map((participant: BattleParticipant) => {
                  const isCurrentTurn = participant.id === currentParticipant?.id;

                  return (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      isCurrentTurn={isCurrentTurn}
                      isDM={isDM}
                      canSeeEnemyHp={true} // Союзники завжди видно
                      onSelect={() => {
                        if (isCurrentTurn) {
                          // Визначаємо чи можна атакувати або кастувати
                          if (participant.attacks && participant.attacks.length > 0) {
                            setSelectedAttacker(participant);
                            setAttackDialogOpen(true);
                          } else if (participant.knownSpells && participant.knownSpells.length > 0) {
                            setSelectedCaster(participant);
                            setSpellDialogOpen(true);
                          }
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Вороги */}
          <div className="space-y-2 sm:space-y-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-2">
              Вороги ({enemies.length})
            </h2>
            <div className="space-y-2 sm:space-y-3">
              {enemies.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Немає ворогів
                  </CardContent>
                </Card>
              ) : (
                enemies.map((participant: BattleParticipant) => {
                  const isCurrentTurn = participant.id === currentParticipant?.id;

                  return (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      isCurrentTurn={isCurrentTurn}
                      isDM={isDM}
                      canSeeEnemyHp={canSeeEnemyHp}
                      onSelect={() => {
                        if (isCurrentTurn) {
                          // Визначаємо чи можна атакувати або кастувати
                          if (participant.attacks && participant.attacks.length > 0) {
                            setSelectedAttacker(participant);
                            setAttackDialogOpen(true);
                          } else if (participant.knownSpells && participant.knownSpells.length > 0) {
                            setSelectedCaster(participant);
                            setSpellDialogOpen(true);
                          }
                        }
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Черга ходів знизу (Heroes 5 style) */}
      {battle.status === "active" && (
        <BattleInitiativeBar
          initiativeOrder={battle.initiativeOrder}
          currentTurnIndex={battle.currentTurnIndex}
          isDM={isDM}
        />
      )}

      <AttackDialog
        open={attackDialogOpen}
        onOpenChange={setAttackDialogOpen}
        attacker={selectedAttacker}
        battle={battle}
        availableTargets={availableTargets}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onAttack={(data) => {
          attackMutation.mutate(data, {
            onSuccess: () => {
              setAttackDialogOpen(false);
            },
            onError: (error: unknown) => {
              console.error("Error processing attack:", error);
              alert("Помилка при обробці атаки");
            },
          });
        }}
      />

      <MoraleCheckDialog
        open={moraleDialogOpen}
        onOpenChange={(open) => {
          setMoraleDialogOpen(open);
          // Якщо діалог закривається без підтвердження (скасування), позначаємо що для цього учасника він був закритий
          if (!open && participantForMorale) {
            setMoraleDialogDismissedFor(participantForMorale.id);
          }
        }}
        participant={participantForMorale}
        onConfirm={handleMoraleCheck}
      />

      <SpellDialog
        open={spellDialogOpen}
        onOpenChange={setSpellDialogOpen}
        caster={selectedCaster}
        battle={battle}
        campaignId={id}
        availableTargets={availableTargets}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onCast={(data) => {
          spellMutation.mutate(data, {
            onSuccess: () => {
              setSpellDialogOpen(false);
            },
            onError: (error: unknown) => {
              console.error("Error processing spell:", error);
              alert("Помилка при обробці заклинання");
            },
          });
        }}
      />
    </div>
  );
}

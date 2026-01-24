"use client";

import { use, useEffect, useMemo, useState } from "react";

import { BattleHeader } from "@/components/battle/BattleHeader";
import { AttackDialog } from "@/components/battle/dialogs/AttackDialog";
import { MoraleCheckDialog } from "@/components/battle/dialogs/MoraleCheckDialog";
import { SpellDialog } from "@/components/battle/dialogs/SpellDialog";
import { BattleFieldView } from "@/components/battle/views/BattleFieldView";
import { PlayerTurnView } from "@/components/battle/views/PlayerTurnView";
import { ParticipantSide } from "@/lib/constants/battle";
import { useAttack, useBattle, useCastSpell, useMoraleCheck, useNextTurn } from "@/lib/hooks/useBattles";
import { createClient } from "@/lib/supabase/client";
import type { ActiveSkill,BattleParticipant } from "@/types/battle";

export default function BattlePage({
  params,
}: {
  params: Promise<{ id: string; battleId: string }>;
}) {
  const { id, battleId } = use(params);

  const [attackDialogOpen, setAttackDialogOpen] = useState(false);

  const [spellDialogOpen, setSpellDialogOpen] = useState(false);

  const [moraleDialogOpen, setMoraleDialogOpen] = useState(false);


  const [participantForMorale, setParticipantForMorale] = useState<BattleParticipant | null>(null);
  
  // Відстежуємо, для якого учасника вже було закрито діалог моралі (щоб не відкривати знову)
  const [moraleDialogDismissedFor, setMoraleDialogDismissedFor] = useState<string | null>(null);

  // ID поточного користувача
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { data: battle, isLoading: loading } = useBattle(id, battleId);

  // Отримуємо ID поточного користувача
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

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

  // Всі хуки мають бути перед умовними return-ами
  const isDM = useMemo(() => battle?.isDM || false, [battle]);

  const currentParticipant = useMemo(() => {
    if (!battle) return null;

    return battle.initiativeOrder[battle.currentTurnIndex] || null;
  }, [battle]);

  // Перевіряємо чи поточний учасник - це гравець (не DM і не NPC)
  const isCurrentPlayerTurn = useMemo(() => {
    if (!currentParticipant || !currentUserId || isDM) return false;
    
    // Перевіряємо чи це персонаж гравця (sourceType === "character" і controlledBy === currentUserId)
    return (
      currentParticipant.basicInfo.sourceType === "character" &&
      currentParticipant.basicInfo.controlledBy === currentUserId
    );
  }, [currentParticipant, currentUserId, isDM]);

  // Перевірка моралі для нового учасника після переходу ходу
  // Тільки для DM режиму або NPC (не для гравців - вони керують через PlayerTurnView)
  useEffect(() => {
    if (!battle || battle.status !== "active") return;

    // Якщо це хід гравця, не показуємо діалог тут - він керується через PlayerTurnView
    if (isCurrentPlayerTurn) {
      return;
    }

    if (moraleDialogOpen) return; // Не показуємо діалог якщо він вже відкритий
    
    const currentParticipant = battle.initiativeOrder[battle.currentTurnIndex];

    if (!currentParticipant || !currentParticipant.basicInfo) return;

    // Якщо для цього учасника вже було закрито діалог, не відкриваємо знову
    if (moraleDialogDismissedFor === currentParticipant.basicInfo.id) {
      return;
    }

    // Перевіряємо чи потрібна перевірка моралі для поточного учасника
    // Виконуємо відразу, оскільки processStartOfTurn вже виконався на бекенді
    if (currentParticipant.combatStats.morale !== 0) {
      // Перевіряємо расові модифікатори
      let currentMorale = currentParticipant.combatStats.morale;

      if (currentParticipant.abilities.race === "human" && currentMorale < 0) {
        currentMorale = 0;
      }

      if (currentParticipant.abilities.race === "necromancer") {
        // Некроманти пропускають перевірку
        return;
      }
      
      // Якщо мораль не 0, показуємо діалог перевірки моралі
      if (currentMorale !== 0) {
        setParticipantForMorale(currentParticipant);
        setMoraleDialogOpen(true);
      }
    }
  }, [battle, moraleDialogOpen, moraleDialogDismissedFor, isCurrentPlayerTurn]);

  const handleNextTurn = async () => {
    if (!battle) return;

    // Скидаємо відстеження закритого діалогу при переході ходу
    setMoraleDialogDismissedFor(null);
    setParticipantForMorale(null);
    setMoraleDialogOpen(false);
    
    // Просто переходимо до наступного ходу
    // Перевірка моралі буде виконана після оновлення через useEffect (тільки для DM/NPC)
    nextTurnMutation.mutate();
  };

  const handleMoraleCheck = (d10Roll: number) => {
    if (!participantForMorale || !participantForMorale.basicInfo) return;
    
    moraleCheckMutation.mutate(
      {
        participantId: participantForMorale.basicInfo.id,
        d10Roll,
      },
      {
        onSuccess: (result: { battle: typeof battle; moraleResult: { shouldSkipTurn: boolean; hasExtraTurn: boolean; message: string } }) => {
          // Якщо треба пропустити хід, одразу переходимо до наступного
          if (result.moraleResult.shouldSkipTurn) {
            setMoraleDialogOpen(false);
            // Позначаємо що для цього учасника діалог був оброблений
            setMoraleDialogDismissedFor(participantForMorale.basicInfo.id);
            setParticipantForMorale(null);
            // Невелика затримка перед переходом
            setTimeout(() => {
              nextTurnMutation.mutate();
            }, 500);
          } else {
            // Якщо є додатковий хід або просто продовжуємо, залишаємося на тому ж учаснику
            // (hasExtraTurn вже встановлено в API)
            setMoraleDialogOpen(false);
            // Позначаємо що для цього учасника діалог був оброблений
            setMoraleDialogDismissedFor(participantForMorale.basicInfo.id);
            setParticipantForMorale(null);
          }
        },
          onError: () => {
            // Error processing morale check
          alert("Помилка при обробці перевірки моралі");
        },
      }
    );
  };

  const allies = useMemo(() => {
    if (!battle) return [];

    return battle.initiativeOrder.filter(
      (p: BattleParticipant | null | undefined): p is BattleParticipant =>
        p !== null && p !== undefined && p.basicInfo?.side === ParticipantSide.ALLY
    );
  }, [battle]);

  const enemies = useMemo(() => {
    if (!battle) return [];

    return battle.initiativeOrder.filter(
      (p: BattleParticipant | null | undefined): p is BattleParticipant =>
        p !== null && p !== undefined && p.basicInfo?.side === ParticipantSide.ENEMY
    );
  }, [battle]);

  // Перевіряємо чи є скіл для перегляду HP ворогів
  const canSeeEnemyHp = useMemo(() => {
    if (!battle) return false;

    if (isDM) return true;
    
    // Перевіряємо чи є спеціальний скіл у поточного учасника
    if (!currentParticipant) return false;
    
    // Шукаємо скіл який дозволяє бачити HP ворогів
    const hasSeeEnemyHpSkill = currentParticipant.battleData.activeSkills?.some(
      (skill: { name?: string; effects?: Array<{ type: string }> }) => 
        skill.name?.toLowerCase().includes("enemy hp") || 
        skill.name?.toLowerCase().includes("detect") ||
        skill.effects?.some((e: { type: string }) => e.type === "see_enemy_hp")
    );
    
    return hasSeeEnemyHpSkill || false;
  }, [battle, isDM, currentParticipant]);

  // Визначаємо доступні цілі для атаки/заклинання
  const availableTargets = useMemo(() => {
    if (!battle) return [];

    return battle.initiativeOrder.filter(
      (p: BattleParticipant | null | undefined): p is BattleParticipant =>
        p !== null && p !== undefined && p.combatStats?.status === "active"
    );
  }, [battle]);

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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <BattleHeader battle={battle} onNextTurn={handleNextTurn} />

      {/* Основний контент */}
      {isCurrentPlayerTurn && currentParticipant && battle.status === "active" ? (
        /* Екран ходу гравця */
        <PlayerTurnView
          battle={battle}
          participant={currentParticipant}
          isDM={isDM}
          campaignId={id}
          onAttack={(data) => {
            attackMutation.mutate(
              {
                attackerId: data.attackerId,
                targetId: data.targetId,
                attackId: data.attackId,
                attackRoll: data.attackRoll,
                advantageRoll: data.advantageRoll,
                damageRolls: data.damageRolls,
              },
              {
                onSuccess: () => {
                  // Атака успішно виконана
                },
                onError: () => {
                  // Error processing attack
                  alert("Помилка при обробці атаки");
                },
              }
            );
          }}
          onSpell={(data) => {
            spellMutation.mutate(data, {
              onSuccess: () => {
                // Заклинання успішно виконано
              },
              onError: () => {
                // Error processing spell
                alert("Помилка при обробці заклинання");
              },
            });
          }}
          onBonusAction={(skill: ActiveSkill) => {
            // TODO: Реалізувати виконання бонусної дії з тригера
            // TODO: Реалізувати виконання бонусної дії з тригера
            alert(`Бонусна дія: ${skill.name} (буде реалізовано)`);
          }}
          onSkipTurn={handleNextTurn}
          onMoraleCheck={handleMoraleCheck}
        />
      ) : (
        /* Ігрове поле (коли не хід гравця або DM режим) */
        battle.status === "active" && (
          <BattleFieldView
            battle={battle}
            allies={allies}
            enemies={enemies}
            isDM={isDM}
          />
        )
      )}

      <AttackDialog
        open={attackDialogOpen}
        onOpenChange={setAttackDialogOpen}
        attacker={null}
        battle={battle}
        availableTargets={availableTargets}
        isDM={isDM}
        canSeeEnemyHp={canSeeEnemyHp}
        onAttack={(data) => {
          attackMutation.mutate(data, {
            onSuccess: () => {
              setAttackDialogOpen(false);
            },
            onError: () => {
              // Error processing attack
              alert("Помилка при обробці атаки");
            },
          });
        }}
      />

      {/* Діалог моралі для DM режиму або NPC (не для гравців) */}
      {!isCurrentPlayerTurn && (
        <MoraleCheckDialog
          open={moraleDialogOpen}
          onOpenChange={(open) => {
            setMoraleDialogOpen(open);

            // Якщо діалог закривається без підтвердження (скасування), позначаємо що для цього учасника він був закритий
            if (!open && participantForMorale && participantForMorale.basicInfo) {
              setMoraleDialogDismissedFor(participantForMorale.basicInfo.id);
              setParticipantForMorale(null);
            }
          }}
          participant={participantForMorale}
          onConfirm={handleMoraleCheck}
        />
      )}

      <SpellDialog
        open={spellDialogOpen}
        onOpenChange={setSpellDialogOpen}
        caster={null}
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
            onError: () => {
              // Error processing spell
              alert("Помилка при обробці заклинання");
            },
          });
        }}
      />
    </div>
  );
}

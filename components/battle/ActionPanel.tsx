"use client";

import { Button } from "@/components/ui/button";
import type { BattleParticipant } from "@/types/battle";

interface ActionPanelProps {
  participant: BattleParticipant;
  onAttack: () => void;
  onSpell: () => void;
  onBonusAction: () => void;
}

export function ActionPanel({
  participant,
  onAttack,
  onSpell,
  onBonusAction,
}: ActionPanelProps) {
  const hasAttacks = participant.attacks && participant.attacks.length > 0;
  const hasSpells = participant.knownSpells && participant.knownSpells.length > 0;
  const canAttack = !participant.hasUsedAction && hasAttacks;
  const canCastSpell = !participant.hasUsedAction && hasSpells;
  const canUseBonusAction = !participant.hasUsedBonusAction;

  return (
    <div className="space-y-2">
      <div className="text-xs sm:text-sm font-semibold text-muted-foreground">
        {participant.name} - Дії:
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={onAttack}
          disabled={!canAttack}
          variant={canAttack ? "default" : "outline"}
          size="sm"
          className="text-xs sm:text-sm"
        >
          ⚔️ Атака {hasAttacks ? `(${participant.attacks.length})` : ""}
        </Button>
        {(hasSpells || participant.knownSpells?.length > 0) && (
          <Button
            onClick={onSpell}
            disabled={!canCastSpell}
            variant={canCastSpell ? "default" : "outline"}
            size="sm"
            className="text-xs sm:text-sm"
          >
            ✨ Заклинання {hasSpells ? `(${participant.knownSpells.length})` : ""}
          </Button>
        )}
        {canUseBonusAction && (
          <Button
            onClick={onBonusAction}
            disabled={!canUseBonusAction}
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm"
          >
            ⭐ Бонус Дія
          </Button>
        )}
      </div>
      {(participant.hasUsedAction || participant.hasUsedBonusAction) && (
        <div className="text-xs text-muted-foreground">
          {participant.hasUsedAction && "Основна дія використана. "}
          {participant.hasUsedBonusAction && "Бонусна дія використана."}
        </div>
      )}
      {!hasAttacks && !hasSpells && (
        <div className="text-xs text-yellow-600 dark:text-yellow-400">
          ⚠️ Немає доступних атак або заклинань
        </div>
      )}
    </div>
  );
}

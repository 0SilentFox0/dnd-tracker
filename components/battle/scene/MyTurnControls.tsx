"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { ActionGrid } from "./ActionGrid";
import { TurnCountdown } from "./TurnCountdown";

import { AiRollButton, DiceGrid } from "@/components/battle/wizards/DiceInput";
import { rollDie, useAttackWizard, useBattleScene, usePlayerTurn, useSpellBook } from "@/lib/hooks/battle";
import { COUNTDOWN_SECONDS } from "@/lib/utils/battle/flows";
import type { BattleParticipant } from "@/types/battle";

const AttackWizard = dynamic(() => import("@/components/battle/wizards/AttackWizard").then((m) => m.AttackWizard), { ssr: false });

const SpellBook = dynamic(() => import("@/components/battle/wizards/SpellBook").then((m) => m.SpellBook), { ssr: false });

const BonusActionPicker = dynamic(() => import("@/components/battle/wizards/BonusActionPicker").then((m) => m.BonusActionPicker), { ssr: false });

export function MyTurnControls({ hero }: { hero: BattleParticipant }) {
  const { anyPending, isDM } = useBattleScene();

  const turn = usePlayerTurn(hero);

  const attack = useAttackWizard(hero, turn.afterAction);

  const book = useSpellBook(hero, { allSpells: isDM, onDone: turn.afterAction });

  const [bonusOpen, setBonusOpen] = useState(false);

  const [abilityOpen, setAbilityOpen] = useState(false);

  const bonusAbilities = (hero.battleData.resolvedAbilities ?? []).filter((a) => a.trigger.event === "bonusAction");

  const actionAbilities = (hero.battleData.resolvedAbilities ?? []).filter((a) => a.trigger.event === "action");

  const hasMagic = Object.values(hero.spellcasting?.spellSlots ?? {}).some((s) => s.current > 0) || (hero.spellcasting?.knownSpells.length ?? 0) > 0;

  return (
    <>
      {turn.phase === "morale" && (
        <div className="pt-3">
          <div className="hud-sc text-lg font-bold">Перевірка моралі · d10</div>
          <DiceGrid sides={10} onPick={(v) => void turn.rollMorale(v)} />
          <div className="mt-2"><AiRollButton onClick={() => void turn.rollMorale(rollDie(10))} /></div>
        </div>
      )}
      {(turn.phase === "acting" || turn.phase === "countdown") && (
        <ActionGrid
          turn={turn}
          pending={anyPending}
          labels={{ attack: hero.battleData.attacks.map((a) => a.name).join(" · ") || "без зброї", magic: hasMagic ? "книга заклинань" : "немає", bonus: bonusAbilities[0]?.name ?? "немає", ability: actionAbilities.map((a) => a.name).join(" · ") }}
          available={{ magic: hasMagic, bonus: bonusAbilities.length > 0, ability: actionAbilities.length > 0 }}
          actions={{ attack: attack.open, magic: () => book.open(), bonus: () => setBonusOpen(true), ability: () => setAbilityOpen(true) }}
        />
      )}
      {turn.phase === "countdown" && <TurnCountdown seconds={COUNTDOWN_SECONDS} onElapsed={() => void turn.endTurn()} onStay={turn.stay} />}
      <AttackWizard wizard={attack} />
      <SpellBook book={book} />
      <BonusActionPicker participant={hero} open={bonusOpen} onOpenChange={setBonusOpen} onDone={turn.afterAction} />
      <BonusActionPicker participant={hero} trigger="action" open={abilityOpen} onOpenChange={setAbilityOpen} onDone={turn.afterAction} />
    </>
  );
}

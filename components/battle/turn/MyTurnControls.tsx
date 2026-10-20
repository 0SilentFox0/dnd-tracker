"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import { ActionGrid } from "./ActionGrid";
import { TurnCountdown } from "./TurnCountdown";

import { AiRollButton, DiceGrid } from "@/components/battle/hud/DiceInput";
import { modeUiOf } from "@/components/battle/modes";
import { MapStripRow } from "@/components/battle/scene/MapStrip";
import { AuraZonePicker } from "@/components/battle/wizards/AuraZonePicker";
import { useAttackWizard, useAuraZones, useBattleScene, useBonusSpells, usePlayerTurn, useSpellBook } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import { canConsumeIntent, COUNTDOWN_SECONDS, turnAllowsAttack, type TurnFlowState } from "@/lib/utils/battle/flows";
import { moraleTriggerRolls } from "@/lib/utils/battle/morale/check";
import { usableAbilities } from "@/lib/utils/battle/view";
import { cryptoRandom, rollDie } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

const AttackWizard = dynamic(() => import("@/components/battle/wizards/AttackWizard").then((m) => m.AttackWizard), { ssr: false });

const SpellBook = dynamic(() => import("@/components/battle/wizards/SpellBook").then((m) => m.SpellBook), { ssr: false });

const BonusActionPicker = dynamic(() => import("@/components/battle/wizards/BonusActionPicker").then((m) => m.BonusActionPicker), { ssr: false });

const STRIP_LABEL: Record<Exclude<TurnFlowState["phase"], "countdown">, string> = {
  waiting: "Твій хід",
  morale: "Перевірка моралі",
  acting: "Твій хід · Дії",
  ended: "Твій хід",
};

const AURA_STRIP_LABEL = "Оберіть зону аури";

/** strip — вкладка «Карта» на телефоні: замість панелі дій один рядок, а майстри лишаються змонтованими (наведення заклинання живе в них) */
export function MyTurnControls({ hero, strip }: { hero: BattleParticipant; strip?: { onExpand: () => void } }) {
  const { anyPending, battle, intents } = useBattleScene();

  const { attack: attackIntent, clearAttack: clearAttackIntent, mapAim, setAttackReady } = intents;

  const turn = usePlayerTurn(hero, useBonusSpells(hero));

  const attack = useAttackWizard(hero, turn.actions.afterAction);

  const book = useSpellBook(hero, { onDone: turn.actions.afterAction });

  const zone = useAuraZones(hero);

  const morale = moraleTriggerRolls(hero, battle.initiativeOrder);

  const [bonusOpen, setBonusOpen] = useState(false);

  const [abilityOpen, setAbilityOpen] = useState(false);

  const bonusAbilities = usableAbilities(hero, "bonusAction", battle.currentRound);

  const actionAbilities = usableAbilities(hero, "action", battle.currentRound);

  const hasMagic = Object.values(hero.spellcasting?.spellSlots ?? {}).some((s) => s.current > 0) || (hero.spellcasting?.knownSpells.length ?? 0) > 0;

  const { phase, status: { actionUsed, skipped } } = turn;

  const { open: openAttack } = attack.actions;

  const { currentRound: round, currentTurnIndex: turnIndex } = battle;

  const heroId = hero.basicInfo.id;

  const ui = modeUiOf(battle.map);

  const attackReady = turnAllowsAttack({ phase, actionUsed, skipped });

  useEffect(() => {
    setAttackReady(attackReady ? heroId : null);

    return () => setAttackReady(null);
  }, [attackReady, heroId, setAttackReady]);

  useEffect(() => {
    if (attackIntent === null) return;

    if (canConsumeIntent(attackIntent, { heroId, round, turnIndex, phase, actionUsed, skipped })) openAttack(attackIntent.targetId, attackIntent.attackId);

    clearAttackIntent();
  }, [attackIntent, heroId, round, turnIndex, phase, actionUsed, skipped, openAttack, clearAttackIntent]);

  const full = (
    <>
      {turn.phase === "morale" && (
        <div className="pt-3">
          <div className="hud-sc text-lg font-bold">Перевірка моралі · d10</div>
          {morale.kind && (
            <div className={cn("mt-1 text-sm", morale.kind === "extra" ? "text-hud-gold-bright" : "text-hud-bad")}>
              {morale.kind === "extra" ? `Додатковий хід на ${morale.rolls.join(", ")}` : `Пропуск ходу на ${morale.rolls.join(", ")}`}
            </div>
          )}
          <DiceGrid sides={10} onPick={(v) => void turn.actions.rollMorale(v)} highlight={morale.kind ? { rolls: morale.rolls, tone: morale.kind === "extra" ? "gold" : "danger" } : undefined} />
          <div className="mt-2"><AiRollButton onClick={() => void turn.actions.rollMorale(rollDie(10, cryptoRandom))} /></div>
        </div>
      )}
      {turn.phase === "acting" && zone && <div className="pt-3"><AuraZonePicker step={zone} /></div>}
      {(turn.phase === "acting" || turn.phase === "countdown") && (
        <ActionGrid
          turn={turn}
          pending={anyPending}
          available={{ magic: hasMagic, bonus: bonusAbilities.length > 0, ability: actionAbilities.length > 0 }}
          actions={{ attack: () => attack.actions.open(), magic: () => book.actions.open(), bonus: () => setBonusOpen(true), ability: () => setAbilityOpen(true) }}
        />
      )}
      {turn.phase === "acting" && ui?.TurnControls && <ui.TurnControls hero={hero} />}
    </>
  );

  const stripRow = strip && phase !== "countdown" && !mapAim && (
    <MapStripRow onExpand={strip.onExpand}>
      <span className="hud-sc tracking-[.12em]">{phase === "acting" && zone ? AURA_STRIP_LABEL : STRIP_LABEL[phase]}</span>
    </MapStripRow>
  );

  return (
    <>
      {strip ? stripRow : full}
      {turn.phase === "countdown" && <TurnCountdown seconds={COUNTDOWN_SECONDS} onElapsed={() => void turn.actions.endTurn()} onStay={turn.actions.stay} />}
      <AttackWizard wizard={attack} />
      <SpellBook book={book} />
      <BonusActionPicker participant={hero} open={bonusOpen} onOpenChange={setBonusOpen} onDone={turn.actions.afterAction} />
      <BonusActionPicker participant={hero} trigger="action" open={abilityOpen} onOpenChange={setAbilityOpen} onDone={turn.actions.afterAction} />
    </>
  );
}

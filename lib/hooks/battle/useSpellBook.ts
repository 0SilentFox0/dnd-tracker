"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { rollDie } from "./useAttackWizard";
import { useBattleScene } from "./useBattleScene";

import { useSpells } from "@/lib/hooks/spells";
import { getDiceSlots } from "@/lib/utils/battle/balance/dice";
import { initialSpellFlow, spellFlow, spellPayload,type SpellPick } from "@/lib/utils/battle/flows";
import { participantSpellAllowsMultipleTargets } from "@/lib/utils/battle/spell/participant-spell-target-mode";
import { slotLevels } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

export type BookSpell = {
  id: string;
  name: string;
  level: number;
  type: "target" | "aoe" | "no_target";
  damageType: "damage" | "heal" | "all";
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: { ability: string; onSuccess: "half" | "none"; dc?: number } | null;
  hitCheck?: { ability: string; dc: number } | null;
  description?: string | null;
  icon?: string | null;
  range?: string | null;
  duration?: string | null;
  concentration?: boolean;
  damageElement?: string | null;
  spellGroup?: { id: string; name: string } | null;
};

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const { data = [] } = useSpells(scene.campaignId, { enabled: state.step !== "closed" && !!caster });

  const spells = useMemo(() => {
    const all = data as BookSpell[];

    if (options.allSpells) return all;

    const known = new Set(caster?.spellcasting.knownSpells ?? []);

    return all.filter((s) => known.has(s.id));
  }, [data, options.allSpells, caster]);

  const byLevel = useMemo(() => {
    const map: Record<number, BookSpell[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };

    for (const s of spells) (map[s.level] ??= []).push(s);

    for (const list of Object.values(map)) list.sort((a, b) => a.name.localeCompare(b.name, "uk"));

    return map;
  }, [spells]);

  const selected = spells.find((s) => s.id === state.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  const targets = order.filter((p) => isUp(p) || selected?.damageType === "heal");

  const pickOf = (s: BookSpell): SpellPick => ({
    spellId: s.id,
    level: s.level,
    targetMode: s.type === "no_target" ? "none" : s.type === "aoe" || (caster && participantSpellAllowsMultipleTargets(caster, s.id)) ? "multi" : "single",
    needsHit: !!s.hitCheck,
    needsSaves: !!s.savingThrow,
    diceSlots: s.diceCount && s.diceType ? getDiceSlots(`${s.diceCount}${s.diceType}`) : [],
  });

  const send = useEffectEvent(async () => {
    if (!caster) return;

    try {
      await scene.actions.castSpell.mutateAsync(spellPayload(state, caster.basicInfo.sourceType));
      dispatch({ type: "SUCCESS" });
      options.onDone?.();
    } catch (e) {
      dispatch({ type: "FAIL", error: e instanceof Error ? e.message : "Не вдалося застосувати заклинання" });
    }
  });

  useEffect(() => {
    if (state.step === "submitting") void send();
  }, [state.step]);

  const firstUsable = (who: BattleParticipant) => slotLevels(who).find((l) => l.current > 0)?.level ?? 0;

  return {
    state, spells, byLevel, selected, targets, slots: caster ? slotLevels(caster) : [],
    open: (level?: number, casterOverride?: BattleParticipant) => {
      const who = casterOverride ?? caster;

      if (who) dispatch({ type: "OPEN", casterId: who.basicInfo.id, level: level ?? firstUsable(who) });
    },
    setLevel: (level: number) => dispatch({ type: "SET_LEVEL", level }),
    pick: (s: BookSpell) => dispatch({ type: "PICK", pick: pickOf(s) }),
    toTargets: () => dispatch({ type: "TO_TARGETS" }),
    toggleTarget: (id: string) => dispatch({ type: "TOGGLE_TARGET", id }),
    confirmTargets: () => dispatch({ type: "CONFIRM_TARGETS" }),
    setHit: (v: number) => dispatch({ type: "SET_HIT", value: v }),
    aiHit: () => dispatch({ type: "SET_HIT", value: rollDie(20) }),
    setSave: (id: string, v: number) => dispatch({ type: "SET_SAVE", id, value: v }),
    setDamage: (i: number, v: number) => dispatch({ type: "SET_DAMAGE", index: i, value: v }),
    aiDamage: () => state.pick?.diceSlots.forEach((sides, i) => dispatch({ type: "SET_DAMAGE", index: i, value: rollDie(sides) })),
    toSummary: () => dispatch({ type: "TO_SUMMARY" }),
    back: () => dispatch({ type: "BACK" }),
    submit: () => dispatch({ type: "SUBMIT" }),
    close: () => dispatch({ type: "CLOSE" }),
  };
}

"use client";

import { useEffect, useEffectEvent, useMemo, useReducer } from "react";

import { rollDie } from "./useAttackWizard";
import { useBattleScene } from "./useBattleScene";

import { usePrefetchSpellsByIds, useSpells, useSpellsByIds } from "@/lib/hooks/spells";
import { initialSpellFlow, spellFlow, spellPayload,type SpellPick } from "@/lib/utils/battle/flows";
import { participantSpellAllowsMultipleTargets } from "@/lib/utils/battle/spell/participant-spell-target-mode";
import { slotLevels } from "@/lib/utils/battle/view";
import { diceSlots } from "@/lib/utils/common/dice";
import { groupSpellsByLevel } from "@/lib/utils/spells/group-by-level";
import type { BattleParticipant } from "@/types/battle";
import type { BookSpell } from "@/types/spells";

export type { BookSpell };

const isUp = (p: BattleParticipant) => p.combatStats.status === "active" && p.combatStats.currentHp > 0;

const NO_SPELLS: string[] = [];

/** Прогріває книгу заклинань героя гравця, поки бій простоює. */
export function useSpellBookPrefetch() {
  const { campaignId, hero, isDM } = useBattleScene();

  usePrefetchSpellsByIds(campaignId, isDM ? NO_SPELLS : (hero?.spellcasting.knownSpells ?? NO_SPELLS));
}

export function useSpellBook(caster: BattleParticipant | null, options: { allSpells?: boolean; onDone?: () => void } = {}) {
  const scene = useBattleScene();

  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const isOpen = state.step !== "closed" && !!caster;

  const library = useSpells(scene.campaignId, { enabled: isOpen && !!options.allSpells });

  const known = useSpellsByIds(scene.campaignId, caster?.spellcasting.knownSpells ?? [], { enabled: isOpen && !options.allSpells });

  const spells = useMemo(() => (options.allSpells ? ((library.data ?? []) as BookSpell[]) : (known.data ?? [])), [options.allSpells, library.data, known.data]);

  const byLevel = useMemo(() => groupSpellsByLevel(spells), [spells]);

  const selected = spells.find((s) => s.id === state.pick?.spellId) ?? null;

  const order = scene.battle.initiativeOrder;

  const targets = order.filter((p) => isUp(p) || selected?.damageType === "heal");

  const pickOf = (s: BookSpell): SpellPick => ({
    spellId: s.id,
    level: s.level,
    targetMode: s.type === "no_target" ? "none" : s.type === "aoe" || (caster && participantSpellAllowsMultipleTargets(caster, s.id)) ? "multi" : "single",
    needsHit: !!s.hitCheck,
    needsSaves: !!s.savingThrow,
    diceSlots: s.diceCount && s.diceType ? diceSlots(`${s.diceCount}${s.diceType}`) : [],
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

import { useReducer, useState } from "react";

import { BackgroundForm } from "@/components/backgrounds/BackgroundForm";
import { AttackWizard } from "@/components/battle/wizards/AttackWizard";
import { ClassForm } from "@/components/classes/ClassForm";
import { RulesForm } from "@/components/rules/RulesForm";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { battleOps, callBattleOp } from "@/lib/api/battle-ops";
import { useAttackWizard } from "@/lib/hooks/battle/useAttackWizard";
import { BattleSceneContext, BattleSceneDataContext } from "@/lib/hooks/battle/useBattleScene";
import { useSpellMapTargeting } from "@/lib/hooks/battle/useSpellMapTargeting";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { initialSpellFlow, spellFlow, spellTargetInRange } from "@/lib/utils/battle/flows";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { AttackData, BattleScene } from "@/types/api";
import type { BackgroundData } from "@/types/backgrounds";
import type { BattleSceneValue } from "@/types/battle-scene";
import type { GameClassData } from "@/types/classes";

export const browserBackground: BackgroundData = { id: "background", name: "Browser Scholar", icon: null, description: null, choices: [], skillProficiencies: [], toolProficiencies: [], originFeatId: null, equipmentText: null };

export const browserClass: GameClassData = { id: "class", name: "Browser Wizard", icon: null, color: null, hitDie: 6, savingThrows: [], proficiencies: { armor: [], weapons: [], tools: [] }, skillChoices: { count: 0, from: [] }, caster: "full", spellcastingAbility: "intelligence", features: [{ level: 1, abilities: [] }], subclassLevel: null, subclasses: [] };

const map = { cols: 8, rows: 8, background: null, opacity: 0.3 };

const caster = createMockParticipant();

caster.battleData.position = { x: 1, y: 1 };

const target = createMockParticipant({ basicInfo: { ...caster.basicInfo, id: "target", name: "Ціль", side: "enemy" }, battleData: { ...caster.battleData, position: { x: 2, y: 1 } } });

const attacker = createMockParticipant({ basicInfo: { ...caster.basicInfo, id: "attacker", sourceType: "unit", side: "ally" }, battleData: { ...caster.battleData, attacks: [{ id: "rapier", name: "Рапіра", type: "melee", attackBonus: 5, damageDice: "1d8", damageType: "slashing" }], activeEffects: [], resolvedAbilities: [] } });

const attackBattle = { id: "battle", campaignId: "synthetic", currentRound: 1, initiativeOrder: [attacker, target], battleLog: [], rules: DEFAULT_RULES, map: null, campaign: { friendlyFire: false } } as unknown as BattleScene;

// The HTTP boundary is synthetic; the wizard, reducer and payload builder are production code.
const attackScene = {
  battle: attackBattle,
  viewer: { userId: "synthetic", isDM: true, canSeeEnemyHp: true },
  readBattle: () => attackBattle,
  result: { show: () => undefined },
  actions: { attack: { mutateAsync: (body: AttackData) => callBattleOp(battleOps.attack, "synthetic", "battle", { ...body, expectedVersion: 1 }) } },
} as unknown as BattleSceneValue;

function AttackSelection() {
  const wizard = useAttackWizard(attacker);

  return <section><button onClick={() => wizard.actions.open()}>Відкрити атаку</button><output id="attack-state">{wizard.state.step}</output><AttackWizard wizard={wizard} /></section>;
}

function AttackCheck() {
  return <BattleSceneDataContext.Provider value={attackScene}><BattleSceneContext.Provider value={attackScene}><AttackSelection /></BattleSceneContext.Provider></BattleSceneDataContext.Provider>;
}

function SpellSelection() {
  const [state, dispatch] = useReducer(spellFlow, initialSpellFlow);

  const [pick, setMapPick] = useState<MapPick | null>(null);

  const [, setMapAim] = useState<MapAim | null>(null);

  useSpellMapTargeting(state, dispatch, { caster, order: [caster, target], map, active: state.step === "targets", candidates: [target], inRange: who => spellTargetInRange(map, caster, who, 60), setMapAim, setMapPick });

  return <section><h1>Вибір заклинання</h1><button onClick={() => {
    dispatch({ type: "OPEN", casterId: caster.basicInfo.id, level: 0 });
    dispatch({ type: "PICK", pick: { spellId: "ray", level: 0, targetMode: "single", targetSide: "enemy", range: 60, needsSaves: false, diceSlots: [6] } });
    dispatch({ type: "TO_TARGETS" });
  }}>Промінь</button>{pick && <button onClick={() => pick.onPick("target")}>Ціль на карті</button>}<output id="spell-state">{JSON.stringify({ step: state.step, targets: state.targetIds, registered: !!pick })}</output></section>;
}

/** Synthetic HTTP and router, real production forms/editors and spell-map lifecycle. */
export function ConstructorUiCheck({ flow }: { flow: string }) {
  return <ConfirmProvider><main style={{ maxWidth: 1000, margin: "auto", padding: 12 }}>
    {flow === "rules" ? <RulesForm campaignId="synthetic" /> : flow === "background" ? <BackgroundForm campaignId="synthetic" background={browserBackground} /> : flow === "class" ? <ClassForm campaignId="synthetic" gameClass={browserClass} /> : flow === "attack" ? <AttackCheck /> : <SpellSelection />}
  </main></ConfirmProvider>;
}

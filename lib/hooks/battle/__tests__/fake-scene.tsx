import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import { MazeToolStateContext, useMazeToolStateValue } from "../modes/maze/useMazeToolState";
import { BattleSceneContext, BattleSceneDataContext } from "../useBattleScene";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import type { BattleSceneValue } from "@/lib/hooks/battle/types";
import { ConfirmContext } from "@/lib/hooks/common";
import { IntlWrapper } from "@/lib/i18n/test/intl-wrapper";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import type { MapAim, MapPick } from "@/lib/utils/battle/grid";
import { buildDisplayEffects, turnQueue } from "@/lib/utils/battle/view";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleScene } from "@/types/api";
import type { BattleAction, BattleParticipant } from "@/types/battle";
import type { ResultFx } from "@/types/battle-scene";

export interface FakeSceneOptions {
  locale?: "uk" | "en";
  knownSpells?: string[];
  slots?: BattleParticipant["spellcasting"]["spellSlots"];
  abilities?: ResolvedAbility[];
  result?: ResultFx | null;
  isMyTurn?: boolean;
  morale?: number;
  confirmAnswer?: boolean;
  isDM?: boolean;
  status?: BattleScene["status"];
  afterLog?: BattleAction[];
  map?: BattleScene["map"];
  mapAim?: MapAim | null;
  mapPick?: MapPick | null;
  attackReady?: boolean;
  reserve?: BattleParticipant[];
  audio?: BattleScene["audio"];
}

function participant(id: string, name: string, side: ParticipantSide, over: Partial<{ hp: number; ac: number; controlledBy: string }> = {}): BattleParticipant {
  const b = createMockParticipant();

  return {
    ...b,
    basicInfo: { ...b.basicInfo, id, name, side, sourceType: "unit", controlledBy: over.controlledBy ?? (side === ParticipantSide.ALLY ? "u" : "dm") },
    combatStats: { ...b.combatStats, currentHp: over.hp ?? 20, maxHp: 20, armorClass: over.ac ?? 12, status: "active" },
    battleData: {
      ...b.battleData,
      attacks: [{ id: "rapier", name: "Рапіра", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d8", damageType: "slashing" }],
      activeEffects: [],
      resolvedAbilities: [],
    },
  };
}

export function fakeScene(opts: FakeSceneOptions = {}) {
  const base = participant("me", "Фрейда", ParticipantSide.ALLY);

  const me: BattleParticipant = {
    ...base,
    combatStats: { ...base.combatStats, morale: opts.morale ?? 0 },
    spellcasting: { ...base.spellcasting, knownSpells: opts.knownSpells ?? [], spellSlots: opts.slots ?? {} },
    battleData: { ...base.battleData, resolvedAbilities: opts.abilities ?? [] },
  };

  const ally = participant("ally", "Годрік", ParticipantSide.ALLY, { hp: 9, controlledBy: "u2" });

  const gob = participant("gob", "Гоблін", ParticipantSide.ENEMY);

  const order = [me, gob, ally];

  const battle = {
    id: "b1", campaignId: "c1", name: "Засідка", status: opts.status ?? "active", participants: [], currentRound: 3, currentTurnIndex: opts.isMyTurn === false ? 1 : 0,
    initiativeOrder: order, pendingSummons: [], rules: DEFAULT_RULES, battleLog: [], createdAt: "", version: 5, isDM: opts.isDM ?? false,
    campaign: { id: "c1", friendlyFire: false }, pendingMoraleCheck: null, pendingCritChoice: null, map: opts.map ?? null, audio: opts.audio ?? null,
  } as BattleScene;

  const usedMe = { ...me, actionFlags: { ...me.actionFlags, hasUsedAction: true, hasUsedBonusAction: true } };

  const after = { ...battle, battleLog: opts.afterLog ?? [], initiativeOrder: [usedMe, { ...gob, combatStats: { ...gob.combatStats, currentHp: 11 } }, ally] } as BattleScene;

  const mutation = (impl: (...a: unknown[]) => Promise<unknown> = async () => undefined) => ({ mutateAsync: vi.fn(impl), mutate: vi.fn(), isPending: false });

  const actions = {
    attack: mutation(),
    castSpell: mutation(),
    bonusAction: mutation(),
    abilityAction: mutation(),
    nextTurn: mutation(),
    critChoice: mutation(),
    moraleCheck: mutation(async () => ({ moraleResult: { hasExtraTurn: true, shouldSkipTurn: false, moralePositive: true, message: "" } })),
    start: mutation(),
    reset: mutation(),
    complete: mutation(),
    rollback: mutation(),
    addParticipant: mutation(),
    updateParticipant: mutation(),
    scaleUnits: mutation(),
    move: mutation(),
    mapTerrain: mutation(),
    mapWeather: mutation(),
    reveal: mutation(),
    maze: mutation(),
    unitControl: mutation(),
    conditions: mutation(),
    coreAction: mutation(),
    refreshSources: mutation(),
  };

  const showResult = vi.fn();

  const toast = { message: null, show: vi.fn(), dismiss: vi.fn() };

  const isMyTurn = opts.isMyTurn ?? true;

  const openLog = vi.fn();

  const value = {
    campaignId: "c1",
    battleId: "b1",
    battle,
    viewer: { userId: "u", isDM: opts.isDM ?? false, canSeeEnemyHp: false },
    turn: { current: isMyTurn ? me : gob, isMyTurn, queue: turnQueue(order, battle.currentTurnIndex, battle.currentRound) },
    roster: { myParticipants: [me], hero: me, allies: [me, ally], enemies: [gob], reserve: opts.reserve ?? [] },
    awaiting: null,
    dialogs: { awaitingDm: { open: false, setOpen: vi.fn() }, resultScreen: { open: false, setOpen: vi.fn() } },
    effects: buildDisplayEffects(order),
    connection: "connected",
    dmControl: { id: null, set: vi.fn() },
    selectedId: null,
    select: vi.fn(),
    clickParticipant: vi.fn(),
    intents: { attack: null, requestAttack: vi.fn(), clearAttack: vi.fn(), mapAim: opts.mapAim ?? null, setMapAim: vi.fn(), mapPick: opts.mapPick ?? null, setMapPick: vi.fn(), attackReady: opts.attackReady ?? true, setAttackReady: vi.fn() },
    toast,
    result: { fx: opts.result ?? null, show: showResult },
    log: { open: false, focus: null, show: openLog, close: vi.fn() },
    readBattle: () => after,
    logHistory: { canLoadEarlier: false, isLoading: false, loadEarlier: vi.fn() },
    actions,
    anyPending: false,
  } as unknown as BattleSceneValue;

  const confirm = vi.fn(async () => opts.confirmAnswer ?? true);

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });

  const MazeTools = ({ children }: { children: ReactNode }) => <MazeToolStateContext.Provider value={useMazeToolStateValue()}>{children}</MazeToolStateContext.Provider>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <IntlWrapper locale={opts.locale}>
    <QueryClientProvider client={queryClient}>
      <ConfirmContext.Provider value={confirm}>
        <BattleSceneDataContext.Provider value={value}>
          <BattleSceneContext.Provider value={value}>
            <MazeTools>{children}</MazeTools>
          </BattleSceneContext.Provider>
        </BattleSceneDataContext.Provider>
      </ConfirmContext.Provider>
    </QueryClientProvider>
    </IntlWrapper>
  );

  return {
    wrapper, value, me, caster: me, gob, ally, battle, confirm, showResult, openLog, toast,
    mutateAsync: actions.attack.mutateAsync,
    castSpell: actions.castSpell.mutateAsync,
    bonusAction: actions.bonusAction.mutateAsync,
    abilityAction: actions.abilityAction.mutateAsync,
    nextTurn: actions.nextTurn.mutateAsync,
    move: actions.move.mutate,
    moraleCheck: actions.moraleCheck.mutateAsync,
    coreAction: actions.coreAction.mutateAsync,
  };
}

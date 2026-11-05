import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { alwaysSeesEnemyStats, canSeeEnemyHp, canSeeExactStats, hiddenTargetSteps, PLAYER_VIEWER, redactLogForPlayers, sanitizeLogEntry } from "@/lib/utils/battle/view";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { Ruleset } from "@/lib/utils/rules/schema";
import type { BattleParticipant } from "@/types/battle";
import type { BattleAction, DamageStep } from "@/types/battle";

const side = (s: ParticipantSide) => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, side: s } };
};

const WFRP: Ruleset = { ...DEFAULT_RULES, system: { key: "wfrp" } };

const ctxOf = (participants: BattleParticipant[] = [], rules = WFRP) => ({ participants, rules });

const player = { userId: "u", isDM: false, readOnly: false, canSeeEnemyHp: false };

describe("видимість", () => {
  it("союзника видно точно, ворога — ні, DM і seeEnemyHp бачать усе", () => {
    expect(canSeeExactStats(side(ParticipantSide.ALLY), player)).toBe(true);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), player)).toBe(false);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), { ...player, isDM: true })).toBe(true);
    expect(canSeeExactStats(side(ParticipantSide.ENEMY), { ...player, canSeeEnemyHp: true })).toBe(true);
  });

  it("журнал для гравця без targetAC і damageBreakdown ворога; DM бачить усе", () => {
    const foe = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "foe" } } as BattleParticipant;

    const e = { targets: [{ participantId: "foe", participantName: "x" }], actionDetails: { targetAC: 15, damageBreakdown: "x", totalAttackValue: 19 } } as unknown as BattleAction;

    expect(sanitizeLogEntry(e, player, ctxOf([foe])).actionDetails).toEqual({ totalAttackValue: 19 });
    expect(sanitizeLogEntry(e, { ...player, isDM: true }, ctxOf([foe]))).toBe(e);
  });

  it("атака по союзнику: числа не ховаються, запис не змінюється (changed: false)", () => {
    const friend = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "fr" } } as BattleParticipant;

    const e = { targets: [{ participantId: "fr", participantName: "x" }], actionDetails: { targetAC: 15, damageBreakdown: "x", damageRows: [] } } as unknown as BattleAction;

    const { entries, changed } = redactLogForPlayers([e], ctxOf([friend]));

    expect(changed).toBe(false);
    expect(entries[0]).toBe(e);
  });

  it("захист цілі в percentile-записі прибирається для гравця, DM бачить усе", () => {
    const opposed = { message: "battleLog.percentile.opposed", params: { roll: 30, target: 45, sl: 1, defRoll: 52, defTarget: 40, defSl: -1, defense: "x", netSl: 2 } };

    const percentile = { roll: 30, target: 45, sl: 1, netSl: 2, location: "arm", doubles: false, defender: { kind: "parry", roll: 52, sl: -1, target: 40 } };

    const e = { actionDetails: { percentile }, log: ["head", opposed] } as unknown as BattleAction;

    const seen = sanitizeLogEntry(e, player, ctxOf());

    expect(seen.actionDetails.percentile?.defender).toBeUndefined();
    expect(seen.log?.[0]).toBe("head");
    expect(seen.log?.[1]).toEqual({ message: "battleLog.percentile.opposedHidden", params: { roll: 30, target: 45, sl: 1, netSl: 2 } });
    expect(JSON.stringify(seen)).not.toContain("52");
    expect(sanitizeLogEntry(e, { ...player, isDM: true }, ctxOf())).toBe(e);
  });

  it("wfrp: рівень стану і ціль тесту зняття чужої не-exact цілі ховаються для гравця", () => {
    const enemy = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "e" } } as BattleParticipant;

    const ally = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "f" } } as BattleParticipant;

    const entry = (id: string, log: unknown[]) => ({ targets: [{ participantId: id, participantName: "x" }], actionDetails: {}, log }) as unknown as BattleAction;

    const applied = { message: "battleWfrp.log.applied", params: { target: "x", condition: "c", level: 3, source: "s" } };

    const test = { message: "battleWfrp.log.endTestFail", params: { name: "x", condition: "c", roll: 50, target: 35, sl: -1 } };

    const seen = sanitizeLogEntry(entry("e", [applied, test]), player, ctxOf([enemy, ally]));

    expect(seen.log?.[0]).toEqual({ message: "battleWfrp.log.appliedHidden", params: { target: "x", condition: "c", source: "s" } });
    expect(seen.log?.[1]).toEqual({ message: "battleWfrp.log.endTestFailHidden", params: { name: "x", condition: "c", roll: 50, sl: -1 } });
    expect(sanitizeLogEntry(entry("f", [applied, test]), player, ctxOf([enemy, ally])).log).toEqual([applied, test]);
    expect(sanitizeLogEntry(entry("e", [applied]), { ...player, isDM: true }, ctxOf([enemy]))).toEqual(entry("e", [applied]));
    expect(sanitizeLogEntry(entry("e", [applied]), { ...player, canSeeEnemyHp: true }, ctxOf([enemy])).log).toEqual([applied]);
  });

  it("wfrp: умови miscast ворожого заклинача ховаються від гравця, DM бачить, d20 без змін", () => {
    const wizard = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "w" } } as BattleParticipant;

    const hero = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "h" } } as BattleParticipant;

    const applied = { message: "battleWfrp.log.applied", params: { target: "x", condition: "c", level: 2, source: "s" } };

    const entry = (miscast: string | null) => ({ actorId: "w", targets: [{ participantId: "h", participantName: "x" }], actionDetails: { percentileCast: { miscast } }, log: [applied] }) as unknown as BattleAction;

    const ctx = ctxOf([wizard, hero]);

    expect(sanitizeLogEntry(entry("minor"), player, ctx).log?.[0]).toEqual({ message: "battleWfrp.log.appliedHidden", params: { target: "x", condition: "c", source: "s" } });
    expect(sanitizeLogEntry(entry("wrath"), player, ctx).log).not.toEqual([applied]);
    expect(sanitizeLogEntry(entry(null), player, ctx).log).toEqual([applied]);
    expect(sanitizeLogEntry(entry("minor"), { ...player, isDM: true }, ctx).log).toEqual([applied]);
    expect(sanitizeLogEntry(entry("minor"), player, ctxOf([wizard, hero], DEFAULT_RULES)).log).toEqual([applied]);
  });

  it("кроки цілі ховаються, доки не помічені в журналі", () => {
    const steps: DamageStep[] = [
      { label: "Кубики", side: "attacker", kind: "dice", value: 6, after: 6 },
      { label: "Експертний захист", side: "target", kind: "percent", value: -20, after: 4 },
    ];

    expect(hiddenTargetSteps(steps, "t", [], false).map((s) => s.label)).toEqual(["Кубики"]);

    const seen = [{ targets: [{ participantId: "t" }], actionDetails: { damageSteps: { t: [steps[1]] } } }] as unknown as BattleAction[];

    expect(hiddenTargetSteps(steps, "t", seen, false)).toHaveLength(2);
    expect(hiddenTargetSteps(steps, "t", [], true)).toHaveLength(2);
  });

  it("якщо хоч один крок цілі прихований, відомі теж не показуються — їхні числа вже містять прихований опір", () => {
    const steps: DamageStep[] = [
      { label: "Кубики", side: "attacker", kind: "dice", value: 10, after: 10 },
      { label: "Таємний оберіг", side: "target", kind: "percent", value: -20, after: 8 },
      { label: "Експертний захист", side: "target", kind: "percent", value: -20, after: 6 },
    ];

    const seen = [{ targets: [{ participantId: "t" }], actionDetails: { damageSteps: { t: [steps[2]] } } }] as unknown as BattleAction[];

    expect(hiddenTargetSteps(steps, "t", seen, false).map((s) => s.label)).toEqual(["Кубики"]);
  });
});

const owned = (id: string, controlledBy: string, effects: unknown[] = []): BattleParticipant => {
  const b = createMockParticipant();

  const resolvedAbilities = [{ key: "k", name: "Вміння", trigger: { event: "passive" }, effects, source: { type: "skill", id: "s", name: "Вміння" } }];

  return { ...b, basicInfo: { ...b.basicInfo, id, controlledBy }, battleData: { ...b.battleData, resolvedAbilities } } as never;
};

const seeHp = [{ kind: "flag", flag: "seeEnemyHp" }];

describe("canSeeEnemyHp", () => {
  it("лише прапорець seeEnemyHp, а не назва вміння", () => {
    const detectMagic = owned("h1", "u1", [{ kind: "modifyStat", stat: "armor", flat: 1 }]);

    const trueSight = owned("h1", "u1", seeHp);

    expect(canSeeEnemyHp(detectMagic, [detectMagic])).toBe(false);
    expect(canSeeEnemyHp(trueSight, [trueSight])).toBe(true);
    expect(canSeeEnemyHp(null, [])).toBe(false);
  });
});

describe("alwaysSeesEnemyStats", () => {
  it("лише коли кожен герой гравця має seeEnemyHp", () => {
    const seer = owned("h1", "u1", seeHp);

    const plain = owned("h2", "u1");

    expect(alwaysSeesEnemyStats([seer], "u1")).toBe(true);
    expect(alwaysSeesEnemyStats([seer, plain], "u1")).toBe(false);
    expect(alwaysSeesEnemyStats([seer], "u2")).toBe(false);
  });
});

describe("redactLogForPlayers", () => {
  const enemy = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "e" } } as BattleParticipant;

  const ally = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "f" } } as BattleParticipant;

  const entry = (id: string, log: unknown[], actionDetails: unknown = {}) =>
    ({ targets: [{ participantId: id, participantName: "x" }], actionDetails, log }) as unknown as BattleAction;

  const applied = { message: "battleWfrp.log.applied", params: { target: "x", condition: "c", level: 3, source: "s" } };

  const pass = { message: "battleWfrp.log.endTestSuccess", params: { name: "x", condition: "c", roll: 20, target: 35, sl: 1 } };

  it("ховає рівень, ціль тесту, захист і числа броні для ворога", () => {
    const percentile = { roll: 30, target: 45, sl: 1, netSl: 2, location: "arm", doubles: false, defender: { kind: "parry", roll: 52, sl: -1, target: 40 } };

    const e = entry("e", [applied, pass], { targetAC: 15, damageBreakdown: "x", damageRows: [], percentile });

    const { entries, changed } = redactLogForPlayers([e], ctxOf([enemy, ally]));

    expect(changed).toBe(true);
    expect(entries[0].log?.[0]).toEqual({ message: "battleWfrp.log.appliedHidden", params: { target: "x", condition: "c", source: "s" } });
    expect(entries[0].log?.[1]).toEqual({ message: "battleWfrp.log.endTestSuccessHidden", params: { name: "x", condition: "c", roll: 20, sl: 1 } });
    expect(entries[0].actionDetails).not.toHaveProperty("targetAC");
    expect(entries[0].actionDetails).not.toHaveProperty("damageBreakdown");
    expect(entries[0].actionDetails).not.toHaveProperty("damageRows");
    expect(entries[0].actionDetails.percentile?.defender).toBeUndefined();
  });

  it("запис про союзника без прихованих полів — той самий об'єкт, changed: false", () => {
    const e = entry("f", [applied]);

    const { entries, changed } = redactLogForPlayers([e], ctxOf([enemy, ally]));

    expect(changed).toBe(false);
    expect(entries[0]).toBe(e);
  });

  it("ідемпотентно: другий прохід дорівнює першому і нічого не змінює", () => {
    const e = entry("e", [applied], { targetAC: 15, percentile: { roll: 1, target: 2, sl: 0, netSl: 0, location: "arm", doubles: false, defender: { kind: "parry", roll: 5, sl: 0, target: 4 } } });

    const once = sanitizeLogEntry(e, PLAYER_VIEWER, ctxOf([enemy]));

    expect(sanitizeLogEntry(once, PLAYER_VIEWER, ctxOf([enemy]))).toBe(once);
    expect(sanitizeLogEntry(once, PLAYER_VIEWER, ctxOf([enemy]))).toEqual(once);
  });
});

describe("concealLine через контракт системи", () => {
  const enemy = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "e" } } as BattleParticipant;

  const applied = { message: "battleWfrp.log.applied", params: { target: "x", condition: "c", level: 3, source: "s" } };

  const e = { targets: [{ participantId: "e", participantName: "x" }], actionDetails: {}, log: [applied] } as unknown as BattleAction;

  it("dnd5e з wfrp-рядком — без змін", () => {
    const dnd = { ...DEFAULT_RULES, system: { key: "dnd5e" as const } };

    expect(sanitizeLogEntry(e, PLAYER_VIEWER, ctxOf([enemy], dnd))).toBe(e);
  });

  it("wfrp — applied приховано", () => {
    expect(sanitizeLogEntry(e, PLAYER_VIEWER, ctxOf([enemy])).log?.[0]).toMatchObject({ message: "battleWfrp.log.appliedHidden" });
  });
});

import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { alwaysSeesEnemyStats, canSeeEnemyHp, canSeeExactStats, hiddenTargetSteps, PLAYER_VIEWER, redactLogForPlayers, redactParticipantsForPlayers, sanitizeLogEntry } from "@/lib/utils/battle/view";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { attackOf, castOf } from "@/systems/wfrp/rules/__tests__/slot-fixtures";
import type { BattleParticipant } from "@/types/battle";
import type { BattleAction, DamageStep } from "@/types/battle";

const side = (s: ParticipantSide) => {
  const p = createMockParticipant();

  return { ...p, basicInfo: { ...p.basicInfo, side: s } };
};

const slot = (data: object, key = "wfrp") => ({ key, data });

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

    const e = { actionDetails: { system: slot({ attack: percentile }) }, log: ["head", opposed] } as unknown as BattleAction;

    const seen = sanitizeLogEntry(e, player, ctxOf());

    expect(attackOf(seen.actionDetails)?.defender).toBeUndefined();
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

  it("wfrp: ціль тесту психології ворожого учасника ховається для гравця, DM бачить усе", () => {
    const enemy = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "e" } } as BattleParticipant;

    const fail = { message: "battleWfrp.log.psychologyFail", params: { name: "x", source: "m", kind: "k", value: 2, roll: 80, target: 40, sl: -4 } };

    const entry = { targets: [{ participantId: "e", participantName: "x" }], actionDetails: {}, log: [fail] } as unknown as BattleAction;

    expect(sanitizeLogEntry(entry, player, ctxOf([enemy])).log?.[0]).toEqual({ message: "battleWfrp.log.psychologyFailHidden", params: { name: "x", source: "m", kind: "k", value: 2, roll: 80, sl: -4 } });
    expect(sanitizeLogEntry(entry, { ...player, isDM: true }, ctxOf([enemy])).log).toEqual([fail]);
  });

  it("wfrp: умови miscast ворожого заклинача ховаються від гравця, DM бачить, d20 без змін", () => {
    const wizard = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "w" } } as BattleParticipant;

    const hero = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "h" } } as BattleParticipant;

    const applied = { message: "battleWfrp.log.applied", params: { target: "x", condition: "c", level: 2, source: "s" } };

    const entry = (miscast: string | null) => ({ actorId: "w", targets: [{ participantId: "h", participantName: "x" }], actionDetails: { system: slot({ cast: { miscast } }) }, log: [applied] }) as unknown as BattleAction;

    const ctx = ctxOf([wizard, hero]);

    expect(sanitizeLogEntry(entry("minor"), player, ctx).log?.[0]).toEqual({ message: "battleWfrp.log.appliedHidden", params: { target: "x", condition: "c", source: "s" } });
    expect(sanitizeLogEntry(entry("wrath"), player, ctx).log).not.toEqual([applied]);
    expect(sanitizeLogEntry(entry(null), player, ctx).log).toEqual([applied]);
    expect(sanitizeLogEntry(entry("minor"), { ...player, isDM: true }, ctx).log).toEqual([applied]);
    expect(sanitizeLogEntry(entry("minor"), player, ctxOf([wizard, hero], DEFAULT_RULES)).log).toEqual([applied]);
  });

  it("wfrp: miscast ворожого заклинача: ні рядка, ні джерела стану, ні cast miscast; свої й ДМ бачать усе", () => {
    const wizard = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "w" } } as BattleParticipant;

    const mine = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "m" } } as BattleParticipant;

    const miscastLine = { message: "wfrpMagic.log.miscast", params: { name: "x", effect: { message: "wfrpMagic.miscast.minor.3" } } };

    const wrathLine = { message: "wfrpMagic.log.wrath", params: { name: "x", effect: { message: "wfrpMagic.miscast.wrath.1" } } };

    const applied = { message: "battleWfrp.log.applied", params: { target: "x", condition: "c", level: 1, source: { message: "wfrpMagic.miscast.minor.3" } } };

    const cast = { message: "wfrpMagic.log.cast", params: { name: "x" } };

    const entry = (actorId: string, miscast: string | null) => ({ actorId, targets: [], actionDetails: { system: slot({ cast: { miscast, sl: 1 } }) }, log: [cast, miscastLine, wrathLine, applied] }) as unknown as BattleAction;

    const seen = sanitizeLogEntry(entry("w", "minor"), player, ctxOf([wizard, mine]));

    expect(seen.log).toEqual([cast]);
    expect(castOf(seen.actionDetails)).toEqual({ miscast: null, sl: 1 });
    expect(JSON.stringify(seen)).not.toMatch(/miscast\./);

    const channel = { actorId: "w", targets: [], actionDetails: {}, log: [cast, miscastLine, applied] } as unknown as BattleAction;

    expect(sanitizeLogEntry(channel, player, ctxOf([wizard, mine])).log).toEqual([cast]);

    const own = entry("m", "minor");

    expect(sanitizeLogEntry(own, player, ctxOf([wizard, mine]))).toBe(own);

    const dm = entry("w", "minor");

    expect(sanitizeLogEntry(dm, { ...player, isDM: true }, ctxOf([wizard, mine]))).toBe(dm);
  });

  it("redactParticipantsForPlayers: ховає concealed-стани лише ворожих не-exact, решту не чіпає", () => {
    const effect = (id: string, concealed?: true) => ({ id, name: id, type: "condition", duration: 1, appliedAt: { round: 1, timestamp: new Date() }, effects: [], ...(concealed && { concealed }) }) as unknown as BattleParticipant["battleData"]["activeEffects"][number];

    const withEffects = (s: ParticipantSide, id: string, effects: ReturnType<typeof effect>[]) => {
      const p = side(s);

      return { ...p, basicInfo: { ...p.basicInfo, id }, battleData: { ...p.battleData, activeEffects: effects } } as BattleParticipant;
    };

    const foe = withEffects(ParticipantSide.ENEMY, "foe", [effect("keep"), effect("hide", true)]);

    const friend = withEffects(ParticipantSide.ALLY, "fr", [effect("own", true)]);

    const [redactedFoe, redactedFriend] = redactParticipantsForPlayers([foe, friend]);

    expect(redactedFoe.battleData.activeEffects.map((e) => e.id)).toEqual(["keep"]);
    expect(redactedFriend).toBe(friend);

    const clean = withEffects(ParticipantSide.ENEMY, "c", [effect("keep")]);

    expect(redactParticipantsForPlayers([clean])[0]).toBe(clean);
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

    const e = entry("e", [applied, pass], { targetAC: 15, damageBreakdown: "x", damageRows: [], system: slot({ attack: percentile }) });

    const { entries, changed } = redactLogForPlayers([e], ctxOf([enemy, ally]));

    expect(changed).toBe(true);
    expect(entries[0].log?.[0]).toEqual({ message: "battleWfrp.log.appliedHidden", params: { target: "x", condition: "c", source: "s" } });
    expect(entries[0].log?.[1]).toEqual({ message: "battleWfrp.log.endTestSuccessHidden", params: { name: "x", condition: "c", roll: 20, sl: 1 } });
    expect(entries[0].actionDetails).not.toHaveProperty("targetAC");
    expect(entries[0].actionDetails).not.toHaveProperty("damageBreakdown");
    expect(entries[0].actionDetails).not.toHaveProperty("damageRows");
    expect(attackOf(entries[0].actionDetails)?.defender).toBeUndefined();
  });

  it("запис про союзника без прихованих полів — той самий об'єкт, changed: false", () => {
    const e = entry("f", [applied]);

    const { entries, changed } = redactLogForPlayers([e], ctxOf([enemy, ally]));

    expect(changed).toBe(false);
    expect(entries[0]).toBe(e);
  });

  it("ідемпотентно: другий прохід дорівнює першому і нічого не змінює", () => {
    const e = entry("e", [applied], { targetAC: 15, system: slot({ attack: { roll: 1, target: 2, sl: 0, netSl: 0, location: "arm", doubles: false, defender: { kind: "parry", roll: 5, sl: 0, target: 4 } } }) });

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

describe("деталі дії через combat.details (D77, P1-P6)", () => {
  const enemy = { ...side(ParticipantSide.ENEMY), basicInfo: { ...side(ParticipantSide.ENEMY).basicInfo, id: "e" } } as BattleParticipant;

  const ally = { ...side(ParticipantSide.ALLY), basicInfo: { ...side(ParticipantSide.ALLY).basicInfo, id: "f" } } as BattleParticipant;

  const attack = { roll: 30, target: 45, sl: 1, netSl: 2, location: "arm", doubles: false, defender: { kind: "parry", roll: 52, sl: -1, target: 40 }, opposed: true };

  const cast = { roll: 44, target: 40, sl: -1, cn: 3, channelled: 0, armourSl: 0, doubles: true, outcome: "failure", overcastSteps: 0, miscast: "minor" };

  const miscastLine = { message: "wfrpMagic.log.miscast", params: { name: "x", effect: { message: "wfrpMagic.miscast.minor.3" } } };

  const opposed = { message: "battleLog.percentile.opposed", params: { roll: 30, target: 45, sl: 1, defRoll: 52, defTarget: 40, defSl: -1, defense: "x", netSl: 2 } };

  const entry = (over: object) => ({ actorId: "f", targets: [{ participantId: "f", participantName: "x" }], actionDetails: {}, log: [], ...over }) as unknown as BattleAction;

  it("P1: видима ціль — без defender, решта чисел є; DM отримує той самий об'єкт", () => {
    const e = entry({ actionDetails: { targetAC: 40, system: slot({ attack }) } });

    const seen = sanitizeLogEntry(e, player, ctxOf([ally]));

    expect(attackOf(seen.actionDetails)).toEqual({ roll: 30, target: 45, sl: 1, netSl: 2, location: "arm", doubles: false, opposed: true });
    expect(seen.actionDetails.targetAC).toBe(40);
    expect(sanitizeLogEntry(e, { ...player, isDM: true }, ctxOf([ally]))).toBe(e);
  });

  it("P2: прихована ціль або без цілей — частини attack немає, cast лишається, targetAC прибрано", () => {
    for (const e of [entry({ targets: [{ participantId: "e", participantName: "x" }], actionDetails: { targetAC: 40, system: slot({ attack, cast }) } }), entry({ targets: [], actionDetails: { targetAC: 40, system: slot({ attack, cast }) } })]) {
      const seen = sanitizeLogEntry(e, player, ctxOf([enemy, ally]));

      expect(attackOf(seen.actionDetails)).toBeUndefined();
      expect(castOf(seen.actionDetails)).toBeDefined();
      expect(seen.actionDetails).not.toHaveProperty("targetAC");
    }
  });

  it("P2: слот лише з attack на прихованій цілі зникає цілком", () => {
    const seen = sanitizeLogEntry(entry({ targets: [], actionDetails: { system: slot({ attack }) } }), player, ctxOf([ally]));

    expect(seen.actionDetails).not.toHaveProperty("system");
  });

  it("P3: ворожий кастер невидимий — miscast null, рядок miscast прибрано; видимий кастер без змін", () => {
    const hidden = sanitizeLogEntry(entry({ actorId: "e", actionDetails: { system: slot({ cast }) }, log: ["ok", miscastLine] }), player, ctxOf([enemy, ally]));

    expect(castOf(hidden.actionDetails)?.miscast).toBeNull();
    expect(hidden.log).toEqual(["ok"]);

    const own = entry({ actorId: "f", actionDetails: { system: slot({ cast }) }, log: ["ok"] });

    expect(sanitizeLogEntry(own, player, ctxOf([enemy, ally]))).toBe(own);
  });

  it("P4: opposed -> opposedHidden для кожного гравця; повторна редакція дорівнює одинарній", () => {
    const e = entry({ actionDetails: { system: slot({ attack }) }, log: [opposed] });

    const once = sanitizeLogEntry(e, player, ctxOf([ally]));

    expect(once.log?.[0]).toMatchObject({ message: "battleLog.percentile.opposedHidden" });
    expect(sanitizeLogEntry(once, player, ctxOf([ally]))).toBe(once);
  });

  it("P5: слот чужої системи видаляється для гравця (wfrp- і d20-кампанії), DM бачить", () => {
    const e = entry({ actionDetails: { system: slot({ attack }, "zzz") } });

    for (const rules of [WFRP, DEFAULT_RULES]) {
      expect(sanitizeLogEntry(e, player, ctxOf([ally], rules)).actionDetails).not.toHaveProperty("system");
      expect(sanitizeLogEntry(e, { ...player, isDM: true }, ctxOf([ally], rules))).toBe(e);
    }
  });

  it("P5: слот wfrp у d20-кампанії (немає хука) видаляється", () => {
    const seen = sanitizeLogEntry(entry({ actionDetails: { system: slot({ attack }) } }), player, ctxOf([ally], DEFAULT_RULES));

    expect(seen.actionDetails).not.toHaveProperty("system");
  });

  it("P6: запис без секретів — той самий об'єкт (changed: false)", () => {
    const { defender: _d, ...open } = attack;

    const e = entry({ actionDetails: { system: slot({ attack: open, cast: { ...cast, miscast: null } }) } });

    const { entries, changed } = redactLogForPlayers([e], ctxOf([ally]));

    expect(changed).toBe(false);
    expect(entries[0]).toBe(e);
  });
});

import { describe, expect, it } from "vitest";

import { SPELLS } from "@/data/library/spells";
import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { castHitSpell } from "@/lib/utils/battle/attack/process/hit-spell";
import { textsOf } from "@/lib/utils/battle/log/__tests__/event-text";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";

const spellOf = (key: string): CastableSpell => {
  const s = SPELLS.find((x) => x.key === key);

  if (!s) throw new Error(key);

  return { id: key, name: s.name, level: s.level, groupId: s.school, definition: { ...s.definition, raceModifiers: [] } };
};

const mistress = (ids: string[]) =>
  makeParticipant({ id: "m", abilities: [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "castSpellOnHit", spellIds: ids }] })] });

const victim = (abilities: ReturnType<typeof resolved>[] = []) => makeParticipant({ id: "v", side: ParticipantSide.ENEMY, hp: 50, maxHp: 50, abilities });

function run(ids: string[], keys: string[], target: ReturnType<typeof victim>, rng = seq(0, 0.99)) {
  const attacker = mistress(ids);

  return castHitSpell({
    attacker,
    targetId: "v",
    participants: [attacker, target],
    spells: new Map(keys.map((k) => [k, spellOf(k)])),
    round: 1,
    battleId: "b",
    rng,
  });
}

const effectNames = (r: ReturnType<typeof run>) => r.participants.find((p) => p.basicInfo.id === "v")?.battleData.activeEffects.map((e) => e.name) ?? [];

describe("castHitSpell", () => {
  it("накладає заклинання без слота", () => {
    const r = run(["frailty"], ["frailty"], victim());

    expect(effectNames(r)).toContain("Немічність");
    expect(textsOf(r.messages)[0]).toContain("Немічність");
  });

  it("рятівний кидок цілі: успіх — без ефекту, провал — ефект", () => {
    expect(effectNames(run(["slow"], ["slow"], victim(), seq(0, 0.99)))).not.toContain("Сповільнення");
    expect(effectNames(run(["slow"], ["slow"], victim(), seq(0, 0)))).toContain("Сповільнення");
  });

  it("імунітет цілі: ефекту немає, повідомлення про імунітет, без помилки", () => {
    const immune = resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "spellImmunity" }] });

    const r = run(["frailty"], ["frailty"], victim([immune]));

    expect(effectNames(r)).toEqual([]);
    expect(textsOf(r.messages).join(" ")).toContain("імунітет");
  });

  it("заклинання з кубиками кидає їх сервером", () => {
    const r = run(["plague"], ["plague"], victim());

    expect(effectNames(r)).toContain("Чума");
  });

  it("невідомий id заклинання пропускається", () => {
    const r = run(["ghost"], [], victim());

    expect(effectNames(r)).toEqual([]);
    expect(r.messages).toEqual([]);
  });
});

import type { CharacterLogEntry } from "@/types/characters";

export interface DescribedLog {
  key: string;
  params?: Record<string, string | number>;
}

export function describeCharacterLog(e: Pick<CharacterLogEntry, "kind" | "data">): DescribedLog {
  const d = e.data;

  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : 0);

  const yes = (v: unknown) => (v ? "yes" : "no");

  switch (e.kind) {
    case "check":
    case "save":
      return {
        key: "rest.log.roll",
        params: {
          hasLabel: yes(d.label),
          label: String(d.label ?? ""),
          autoFail: yes(d.autoFail),
          rolls: Array.isArray(d.rolls) ? (d.rolls as number[]).join(" / ") : "",
          total: num("total"),
          mode: String(d.mode),
          inspiration: yes(d.inspiration),
        },
      };
    case "short_rest":
      return { key: "rest.log.shortRest" };
    case "long_rest":
      return { key: "rest.log.longRest" };
    case "rest_closed":
      return { key: "rest.log.restClosed" };
    case "hit_die":
      return { key: "rest.log.hitDie", params: { die: num("die"), roll: num("roll"), healed: num("healed"), hpBefore: num("hpBefore"), hpAfter: num("hpAfter") } };
    case "arcane_recovery":
      return { key: "rest.log.arcaneRecovery", params: { levels: num("levels") } };
    case "xp":
      return {
        key: "rest.log.xp",
        params: { amount: `${num("amount") > 0 ? "+" : ""}${num("amount")}`, total: num("total"), hasNote: yes(typeof d.note === "string"), note: typeof d.note === "string" ? d.note : "" },
      };
    case "inspiration":
      return { key: d.value ? "rest.log.inspirationGained" : "rest.log.inspirationRemoved" };
    case "resources_edit":
      return { key: "rest.log.resourcesEdit" };
    case "choices_edit":
      return { key: "rest.log.choicesEdit" };
    case "battle_result":
      return { key: "rest.log.battleResult", params: { hpBefore: num("hpBefore"), hpAfter: num("hpAfter"), maxHp: num("maxHp"), dead: yes(d.dead) } };
  }
}

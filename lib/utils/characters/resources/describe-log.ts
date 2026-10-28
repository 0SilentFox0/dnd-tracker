import type { CharacterLogEntry } from "@/types/characters";

const MODE_NOTE: Record<string, string> = { advantage: " (перевага)", disadvantage: " (перешкода)" };

export function describeCharacterLog(e: Pick<CharacterLogEntry, "kind" | "data">): string {
  const d = e.data;

  const num = (k: string) => (typeof d[k] === "number" ? (d[k] as number) : 0);

  switch (e.kind) {
    case "check":
    case "save": {
      const rolls = Array.isArray(d.rolls) ? (d.rolls as number[]).join(" / ") : "";

      const result = d.autoFail ? "автопровал" : `${rolls} → ${num("total")}${MODE_NOTE[String(d.mode)] ?? ""}`;

      return `🎲 ${String(d.label ?? "Кидок")}: ${result}${d.inspiration ? " · натхнення" : ""}`;
    }
    case "short_rest":
      return "☕ Короткий відпочинок";
    case "long_rest":
      return "🛏 Довгий відпочинок";
    case "rest_closed":
      return "Відпочинок завершено";
    case "hit_die":
      return `🎲 Кістка хітів d${num("die")}: ${num("roll")} → +${num("healed")} HP (${num("hpBefore")} → ${num("hpAfter")})`;
    case "xp":
      return `⭐ Досвід ${num("amount") > 0 ? "+" : ""}${num("amount")} (разом ${num("total")})${typeof d.note === "string" ? ` · ${d.note}` : ""}`;
    case "inspiration":
      return d.value ? "✦ Отримано натхнення" : "✦ Натхнення знято";
    case "resources_edit":
      return "ДМ змінив ресурси";
    case "choices_edit":
      return "✎ Змінено вибори (раса, риси, опції класу)";
    case "battle_result":
      return `⚔ Після бою: HP ${num("hpBefore")} → ${num("hpAfter")} / ${num("maxHp")}${d.dead ? " · загинув" : ""}`;
  }
}

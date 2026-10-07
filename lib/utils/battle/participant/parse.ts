/** Визначає рівень скіла за назвою (Напад — Експерт → expert) */
export function inferLevelFromSkillName(name: string | null): string | null {
  const n = (name ?? "").toLowerCase();

  if (n.includes("експерт") || n.includes("expert")) return "expert";

  if (n.includes("просунут") || n.includes("advanced")) return "advanced";

  if (n.includes("базов") || n.includes("основ") || n.includes("basic"))
    return "basic";

  return null;
}

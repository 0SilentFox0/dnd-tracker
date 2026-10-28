import { backgroundSpellIds } from "./references";

export function backgroundReferenceError(background: { originFeatId?: unknown; choices?: unknown }, feats: readonly { id: unknown; type?: unknown }[], spells: ReadonlySet<unknown>): string | null {
  if (background.originFeatId && !feats.some((f) => f.id === background.originFeatId && f.type === "origin")) return "Риса походження передісторії має бути origin-рисою цієї кампанії";

  if (backgroundSpellIds(background.choices).some((id) => !spells.has(id))) return "Передісторія посилається на невідоме заклинання";

  return null;
}

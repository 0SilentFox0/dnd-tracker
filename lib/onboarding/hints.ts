import type { OnboardingHintDef } from "@/lib/onboarding/types";

const list: OnboardingHintDef[] = [
  { id: "dm.races", audience: "dm", helpSlug: "dm-world" },
  { id: "dm.skill-trees", audience: "dm", helpSlug: "dm-world" },
  { id: "dm.skills", audience: "dm", helpSlug: "dm-world" },
  { id: "dm.units", audience: "dm", helpSlug: "dm-units-balance" },
  { id: "dm.class-map", audience: "dm", helpSlug: "dm-world" },
  { id: "dm.spells", audience: "dm", helpSlug: "dm-world" },
  { id: "dm.artifacts", audience: "dm", helpSlug: "dm-world" },
  { id: "dm.battles", audience: "dm", helpSlug: "dm-battle" },
  { id: "dm.battle-setup", audience: "dm", helpSlug: "dm-units-balance" },
  { id: "dm.battle-scene", audience: "dm", helpSlug: "dm-battle" },
  { id: "dm.scenario", audience: "dm", helpSlug: "dm-scenario-show" },
  { id: "dm.show", audience: "dm", helpSlug: "dm-scenario-show" },
  { id: "dm.world", audience: "dm", helpSlug: "dm-world-map" },
  { id: "player.world", audience: "player", helpSlug: "player-world-map" },
  { id: "player.character", audience: "player", helpSlug: "player-quickstart" },
  { id: "player.draft", audience: "player", helpSlug: "player-quickstart" },
  { id: "player.battle", audience: "player", helpSlug: "player-battle" },
];

export const HINTS: Record<string, OnboardingHintDef> = Object.fromEntries(list.map((h) => [h.id, h]));

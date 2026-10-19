import { area } from "./area";
import { bolt } from "./bolt";
import { buff } from "./buff";
import { death } from "./death";
import { debuff } from "./debuff";
import { heal } from "./heal";
import { melee } from "./melee";
import { ranged } from "./ranged";
import { summon } from "./summon";
import type { FxAnimation } from "./types";

import type { FxArchetype } from "@/lib/utils/battle/fx";

type BaseArchetype = "melee" | "ranged" | "bolt" | "area" | "heal" | "buff" | "debuff" | "summon" | "death";

type SignatureArchetype = Exclude<FxArchetype, BaseArchetype>;

const BASE: Record<BaseArchetype, FxAnimation> = { melee, ranged, bolt, area, heal, buff, debuff, summon, death };

// One chunk per signature; `fallback` plays when the chunk is late or fails to load.
const SIGNATURES: Record<SignatureArchetype, { load: () => Promise<FxAnimation>; fallback: BaseArchetype }> = {
  swarm: { load: () => import("./swarm").then((m) => m.swarm), fallback: "area" },
  quake: { load: () => import("./quake").then((m) => m.quake), fallback: "area" },
  teleport: { load: () => import("./teleport").then((m) => m.teleport), fallback: "buff" },
  entangle: { load: () => import("./entangle").then((m) => m.entangle), fallback: "debuff" },
  meteor: { load: () => import("./meteor").then((m) => m.meteor), fallback: "area" },
  eldritch: { load: () => import("./eldritch").then((m) => m.eldritch), fallback: "bolt" },
  slow: { load: () => import("./slow").then((m) => m.slow), fallback: "debuff" },
  haste: { load: () => import("./haste").then((m) => m.haste), fallback: "buff" },
  stoneskin: { load: () => import("./stoneskin").then((m) => m.stoneskin), fallback: "buff" },
  cleanse: { load: () => import("./cleanse").then((m) => m.cleanse), fallback: "buff" },
  regenerate: { load: () => import("./regenerate").then((m) => m.regenerate), fallback: "buff" },
  might: { load: () => import("./might").then((m) => m.might), fallback: "buff" },
  deflect: { load: () => import("./deflect").then((m) => m.deflect), fallback: "buff" },
  holyword: { load: () => import("./holyword").then((m) => m.holyword), fallback: "area" },
  empower: { load: () => import("./empower").then((m) => m.empower), fallback: "buff" },
  spellward: { load: () => import("./spellward").then((m) => m.spellward), fallback: "buff" },
  sunbeam: { load: () => import("./sunbeam").then((m) => m.sunbeam), fallback: "heal" },
  retribution: { load: () => import("./retribution").then((m) => m.retribution), fallback: "bolt" },
  resurrect: { load: () => import("./resurrect").then((m) => m.resurrect), fallback: "heal" },
  siphon: { load: () => import("./siphon").then((m) => m.siphon), fallback: "debuff" },
  rust: { load: () => import("./rust").then((m) => m.rust), fallback: "debuff" },
  pestilence: { load: () => import("./pestilence").then((m) => m.pestilence), fallback: "bolt" },
  whispers: { load: () => import("./whispers").then((m) => m.whispers), fallback: "debuff" },
  thorns: { load: () => import("./thorns").then((m) => m.thorns), fallback: "debuff" },
  raincloud: { load: () => import("./raincloud").then((m) => m.raincloud), fallback: "debuff" },
  blindfold: { load: () => import("./blindfold").then((m) => m.blindfold), fallback: "debuff" },
  puppet: { load: () => import("./puppet").then((m) => m.puppet), fallback: "debuff" },
  netherhands: { load: () => import("./netherhands").then((m) => m.netherhands), fallback: "bolt" },
  firesummon: { load: () => import("./firesummon").then((m) => m.firesummon), fallback: "summon" },
  watersummon: { load: () => import("./watersummon").then((m) => m.watersummon), fallback: "summon" },
  earthsummon: { load: () => import("./earthsummon").then((m) => m.earthsummon), fallback: "summon" },
  airsummon: { load: () => import("./airsummon").then((m) => m.airsummon), fallback: "summon" },
  phoenix: { load: () => import("./phoenix").then((m) => m.phoenix), fallback: "summon" },
  avatar: { load: () => import("./avatar").then((m) => m.avatar), fallback: "summon" },
  healword: { load: () => import("./healword").then((m) => m.healword), fallback: "heal" },
  healwave: { load: () => import("./healwave").then((m) => m.healwave), fallback: "heal" },
  rebirth: { load: () => import("./rebirth").then((m) => m.rebirth), fallback: "heal" },
  forestspirit: { load: () => import("./forestspirit").then((m) => m.forestspirit), fallback: "heal" },
  thornvines: { load: () => import("./thornvines").then((m) => m.thornvines), fallback: "bolt" },
  moonbeam: { load: () => import("./moonbeam").then((m) => m.moonbeam), fallback: "bolt" },
  vampire: { load: () => import("./vampire").then((m) => m.vampire), fallback: "buff" },
};

const isBase = (a: FxArchetype): a is BaseArchetype => a in BASE;

const loaded = new Map<SignatureArchetype, FxAnimation>();

const pending = new Map<SignatureArchetype, Promise<FxAnimation>>();

export function loadAnimation(archetype: FxArchetype): Promise<FxAnimation> {
  if (isBase(archetype)) return Promise.resolve(BASE[archetype]);

  const ready = loaded.get(archetype);

  if (ready) return Promise.resolve(ready);

  let load = pending.get(archetype);

  if (!load) {
    load = SIGNATURES[archetype].load().then(
      (anim) => {
        loaded.set(archetype, anim);
        pending.delete(archetype);

        return anim;
      },
      (e: unknown) => {
        // a failed chunk (e.g. right after a deploy) is tried again next time
        pending.delete(archetype);
        throw e;
      },
    );
    pending.set(archetype, load);
  }

  return load;
}

/** Best effort: called when a spec enters the queue or a preview mounts, so the first run rarely waits. */
export function preloadAnimation(archetype: FxArchetype) {
  loadAnimation(archetype).catch(() => undefined);
}

/** The archetype's animation, or its base fallback when the chunk fails or takes longer than `timeoutMs`. */
export function animationFor(archetype: FxArchetype, timeoutMs: number): Promise<FxAnimation> {
  if (isBase(archetype)) return Promise.resolve(BASE[archetype]);

  const ready = loaded.get(archetype);

  if (ready) return Promise.resolve(ready);

  const fallback = BASE[SIGNATURES[archetype].fallback];

  return new Promise((resolve) => {
    const timer = Number.isFinite(timeoutMs) ? setTimeout(() => resolve(fallback), timeoutMs) : undefined;

    loadAnimation(archetype).then(
      (anim) => {
        clearTimeout(timer);
        resolve(anim);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

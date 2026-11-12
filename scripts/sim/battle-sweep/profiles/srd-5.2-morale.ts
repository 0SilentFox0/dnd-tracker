import type { SweepProfile } from "./types";

export const SRD_MORALE_PROFILE: SweepProfile = {
  key: "srd-5.2+morale",
  template: "srd-5.2",
  judge: "client",
  source: { kind: "template", importIfMissing: false },
  // the morale gate fires inside the sweep rounds (call() resolves it); the other modes are covered by the plain srd-5.2 profile
  modes: ["sweep"],
  maxBattles: 6,
  unitsPerBattle: 6,
  heroCount: 4,
  heroLevel: 5,
  rules: { modules: ["morale"], patch: { morale: { enabled: true, cap: 3 } } },
  heroMorale: 2,
};

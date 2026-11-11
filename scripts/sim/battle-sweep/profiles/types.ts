export type SweepMode = "sweep" | "targeted" | "control" | "level5" | "aura" | "reserve" | "map" | "maze" | "system";

export interface SweepProfile {
  key: string;
  judge: "client" | "server";
  /** `campaign`: existing campaign with heroes; `template`: template campaign, heroes seeded from its content and removed afterwards */
  source: { kind: "campaign"; name: string } | { kind: "template"; importIfMissing: boolean };
  modes: readonly SweepMode[];
  maxBattles: number;
  unitsPerBattle: number;
  heroCount: number;
  heroLevel: number;
}

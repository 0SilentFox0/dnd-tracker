export interface TransformRequest {
  targetId: string;
  casterId: string;
  unitId: string;
  spellId: string;
  spellName: string;
  castId: string;
  expiresRound: number;
  concentrationOf?: { casterId: string; castId: string };
}

export interface TransformRequest {
    targetId: string;
    casterId: string;
    unitId: string;
    pick?: { creatureType: string };
    spellId: string;
    spellName: string;
    castId: string;
    expiresRound: number;
    concentrationOf?: { casterId: string; castId: string };
}

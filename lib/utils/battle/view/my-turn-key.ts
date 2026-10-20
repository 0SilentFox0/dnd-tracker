import type { BattleParticipant } from "@/types/battle";

/** Ключ перемонтування майстра ходу: новий раунд або додатковий хід скидають його стан. */
export const myTurnKey = (hero: BattleParticipant, round: number) => `${hero.basicInfo.id}-${round}-${hero.battleData.extraTurnActive ? "x" : "n"}`;

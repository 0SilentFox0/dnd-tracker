import type { RuleSystemMagic } from "../../types";
import { wfrpLoreAttribute } from "./attribute";
import { wfrpCastTest } from "./cast-test";
import { wfrpChannel } from "./channel";
import { wfrpMiscast } from "./miscast";

import type { BattleParticipant } from "@/types/battle";

const dropChannelled = (p: BattleParticipant): BattleParticipant => (p.battleData.channelledSl ? { ...p, battleData: { ...p.battleData, channelledSl: 0 } } : p);

export const WFRP_MAGIC: RuleSystemMagic = {
  slots: false,
  castTest: wfrpCastTest,
  channel: wfrpChannel,
  miscast: wfrpMiscast,
  attribute: wfrpLoreAttribute,
  onDamaged: dropChannelled,
};

import { d20DeathSaveOnSkip } from "../death-saves/on-skipped-turn";
import { d20LairRoundStart } from "./on-round-start";
import { d20DropStalePendingCast } from "./on-turn-end";

import type { RuleSystemTurn } from "@/lib/utils/rules/systems/types";

export const D20_TURN: RuleSystemTurn = { onSkippedTurn: [d20DeathSaveOnSkip], onTurnEnd: [d20DropStalePendingCast], onRoundStart: [d20LairRoundStart] };

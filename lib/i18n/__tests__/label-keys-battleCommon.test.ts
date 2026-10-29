import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { AttackType, BattleActionType } from "@/lib/constants/battle";
import { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import { CUNNING_STRIKE_EFFECTS } from "@/lib/utils/abilities/schema/params";
import { CORE_ACTION_KEYS } from "@/lib/utils/battle/actions/registry";
import { CONDITION_5E_KEYS } from "@/lib/utils/battle/conditions/registry";

describe("battleCommon has translations", () => {
  expectLabelKeys("battleCommon", "conditions", CONDITION_5E_KEYS.flatMap((k) => [`${k}.label`, `${k}.description`]));
  expectLabelKeys("battleCommon", "coreActions", CORE_ACTION_KEYS);
  expectLabelKeys("battleCommon", "cunningStrike", CUNNING_STRIKE_EFFECTS);
  expectLabelKeys("battleCommon", "attackKinds", Object.values(AttackType));
  expectLabelKeys("battleCommon", "actionKinds", [...Object.values(BattleActionType), "hazard", "event"]);
  expectLabelKeys("battleCommon", "weather", [...WEATHER_KINDS, "clear"]);
  expectLabelKeys("battleCommon", "actors", ["system", "dm"]);
});

import { BattleRuleError } from "@/lib/utils/battle/store/errors";

export const reject = (message: string): never => {
  throw new BattleRuleError("action_rejected", message);
};

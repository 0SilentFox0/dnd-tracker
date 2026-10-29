import { ruleErrorOf } from "@/lib/utils/battle/store/errors";
import type { LogLine } from "@/types/text";

export const reject = (reason: LogLine): never => {
  throw ruleErrorOf("action_rejected", reason);
};

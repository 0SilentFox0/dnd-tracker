import { MAX_DAYS } from "./constants";
import { validateEndeavour } from "./endeavours";
import { planPeriod } from "./plan-period";

export const WFRP_DOWNTIME = { planPeriod, validateEndeavour, maxDays: MAX_DAYS };

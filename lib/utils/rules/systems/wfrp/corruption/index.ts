import { GRANT_MAX } from "./constants";
import { planGrant } from "./plan-grant";
import { planCorruptionUndo } from "./undo";

export const WFRP_CORRUPTION = { planGrant, planUndo: planCorruptionUndo, grantMax: GRANT_MAX };

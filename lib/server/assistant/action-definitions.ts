import { BATTLE_ACTIONS } from "./actions/battles";
import { CAMPAIGN_ACTIONS } from "./actions/campaign";
import { CHARACTER_PROGRESSION_ACTIONS } from "./actions/character-progression";
import { CHARACTER_ACTIONS } from "./actions/characters";
import { CONTENT_ACTIONS } from "./actions/content";
import { HANDOFF_ACTIONS } from "./actions/handoffs";
import { SCENARIO_ACTIONS } from "./actions/scenario";
import { SHOW_ACTIONS } from "./actions/show";

/** The sole executable catalog, assembled from the completed domain adapters. */
export const ASSISTANT_ACTIONS = [...CONTENT_ACTIONS, ...SCENARIO_ACTIONS, ...CAMPAIGN_ACTIONS, ...CHARACTER_ACTIONS, ...CHARACTER_PROGRESSION_ACTIONS, ...BATTLE_ACTIONS, ...SHOW_ACTIONS, ...HANDOFF_ACTIONS];

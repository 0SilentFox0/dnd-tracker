import type { StashActionName } from "./stash-actions";

const PLAYER_ACTIONS: ReadonlySet<StashActionName> = new Set(["spend", "gain", "addItem", "editItem", "useItem", "removeItem", "stash", "equip"]);

export const canStashAction = (action: StashActionName, who: { isDM: boolean; isOwner: boolean; pending: boolean }) =>
  who.isDM || (who.isOwner && !who.pending && PLAYER_ACTIONS.has(action));

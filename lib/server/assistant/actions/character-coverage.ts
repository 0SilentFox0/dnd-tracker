/** Implemented shared character adapters. Activation of model transports remains T14. */
const base = "campaigns/[id]/characters";

const hero = `${base}/[characterId]`;

export const CHARACTER_ACTION_COVERAGE = [
  ["GET", base, "list", "character-actions"], ["POST", base, "create", "character-actions"], ["DELETE", base, "delete-all", "character-actions"],
  ["GET", `${base}/roster`, "roster", "character-roster-api"],
  ["GET", hero, "get", "character-actions"], ["PATCH", hero, "patch", "character-actions"], ["DELETE", hero, "delete", "character-actions"],
  ["PUT", `${hero}/notes`, "notes", "character-notes-api"], ["PUT", `${hero}/goals`, "goals", "character-goals-api"],
  ["POST", `${hero}/review`, "review", "character-draft-api"], ["POST", `${hero}/tokens`, "tokens.create", "character-tokens-api"],
  ["DELETE", `${hero}/tokens/[tokenId]`, "tokens.delete", "character-tokens-api"],
  ["POST", `${hero}/level-up`, "level-up", "character-progression-storage.integration"],
  ["PUT", `${hero}/choices`, "choices", "character-progression-actions"],
  ["PATCH", `${hero}/resources`, "resources", "character-progression-actions"],
  ["GET", `${hero}/inventory`, "inventory", "character-progression-actions"], ["PATCH", `${hero}/inventory`, "inventory.patch", "inventory-equip-swap-api"],
  ["GET", `${hero}/stash`, "stash", "stash-api"], ["POST", `${hero}/stash`, "stash.apply", "stash-api"],
  ["POST", `${hero}/artifacts/transfer`, "transfer", "character-progression-storage.integration"],
  ["GET", `${hero}/stash/log`, "stash.log", "stash-api"], ["GET", `${hero}/stash/free-artifacts`, "stash.free-artifacts", "stash-api"],
  ["POST", `${hero}/hit-dice`, "hit-dice", "hit-dice"], ["POST", `${hero}/inspiration`, "inspiration", "inspiration"],
  ["POST", `${hero}/roll`, "roll", "character-progression-storage.integration"], ["GET", `${hero}/sheet`, "sheet", "character-sheet-api"],
  ["GET", `${hero}/log`, "log", "log"], ["GET", `${hero}/progression`, "progression", "progression-api"],
  ["POST", `${hero}/progression/learn`, "progression.learn", "progression-actions-api"],
  ["POST", `${hero}/progression/unlearn`, "progression.unlearn", "progression-actions-api"],
  ["POST", `${hero}/progression/reset`, "progression.reset", "character-progression-actions"],
  ["POST", `${hero}/progression/seen-level`, "progression.seen-level", "progression-actions-api"],
  ["POST", "campaigns/[id]/rest", "rest", "character-progression-storage.integration"],
  ["POST", "campaigns/[id]/experience", "experience", "character-progression-storage.integration"],
].map(([method, route, operation, testId]) => ({ method, route, actionId: `characters.${operation}`, testId }));

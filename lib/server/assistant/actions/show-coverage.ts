const decks = "campaigns/[id]/decks";

export const SHOW_ACTION_COVERAGE = [
  ["GET", decks, "decks.list"], ["POST", decks, "decks.create"],
  ["GET", `${decks}/[deckId]`, "decks.get"], ["PUT", `${decks}/[deckId]`, "decks.save"],
  ["PATCH", `${decks}/[deckId]`, "decks.scene"], ["DELETE", `${decks}/[deckId]`, "decks.delete"],
  ["POST", `${decks}/generate-image`, "generate"], ["DELETE", `${decks}/generated-image`, "discard"],
  ["GET", "campaigns/[id]/show", "get"], ["POST", "campaigns/[id]/show", "command"],
].map(([method, route, operation]) => ({ method, route, actionId: `show.${operation}`, testId: "show-actions" }));

const c = "campaigns/[id]";

/** Metadata only. Catalog and transport activation remain T14. */
export const HANDOFF_ACTION_COVERAGE = [
  ...["DELETE", "PATCH", "PUT"].map((m) => [
    m,
    "ai/credentials/[provider]",
    "handoff.credentials",
  ]),
  ["GET", "ai/credentials", "handoff.credentials"],
  ["DELETE", `${c}/api-tokens/[tokenId]`, "handoff.tokens"],
  ...["GET", "POST"].map((m) => [m, `${c}/api-tokens`, "handoff.tokens"]),
  ["PATCH", `${c}/characters/[characterId]/draft`, "handoff.player-draft"],
  ["POST", `${c}/characters/draft/avatar`, "handoff.player-draft"],
  ...["GET", "POST"].map((m) => [
    m,
    `${c}/characters/draft/backstory`,
    "handoff.player-draft",
  ]),
  ["GET", `${c}/characters/draft/portraits`, "handoff.player-draft"],
  ["POST", `${c}/characters/draft`, "handoff.player-draft"],
  ["POST", `${c}/compendium/confirm`, "handoff.compendium-confirm"],
  ["POST", `${c}/compendium/media`, "handoff.compendium-confirm"],
  ["GET", `${c}/compendium/entries`, "compendium.entries"],
  ["GET", `${c}/compendium/options`, "compendium.options"],
  ["POST", `${c}/compendium/preview`, "handoff.compendium-preview"],
  ["GET", `${c}/compendium/reports`, "compendium.reports"],
  ...["GET", "POST"].map((m) => [
    m,
    `${c}/content-import/[kind]/ai-map`,
    "handoff.ai-map",
  ]),
  ["POST", `${c}/decks/upload-url`, "handoff.slide-upload"],
  ["POST", `${c}/tracks/upload-url`, "handoff.track-upload"],
  ["POST", "campaigns/import", "handoff.campaign-import"],
  ["POST", "campaigns/join", "handoff.campaign-join"],
].map(([method, route, actionId]) => ({
  method,
  route,
  actionId,
  testId: "handoffs",
}));

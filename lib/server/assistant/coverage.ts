// Coverage metadata is not an executable action registry. Entries become active
// only after the owning adapter and its acceptance tests are implemented.
export const HTTP_METHODS = ["DELETE", "GET", "PATCH", "POST", "PUT"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];
export type RouteMethods = { route: string; methods: readonly string[] };
export type RouteCoverage = RouteMethods & { task: number; adapter: string; state: "planned" | "active" | "handoff" };

export function exportedHttpMethods(source: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();

  for (const method of HTTP_METHODS) {
    if (new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+const\\s+${method}\\s*=`).test(source)) methods.add(method);

    for (const match of source.matchAll(/export\s+(?:const\s+)?\{([^}]+)\}/g)) {
      if (new RegExp(`(?:^|,)\\s*(?:[a-zA-Z_$][\\w$]*\\s+as\\s+)?${method}\\s*(?:,|$)`).test(match[1])) methods.add(method);
    }
  }

  return [...methods].sort();
}

export function auditRouteCoverage(routes: readonly RouteMethods[], entries: readonly RouteCoverage[]): string[] {
  const actual = new Set(routes.flatMap((r) => r.methods.map((m) => `${m} ${r.route}`)));

  const owned = new Set<string>();

  const issues: string[] = [];

  for (const entry of entries) for (const method of entry.methods) {
    const key = `${method} ${entry.route}`;

    if (owned.has(key)) issues.push(`duplicate: ${key}`);

    if (!actual.has(key)) issues.push(`removed: ${key}`);

    owned.add(key);
  }
  for (const key of actual) if (!owned.has(key)) issues.push(`unmapped: ${key}`);

  return issues.sort();
}

export const ASSISTANT_ROUTE_COVERAGE: readonly RouteCoverage[] = [
  { route: "campaigns/[id]/assistant/intents", methods: ["GET"], task: 4, adapter: "session-review", state: "handoff" },
  { route: "campaigns/[id]/assistant/intents/[intentId]", methods: ["GET"], task: 4, adapter: "session-review", state: "handoff" },
  { route: "campaigns/[id]/assistant/intents/[intentId]/confirm", methods: ["POST"], task: 4, adapter: "session-review", state: "handoff" },
  { route: "campaigns/[id]/assistant/intents/[intentId]/reject", methods: ["POST"], task: 4, adapter: "session-review", state: "handoff" },
  { route: "campaigns/[id]/assistant/intents/[intentId]/receipt", methods: ["GET"], task: 4, adapter: "session-review", state: "handoff" },
  { route: "campaigns/[id]/assistant/policy", methods: ["PUT"], task: 4, adapter: "session-review", state: "handoff" },
  { route: 'ai/credentials/[provider]', methods: ['DELETE', 'PATCH', 'PUT'], task: 4, adapter: 'handoffs/settings', state: "planned" },
  { route: 'ai/credentials', methods: ['GET'], task: 4, adapter: 'handoffs/settings', state: "planned" },
  { route: 'campaigns/[id]/abilities/[kind]/[ownerId]', methods: ['GET'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/abilities/sources', methods: ['GET'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/ai/proposals/[proposalId]/apply', methods: ['POST'], task: 6, adapter: 'legacy-proposals', state: "planned" },
  { route: 'campaigns/[id]/ai/proposals/[proposalId]/reject', methods: ['POST'], task: 6, adapter: 'legacy-proposals', state: "planned" },
  { route: 'campaigns/[id]/ai/proposals', methods: ['GET'], task: 6, adapter: 'legacy-proposals', state: "planned" },
  { route: 'campaigns/[id]/ai/settings', methods: ['GET', 'PUT'], task: 7, adapter: 'campaign instructions', state: "planned" },
  { route: 'campaigns/[id]/ai/threads/[threadId]/chat', methods: ['POST'], task: 15, adapter: 'existing chat/run transport', state: "planned" },
  { route: 'campaigns/[id]/ai/threads/[threadId]/messages', methods: ['GET'], task: 15, adapter: 'existing chat/run transport', state: "planned" },
  { route: 'campaigns/[id]/ai/threads/[threadId]', methods: ['DELETE', 'PATCH'], task: 15, adapter: 'existing chat/run transport', state: "planned" },
  { route: 'campaigns/[id]/ai/threads', methods: ['GET', 'POST'], task: 15, adapter: 'existing chat/run transport', state: "planned" },
  { route: 'campaigns/[id]/api-tokens/[tokenId]', methods: ['DELETE'], task: 4, adapter: 'handoffs/settings', state: "planned" },
  { route: 'campaigns/[id]/api-tokens', methods: ['GET', 'POST'], task: 4, adapter: 'handoffs/settings', state: "planned" },
  { route: 'campaigns/[id]/artifact-sets/[setId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/artifact-sets', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/artifacts/[artifactId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/artifacts', methods: ['DELETE', 'GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/backgrounds/[backgroundId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/backgrounds', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/ability-action', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/add-participant', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/attack', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/audio', methods: ['GET', 'POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/aura-zone', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/bonus-action', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/complete', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/conditions', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/core-action', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/events', methods: ['GET'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/map-terrain', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/map-weather', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/maze', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/maze-mark', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/morale-check', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/move', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/next-turn', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/participants/[participantId]', methods: ['PATCH'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/refresh-sources', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/reset', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/reveal-participant', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/rollback', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]', methods: ['DELETE', 'GET', 'PATCH'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/scale-units', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/spell', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/start', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/summary', methods: ['GET'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/[battleId]/unit-control', methods: ['POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles/balance', methods: ['GET', 'POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/battles', methods: ['DELETE', 'GET', 'POST'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/artifacts/transfer', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/choices', methods: ['PUT'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/draft', methods: ['PATCH'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/goals', methods: ['PUT'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/hit-dice', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/inspiration', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/inventory', methods: ['GET', 'PATCH'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/level-up', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/log', methods: ['GET'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/notes', methods: ['PUT'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/progression/learn', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/progression/reset', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/progression', methods: ['GET'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/progression/seen-level', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/progression/unlearn', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/resources', methods: ['PATCH'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/review', methods: ['POST'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/roll', methods: ['POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]', methods: ['DELETE', 'GET', 'PATCH'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/sheet', methods: ['GET'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/stash/free-artifacts', methods: ['GET'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/stash/log', methods: ['GET'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/stash', methods: ['GET', 'POST'], task: 9, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/tokens/[tokenId]', methods: ['DELETE'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/[characterId]/tokens', methods: ['POST'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters/draft/avatar', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/characters/draft/backstory', methods: ['GET', 'POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/characters/draft/portraits', methods: ['GET'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/characters/draft', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/characters/roster', methods: ['GET'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/characters', methods: ['DELETE', 'GET', 'POST'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/classes/[classId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/classes', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/compendium/confirm', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/compendium/entries', methods: ['GET'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/compendium/options', methods: ['GET'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/compendium/preview', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/compendium/reports', methods: ['GET'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/content-export/[kind]', methods: ['GET'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/content-import/[kind]/ai-map', methods: ['GET', 'POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/content-import/[kind]/example.csv', methods: ['GET'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/content-import/[kind]', methods: ['POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/decks/[deckId]', methods: ['DELETE', 'GET', 'PATCH', 'PUT'], task: 12, adapter: 'show/decks', state: "planned" },
  { route: 'campaigns/[id]/decks/generate-image', methods: ['POST'], task: 12, adapter: 'show/decks', state: "planned" },
  { route: 'campaigns/[id]/decks/generated-image', methods: ['DELETE'], task: 12, adapter: 'show/decks', state: "planned" },
  { route: 'campaigns/[id]/decks', methods: ['GET', 'POST'], task: 12, adapter: 'show/decks', state: "planned" },
  { route: 'campaigns/[id]/decks/upload-url', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/experience', methods: ['POST'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]/export', methods: ['GET'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/feats/[featId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/feats', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/main-skills/[mainSkillId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/main-skills', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/members/[memberId]', methods: ['DELETE'], task: 7, adapter: 'campaign/templates', state: "planned" },
  { route: 'campaigns/[id]/members', methods: ['GET'], task: 7, adapter: 'campaign/templates', state: "planned" },
  { route: 'campaigns/[id]/onboarding', methods: ['GET'], task: 7, adapter: 'campaign/templates', state: "planned" },
  { route: 'campaigns/[id]/races/[raceId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/races', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/rest', methods: ['POST'], task: 8, adapter: 'characters', state: "planned" },
  { route: 'campaigns/[id]', methods: ['DELETE', 'GET', 'PATCH'], task: 7, adapter: 'campaign/templates', state: "planned" },
  { route: 'campaigns/[id]/rules', methods: ['GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/save-as-template', methods: ['POST'], task: 7, adapter: 'campaign/templates', state: "planned" },
  { route: 'campaigns/[id]/scenario/[pageId]', methods: ['DELETE', 'GET', 'PATCH', 'PUT'], task: 6, adapter: 'scenario + legacy proposals', state: "planned" },
  { route: 'campaigns/[id]/scenario/[pageId]/sections/[sectionId]', methods: ['PATCH'], task: 6, adapter: 'scenario + legacy proposals', state: "planned" },
  { route: 'campaigns/[id]/scenario/[pageId]/versions', methods: ['GET', 'POST'], task: 6, adapter: 'scenario + legacy proposals', state: "planned" },
  { route: 'campaigns/[id]/scenario/mentions', methods: ['GET'], task: 6, adapter: 'scenario + legacy proposals', state: "planned" },
  { route: 'campaigns/[id]/scenario', methods: ['GET', 'POST'], task: 6, adapter: 'scenario + legacy proposals', state: "planned" },
  { route: 'campaigns/[id]/scenario/search', methods: ['GET'], task: 6, adapter: 'scenario + legacy proposals', state: "planned" },
  { route: 'campaigns/[id]/show', methods: ['GET', 'POST'], task: 12, adapter: 'show/decks', state: "planned" },
  { route: 'campaigns/[id]/skill-trees/[treeId]', methods: ['PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/skill-trees', methods: ['GET'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/skills/[skillId]/duplicate', methods: ['POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/skills/[skillId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/skills', methods: ['DELETE', 'GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/source-sync', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/[spellId]/remove-from-group', methods: ['POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/[spellId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/delete-all', methods: ['DELETE'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/delete-by-level', methods: ['DELETE'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/groups/[groupId]/remove-all-spells', methods: ['POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/groups/[groupId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells/groups', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/spells', methods: ['DELETE', 'GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/tracks/[trackId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/tracks/order', methods: ['PUT'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/tracks', methods: ['GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/tracks/upload-url', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/[id]/units/[unitId]', methods: ['DELETE', 'GET', 'PATCH'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/units/delete-all', methods: ['DELETE'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/units/import', methods: ['POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/[id]/units', methods: ['DELETE', 'GET', 'POST'], task: 5, adapter: 'content', state: "planned" },
  { route: 'campaigns/active-battles', methods: ['GET'], task: 10, adapter: 'battles', state: "planned" },
  { route: 'campaigns/import', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns/join', methods: ['POST'], task: 13, adapter: 'handoffs', state: "planned" },
  { route: 'campaigns', methods: ['GET', 'POST'], task: 7, adapter: 'campaign/templates', state: "planned" },
  { route: 'templates', methods: ['GET'], task: 7, adapter: 'campaign/templates', state: "planned" },
];

# MCP Coverage Expansion Design

## Intent

Raise the D&D Tracker MCP to a reliable interface for DM workflows and campaign capabilities already available in the product. MCP is intended for the DM; ordinary player access is outside the product goal.

## Goals

- Expose DM world-map workflows through MCP: map and marker reads, notes, and supported travel/movement operations.
- Keep map data and campaign context available only to the authenticated DM; MCP does not expose the player-facing filtered map view.
- Provide MCP Resources and Prompts for discoverable campaign context and common workflows, if supported by the installed MCP server library and its clients.
- Keep MCP authorization DM-only, consistent with the current API-token model.
- Preserve scoped token access, human review for sensitive writes, and existing campaign isolation.
- Add protocol-level documentation and a reproducible compatibility check for representative MCP clients.

## Non-goals

- Replacing the app's world-map or player permission model.
- Adding MCP access for ordinary players.
- Bypassing review/confirmation for writes.
- Exposing arbitrary database records or arbitrary integration execution.
- Claiming universal compatibility with every external MCP client; compatibility will be documented for the clients actually checked.
- Defining new game mechanics or map features beyond existing application operations.

## Current constraints

- `app/api/mcp/route.ts` creates a stateless MCP handler and registers only tools selected by API-token scopes.
- `lib/ai/tools/index.ts` is the tool registry; no Resources or Prompts are currently registered.
- `verifyApiToken` currently accepts only a campaign DM/owner identity and strips write scopes for demo campaigns; this is intentional for MCP and remains so.
- The app already has world-map schemas and handlers. Most HTTP handlers are session-bound (`withDM`/`requireCampaignAccess`) and cannot be called directly with an MCP token; MCP needs shared domain operations or assistant actions that carry the verified caller.
- MCP is built on `mcp-handler`; confirm its installed API and transport behavior before selecting the Resources/Prompts implementation.
- Existing workspace changes in the expanded-demo design and plan are unrelated and must be preserved.

## Approaches considered

1. **Map tools only.** Smallest change and closes the most visible gap, but leaves campaign discovery and reusable prompts unsupported.
2. **Full MCP surface expansion (recommended).** Add scoped map tools, Resources and Prompts, and compatibility documentation. This addresses the identified gaps while reusing existing application rules.
3. **Expose broad database-level CRUD.** Could cover more records quickly, but duplicates business logic and risks leaking hidden data or bypassing review. Rejected because it weakens the existing security boundary.

## Recommended behavior

- Keep MCP callers DM-only. Apply least-privilege scopes for world reads and DM world writes. Existing token compatibility must be preserved; old tokens should not silently gain new permissions.
- Keep reads on shared server/domain functions. For writes, route through the assistant action dispatcher so review/auto policy, token revalidation, and human confirmation remain in force. Extract domain operations from session-bound HTTP handlers where needed; do not call those handlers with forged requests or query Prisma from MCP tool definitions.
- Resources should offer stable, read-only campaign context with opaque URIs and per-request DM authorization. Prompts should be workflow templates that do not embed campaign data; context is resolved through authorized tools/resources.
- Use the MCP library's supported registrations and protocol semantics. If the dependency does not support a capability cleanly, upgrade or use a compatible MCP SDK surface rather than implementing a partial protocol by hand.
- Compatibility evidence should include initialize, tools/list and invocation, resources/list/read, prompts/list/get, and error/permission behavior for at least two distinct clients or protocol harnesses. Report exact versions and unsupported features.

## Open implementation decisions

- Final names and granularity of world scopes, tools, and assistant actions.
- Resource URI layout and campaign context pagination/size limits.
- MCP package support and client matrix, determined from repository dependency versions and available clients.

## Acceptance criteria

- DM tokens can discover and use the world-map operations their scopes permit.
- Player credentials remain unsupported; the existing DM-only token policy is preserved.
- Existing DM tools and old token permissions retain their current behavior.
- Resources and Prompts are discoverable and usable through the MCP protocol when advertised.
- Cross-campaign access, stale/revoked credentials, unsupported scopes, and unauthorized writes fail closed; writes follow the existing review/confirmation policy.
- Automated tests cover DM scope authorization, protocol registration, and regression behavior; compatibility notes record tested client versions.

## Delivery order

1. Inspect MCP dependency support and current world-map handler contracts; finalize scopes and DM authorization boundaries.
2. Add world-map tools with shared validation and visibility rules.
3. Add Resources and Prompts with bounded, authorized reads.
4. Add compatibility checks and documentation; run the required verification suite.

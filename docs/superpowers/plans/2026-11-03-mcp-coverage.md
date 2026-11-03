# MCP Coverage Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the DM-only MCP with world-map tools, authorized Resources and Prompts, and documented protocol compatibility.

**Architecture:** Keep MCP registration in the existing route and tool registry, adding focused modules for world tools and read-only MCP capabilities. Reads use shared domain functions; writes go through the assistant action dispatcher and shared world operations, since current HTTP handlers are session-bound. No direct database access from MCP tool definitions.

**Tech Stack:** Next.js route handlers, TypeScript, Zod, `mcp-handler` 2.x, `@modelcontextprotocol/server` 2.x, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-mcp-coverage-design.md`

## Global Constraints

- MCP is DM-only; ordinary player access is out of scope.
- Existing token permissions must not silently expand; new world scopes are least-privilege.
- Reuse validated domain behavior and preserve campaign isolation.
- Preserve human review for sensitive writes.
- Resources are read-only, bounded, and authorized per request.
- Do not claim universal client compatibility; record tested clients and versions.

## Review Focus

- Existing tokens without world scopes: must not acquire world tools implicitly. Test tools/list against old grants.
- Demo campaign tokens: retain read-only restrictions. Test each newly introduced write scope is removed.
- Cross-campaign map or marker IDs: return the existing not-found/forbidden behavior without leaking data. Test mismatched campaign IDs.
- Public and private notes: preserve current DM endpoint semantics and author restrictions. Test that MCP does not widen note visibility or editing rights.
- Oversized resource contents and malformed MCP arguments: return bounded/protocol errors without unhandled exceptions. Test size limits and schema failures.

---

### Task 1: Add world scopes and token UI labels

**Files:**
- Modify: `lib/constants/ai.ts`
- Modify: `messages/en/ai.json`, `messages/uk/ai.json` (and matching locale files if token scope labels require them)
- Test: `lib/i18n/__tests__/label-keys-ai.test.ts`
- Test: API-token and MCP scope tests under `app/api/__tests__` and `lib/ai/tools/__tests__`

**Interfaces:**
- Produces `world:read` and `world:write` as `ApiTokenScope` values; `world:write` implies read through existing `hasScope` semantics.

- [ ] Add scope-label assertions and tests that pre-existing grants do not gain world tools.
- [ ] Verify demo token verification strips `world:write` and retains `world:read`.
- [ ] Add the two scopes to `API_TOKEN_SCOPES`; add localized labels and UI coverage.
- [ ] Run the focused scope, token, and i18n tests.

### Task 2: Expose world-map tools for DM callers

**Files:**
- Create: `lib/ai/tools/world.ts`
- Modify: `lib/ai/tools/index.ts`
- Create: `lib/server/assistant/actions/world.ts`
- Modify: world handler/domain modules as required to extract caller-independent operations
- Modify: `lib/ai/tools/__tests__/registry.test.ts`
- Create: `lib/ai/tools/__tests__/world.test.ts`
- Reuse: `lib/schemas/world.ts`, world store modules, and current assistant action/authorization/execute framework

**Interfaces:**
- Tool definitions follow `AiToolDef` from `lib/ai/tools/define.ts` and use the common `AiToolContext`.
- Read tools require `world:read`; write tools require `world:write` and dispatch a canonical assistant action.

- [ ] Add tests for map listing/details and DM view, including existing public/private note semantics and campaign scoping.
- [ ] Add tests for marker/map mutation and travel input validation; assert unauthorized scopes cannot invoke writes and writes remain pending until confirmation under review mode.
- [ ] Extract shared world domain operations from session-bound HTTP handlers where required, preserving validation, events, file cleanup, and transaction behavior.
- [ ] Add canonical world assistant actions in `lib/server/assistant/actions/world.ts`; require `world:write` and let the existing dispatcher enforce review/auto behavior and human confirmation.
- [ ] Implement focused MCP tools for map list/detail/view, map and marker mutation, DM notes, travel/enter/exit/rest, and travel log. Reads use shared read operations; writes dispatch canonical assistant actions and return pending/review results when required.
- [ ] Register tools and verify `toolsFor` exposes each tool only for the required scope.
- [ ] Run focused world-tool and MCP registry tests.

### Task 3: Register MCP Resources and Prompts

**Files:**
- Create: `lib/ai/mcp-capabilities.ts`
- Modify: `app/api/mcp/route.ts`
- Create: `app/api/__tests__/mcp-capabilities.test.ts`
- Inspect before implementation: installed `mcp-handler` and MCP server type declarations/API for resource and prompt registration.

**Interfaces:**
- `registerMcpCapabilities(server, context)` registers capabilities on the same per-request server instance as tools.
- Resource reads use the campaign and verified DM identity from `buildToolContext`; all payloads have explicit size/pagination limits.
- Prompts are static workflow templates and fetch no campaign data at registration time.

- [ ] Add protocol tests for resources/list, resources/read, prompts/list, prompts/get, unauthorized/missing-resource behavior, and output limits using the supported SDK test client.
- [ ] Implement a small set of read-only campaign resources (campaign brief, scenario index, DM world-map index) and DM workflow prompts (prepare session, summarize travel, prepare scene). Define scopes for each resource; prompts contain no campaign data and are listed only for authorized DM tokens.
- [ ] Register capabilities in the MCP route and verify tools-only tokens continue to initialize and list tools correctly.
- [ ] Run MCP route and capability tests.

### Task 4: Add compatibility notes and final verification

**Files:**
- Create or modify: `docs/MCP.md` (or the repository's existing MCP documentation entrypoint, after checking docs index)
- Create: a reproducible protocol compatibility script under `scripts/` only if the repository has an established script convention; otherwise add a documented SDK integration check.
- Test: existing `app/api/__tests__/assistant-mcp.test.ts`, `app/api/__tests__/api-tokens-mcp.test.ts`, and relevant tool tests

- [ ] Document endpoint setup, DM-only token requirement, scope meanings, tool/resource/prompt catalogs, and client limitations.
- [ ] Exercise initialize, list and invocation for tools, resources and prompts through the SDK protocol harness and at least one external MCP client; record exact versions and results.
- [ ] Run the relevant existing MCP and world API regression tests.
- [ ] Review the final diff for scope expansion, campaign isolation, hidden data exposure, and unrelated workspace modifications.

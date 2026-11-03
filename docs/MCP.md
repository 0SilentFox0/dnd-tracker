# D&D Tracker MCP

The MCP endpoint is DM-only and uses a campaign-scoped API token. Connect a Streamable HTTP client to `/api/mcp` and send the token as `Authorization: Bearer dndt_…`.

## Token scopes

- `world:read` lists maps, reads map details and the travel log, and exposes the world-map resource.
- `world:write` adds the read capability and exposes the `world_action` tool.
- `campaign:read` exposes the campaign brief resource.
- `scenario:read` exposes the scenario index resource.
- Existing campaign, scenario, character, battle, show, and content tools remain available under their existing scopes.

Demo-campaign tokens remain read-only. Existing tokens receive no new scopes automatically. MCP does not support ordinary player credentials.

## World map tools

- `world_maps_list`: map index for the campaign.
- `world_map_get`: a map, markers (including DM notes), heroes on the map, and public notes. Private player notes remain subject to the existing DM API rules.
- `world_travel_log`: recent travel, entry/exit, and rest records.
- `world_action`: prepares map and marker changes, public DM notes, party travel, entry/exit, and rests. Destructive actions and party movement always require confirmation in the app. Other writes follow the token's review/auto mode.

Map image uploads require the web editor. Use `world_action` with operation `maps.upload-handoff` to open it, then create a map using its campaign-owned image URL.

## Resources and prompts

Resources are registered according to token scopes:

- `dnd://campaign/{campaignId}/brief`
- `dnd://campaign/{campaignId}/scenario-index`
- `dnd://campaign/{campaignId}/world-map-index`

The available prompts are `prepare_session`, `summarize_world_travel`, and `prepare_scene`. They provide workflow instructions and do not contain campaign data; the client retrieves context through authorized resources and tools.

Resource payloads are bounded. Use the corresponding tools for complete or detailed data.

## Client compatibility

The endpoint uses the `mcp-handler` 2.x and `@modelcontextprotocol/server` 2.x Streamable HTTP stack pinned by `pnpm-lock.yaml`. This repository change has been type-checked, but interoperability has not yet been exercised against separate external MCP clients. Client setup and version-specific behavior should be reported only after those clients are checked.

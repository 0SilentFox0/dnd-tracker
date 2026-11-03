# Expanded demo campaign design

## Intent

Make the shared demo useful for exploring the full campaign experience: show every applicable DM screen and library, let visitors inspect characters and NPCs, run the regular battle interface, and use the four supplied maps. Demo data remains protected from edits and deletion.

## Goals

- Expose the complete set of demo campaign dashboard screens, including all campaign libraries.
- Provide read-only browsing for characters and NPCs, plus other demo campaign content.
- Keep demo campaign content immutable through normal UI actions (no edit, create, or delete controls).
- Open demo encounters in the standard battle screen and preparation view. Demo battle writes remain disabled to protect the shared seeded encounter.
- Store the supplied global map and three location maps locally and point demo seed data at them.

## Non-goals

- Changing access rules for non-demo campaigns or player campaigns.
- Adding new library types or creating new demo content beyond what is needed to expose existing data.
- Changing production data by running the seed script against a remote database.

## Constraints

- The demo dashboard currently uses a short custom list; the regular DM dashboard already defines the complete campaign screen list.
- Some demo pages already support read-only rendering (for example battles, scenario, graph, and music); others may need `canEdit` support or a read-only presentation.
- Demo battle routing currently substitutes `DemoBattleSandbox` and generated encounter data for the standard battle page.
- Demo campaign seed data currently points at SVGs under `public/example-demo/maps`; the new JPEG assets must be included in the repository and referenced by the seed.
- The requested image URLs are the global map (vttrpgmanager) and three location maps (Pinterest, Reddit, World Anvil), in the order provided.

## Approaches

1. Reuse the regular DM dashboard and thread read-only behavior through existing demo pages; route demo battles through the normal battle client; replace seed map paths. Recommended and selected: it gives the demo the same navigation and interaction model as the application while preserving demo protections.
2. Keep a separate demo-only page collection and add isolated previews for libraries, characters, and standard battle behavior. This limits changes to existing pages but duplicates UI and risks divergence.

## Design

- Build the demo dashboard sections from the existing regular DM screen definitions, applying campaign visibility rules where appropriate. Ensure characters, acquaintances/NPCs, campaign reference, and all library screens are reachable.
- Pass read-only capability through demo routes and page clients. Hide create/edit/delete actions, disable mutation actions, and retain detail viewing. Enforce demo write protection in server actions/API paths where demo routes currently share mutation endpoints.
- On character and NPC detail pages, expose view-only profiles for seeded demo records.
- Remove the demo-only battle sandbox branch so demo battle IDs use the standard `BattlePageClient` flow and show the standard preparation view based on the stored encounter. Preserve the existing server-side rejection of demo battle writes.
- Download the four supplied maps as local JPEG assets in `public/example-demo/maps`, update seed references for the global map and three locations, and retain existing dimensions/marker associations unless image dimensions require adjustment.

## Verification

- Focused tests cover demo dashboard visibility, read-only controls on newly exposed pages, and standard battle routing.
- Run relevant existing tests and static checks for touched code.
- Inspect downloaded images and confirm seed paths resolve locally.

## Open implementation calls

- Audit every screen surfaced by the full demo dashboard and add only the read-only support it lacks.
- Keep map pixel dimensions sourced from the downloaded files where the seed currently uses placeholders.
- Existing seed safety guards remain in force; no remote seed execution is part of this work.

# Demo SRD 5e Content Plan

## Goal

Make the demo campaign use the repository's official 5e SRD 5.2 content and progression while preserving its read-only visitor experience.

## Requirements

- Populate every demo library from the official SRD template instead of leaving the campaign-scoped tables empty.
- Replace the six hand-written demo units with SRD units and update battle references to valid SRD entries.
- Enable the SRD 5e class rules and level progression up to 20 for the campaign.
- Seed the existing demo hero at level 20 using real SRD class/race/background data, including class and subclass progression through level 20.
- Preserve the campaign ID, read-only UI and server-side write protections.
- After code is deployed, run the guarded production seed and confirm campaign-scoped record counts.

## Implementation Sequence

1. Add a repeatable seed step that copies the canonical `5e SRD 5.2` template bundle into the existing demo campaign, updates its source/baseline, rules and max level, and safely replaces prior demo library records.
2. Resolve battle participants to imported SRD unit IDs and keep the encounters valid.
3. Seed the demo hero in class mode with a real class entry, subclass, ability scores, spell slots and progression choices through level 20.
4. Verify TypeScript, scoped lint and a read-only database count check; do not add or run tests unless requested.
5. Deploy from `main`, run the guarded production seed, and verify libraries, units, campaign max level and hero data.

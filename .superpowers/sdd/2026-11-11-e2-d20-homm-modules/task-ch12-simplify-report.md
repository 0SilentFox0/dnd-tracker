# Ч12 simplify

Scope: `git diff main...HEAD` without `.superpowers` (69 non-test source files). One pass by hand, no subagents.

Checked new and moved code: d20 UI (DeathSaveBadge, ParticipantStats, HeroStats, SpellSlotsPanel, defense), morale (MoraleBadge/Label/Panel, result-fx, trigger-rolls, outcome, useMoraleRoll), turn-start-check, ability-modifier, Section.

- Reuse: no new re-implementations. ability-modifier is a move from power.ts, no other ability-label map in lib/systems/components.
- Simplification: no dead code or copy-paste. The d20Defense and ParticipantStats AC logic overlap slightly, but they serve different shapes (string vs section), so they were left alone.
- Efficiency: no redundant work or sequential I/O introduced.
- Comments: only single-line "why" comments, no redundant ones.

Changes: none. No commits, no gates run (nothing to verify).

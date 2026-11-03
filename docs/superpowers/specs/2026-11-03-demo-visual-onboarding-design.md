# Demo campaign visual onboarding design

## Intent

Help visitors discover the demo campaign with seven short, user-started visual tours: dashboard, scenario, slides, global map, music, libraries, and battle.

## Goals

- Show a compact menu on the demo campaign dashboard with all seven tours and their completion state.
- Start a selected tour from that menu; allow completed tours to be replayed.
- Highlight useful controls and explain their purpose, with navigation between pages when a flow needs it.
- Provide all tour titles, descriptions, and controls in Ukrainian and English using the active app locale.
- Save completion per signed-in user so progress survives reloads and revisits.
- Keep all onboarding UI and behavior exclusive to demo campaigns.

## Non-goals

- Automatically starting a tour or blocking normal navigation.
- Changing access or editing behavior for campaigns outside the demo.
- Marking a tour complete when it is skipped or dismissed early.

## Approaches

1. React Joyride in a demo-only campaign layout, with a shared coordinator for route changes and seven separate step sequences. Recommended and selected: supports guided, multi-page tours and centralized progress.
2. Driver.js per page. Lighter for isolated pages but awkward for flows that navigate between routes.
3. Hand-built spotlight UI. Avoids a dependency but duplicates tour navigation, accessibility, and focus behavior.

## Design

- Add a compact “Demo tour” menu to the demo dashboard. It lists the seven flows, marks completed ones, and starts/restarts a selected flow on click.
- Mount a client tour coordinator only when the server confirms `isDemo`. Keep it in the campaign layout so it can continue across client-side route changes.
- Define tour steps with stable `data-tour` targets and localized Ukrainian/English titles, descriptions, and controls. Include accessible next, back, skip, and close controls.
- Record a completion flag only when the final step completes. Reuse the existing per-user onboarding flag storage with a dedicated `demo-tour:` key namespace; do not add a database table.
- Reuse existing dashboard and onboarding localization conventions. Tours should explain available client functionality without implying that demo data can be edited.

## Implementation calls

- Use seven distinct tours, started individually from the dashboard menu.
- Completion is per user and persists across sessions; skipped tours remain incomplete and can be resumed from the beginning.
- Choose stable page elements for each step during implementation; if an element is not present, omit that step instead of leaving the tour stuck.

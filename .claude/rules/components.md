---
paths:
  - "components/**"
  - "app/**/*.tsx"
---

# Component API conventions

- Aim for ≤ ~7 props. Pass domain objects (`participant`, `character`, `form`) instead of exploding their fields into separate props.
- Group related callbacks into one object prop (`actions={{ onRename, onDelete }}`) rather than many `onX` props.
- Deep trees (battle scene, character view, skill tree) use a context provider instead of drilling `battle`/`handlers`/`mutations` bags through 3+ levels.
- Shared UI goes in `components/common` or `components/ui`; check there before writing a new card, dialog, avatar or empty state.
- Search on list pages: `useSearch(items, fieldsOf)` (`@/lib/hooks/common`, built on `matchesQuery` from `lib/utils/common/text-search`) + `SearchInput` / `SearchEmptyState` (`components/common`); don't write per-page filtering.
- Dialogs: `ResponsiveDialog` (`components/ui/responsive-dialog`) — modal on desktop, `vaul` bottom sheet on phones. Never Radix `Dialog`/`AlertDialog` or `vaul` directly (ESLint enforces outside `components/ui`). Buttons go in its `footer`; a footer submit button needs `form="<form id>"`.
- Confirmations and notices: `useConfirm()` / `useNotify()` from `@/lib/hooks/common`, never `window.confirm`/`alert` (ESLint enforces). Component tests render them inside `ConfirmProvider` (`components/ui/__tests__/render-with-confirm.tsx`).
- Forms: `HudFormPage` + `HudForm` (tabs via `HudTab`, section headings via `HudSection`) from `components/hud/form`; form dialogs use `ResponsiveDialog hud`. Inside `.hud-surface` the shadcn tokens are HUD-coloured and the HUD text variable is `--hud-muted`. Accordions only in lists, never in forms.
- Pages (lists, dashboards): `HudPage` + `HudPageHeader`, items as `HudCard` / `HudTile`, filters as `HudChipTabs`, panels `HudPanel` (`components/hud/page`); the section art (`body::before`, picked in `app/globals.css` by the `data-screen-bg` marker that a segment `layout.tsx` renders via `screenBackgroundLayout` from `components/layout/screen-background.tsx`; no marker → tavern) stays visible behind the translucent panels. Print pages (`dm/print/*`) stay light.
- Page states: `components/common/states` (`QueryState`, `EmptyState`, `LoadingState`, `ErrorState`); form buttons: `ActionBar`.

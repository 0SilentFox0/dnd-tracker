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
- Layers: `ui` → `hud` → `common` → domain → `systems/<id>/ui` → `app`; imports go down only (ESLint `ui-layers/zone`, ratchet `ui-layers-exempt.json`, details in `docs/architecture/ui-layers.md`).
- `common` has no domain types or domain components; a widget shared by two domains lives in the folder of the data owner.
- System UI takes from core only `ui`/`hud`/`common`, `components/systems/types` and the kit (`SYSTEM_UI_KIT` in `scripts/shared/ui-layers.mjs`).
- `ActionBar` is `components/ui/action-bar`, `ImageUpload` is `components/common`; dice are `components/dice`.
- Page states: `components/common/states` (`QueryState`, `EmptyState`, `LoadingState`, `ErrorState`); form buttons: `ActionBar`.

## Kit pairs: what to use when

Not duplicates: the first of each pair is the primitive, the second adds label/state wiring on top.

| Need | Use | Not |
|---|---|---|
| Integer field, value live on every keystroke | `NumberInput` | raw `type=number` |
| Number with range, commit on blur/Enter (`onCommit`) | `BoundedNumberInput` | `NumberInput` + manual clamp |
| Slider | `Slider` (`components/ui/slider`) | raw `type=range` |
| Custom-composed dropdown (groups, triggers) | `Select*` primitives | — |
| Plain dropdown from options array | `SelectField` | hand-built `Select` tree |
| Bare toggle inside custom layout | `Switch` | — |
| Labelled toggle row (+ description) | `SwitchField` | `Switch` + `Label` by hand |
| Any modal (desktop modal, phone sheet) | `ResponsiveDialog` | `Dialog` / `vaul` directly |
| Yes/no confirmation | `useConfirm()` (renders `ConfirmDialog`) | `window.confirm`, `ConfirmDialog` by hand |
| Map/HUD toggle chip, toolbar | `HudToggleChip`, `HudToolbar` (`components/hud`) | per-file gold-chip classes |

`dialog.tsx` is the Radix wrapper used only inside `components/ui` (`ResponsiveDialog`, `ConfirmDialog` build on it).

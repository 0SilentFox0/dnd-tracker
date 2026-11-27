# UI polish — reuse inventory (2026-11-27, branch feat/ux-ui-polish)

Counts: grep over `app components systems` (.ts/.tsx, tests included).

## 1. Colour tokens
- `app/palettes.css`: `--hud-faint` tavern `#6b6156` (L47) / parchment `#a29482` (L62); `--hud-muted` `#9b9080`/`#64584b`; `--hud-accent-2` `#8f7a3f` (L49)/`#5a420a` (L66); `--hud-hp`/`-hp-2` `#c8382f`/`#8a211c` (L51), parchment `#b0332a`/`#84231d` (L64); `--hud-danger` `#d0705c` (L55)/`#a04030` (L70); crimson set `#b3312c,#7c1e1d,#e66a58,#fbefe9` / `#a12b28,#761d1b,#a12b28,#fff4ef`. shadcn aliases in `html[data-palette]` L1-37 (`--muted-foreground` = `--hud-muted`).
- Tailwind = CSS only: `@theme static` in `app/globals.css` L8-46 (`--color-hud-*` = `var(--hud-x, tavern fallback)`; faint L14, accent-2 L25, hp L31, muted L10; `--color-hud-soft` L39 color-mix). `@theme inline` L48-89 maps shadcn names.
- `faint` as text: only `components/profile/ProfileHeroes.tsx:70`; chevrons in `ui/disclosure.tsx:71`, `ui/accordion.tsx:45`. Not in contrast test.
- `text-hud-muted` 722 vs `text-muted-foreground` 194 — same colour, two utilities.
- `hud-accent-2` only border/fill: `ui/button.tsx:16`, `battle/wizards/attack/shared.ts:8`.
- Disabled = opacity only, inconsistent: `ui/button.tsx:11` opacity-50 + pointer-events-none; `ui/field-class.ts:2` opacity-35; `ui/input.tsx:16`, `ui/select.tsx:45`, `ui/textarea.tsx:11` cursor only; `HudToggleChip:25` 50; `OptionButton:16/20` 40/50; `ui/tabs.tsx:33` 50; `HeaderPillLink:37` 70; `globals.css:241-242` checkbox/radio. HudButton none. Distribution disabled:opacity 50×33, 40×16, 30×5, 70×3, 35, 60, 100×2.

## 2. Fonts
- `app/fonts.css` @font-face (public/fonts/*.woff2, swap), imported `app/layout.tsx:6`; preload `components/hud/fonts.ts` HUD_PRELOAD_FONTS (CormorantSC-Bold-cyrillic, Alegreya-Variable, AlegreyaSC-Bold) at `layout.tsx:41-50`.
- Families: Geist (variable, `.font-geist`), Alegreya SC 500/700/800, Alegreya Sans 400/500/700+italic, EB Garamond var+italic, Alegreya var+italic, Cormorant SC 700, Oswald 500. No mono face (`font-mono` ×12 → system).
- `.font-hud` (fonts.css:29-37): `--font-hud-sc`/`--font-title` Cormorant SC, `--font-hud-sans`/`--font-body` Alegreya, `--font-hud-book` EB Garamond, `--font-num` Oswald. `.font-scenario` (39-42): serif Alegreya, sans Alegreya Sans.
- Utilities `components/hud/hud.css:12-20`: `.hud-sc` (~365), `.hud-num` 34, `.hud-title` 11, `.hud-body` 5, `.hud-book`.
- EB Garamond (`hud-book`) in 7 files: spells/book/SpellBookPages, character-profile/story/BiographyText + BiographyEditor:60, campaigns/members/CampaignMembersList:80, battle/overlays/BattlePreparationView, battle/dev/spells/FxSpells, campaigns/dashboard/dashboard.css.
- Alegreya Sans: scenario-book.css ×16; `landing/landing.css:163` remaps `--font-hud-sans`.
- Alegreya SC: `landing.css:163` scope `[data-landing], .auth-legacy` remaps `--font-hud-sc`; `world/world-atlas.css:91`.

## 3. Font sizes
- No type scale; `text-xs` 693, `sm` 911, `base` 87, `lg` 78, `xl` 30, `2xl` 28, `3xl` 13.
- Arbitrary `text-[..]` 246: 9px 4, 10px 29, 11px 37, 12px 5, 13px 64, 15px 48, 17px 21, 16px 1, 20px 2; plus 19/22/26/27/28/30/34/36/40/42/44/46/52/56 and fractional 13.5/12.5/11.5px, 0.75em, 0.65rem.
- Sub-12px ≈72 in 55 files, flat (top: battle/participants/InitiativeTrack 3, characters/artifacts/CharacterArtifactsSection 3; many at 2). Kit: `hud/page/HudStatChip.tsx:34` 10px.
- CSS font-size px: 62, 6 under 12 (dm/print/print.css 2, world-atlas.css 2, scenario-book.css 1, skilltrees editor.css 1).
- Kit hard-codes: 13px HudPill:30, HudSectionTitle:15, HudSheetHeading:25, HUD_CHIP_CLASS; 15px Button base, HudTabs:132,179, HudTile:33; 17px Button default variant.

## 4. Radii
- `globals.css` @theme inline L81-88: xs4 sm6 md8 lg8 xl12 2xl12 3xl16 4xl16; `--radius:8px` L114, `--r:10px` L115 (used as `rounded-[var(--r)]`, e.g. HudFormPage:40).
- Usage: none 19, sm 21, md 125, lg 142, xl 62, 2xl 7, full 120; bare `rounded` (Tailwind 4px) e.g. HeaderPillLink:5.
- Arbitrary `rounded-[..]` 28 in 22 files ([4px] 17 — SheetVitals ×4, d20/ui/StatsTab ×2, tooltip, checkbox; [var(--r)] 2, [inherit] 2, [3px] 2, [2px] 2, [1px], [10px], [1.6rem]).
- Doc says raw rounded-[Npx] forbidden — NOT enforced anywhere.

## 5. Buttons
- `ui/button.tsx` cva: variants default (gold, hud-sc 17px, border accent-2), destructive/outline/secondary share OUTLINE (outline ≡ secondary), ghost, link. Sizes default h-11, sm h-10, lg h-12 (52 at sm+), icon size-10, icon-sm size-10, icon-lg size-11 — no 32/36. Base rounded-lg 15px. `<Button` 753, `size=` only 29.
- `hud/HudButton.tsx`: bare button (ds-interactive), 321 uses, no size/disabled. `HudIconButton` sm size-8 / md size-10, tones muted/danger/gold, 35 uses.
- `campaigns/HeaderPillLink.tsx`: h-8, bare rounded, text-xs, gold; label `hidden sm:inline` (L25), srLabel sr-only; used by WatchShowButton, JoinBattleButton.
- Hand overrides: Button min-h-11 ×41, min-h-10 ×14, min-h-9 5, size-8 8, h-9 6…; HudButton h-8 14, h-11 14, min-h-11 11, h-10 10…; `h-[52px]` ×7; arbitrary h-[Npx] 41. Pattern `min-h-11 sm:min-h-9` per page.

## 6. Chips / badges / tabs
- `ui/badge.tsx` rounded-full text-xs, shadcn tones, dead `dark:` (47 uses).
- `hud/page/HudPill.tsx` tones gold/silver/bone/accent/muted/fact, rounded-full 13px leading-5 (~20px), 56 uses. gold = `.metal-gold` gradient (hud.css:24).
- `HudStatChip` rounded-lg 10px label (12). `HudChipTabs` HUD_CHIP_CLASS h-8 rounded-lg 13px, lg h-11 (34). `HudToggleChip` h-7/h-8 (25). `HudSegmented` (10). `hud/form/HudTabs` rail h-10 rounded-md, scroll hud-sc h-10 15px (11). `ui/tabs` Radix h-9 list rounded-lg / trigger rounded-md.
- Role: `CampaignMembersList.tsx:101` HudPill gold=DM / bone; `ProfileCampaigns.tsx:53-57` plain accent text; `DmCharacterCard` silver=NPC / gold=player (gold means different things). `NewPill` = HudPill gold.

## 7. Skeletons / empty / 404
- Only `common/states/LoadingState.tsx` (N rows h-14 animate-pulse rounded-lg bg-muted; overrides hud.css:98); `SectionLoading` rows=6. 8 ad-hoc animate-pulse elsewhere. 6 loading.tsx (campaigns, character, character/edit, dm, dm/battles, battles/[battleId]).
- `common/states/`: EmptyState (icon/title/description/action, dashed border, text-muted-foreground), SearchEmptyState, ErrorState, FormAlert, QueryState.
- `app/not-found.tsx` only (HudPage md + HudPanel + EmptyState, no icon). No `book-*` assets in public/ (public: bg/, brand/, icons/, landing/, fx, sfx, assets/battle-tiles).

## 8. Page container / background
- Kit `hud/page`: `HudPage({width:'md'|'lg'})` max-w-4xl / max-w-page (72rem → min(90vw,160rem) at 96rem), px-4 py-4; `HudPageHeader({title,subtitle,actions,children})`; HudPanel, HudCard, HudTile, HudPill, HudStatChip, HudChipTabs, HudSectionTitle, HudSheetHeading, pathHeader. No side-panel in kit. HudPage 41 files, HudFormPage 28, HudPageHeader 32 (91 page.tsx).
- `hud/form/HudFormPage({header, width: narrow|wide, actions, side, sidePreview})`, wide max-w-[1680px].
- `/dm/rules`: page → RulesForm → `components/rules/RulesBook.tsx` (272 l.) = HudFormPage wide + rail HudForm + `side=<RulesSide>` + sticky actions. Changes shown 3×: RulesSide.tsx:19-47 list with per-row reset, tab dots (RulesBook:89-95), count in actions (198-204). Header chip of system+modules.
- `/info`: `app/campaigns/[id]/info/page.tsx` HudPage + HudPageHeader → InfoReferenceClient (219 l.) → `campaigns/info/layout/ReferenceLayout.tsx` grid lg [1fr_400px], xl [220px_1fr_440px], sticky rail + sticky aside; mobile ResponsiveDialog.
- Rail/list/aside implemented twice with different widths (rail 208/200 vs 220, aside 320–400 vs 400–440).
- Background: grain `body::before` globals.css:273-282 (`--grain-op` .32/.5); map `html[data-palette="tavern"] body::after` 283-300 (vey-strait 2k/4k, 72% black) — tavern only. `layout/screen-background.tsx` per-route DM backgrounds. Auth: `isPalettePath` (lib/theme/palettes.ts:61-70) excludes /, sign-in/up, forgot/reset, /dm/print → no data-palette → no map; `AuthCard` `.auth-legacy` pins page #0b0908 + Alegreya SC. Landing hides pseudo-elements (landing.css:2-3). Scenario: `.scenario-book` opaque `background: var(--page)` (scenario-book.css:5,17) covers map; own palette block; not in screen-background DM_SECTIONS.

## 9. HP / portrait / header pill
- Sheet HP bar `character-profile/sheet/SheetVitals.tsx:119-133`, colours `app/motion.css:10-14` `--sheet-hp: var(--hud-danger)` (+ghost/track/temp mixes) → `#d0705c`. Dashboard `HeroHp.tsx:37` uses `--hud-hp`→`--hud-hp-2`. Two HP reds.
- `/dm/characters` card `characters/list/DmCharacterCard.tsx`; no avatar → `HeroPortrait.tsx:34-47` initials text-5xl in aspect-square rounded-2xl. Class has `icon`/`color` (core.prisma:749, types/classes.ts:33); `CharacterListItem` (types/characters.ts:177-201) has class name + `classes?`; lookup via `useClassMode(campaignId).byId` already used by DmCharacterCard.
- HeaderPillLink label hidden < sm (L25-26).

## 10. Landing motion
- No per-word reveal; `.ld-ink` (landing-motion.css:37-43) mask-image sweep with `animation-timeline: view()` on 4 headings (FinalCta:24, AiSection:29, Problem:35, parts:80). All ld-* inside `prefers-reduced-motion: no-preference` + `@supports (animation-timeline: view())`. App fallback app/motion.css:90-96.

## 11. Ratchets
- ratchets/: cyrillic-comments-exempt {file:count}, grid-square-only, i18n-exempt, import-cycles-baseline, props-budget-exempt {"file#Comp":count}, raw-controls-exempt, system-*-exempt, ui-layers-exempt.
- Templates: `scripts/shared/hud-gold.ts` + `lib/__tests__/hud-gold.test.ts` (scan + it.each counter cases, patterns concatenated); `scripts/shared/props-budget.ts --write` + `lib/__tests__/props-budget.test.ts` (no growth + exact entries); `eslint/raw-controls.mjs` + `scripts/shared/raw-controls-baseline.mjs` + test.
- `lib/theme/__tests__/palette-contrast.test.ts` parses hex in palettes.css; covers ink/text/muted, accent-fg, crimson-fg, accent-ink, checkbox tick, crimson-ink, muted≥3; NOT faint, accent-2, hp, danger, info/good/bad, disabled; hex only.

## Reuse vs merge
- Extend: palettes.css + @theme (disabled token, `--fs-*`/`--text-*` scale beside `--radius-*`), palette-contrast test; Button cva size ladder (+ fold HudToggleChip/HeaderPillLink); LoadingState (shimmer, shaped variants); EmptyState + not-found (illustration slot, new asset); HudPill for all role/status badges.
- Merge: text-muted-foreground → text-hud-muted (or alias); chip/tab families onto one height/radius; Badge → HudPill; one role-badge mapping; `--sheet-hp*` derive from `--hud-hp`; radii md≡lg, xl≡2xl, `--r` 10, `[4px]`→`--radius-xs`; one disabled opacity; outline≡secondary; HeaderPillLink + `min-h-11 sm:min-h-9` overrides → Button sizes; one page shell with `side` slot for /info + /dm/rules (ReferenceLayout vs HudFormPage side); fonts (Alegreya SC remap on landing/auth, EB Garamond 7 files, Alegreya Sans scenario+landing, no mono face); background special cases (tavern-only map, auth exclusion, scenario opaque).

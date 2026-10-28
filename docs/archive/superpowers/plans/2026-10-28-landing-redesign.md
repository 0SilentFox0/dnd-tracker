# Landing redesign v2 — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild the public landing as a bilingual (EN `/`, UK `/uk`), DM-first, conversion-focused page that leads with custom mechanics + automated tactical combat, with a replaceable brand.

**Architecture:** Keep the static `components/landing/*` + HUD styling. Split copy from markup: pure-string `LandingCopy` dictionaries (`copy/en.ts`, `copy/uk.ts`) typed by one interface; non-localized media/icon maps live beside components. Server components take a `copy: LandingCopy` prop (no context; `/` stays static, no cookies). Two route files render the same `<LandingPage copy>`.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind + `hud.css`, lucide-react, vitest (node env, `renderToStaticMarkup` for render tests).

**Spec:** `docs/superpowers/specs/2026-10-28-landing-redesign-design.md`

Worktree: `/Users/silentfox/Work/dnd-tracker-landing`, branch `feat/landing-v2`. **Never touch `/Users/silentfox/Work/dnd-tracker`** (another session has uncommitted work there). Run commands with `cd` into the worktree.

## Global Constraints

- `/` and `/uk` must build as static (`○` in `pnpm build` output); root `app/layout.tsx` must not read cookies; no new dependencies.
- No pricing, "free", trial, user counts, testimonials; `offers` removed from JSON-LD. No claims from the spec's "Правдивість" list (memory of all events, flawless import, video, all RPG systems, Obojima).
- No hardcoded product name in `components/landing/**` or `app/page.tsx`/`app/uk/page.tsx`: only `BRAND`. "D&D 5e" appears only as compatibility wording; footer keeps the Wizards of the Coast disclaimer.
- Code comments minimal (user rule). Import order via `pnpm lint --fix`; blank-line padding rule applies.
- Component rules: ≤ ~7 props, pass domain objects; never import `@/lib/api/*`.
- Images: WebP ≤ ~100 KB, `next/image`, meaningful `alt` from copy; below-fold sections keep `.ld-lazy`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. `/uk` and `/` render with correct `lang` on the wrapper and not the other language's strings (test: no Cyrillic in EN markup except brand-neutral tokens; no Latin sentences leakage check on key fields).
2. A logged-in visitor (session cookie) sees "My campaigns" instead of sign-up CTAs in both languages (SessionSwitch labels come from copy).
3. Missing copy key in one language must fail tsc/test, not render `undefined`.
4. Mobile 360px: no horizontal overflow, CTA visible above the fold.
5. `SITE_INDEXING` off: both URLs keep `noindex`/robots disallow; on: both in sitemap with hreflang.

---

## File structure

| File | Responsibility |
|---|---|
| `lib/constants/site.ts` (modify) | add `BRAND = { name, short, mark }`, `LANDING_LOCALES` |
| `components/landing/copy/types.ts` (new) | `Locale`, `LandingCopy` and sub-interfaces |
| `components/landing/copy/en.ts`, `uk.ts` (new) | dictionaries |
| `components/landing/copy/index.ts` (new) | `getCopy(locale): LandingCopy` |
| `components/landing/flags.ts` (new) | `LANDING_TEMPLATES = false` |
| `components/landing/media.ts` (new) | non-localized `SHOWCASE_MEDIA`, icon maps |
| `components/landing/content.ts` (delete at end) | replaced by copy + media |
| `components/landing/LandingPage.tsx` (rewrite, split) | composition + nav/footer; sections in own files |
| `components/landing/sections/*.tsx` (new) | `Hero`, `Problem`, `Combat`, `Mechanics`, `Prep`, `AiSection`, `Players`, `HowItWorks`, `Faq`, `FinalCta` |
| `components/landing/SessionDemo.tsx`, `AiMock.tsx` (modify) | take `copy` slice props instead of literals |
| `app/page.tsx` (rewrite), `app/uk/page.tsx` (new), `components/landing/landing-metadata.ts` (new) | metadata + JSON-LD builder shared by both |
| `app/sitemap.ts` (modify) | add `/uk` with alternates |
| `public/landing/*.webp` (replace/add) | screenshots |
| `components/landing/__tests__/*.test.ts(x)` (new) | copy parity, render, metadata |

## Truth table (claims → evidence; executor re-verifies each before copy is final)

| Claim | Evidence |
|---|---|
| Initiative/turns, actions, spells, zones, cover/ranged, morale, crit choice by DM, reserve/victory, delta-synced real-time (Pusher + polling fallback) | `docs/architecture/battle.md`; `lib/onboarding/whats-new.ts` |
| Encounter balance (fair scaling; XP budget 2014/2024) | `docs/architecture/balance.md` |
| 3D dice, spell/action FX | whats-new + `components/battle` (confirm dice component exists) |
| Custom mechanics: races, classes, units, abilities/formulas/triggers, spells, artifacts, rule toggles; CSV/TSV/JSON import with row validation; OpenAPI + MCP | `docs/architecture/{abilities,content-api}.md` |
| Scenario manuscript, slide/battle bindings, "played" marks, versions; show + music sync; puzzle; world map (fog, markers, travel, notes) | `show.md`, `world-map.md`, whats-new |
| AI: BYOK Claude/OpenAI/Gemini, scenario/scene context, proposals reviewed before apply, live chat, image gen for show (with user key), MCP | `docs/architecture/ai.md` |
| Players: phone, own hero/turn, show, spell reference, hero drafts | `characters.md`, whats-new |
| Templates (HOMM5/5e SRD/empty) available | **NOT on prod yet** → behind `LANDING_TEMPLATES=false` |

---

### Task 1: Brand constant, copy types, locale plumbing

**Files:** modify `lib/constants/site.ts`; create `components/landing/copy/{types,index}.ts`, `components/landing/flags.ts`; test `components/landing/__tests__/copy.test.ts`.

**Interfaces — Produces:**
```ts
// lib/constants/site.ts
export const BRAND = { name: "Dice & Banner", short: "D&B", mark: "d20" } as const; // working name; one place to rename
export const LANDING_LOCALES = ["en", "uk"] as const;
// copy/types.ts
export type Locale = (typeof LANDING_LOCALES)[number];
export interface Cta { label: string; href: string }
export interface Showcase { id: string; eyebrow: string; title: string; text: string; points: string[]; alt: string; screen: string }
export interface LandingCopy {
  locale: Locale;
  meta: { title: string; description: string; keywords: string[]; ogAlt: string; siteName: string };
  nav: { aria: string; items: Cta[]; signIn: string; signUp: string; myCampaigns: string; switchTo: Cta; switchLabel: string };
  hero: { eyebrow: string; titleLead: string; titleAccent: string; text: string; primary: string; member: string; secondary: Cta; note: string; alt: string };
  problem: { eyebrow: string; title: string; pains: string[]; resolve: string; replaces: { title: string; text: string }[]; hubTag: string };
  combat: { eyebrow: string; title: string; text: string; points: { title: string; text: string }[]; demoSteps: string[]; demo: DemoCopy; fx: { title: string; text: string; names: string[]; auras: string[]; more: string } };
  mechanics: { eyebrow: string; title: string; text: string; capabilities: { id: string; title: string; text: string }[]; templatesNote: string; footnote: string };
  prep: { eyebrow: string; title: string; text: string; panels: Showcase[] };
  ai: Showcase & { honesty: string; mock: AiMockCopy };
  players: { eyebrow: string; title: string; text: string; panels: Showcase[] };
  how: { eyebrow: string; title: string; steps: { title: string; text: string }[] };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  cta: { title: string; text: string };
  footer: { tagline: string; credits: string; disclaimer: string; signIn: string; signUp: string };
}
// DemoCopy / AiMockCopy: string fields for every literal currently in SessionDemo.tsx / AiMock.tsx (read both files, list each literal as a named field)
// copy/index.ts
export function getCopy(locale: Locale): LandingCopy;
// flags.ts
export const LANDING_TEMPLATES = false;
```

- [ ] **Step 1:** Write `copy.test.ts` (fails: module missing): `getCopy("en")` and `getCopy("uk")` return identical key trees (recursive `Object.keys` compare incl. array lengths for `pains`, `faq.items`, `how.steps`, `combat.points`), every leaf string non-empty after trim, no leaf matches `/free|безкоштов|trial|pricing|тариф/i`, no leaf contains `BRAND.name` literal duplicated outside `meta`/`footer` (brand injected by component, not copy), JSON-LD later reuses this.
- [ ] **Step 2:** Run `pnpm test:run components/landing/__tests__/copy.test.ts` → FAIL.
- [ ] **Step 3:** Add `BRAND`, types, `getCopy` (switch on locale, import `en`/`uk` — created as stubs satisfying the type in Task 3; for this task export minimal fully-typed dictionaries copied from current Ukrainian `content.ts` where equivalent and short placeholders-free real text elsewhere is deferred: make `uk.ts` migrate existing strings now, `en.ts` mirrors them in English).

  *Note:* to keep this task green and honest, populate both dictionaries fully in Task 3; in Task 1 only the test's tree-comparison utility and types are committed, with the test `describe.skip`ped until Task 3 un-skips it. Commit message states that.
- [ ] **Step 4:** `pnpm exec tsc --noEmit` clean; commit `feat(landing): brand constant and copy types`.

### Task 2: Screenshots (Sonnet browser subagent)

**Files:** replace/add `public/landing/screen-{battle,hero,scenario,show,world,constructor,player-mobile}.webp`; optional `screen-ai.webp`.

Run via a **Sonnet subagent** (user rule: live browser runs go to Sonnet; use zoomed/scaled screenshots, JS/text checks over screenshots). Steps:

- [ ] **Step 1:** Ensure local DB `prodcopy` is current (`./scripts/db/prodcopy-db.sh` reads prod; confirm with user before running if the DB is not already present), run the app from the **worktree** with `DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm dev` on a free port.
- [ ] **Step 2:** Capture at 1440×900 (desktop) and 390×844 (player-mobile): active battle (2nd round, map + initiative + log), hero sheet, scenario manuscript with bindings, show screen, world map with fog and a marker, constructor view (ability or rules page), player phone battle view. Use 5e-style names (no HOMM5 art, per earlier user choice); crop to app chrome, no personal emails visible (check text for `@`).
- [ ] **Step 3:** Convert with `sharp`/`cwebp` to WebP q≈80, width ≤ 1600 (mobile ≤ 800), each ≤ ~100 KB; write names above. Remove nothing else in `public/landing` yet.
- [ ] **Step 4:** Commit `feat(landing): refresh product screenshots`.

### Task 3: Dictionaries (EN + UK) and media map

**Files:** create `components/landing/copy/{en,uk}.ts`, `components/landing/media.ts`; modify `copy/index.ts`; un-skip tests.

**Interfaces — Produces:**
```ts
// media.ts
export const SHOWCASE_MEDIA: Record<string, { image?: string; mock?: "ai"; ratio?: "16/10" | "9/16" }>;
export const PROBLEM_ICONS: LucideIcon[];      // index-aligned with copy.problem.replaces
export const CAPABILITY_ICONS: Record<string, LucideIcon>; // keyed by copy.mechanics.capabilities[].id
```

Copy decisions (EN shown; UK = faithful translation, not transliteration):
- hero.titleLead/titleAccent: "Your world. Your rules." / "Combat that runs itself."; eyebrow: "The all-in-one platform for Dungeon Masters"; text: "Prepare your campaign, shape your own mechanics and run tactical combat in one connected place — initiative, damage and effects calculated for you, synced to every player's device."; primary: "Start a campaign"; member: "My campaigns"; secondary `{ label: "See how it works", href: "#combat" }`; note: "Works in the browser · players join from their phones".
- problem pains: notes in one app, character sheets in another, initiative in a spreadsheet, map and effects elsewhere, music on a phone, handouts in a gallery; resolve: "One connected environment: prepare once, play without switching."
- combat.points (6): Initiative & turns; Attacks, spells & areas (auto hit/damage/modifiers); Conditions, saves & positioning (cover, ranged, auras); Real-time sync DM↔players, mobile-friendly; Combat log & DM control (crit choice, manual overrides); Encounter balancing assistance. fx: spell/action animations, 3D dice (UK/EN names of the 5 spell FX + auras list from old `content.ts` `SPELL_FX`/`AURAS`, translated).
- mechanics.capabilities ids: `races`, `classes`, `units`, `abilities` (formulas & triggers), `spells`, `artifacts`, `rules` (toggles: morale, crits, initiative, rests), `import` (CSV/TSV/JSON with per-row validation — "review before it is applied"), `api` (OpenAPI + MCP). `templatesNote` rendered only if `LANDING_TEMPLATES`. `footnote`: "Built for D&D-style, turn-based tabletop RPGs. Imported rules are validated row by row; check results before play."
- ai.honesty: "Bring your own Claude, OpenAI or Gemini key. The assistant works from your scenario and scene; every change is a proposal you review before it is applied."
- faq (5): other apps needed?; which systems (D&D-style turn-based; 5e-style rules; not every RPG); custom world?; what do players need?; how does AI work/keys & privacy ("your key stays on the server, never sent to the browser"). No pricing question.
- how.steps (4): Create or import content → Prepare scenario & mechanics → Invite players with a code → Run the session.

- [ ] **Step 1:** Un-skip Task 1 tests; they fail (dictionaries incomplete).
- [ ] **Step 2:** Write `en.ts`, then `uk.ts` (keys identical; `satisfies LandingCopy`). Verify each claim against the Truth table; list proof files in the PR description, not in code.
- [ ] **Step 3:** Run `pnpm test:run components/landing/__tests__/copy.test.ts` → PASS; add a leakage test: EN leaves contain no Cyrillic (`/[Ѐ-ӿ]/`), UK leaves are allowed Latin only for product terms (`D&D`, `5e`, `AI`, `MCP`, `API`, `OpenAPI`, `CSV`, `JSON`, `Claude`, `OpenAI`, `Gemini`, `XP`, `SRD`).
- [ ] **Step 4:** Commit `feat(landing): EN and UK copy`.

### Task 4: Components — shell, hero, problem, combat

**Files:** create `components/landing/sections/{Hero,Problem,Combat}.tsx`; rewrite `LandingPage.tsx` (nav, footer, composition); modify `SessionDemo.tsx`, `LandingHero.tsx` (delete), `LandingSections.tsx` (delete after migration), `landing.css` (only if new utility needed; add `@media (prefers-reduced-motion: reduce)` disabling `ld-*` animations if absent — check first with grep).

**Interfaces:**
- Consumes: `LandingCopy`, `BRAND`, `SHOWCASE_MEDIA`.
- Produces: `export function LandingPage({ copy }: { copy: LandingCopy })`; each section `({ copy }: { copy: LandingCopy["combat"] })` etc.; `Brand()` uses `BRAND.mark` + `BRAND.name`; nav has language link `copy.nav.switchTo` and `aria-label`; wrapper `<div data-landing lang={copy.locale} …>`.

- [ ] **Step 1:** Render test `landing-render.test.tsx`: `renderToStaticMarkup(<LandingPage copy={getCopy("en")} />)` → exactly one `<h1>`, contains `lang="en"`, contains hero primary label, contains `href="/uk"`; same for `uk` with `href="/"` and `lang="uk"`; markup does not contain `BRAND.name` hardcoded duplicates beyond brand/footers (assert count ≥1). Fails first.
- [ ] **Step 2:** Implement. Hero: real `screen-battle.webp` in a framed window (reuse `ShowcaseMedia` frame, extract to `components/landing/MediaFrame.tsx` — default fixed `width/height` or `aspect-[16/10]` to avoid CLS; `priority` on hero image) with `SessionDemo` kept in Combat section (localized via `copy.combat.demo`). Combat: layout = demo window + 6-point grid + FX strip (reuse sprites). Footer: credits/disclaimer from copy.
- [ ] **Step 3:** Run render test → PASS; `pnpm exec tsc --noEmit`; `pnpm lint --fix` on touched files.
- [ ] **Step 4:** Commit `feat(landing): shell, hero, problem and combat sections`.

### Task 5: Components — mechanics, prep, AI, players, how, FAQ, final CTA

**Files:** create `components/landing/sections/{Mechanics,Prep,AiSection,Players,HowItWorks,Faq,FinalCta}.tsx`; modify `AiMock.tsx` (props `copy: AiMockCopy`).

Layout variety (brief forbids identical cards): Mechanics = capability grid with icons + framed `screen-constructor.webp` beside intro, templates block gated by `LANDING_TEMPLATES`; Prep = three-panel triptych (scenario / library+import / world map) using `copy.prep.panels`; AI = media+text row with `AiMock` (or `screen-ai.webp` if captured) plus `honesty` callout; Players = phone frame (`screen-player-mobile.webp`, ratio 9/16) + show screenshot; How = numbered steps; FAQ = `<details>` as before; FinalCta = `PrimaryCta` + secondary link, no pricing text.

- [ ] **Step 1:** Extend render test: each section id (`combat`, `mechanics`, `prep`, `ai`, `players`, `how`, `faq`) present exactly once; with `LANDING_TEMPLATES=false` the string `copy.mechanics.templatesNote` is absent; no `/free|безкоштов/i` in whole markup. Fails first.
- [ ] **Step 2:** Implement; `PrimaryCta` moves to `components/landing/PrimaryCta.tsx` taking `{ label, memberLabel, href }`-free props `{ copy: { primary: string; member: string } }` using `SessionSwitch`.
- [ ] **Step 3:** Tests PASS, tsc, lint. Delete `content.ts` once nothing imports it (`grep -rn "landing/content"`).
- [ ] **Step 4:** Commit `feat(landing): mechanics, prep, AI, players, FAQ sections`.

### Task 6: Routes, metadata, JSON-LD, sitemap

**Files:** `components/landing/landing-metadata.ts` (new), `app/page.tsx` (rewrite), `app/uk/page.tsx` (new), `app/sitemap.ts`; test `__tests__/landing-metadata.test.ts`.

**Interfaces — Produces:**
```ts
export function buildLandingMetadata(copy: LandingCopy): Metadata;   // title.absolute, description, keywords, alternates { canonical, languages: { en: "/", uk: "/uk", "x-default": "/" } }, openGraph { locale: en_US | uk_UA, alternateLocale, siteName: BRAND.name, images: hero screenshot }, twitter
export function buildLandingJsonLd(copy: LandingCopy): object;       // WebApplication (no offers) + FAQPage from copy.faq.items, inLanguage
```
Both pages: `export const metadata = buildLandingMetadata(getCopy(locale))`, render `<script type="application/ld+json">` (keep `.replace(/</g, "\\u003c")`) + `<LandingPage copy>`. OG image: `/landing/screen-battle.webp` with `copy.meta.ogAlt` (current `hero-dice.webp` is retired if unused).

- [ ] **Step 1:** Tests: JSON-LD has no `offers` key; FAQPage questions equal `copy.faq.items`; canonical `/` vs `/uk`; hreflang includes `x-default`; `siteName` equals `BRAND.name`.
- [ ] **Step 2:** Implement; sitemap gets `{ url: SITE_URL + "/uk", alternates: { languages: { en: SITE_URL, uk: SITE_URL + "/uk" } } }`.
- [ ] **Step 3:** `pnpm test:run components/landing`, tsc, lint, **`pnpm build`** → confirm `○ /` and `○ /uk`.
- [ ] **Step 4:** Commit `feat(landing): bilingual routes, metadata and sitemap`.

### Task 7: Verification, cleanup, docs

- [ ] **Step 1 (Sonnet browser subagent):** run `pnpm build && pnpm start` from the worktree; check `/` and `/uk` at 1440/768/390: CTA visible above fold, anchors scroll, language link works, signed-in vs guest CTA (set/clear the `sb-…-auth-token` cookie via JS), no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`), images load, console clean. Lighthouse (mobile + desktop) via `npx lighthouse`; target mobile perf ≥ 90, a11y/BP/SEO 100 (SEO may read lower with noindex — note it).
- [ ] **Step 2:** Fix findings; delete unused `public/landing/{hero-dice,constructor,candle}.webp` only if `grep -rn` shows no references.
- [ ] **Step 3:** Update `docs/architecture/landing-auth.md` (structure, copy dictionaries, `BRAND`, `/uk`, `LANDING_TEMPLATES`, lang-on-wrapper caveat: root `<html lang="uk">` stays) and `docs/STATUS.md` row for `feat/landing-v2`; amend spec "Метадані" line about `<html lang>` (decision: wrapper `lang`).
- [ ] **Step 4:** `/simplify` on branch diff (1–2 agents), full `pnpm test:run` once, then commit `docs(landing): architecture and status` and hand off for Opus final review (user rule: one final review, no per-task reviews).

# Layering api → hooks → components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No client component or page imports `@/lib/api/*`; requests, loading, mutations and non-trivial logic live in `lib/hooks/<domain>` (pure parts in `lib/utils/<domain>`); every confirmation is `useConfirm`; components that fetched data render through `QueryState`; ESLint enforces it.

**Architecture:** One task per domain (artifacts, spells, units, campaigns, characters, skills/abilities/races, battles), then the confirm-dialog sweep, then the guard + docs + verification. Each domain task adds hooks to the domain barrel, moves pure logic into `lib/utils/<domain>` with unit tests, and rewrites the components to "call hook, render". Server-rendered lists (artifacts, artifact sets, battles list) stay RSC; their mutation hooks call `router.refresh()`.

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query 5, Vitest + happy-dom + Testing Library, ESLint flat config.

**Spec:** `docs/superpowers/specs/2026-10-05-layering-hooks-design.md`

## Global Constraints

- Components/pages (`app/**` except `app/api/**`, `components/**`) never import `@/lib/api/*`; types they need come from `types/<domain>.ts` (re-exported by `lib/api` for compatibility).
- Hooks live only in `lib/hooks/<domain>/` and are exported from the domain `index.ts`; consumers import from the folder (`@/lib/hooks/artifacts`), never deep paths.
- Query keys reuse the existing ones so caches are shared: `["spells", campaignId]`, `["spellGroups", campaignId]`, `["units", campaignId]`, `["unitGroups", campaignId]`, `["characters", campaignId, …]`, `["artifacts", campaignId]`, `["artifact-sets", campaignId]`, `["skill-trees", campaignId]`, `["skill", campaignId, skillId]`, `["active-battles"]`, `["character-damage-preview", campaignId, characterId, …]`.
- Server-rendered lists (artifacts, artifact sets, battles) stay RSC; their mutation hooks call `router.refresh()` on success.
- No public UI behavior changes (copy, routes, what's shown) except: confirmations look like `useConfirm`, loading/error states look like `components/common/states`.
- Components ≤ ~7 props; pass domain objects/hook results instead of exploding fields.
- UI copy Ukrainian, identifiers English, minimal comments (one compact line, only "why"); no `console.log`; remove `console.error` + silent-swallow patterns in touched components (errors go to `useNotify` or inline error state).
- ESLint: `simple-import-sort`, `padding-line-between-statements`, `react-hooks/exhaustive-deps` = error; run `pnpm exec eslint --fix <paths>` after each edit batch.
- Tests needing DOM start with `// @vitest-environment happy-dom` and call `afterEach(cleanup)`; hook tests wrap in a fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })`; confirm flows use `renderWithConfirm` (`components/ui/__tests__/render-with-confirm.tsx`).
- Each task ends with `pnpm exec tsc --noEmit && pnpm test:run` green before commit.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Form seeded from a query must not be clobbered by refetch** — the character editor (player and DM) and unit editor load data via `useQuery`; a background refetch (window focus, invalidation after level-up) must not overwrite what the user is typing. Seed once per entity id (test in Task 6 for `useCharacterEditor`; unit page keeps its sync-key behavior, test in Task 4).
2. **Disabled queries inside `QueryState`** — `isPending` stays `true` for a disabled query, so `QueryState` would spin forever. Only put enabled queries into `QueryState`; queries gated by `enabled` keep plain `data ?? []` (checked in Task 6 `CharacterSpellbook` and Task 8 spell dialog).
3. **Confirm with a failing mutation** — `useConfirm({ onConfirm })` keeps the dialog open and shows the error; the old dialogs closed and fired `notify`. Each replaced site must pass `onConfirm: () => mutation.mutateAsync(...)` (not `mutate`) so errors surface (test in Task 9).
4. **Quick-stat editor revert on bad input / failed save** — empty or non-numeric AC/initiative/dice must reset the field to the saved value; a failed save must also reset (pure planner tests in Task 4).
5. **Join campaign error translation** — server messages "Campaign not found" / "Already a member" / "not active" keep their Ukrainian translations after the move into the hook (test in Task 5).

---

### Task 1: Types out of `lib/api`

**Files:**
- Modify: `types/artifacts.ts` (add `ArtifactListItem`), `types/battle.ts` (add `AddParticipantData`), `types/characters.ts` (add `DamagePreviewItem`, `DamagePreviewResponse`)
- Modify: `lib/api/artifacts.ts`, `lib/api/battles-types.ts`, `lib/api/characters.ts` (import + re-export from `types/`)
- Modify: `components/artifact-sets/ArtifactSetMembersPicker.tsx`, `components/battle/dialogs/AddParticipantDialog.tsx`, `app/campaigns/[id]/battles/[battleId]/BattlePageDialogs/BattlePageDialogs-types.ts` (import from `@/types/...`)

**Interfaces:**
- Produces: `ArtifactListItem` from `@/types/artifacts`; `AddParticipantData` from `@/types/battle`; `DamagePreviewItem`, `DamagePreviewResponse` (melee/ranged with `total`, `breakdown`, `diceFormula`, `hasWeapon`; optional `magic`) from `@/types/characters`.

- [ ] **Step 1: Move `ArtifactListItem`**

Append to `types/artifacts.ts`:

```ts
export interface ArtifactListItem {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  setId?: string | null;
  [key: string]: unknown;
}
```

In `lib/api/artifacts.ts` delete the local interface and add:

```ts
import type { ArtifactListItem } from "@/types/artifacts";

export type { ArtifactListItem };
```

- [ ] **Step 2: Move `AddParticipantData`**

Append to `types/battle.ts`:

```ts
export type AddParticipantData = {
  sourceId: string;
  type: "character" | "unit";
  side: "ally" | "enemy";
  quantity?: number;
};
```

In `lib/api/battles-types.ts` replace the local type with `export type { AddParticipantData } from "@/types/battle";`.

- [ ] **Step 3: Unify `DamagePreviewResponse`**

There are three copies (`lib/api/characters.ts`, `components/characters/stats/CharacterDamagePreview.tsx`, `components/characters/stats/damage-calculator-utils.ts`). Read the calculator copy (`damage-calculator-utils.ts:10-30`) — it is the widest (has `magic`). Put that shape into `types/characters.ts` as `SpellEffectKind` + `DamagePreviewItem` + `DamagePreviewResponse` (the item has `spellEffectKind?`, `targets?`, `targetsTotal?`, `distribution?`); `lib/api/characters.ts` imports it, returns `Promise<DamagePreviewResponse | null>` and re-exports it. The two component copies are removed in Task 6.

- [ ] **Step 4: Point the three type-only importers at `@/types`**

`ArtifactSetMembersPicker.tsx`: `import type { ArtifactListItem } from "@/types/artifacts";`
`AddParticipantDialog.tsx`, `BattlePageDialogs-types.ts`: `import type { AddParticipantData } from "@/types/battle";`

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec eslint --fix types lib/api components/artifact-sets components/battle/dialogs "app/campaigns/[id]/battles" && pnpm exec tsc --noEmit && pnpm test:run`
Expected: clean, all tests pass.

```bash
git add -A types lib/api components app
git commit -m "refactor(types): move shared api types into types/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Artifacts and artifact sets

**Files:**
- Create: `lib/hooks/artifacts/index.ts`, `lib/hooks/artifacts/useArtifacts.ts`, `lib/hooks/artifacts/useArtifactForm.ts`
- Create: `lib/hooks/artifact-sets/index.ts`, `lib/hooks/artifact-sets/useArtifactSets.ts`, `lib/hooks/artifact-sets/useArtifactSetForm.ts`
- Create: `lib/utils/artifacts/artifact-form.ts` (pure payload builder)
- Modify: `components/artifacts/{ArtifactForm,ArtifactCreateForm,ArtifactEditForm,ArtifactDeleteButton,DeleteAllArtifactsButton,ArtifactCard}.tsx`, `components/artifact-sets/ArtifactSetForm.tsx`
- Delete: `components/artifacts/ImmuneSpellsLibraryPicker.tsx` (no importers since immunities became flags in 3b)
- Test: `lib/utils/artifacts/__tests__/artifact-form.test.ts`, `lib/hooks/artifacts/__tests__/useArtifacts.test.tsx`; existing `components/artifacts/__tests__/{ArtifactCard,ArtifactForm}.test.tsx` stay green

**Interfaces:**
- Consumes: `ArtifactListItem` (`@/types/artifacts`, Task 1).
- Produces:
  - `useArtifactsList(campaignId: string, opts?: { enabled?: boolean }): UseQueryResult<ArtifactListItem[]>` — key `["artifacts", campaignId]`
  - `useCreateArtifact(campaignId)`, `useUpdateArtifact(campaignId)` (variables `{ artifactId: string; data: UpdateArtifactData }`), `useDeleteArtifact(campaignId)` (variables `artifactId: string`), `useDeleteAllArtifacts(campaignId)` — all `useMutation`, `onSuccess` → `router.refresh()` and invalidate `["artifacts", campaignId]`
  - `useArtifactSetsList(campaignId, opts?)` — key `["artifact-sets", campaignId]`; `useSaveArtifactSet(campaignId, setId?)` (create when `setId` is undefined, else update), `useDeleteArtifactSet(campaignId)`
  - `buildArtifactPayload(state: ArtifactFormState, mode: "create" | "edit"): ArtifactFormSubmitPayload` in `lib/utils/artifacts/artifact-form.ts`
  - `useArtifactForm({ initial, mode, onSubmit, onDelete })` → `{ fields, setField, abilityErrors, setAbilityErrors, abilitiesValid, isSaving, isDeleting, isBusy, error, submit(e), remove() }`
  - `useArtifactSetForm({ campaignId, setId, initial })` → `{ fields, setField, selectedIds, toggleArtifact, selectableArtifacts, abilityErrors, setAbilityErrors, abilitiesValid, isBusy, error, submit(e), remove() }`

- [ ] **Step 1: Failing test for the payload builder** — `lib/utils/artifacts/__tests__/artifact-form.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { buildArtifactPayload } from "@/lib/utils/artifacts/artifact-form";

const base = { name: "  Кільце ", description: "  ", rarity: "common", slot: "ring", icon: " ", setId: null, abilities: [], weapon: { damageDice: "1d8" } };

describe("buildArtifactPayload", () => {
  it("edit mode sends nulls for cleared fields", () => {
    expect(buildArtifactPayload(base, "edit")).toEqual({ name: "Кільце", description: null, rarity: "common", slot: "ring", icon: null, setId: null, abilities: [] });
  });

  it("create mode omits cleared description and set", () => {
    const p = buildArtifactPayload(base, "create");

    expect(p.description).toBeUndefined();
    expect(p.setId).toBeUndefined();
  });

  it("includes weapon only for weapon slots", () => {
    expect(buildArtifactPayload({ ...base, slot: "weapon" }, "edit").weapon).toEqual({ damageDice: "1d8" });
  });
});
```

Before writing it, check `lib/utils/artifacts/weapon-stats.ts` for the exact weapon slot value(s) `isWeaponSlot` accepts and use one of them instead of `"weapon"` if it differs.

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '@/lib/utils/artifacts/artifact-form'`)

Run: `pnpm test:run lib/utils/artifacts/__tests__/artifact-form.test.ts`

- [ ] **Step 3: Implement** — `lib/utils/artifacts/artifact-form.ts`

```ts
import type { Ability } from "@/lib/utils/abilities/schema";
import { isWeaponSlot, type WeaponStats } from "@/lib/utils/artifacts/weapon-stats";

export interface ArtifactFormState {
  name: string;
  description: string;
  rarity: string;
  slot: string;
  icon: string;
  setId: string | null;
  abilities: Ability[];
  weapon: WeaponStats;
}

export interface ArtifactFormSubmitPayload {
  name: string;
  description: string | null | undefined;
  rarity: string;
  slot: string;
  icon: string | null;
  setId: string | null | undefined;
  abilities: Ability[];
  weapon?: WeaponStats;
}

export function buildArtifactPayload(s: ArtifactFormState, mode: "create" | "edit"): ArtifactFormSubmitPayload {
  const cleared = mode === "edit" ? null : undefined;

  return {
    name: s.name.trim(),
    description: s.description.trim() || cleared,
    rarity: s.rarity,
    slot: s.slot,
    icon: s.icon.trim() || null,
    setId: s.setId || cleared,
    abilities: s.abilities,
    ...(isWeaponSlot(s.slot) && { weapon: s.weapon }),
  };
}
```

`ArtifactForm.tsx` keeps re-exporting `ArtifactFormSubmitPayload` (`export type { ArtifactFormSubmitPayload } from "@/lib/utils/artifacts/artifact-form";`) so its importers don't change.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Hooks** — `lib/hooks/artifacts/useArtifacts.ts`

```ts
"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createArtifact,
  type CreateArtifactData,
  deleteAllArtifacts,
  deleteArtifact,
  getArtifacts,
  updateArtifact,
  type UpdateArtifactData,
} from "@/lib/api/artifacts";

export function useArtifactsList(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["artifacts", campaignId],
    queryFn: () => getArtifacts(campaignId),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}

function useRefreshAfter(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: ["artifacts", campaignId] });
    router.refresh();
  };
}

export function useCreateArtifact(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: (data: CreateArtifactData) => createArtifact(campaignId, data), onSuccess });
}

export function useUpdateArtifact(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({
    mutationFn: ({ artifactId, data }: { artifactId: string; data: UpdateArtifactData }) => updateArtifact(campaignId, artifactId, data),
    onSuccess,
  });
}

export function useDeleteArtifact(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: (artifactId: string) => deleteArtifact(campaignId, artifactId), onSuccess });
}

export function useDeleteAllArtifacts(campaignId: string) {
  const onSuccess = useRefreshAfter(campaignId);

  return useMutation({ mutationFn: () => deleteAllArtifacts(campaignId), onSuccess });
}
```

`lib/hooks/artifact-sets/useArtifactSets.ts` — same shape: `useArtifactSetsList` (`getArtifactSets`, key `["artifact-sets", campaignId]`), `useSaveArtifactSet(campaignId, setId?)` (`mutationFn: (payload: ArtifactSetCreatePayload) => setId ? updateArtifactSet(campaignId, setId, payload) : createArtifactSet(campaignId, payload)`), `useDeleteArtifactSet(campaignId)` (`(setId: string) => deleteArtifactSet(campaignId, setId)`); success invalidates `["artifact-sets", campaignId]` and `["artifacts", campaignId]` (membership changes the artifacts' `setId`) and calls `router.refresh()`.

- [ ] **Step 6: Hook test** — `lib/hooks/artifacts/__tests__/useArtifacts.test.tsx`

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/lib/api/artifacts", () => ({
  getArtifacts: vi.fn(async () => [{ id: "a1", name: "Кільце", slot: "ring" }]),
  deleteArtifact: vi.fn(async () => undefined),
  createArtifact: vi.fn(),
  updateArtifact: vi.fn(),
  deleteAllArtifacts: vi.fn(),
}));

import { deleteArtifact } from "@/lib/api/artifacts";
import { useArtifactsList, useDeleteArtifact } from "@/lib/hooks/artifacts";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

afterEach(cleanup);

describe("artifacts hooks", () => {
  it("lists artifacts", async () => {
    const { result } = renderHook(() => useArtifactsList("c1"), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });

  it("delete refreshes the server-rendered list", async () => {
    const { result } = renderHook(() => useDeleteArtifact("c1"), { wrapper });

    await act(() => result.current.mutateAsync("a1"));

    expect(deleteArtifact).toHaveBeenCalledWith("c1", "a1");
    expect(refresh).toHaveBeenCalled();
  });
});
```

Barrels: `lib/hooks/artifacts/index.ts` exports `useArtifactsList, useCreateArtifact, useUpdateArtifact, useDeleteArtifact, useDeleteAllArtifacts, useArtifactForm`; `lib/hooks/artifact-sets/index.ts` exports `useArtifactSetsList, useSaveArtifactSet, useDeleteArtifactSet, useArtifactSetForm`.

Run: `pnpm test:run lib/hooks/artifacts` — PASS.

- [ ] **Step 7: `useArtifactForm`** — `lib/hooks/artifacts/useArtifactForm.ts`

Move all `useState`s, `handleSubmit` and `handleDelete` out of `ArtifactForm.tsx` (lines 108–188) into the hook. State is one object:

```ts
const [fields, setFields] = useState<ArtifactFormState>({ ...initial, weapon: initial.weapon ?? {} });

const setField = <K extends keyof ArtifactFormState>(key: K, value: ArtifactFormState[K]) => setFields((prev) => ({ ...prev, [key]: value }));
```

`submit(e)` = `e.preventDefault()`, guard `!fields.name.trim() || !abilitiesValid`, `setIsSaving(true)`, `await onSubmit(buildArtifactPayload(fields, mode))`, catch → `setError(abilitySaveError(err, mode === "edit" ? "Помилка оновлення" : "Помилка створення"))`. `remove()` keeps the existing `confirm({ title: "Ви впевнені, що хочете видалити цей артефакт?", confirmLabel: "Видалити", destructive: true, onConfirm: onDelete })` — passing `onDelete` as `onConfirm` lets `useConfirm` show the error and drops the local `isDeleting`/catch; `isDeleting` is then not needed (`isBusy = isSaving`).

`ArtifactForm.tsx` becomes: `const form = useArtifactForm({ initial, mode, onSubmit, onDelete });` and the JSX reads `form.fields.name`, `onChange={(e) => form.setField("name", e.target.value)}` etc. `ArtifactForm` props stay as they are (consumers and the existing test don't change).

- [ ] **Step 8: Thin wrappers use the mutations**

`ArtifactCreateForm.tsx`:

```tsx
const router = useRouter();

const create = useCreateArtifact(campaignId);

// …
onSubmit={async (payload) => {
  await create.mutateAsync({ ...payload, description: payload.description ?? undefined, setId: payload.setId ?? undefined });
  router.push(`/campaigns/${campaignId}/dm/artifacts`);
}}
```

`ArtifactEditForm.tsx`: `useUpdateArtifact` (`mutateAsync({ artifactId: artifact.id, data: payload })`) and `useDeleteArtifact` (`mutateAsync(artifact.id)`), then `router.push(...)`; the explicit `router.refresh()` calls go (the hook does it).

`ArtifactDeleteButton.tsx`:

```tsx
const confirm = useConfirm();

const remove = useDeleteArtifact(campaignId);

const handleDelete = () =>
  confirm({ title: "Ви впевнені, що хочете видалити цей артефакт?", confirmLabel: "Видалити", destructive: true, onConfirm: () => remove.mutateAsync(artifactId) });
// <Button … disabled={remove.isPending} onClick={() => void handleDelete()}>
```

`DeleteAllArtifactsButton.tsx`: `onConfirm: () => deleteAll.mutateAsync()` with `useDeleteAllArtifacts`; drop `useRouter`.

`ArtifactCard.tsx`: replace `handleSlotChange` with

```tsx
const update = useUpdateArtifact(campaignId);

const [slot, setSlot] = useState(artifact.slot);

const handleSlotChange = (newSlot: string) => {
  if (newSlot === slot) return;

  const prev = slot;

  setSlot(newSlot);
  update.mutate({ artifactId: artifact.id, data: { slot: newSlot } }, { onError: () => { setSlot(prev); void notify("Не вдалося змінити слот"); } });
};
// <Select … disabled={update.isPending}>
```

(`notify` from `useNotify()`; this replaces the silent `console.error`.) Update `components/artifacts/__tests__/ArtifactCard.test.tsx` only if it mocked `@/lib/api/artifacts` by path — the mock still applies because the hook imports the same module; it needs a `QueryClientProvider` wrapper now (wrap the `renderWithConfirm` argument).

- [ ] **Step 9: `useArtifactSetForm` and `ArtifactSetForm`**

Move from `ArtifactSetForm.tsx` into `lib/hooks/artifact-sets/useArtifactSetForm.ts`: all field state (one `fields` object: `name, description, icon, bonusName, bonusDescription, abilities`), `selectedIds` + `toggleArtifact`, `abilityErrors`, `error`, `submit`, `remove`. The `useEffect(getArtifacts…)` becomes `const { data: artifacts = [] } = useArtifactsList(campaignId);` and `selectableArtifacts = useMemo(() => filterArtifactsSelectableForSet(artifacts, setId), [artifacts, setId])` — move `components/artifact-sets/artifact-set-form-helpers.ts` → `lib/utils/artifacts/artifact-set-form.ts` (it is pure; keep `formatArtifactSlotLabel` export there too and update `ArtifactSetMembersPicker` import). `submit` builds the same payload as today (lines 112–119) and calls `useSaveArtifactSet(campaignId, setId).mutateAsync(payload)` then `router.push(\`/campaigns/${campaignId}/dm/artifact-sets\`)`; errors → `setError(abilitySaveError(err, "Помилка збереження"))`. `remove` = `confirm({ title: "Видалити сет? Артефакти залишаться в кампанії, поле «Сет» у них буде очищено.", confirmLabel: "Видалити", destructive: true, onConfirm: () => del.mutateAsync(setId) })` and on `true` → `router.push(...)`.

`ArtifactSetForm` keeps its props and becomes `const form = useArtifactSetForm({ campaignId, setId, initial: { name: initialName, … } });` + JSX.

- [ ] **Step 10: Delete the dead picker**

Run: `grep -rn "ImmuneSpellsLibraryPicker" app components lib` — Expected: only the file itself. Then `git rm components/artifacts/ImmuneSpellsLibraryPicker.tsx`.

- [ ] **Step 11: Verify and commit**

Run: `grep -rn "@/lib/api" components/artifacts components/artifact-sets` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks/artifacts lib/hooks/artifact-sets lib/utils/artifacts components/artifacts components/artifact-sets && pnpm exec tsc --noEmit && pnpm test:run`
Expected: clean, all pass.

```bash
git add -A lib components
git commit -m "refactor(artifacts): hooks for artifacts and sets, forms call hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Spells, spell groups, main skills

**Files:**
- Create: `lib/utils/spells/spell-import.ts` (CSV row → `ImportSpell`), `lib/hooks/spells/useSpellImport.ts`
- Move: `app/campaigns/[id]/dm/spells/useSpellFormSync.ts` → `lib/hooks/spells/useSpellFormSync.ts`
- Modify: `lib/hooks/spells/useSpells.ts` (add `useCreateSpellGroup`), `lib/hooks/spells/index.ts`
- Modify: `components/skills/dialogs/CreateGroupDialog.tsx`, `components/spells/dialogs/SpellImportDialog.tsx`, `components/main-skills/{CreateMainSkillDialog,MainSkillEditForm}.tsx`, `app/campaigns/[id]/dm/spells/[spellId]/page.tsx` (import path)
- Test: `lib/utils/spells/__tests__/spell-import.test.ts`; existing `components/skills/__tests__/CreateGroupDialog.test.tsx` stays green

**Interfaces:**
- Produces:
  - `csvRowToImportSpell(row: CSVSpellRow): ImportSpell` (`lib/utils/spells/spell-import.ts`)
  - `useCreateSpellGroup(campaignId)` — `useCrudMutation({ mutationFn: (name: string) => createSpellGroup(campaignId, { name }), invalidateKeys: [["spellGroups", campaignId]] })`
  - `useSpellImport(campaignId): UseFileImportReturn` — wraps `useFileImport<ImportSpell>` with CSV (`parseCSVFile(file, ",")` → `csvRowToImportSpell`) and JSON parsers and an import mutation invalidating `["spells", campaignId]`, `["spellGroups", campaignId]`
  - `useSpellFormSync` exported from `@/lib/hooks/spells`

- [ ] **Step 1: Failing test** — `lib/utils/spells/__tests__/spell-import.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { SpellType } from "@/lib/constants/spell-abilities";
import { csvRowToImportSpell } from "@/lib/utils/spells/spell-import";

describe("csvRowToImportSpell", () => {
  it("maps the UA columns and derives the defaults", () => {
    const s = csvRowToImportSpell({ "UA Name": " Вогняна куля ", "Original Name": "Fireball", Level: "3", School: "Evocation", Effect: "8d6 fire damage in a 20-foot radius, DEX save for half" } as never);

    expect(s.name).toBe("Вогняна куля");
    expect(s.level).toBe(3);
    expect(s.castingTime).toBe("1 action");
    expect(s.components).toBe("V, S");
    expect(s.description).toBe("Fireball (Вогняна куля): 8d6 fire damage in a 20-foot radius, DEX save for half");
    expect(s.range).toBe(s.type === SpellType.AOE ? "60 feet" : "Touch");
  });

  it("defaults a missing level to 0", () => {
    expect(csvRowToImportSpell({ name: "X", Effect: "" } as never).level).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (module missing)

Run: `pnpm test:run lib/utils/spells/__tests__/spell-import.test.ts`

- [ ] **Step 3: Implement** — move the body of `convertCSVToImportFormat`'s `.map` callback (`SpellImportDialog.tsx:46-90`) verbatim into

```ts
export function csvRowToImportSpell(row: CSVSpellRow): ImportSpell {
  const level = parseInt(row.Level || row.level || "0", 10) || 0;
  // … the rest of the existing callback body, unchanged …
}
```

with the imports it uses (`SpellType`, the `determine*`/`extractDamageDice`/`normalizeSchoolName` helpers from `@/lib/utils/spells/spell-parsing`, types from `@/types/import`). Drop the narrating comments (`// Use utility functions`).

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: `useSpellImport`** — `lib/hooks/spells/useSpellImport.ts`

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { importSpells } from "@/lib/api/spells";
import { useFileImport } from "@/lib/hooks/common";
import { parseCSVFile, parseJSONFile } from "@/lib/utils/common/file-import";
import { csvRowToImportSpell } from "@/lib/utils/spells/spell-import";
import type { CSVSpellRow, ImportSpell, SpellImportResult } from "@/types/import";

export function useSpellImport(campaignId: string) {
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (spells: ImportSpell[]) => importSpells(campaignId, { spells }) as Promise<SpellImportResult>,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["spells", campaignId] });
      void queryClient.invalidateQueries({ queryKey: ["spellGroups", campaignId] });
    },
  });

  return useFileImport<ImportSpell>({
    onImport: async (spells) => {
      const { imported, total } = await importMutation.mutateAsync(spells);

      return { imported, total };
    },
    parseCSV: async (file) => (await parseCSVFile<CSVSpellRow>(file, ",")).map(csvRowToImportSpell),
    parseJSON: (file) => parseJSONFile<ImportSpell>(file),
  });
}
```

`SpellImportDialog.tsx` becomes:

```tsx
export function SpellImportDialog({ campaignId }: SpellImportDialogProps) {
  const importHook = useSpellImport(campaignId);

  return <ImportDialog triggerLabel="Імпортувати заклинання" title="Імпорт заклинань" description="Завантажте CSV або JSON файл з заклинаннями для масового імпорту" importHook={importHook} />;
}
```

- [ ] **Step 6: `useCreateSpellGroup` + `CreateGroupDialog`**

Add to `lib/hooks/spells/useSpells.ts`:

```ts
export function useCreateSpellGroup(campaignId: string) {
  return useCrudMutation({
    mutationFn: (name: string) => createSpellGroup(campaignId, { name }),
    invalidateKeys: [["spellGroups", campaignId], ["spells", campaignId]],
  });
}
```

In `CreateGroupDialog.tsx` drop `useQueryClient`, `isCreating`, the try/catch; keep `open`, `name`, `error`:

```tsx
const createGroup = useCreateSpellGroup(campaignId);

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!name.trim()) return;

  setError(null);
  createGroup.mutate(name.trim(), {
    onSuccess: (group) => {
      setOpen(false);
      setName("");
      router.refresh();
      onGroupCreated?.(group.id);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Помилка створення групи"),
  });
};
// isCreating → createGroup.isPending
```

Read `components/skills/__tests__/CreateGroupDialog.test.tsx` first: it mocks `@/lib/api/spells` and asserts `invalidateQueries`/`refresh` — the mock path still applies; if it spies on `queryClient.invalidateQueries` with only `["spellGroups", …]`, keep that assertion (the hook still invalidates that key).

- [ ] **Step 7: Main-skill forms use `useSpellGroups`**

In `CreateMainSkillDialog.tsx` and `MainSkillEditForm.tsx` replace the inline `useQuery<SpellGroup[]>({ queryKey: …, queryFn: () => getSpellGroups(campaignId) … })` with `const { data: spellGroups = [] } = useSpellGroups(campaignId);` (from `@/lib/hooks/spells`). Check the inline query's key first — if it is not `["spellGroups", campaignId]`, the shared hook's key wins (same data).

- [ ] **Step 8: Move `useSpellFormSync`**

`git mv "app/campaigns/[id]/dm/spells/useSpellFormSync.ts" lib/hooks/spells/useSpellFormSync.ts`; export it from `lib/hooks/spells/index.ts`; fix its relative imports to `@/` paths; update `app/campaigns/[id]/dm/spells/[spellId]/page.tsx` to `import { useSpellFormSync } from "@/lib/hooks/spells";`.

- [ ] **Step 9: Verify and commit**

Run: `grep -rn "@/lib/api" components/spells components/skills components/main-skills "app/campaigns/[id]/dm/spells"` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks/spells lib/utils/spells components/spells components/skills components/main-skills "app/campaigns/[id]/dm/spells" && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A lib components app
git commit -m "refactor(spells): spell import, group creation and form sync in hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 4: Units

**Files:**
- Create: `lib/utils/units/quick-stats.ts`, `lib/hooks/units/useUnitQuickStats.ts`, `lib/hooks/units/useUnitImport.ts`, `lib/hooks/units/useUnitEditForm.ts`, `lib/utils/units/unit-form.ts`
- Modify: `lib/hooks/units/index.ts`, `components/units/list/UnitQuickStatsEditor.tsx`, `components/units/dialogs/UnitImportDialog.tsx`, `app/campaigns/[id]/dm/units/[unitId]/page.tsx`
- Test: `lib/utils/units/__tests__/quick-stats.test.ts`, `lib/utils/units/__tests__/unit-form.test.ts`; existing `components/units/__tests__/UnitCard.test.tsx` stays green

**Interfaces:**
- Consumes: `useUpdateUnitAny(campaignId)` (variables `{ unitId, data: Partial<Unit> }`), `useUnit`, `useUpdateUnit`, `useDeleteUnit` (existing), `useSpells` (existing).
- Produces:
  - `type QuickStatField = "ac" | "init" | "dice"`; `type QuickStatPlan = { kind: "reset" } | { kind: "noop" } | { kind: "update"; data: Partial<Unit> }`
  - `planQuickStatUpdate(field: QuickStatField, raw: string, unit: Unit, primaryAttackIndex: number): QuickStatPlan`
  - `useUnitQuickStats(unit: Unit, campaignId: string, primaryAttackIndex: number)` → `{ isBusy: boolean; field(f: QuickStatField): { key: string; id: string; defaultValue: string; commit(raw: string): void } }`
  - `useUnitImport(campaignId): UseFileImportReturn`
  - `buildUnitFormData(unit: Unit): Partial<Unit>`, `emptyUnitFormDefaults(): Partial<Unit>`, `buildUnitUpdatePayload(form: Partial<Unit>, unit: Unit | undefined): Partial<Unit>` (`lib/utils/units/unit-form.ts`)
  - `useUnitEditForm(campaignId: string, unitId: string)` → `{ query, races, spells, formData, change(updates: Partial<Unit>), abilityErrors, setAbilityErrors, abilitiesValid, submit(e), remove(), isSaving, isDeleting, error }`

- [ ] **Step 1: Failing tests** — `lib/utils/units/__tests__/quick-stats.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { planQuickStatUpdate } from "@/lib/utils/units/quick-stats";
import type { Unit } from "@/types/units";

const unit = { id: "u1", armorClass: 14, initiative: 2, attacks: [{ name: "Меч", damageDice: "1d8" }] } as unknown as Unit;

describe("planQuickStatUpdate", () => {
  it("resets on empty or non-numeric AC", () => {
    expect(planQuickStatUpdate("ac", " ", unit, 0)).toEqual({ kind: "reset" });
    expect(planQuickStatUpdate("ac", "abc", unit, 0)).toEqual({ kind: "reset" });
  });

  it("clamps negative AC to 0 and skips unchanged", () => {
    expect(planQuickStatUpdate("ac", "-3", unit, 0)).toEqual({ kind: "update", data: { armorClass: 0 } });
    expect(planQuickStatUpdate("ac", "14", unit, 0)).toEqual({ kind: "noop" });
  });

  it("updates initiative, allowing negatives", () => {
    expect(planQuickStatUpdate("init", "-1", unit, 0)).toEqual({ kind: "update", data: { initiative: -1 } });
  });

  it("dice: resets on empty, noop on same, replaces only the primary attack", () => {
    expect(planQuickStatUpdate("dice", "", unit, 0)).toEqual({ kind: "reset" });
    expect(planQuickStatUpdate("dice", " 1d8 ", unit, 0)).toEqual({ kind: "noop" });
    expect(planQuickStatUpdate("dice", "2d6", unit, 0)).toEqual({ kind: "update", data: { attacks: [{ name: "Меч", damageDice: "2d6" }] } });
  });

  it("dice without a primary attack is a noop", () => {
    expect(planQuickStatUpdate("dice", "2d6", unit, -1)).toEqual({ kind: "noop" });
  });
});
```

`lib/utils/units/__tests__/unit-form.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { buildUnitFormData, buildUnitUpdatePayload } from "@/lib/utils/units/unit-form";
import type { Unit } from "@/types/units";

const unit = { id: "u1", name: "Гоблін", race: " ", unitGroup: { name: "Гобліни" }, knownSpells: ["s1"], attacks: null, avatar: "" } as unknown as Unit;

describe("unit form", () => {
  it("falls back to the group name for race and normalizes arrays", () => {
    const f = buildUnitFormData(unit);

    expect(f.race).toBe("Гобліни");
    expect(f.attacks).toEqual([]);
    expect(f.avatar).toBeNull();
  });

  it("payload trims race to null and keeps saved knownSpells when the form has none", () => {
    const p = buildUnitUpdatePayload({ race: "  ", avatar: "" }, unit);

    expect(p.race).toBeNull();
    expect(p.knownSpells).toEqual(["s1"]);
    expect(p.avatar).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (modules missing)

Run: `pnpm test:run lib/utils/units`

- [ ] **Step 3: Implement `quick-stats.ts`**

```ts
import type { Unit } from "@/types/units";

export type QuickStatField = "ac" | "init" | "dice";

export type QuickStatPlan = { kind: "reset" } | { kind: "noop" } | { kind: "update"; data: Partial<Unit> };

export function parseQuickStatInt(raw: string): number | null {
  const t = raw.trim();

  if (t === "") return null;

  const n = Number.parseInt(t, 10);

  return Number.isFinite(n) ? n : null;
}

export function planQuickStatUpdate(field: QuickStatField, raw: string, unit: Unit, primaryAttackIndex: number): QuickStatPlan {
  if (field === "dice") {
    const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

    const primary = primaryAttackIndex >= 0 ? attacks[primaryAttackIndex] : undefined;

    const trimmed = raw.trim();

    if (!primary || trimmed === (primary.damageDice ?? "").trim()) return { kind: "noop" };

    if (!trimmed) return { kind: "reset" };

    return { kind: "update", data: { attacks: attacks.map((a, i) => (i === primaryAttackIndex ? { ...a, damageDice: trimmed } : a)) } };
  }

  const n = parseQuickStatInt(raw);

  if (n === null) return { kind: "reset" };

  if (field === "ac") {
    const ac = Math.max(0, n);

    return ac === unit.armorClass ? { kind: "noop" } : { kind: "update", data: { armorClass: ac } };
  }

  return n === unit.initiative ? { kind: "noop" } : { kind: "update", data: { initiative: n } };
}
```

- [ ] **Step 4: Implement `unit-form.ts`** — move `buildUnitFormData` and `emptyUnitFormDefaults` verbatim from `app/campaigns/[id]/dm/units/[unitId]/page.tsx:31-89`, and extract the payload expression of `handleSubmit` (lines 148–165) into

```ts
export function buildUnitUpdatePayload(form: Partial<Unit>, unit: Unit | undefined): Partial<Unit> {
  return {
    ...form,
    knownSpells: form.knownSpells !== undefined ? form.knownSpells : unit?.knownSpells ?? [],
    race:
      form.race !== undefined
        ? String(form.race ?? "").trim() || null
        : (unit?.race?.trim() ?? null),
    avatar: form.avatar === undefined ? undefined : form.avatar || null,
    damageModifier: form.damageModifier === undefined ? undefined : form.damageModifier,
  };
}
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm test:run lib/utils/units`

- [ ] **Step 6: `useUnitQuickStats`** — `lib/hooks/units/useUnitQuickStats.ts`

```ts
"use client";

import { useState } from "react";

import { useUpdateUnitAny } from "./useUnits";

import { planQuickStatUpdate, type QuickStatField } from "@/lib/utils/units/quick-stats";
import type { Unit } from "@/types/units";

export function useUnitQuickStats(unit: Unit, campaignId: string, primaryAttackIndex: number) {
  const update = useUpdateUnitAny(campaignId);

  // Uncontrolled inputs reset to the server value by bumping their key, so typing keeps focus.
  const [epochs, setEpochs] = useState<Record<QuickStatField, number>>({ ac: 0, init: 0, dice: 0 });

  const bump = (f: QuickStatField) => setEpochs((e) => ({ ...e, [f]: e[f] + 1 }));

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  const saved: Record<QuickStatField, string> = {
    ac: String(unit.armorClass),
    init: String(unit.initiative),
    dice: (primaryAttackIndex >= 0 ? attacks[primaryAttackIndex]?.damageDice : "") ?? "",
  };

  const field = (f: QuickStatField) => ({
    key: `${unit.id}-${f}-${saved[f]}-${epochs[f]}`,
    id: `unit-${f}-${unit.id}`,
    defaultValue: saved[f],
    commit: (raw: string) => {
      const plan = planQuickStatUpdate(f, raw, unit, primaryAttackIndex);

      if (plan.kind === "reset") bump(f);

      if (plan.kind === "update") update.mutate({ unitId: unit.id, data: plan.data }, { onError: () => bump(f) });
    },
  });

  return { field, isBusy: update.isPending };
}
```

The DOM ids stay `unit-ac-<id>`, `unit-init-<id>`, `unit-dice-<id>` (`f` is `ac`/`init`/`dice`).

- [ ] **Step 7: Rewrite `UnitQuickStatsEditor.tsx`**

Delete `parseQuickStatInt`, the three epochs, the three `persist*` functions and the `document.getElementById` reads. Each of the three blocks becomes (AC shown; init and dice identical with their field and labels):

```tsx
const { field, isBusy } = useUnitQuickStats(unit, campaignId, primaryAttackIndex);

const ac = field("ac");
// …
<Input
  key={ac.key}
  id={ac.id}
  type="number"
  min={0}
  inputMode="numeric"
  className="h-8 min-w-0 flex-1 text-sm tabular-nums"
  defaultValue={ac.defaultValue}
  onBlur={(e) => ac.commit(e.currentTarget.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ac.commit(e.currentTarget.value);
    }
  }}
  disabled={isBusy}
/>
<Button type="button" variant="secondary" size="sm" className="h-8 shrink-0 px-2.5 text-xs" disabled={isBusy}
  onClick={() => ac.commit((document.getElementById(ac.id) as HTMLInputElement | null)?.value ?? "")}>
```

The «Зберегти» button has no event target with the input value, so it alone keeps the `getElementById(ac.id)` read. Remove the file's header comment block (it narrates history). Keep the `primaryAttackName` label logic.

- [ ] **Step 8: `useUnitImport` + `UnitImportDialog`**

`lib/hooks/units/useUnitImport.ts` — same structure as `useSpellImport` (Task 3 Step 5): mutation `importUnits(campaignId, { units })` invalidating `["units", campaignId]`, `["unitGroups", campaignId]`; `onImport` returns `{ imported, total, skipped }`; `parseCSV: async (file) => (await parseCSVFile<CSVUnitRow>(file, ";")).map((row) => { const { unit, groupName } = convertCSVRowToUnit(row); return { ...unit, groupName }; })`; `parseJSON: async (file) => (await parseJSONFile<ImportUnit>(file)).map((u) => ({ ...u, groupName: undefined }))`. Type parameter: `ImportUnit & { groupName?: string }`.

`UnitImportDialog.tsx` → `const importHook = useUnitImport(campaignId); return <ImportDialog … importHook={importHook} />;`

- [ ] **Step 9: `useUnitEditForm` + unit edit page**

`lib/hooks/units/useUnitEditForm.ts` takes everything stateful from `app/campaigns/[id]/dm/units/[unitId]/page.tsx:96-195`:
- `const query = useUnit(campaignId, unitId);`, `useRaces`, `const { data: spells = [] } = useSpells(campaignId);` (replaces the `useEffect(getSpells)`),
- `formData` state seeded with `emptyUnitFormDefaults`, the `lastServerSyncKeyRef` effect unchanged (keeps re-syncing when race/group arrive — Review Focus 1),
- `submit(e)` → guard `abilitiesValid`, `update.mutate(buildUnitUpdatePayload(formData, query.data), { onSuccess: () => router.push(\`/campaigns/${campaignId}/dm/units\`) })` (drop the `console.error` `onError`; the error is rendered from `error`),
- `remove()` → `confirm({ title: "Ви впевнені, що хочете видалити цього юніта?", confirmLabel: "Видалити", destructive: true, onConfirm: () => del.mutateAsync(unitId) })` then on `true` `router.push(...)`,
- `error = (update.error ?? del.error) as Error | null`.

The page becomes `const form = useUnitEditForm(id, unitId);` and renders `<QueryState query={form.query} loading={<LoadingState rows={8} label="Завантаження юніта…" />}>{() => (<Card>…</Card>)}</QueryState>`; the current `if (fetching)` and "not found" branches go (`QueryState` shows `ErrorState` with retry). JSX field bindings: `formData={form.formData} onChange={form.change}`; `spells={form.spells}`; delete button `onClick={() => void form.remove()}` `disabled={form.isDeleting}`.

Add a hook test `lib/hooks/units/__tests__/useUnitEditForm.test.tsx` for Review Focus 1: mock `@/lib/api/units` (`getUnit` resolves a unit with `name: "Гоблін"`), `@/lib/api/spells` (`getSpells` → `[]`), `@/lib/api/races` (`getRaces` → `[]` — check the races api export name first), `next/navigation`; render the hook, wait for `formData.name === "Гоблін"`, call `change({ name: "Орк" })`, then `queryClient.setQueryData(["unit", "c1", "u1"], { ...unit, name: "Гоблін" })` (same sync key) and assert `formData.name` stays `"Орк"`. Wrap with `ConfirmProvider` (the hook calls `useConfirm`).

- [ ] **Step 10: Verify and commit**

Run: `grep -rn "@/lib/api" components/units "app/campaigns/[id]/dm/units"` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks/units lib/utils/units components/units "app/campaigns/[id]/dm/units" && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A lib components app
git commit -m "refactor(units): quick stats, import and edit page logic in hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Campaigns

**Files:**
- Create: `lib/hooks/campaigns/useCampaignMutations.ts`, `lib/hooks/campaigns/useActiveBattles.ts`, `lib/utils/campaigns/join-error.ts`
- Modify: `lib/hooks/campaigns/useCampaignMembers.ts` (→ `useQuery`), `lib/hooks/campaigns/index.ts`
- Modify: `components/campaigns/JoinBattleButton.tsx`, `components/campaigns/join/JoinCampaignDialog.tsx`, `components/campaigns/members/CampaignMembersList.tsx`, `components/campaigns/settings/CampaignSettingsDialog.tsx`, `app/campaigns/new/page.tsx`
- Test: `lib/utils/campaigns/__tests__/join-error.test.ts`

**Interfaces:**
- Produces:
  - `useActiveBattles()` — key `["active-battles"]`, `refetchInterval: 120_000`, `refetchOnWindowFocus: false`
  - `useCreateCampaign()`, `useJoinCampaign()`, `useUpdateCampaign(campaignId)`, `useRemoveCampaignMember(campaignId)` (`useMutation`; update and remove call `router.refresh()` on success — the campaign page is server-rendered, there is no campaign query key)
  - `joinErrorMessage(err: unknown): string` (`lib/utils/campaigns/join-error.ts`)
  - `useCampaignMembers(campaignId)` keeps its return shape `{ members, loading, error }` (4 consumers), implemented with `useQuery({ queryKey: ["campaign-members", campaignId], queryFn: () => getCampaignMembers(campaignId), enabled: !!campaignId, staleTime: ENTITY_STALE_MS })` → `{ members: data ?? [], loading: isPending && !!campaignId, error: error?.message ?? null }`

- [ ] **Step 1: Failing test** — `lib/utils/campaigns/__tests__/join-error.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { joinErrorMessage } from "@/lib/utils/campaigns/join-error";

describe("joinErrorMessage", () => {
  it("translates known server errors", () => {
    expect(joinErrorMessage(new Error("Campaign not found"))).toBe("Кампанію не знайдено. Перевірте код запрошення.");
    expect(joinErrorMessage(new Error("Already a member of this campaign"))).toBe("Ви вже є учасником цієї кампанії.");
    expect(joinErrorMessage(new Error("Campaign is not active"))).toBe("Кампанія неактивна.");
  });

  it("passes other messages through and has a fallback", () => {
    expect(joinErrorMessage(new Error("Boom"))).toBe("Boom");
    expect(joinErrorMessage("x")).toBe("Помилка приєднання до кампанії");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```ts
const TRANSLATIONS: Array<[string, string]> = [
  ["Campaign not found", "Кампанію не знайдено. Перевірте код запрошення."],
  ["Already a member", "Ви вже є учасником цієї кампанії."],
  ["not active", "Кампанія неактивна."],
];

export function joinErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Помилка приєднання до кампанії";

  return TRANSLATIONS.find(([needle]) => err.message.includes(needle))?.[1] ?? err.message;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Hooks** — `useActiveBattles.ts` copies the query from `JoinBattleButton.tsx:14-19`. `useCampaignMutations.ts`:

```ts
"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCampaign, joinCampaign, removeCampaignMember, updateCampaign } from "@/lib/api/campaigns";

export function useCreateCampaign() {
  return useMutation({ mutationFn: createCampaign });
}

export function useJoinCampaign() {
  return useMutation({ mutationFn: (inviteCode: string) => joinCampaign(inviteCode) });
}

export function useUpdateCampaign(campaignId: string) {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: Parameters<typeof updateCampaign>[1]) => updateCampaign(campaignId, data),
    onSuccess: () => router.refresh(),
  });
}

export function useRemoveCampaignMember(campaignId: string) {
  const router = useRouter();

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => removeCampaignMember(campaignId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaign-members", campaignId] });
      router.refresh();
    },
  });
}
```

Rewrite `useCampaignMembers.ts` as in Interfaces (drop the `console.error`). Export all from `lib/hooks/campaigns/index.ts`.

- [ ] **Step 6: Components**

- `JoinBattleButton.tsx`: `const { data: activeBattles = [], isLoading } = useActiveBattles();` — rest unchanged.
- `JoinCampaignDialog.tsx`: `const join = useJoinCampaign();` replaces `loading` (`join.isPending`) and the try/catch; `error` state stays for the empty-code message and is set in `onError: (err) => setError(joinErrorMessage(err))`; `onSuccess: (result) => { setSuccess(true); setTimeout(() => { router.push(\`/campaigns/${result.campaign.id}\`); router.refresh(); }, 1000); }`. Remove the two narrating comments.
- `CampaignMembersList.tsx`: `const removeMember = useRemoveCampaignMember(campaignId);` and `handleRemoveMember = (memberId) => confirm({ title: "Ви впевнені, що хочете виключити цього учасника з кампанії?", confirmLabel: "Виключити", destructive: true, onConfirm: () => removeMember.mutateAsync(memberId) })`; `removingMemberId` → `removeMember.isPending && removeMember.variables === memberId`; drop `notify`/`router`/try-catch.
- `CampaignSettingsDialog.tsx`: `const update = useUpdateCampaign(campaignId);` replaces `isSaving` and try/catch: `update.mutate(payload, { onSuccess: () => onOpenChange(false), onError: (err) => setError(err instanceof Error ? err.message : "Помилка збереження") })`. The `useEffect` that re-seeds fields on open stays (form state, not data loading). It has 10 props: add `export interface CampaignSettings { name: string; description: string | null; maxLevel: number; xpMultiplier: number; allowPlayerEdit: boolean; status: string }` to `types/campaigns.ts` and replace the six `initial*` props with `campaign: CampaignSettings`; drop `onUpdated` (the hook refreshes). Do the same for `CampaignSettingsButton.tsx` (its only caller) and update the server page that renders the button (`grep -rn "CampaignSettingsButton" app`) to pass `campaign={{ name: …, … }}`.
- `app/campaigns/new/page.tsx`: `const create = useCreateCampaign();`, `loading` → `create.isPending`, submit → `create.mutate(formData, { onSuccess: (c) => router.push(\`/campaigns/${c.id}\`), onError: () => void notify("Помилка при створенні кампанії") })`.

- [ ] **Step 7: Verify and commit**

Run: `grep -rn "@/lib/api" components/campaigns app/campaigns/new` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks/campaigns lib/utils/campaigns components/campaigns app/campaigns && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A lib components app
git commit -m "refactor(campaigns): campaign mutations and members query in hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 6: Characters

**Files:**
- Create: `lib/hooks/characters/useCharacterEditor.ts`, `lib/hooks/characters/useDmCharacterEditor.ts`, `lib/hooks/characters/useDamagePreview.ts`, `lib/hooks/characters/damage-preview.ts`, `lib/hooks/characters/useEquipArtifact.ts`, `lib/hooks/skills/useSkillTrees.ts`, `lib/utils/artifacts/equipment.ts`
- Move: `components/characters/stats/damage-calculator-utils.ts` → `lib/utils/characters/damage-calculator.ts` (pure part) + `lib/hooks/characters/damage-preview.ts` (`fetchDamagePreview`)
- Modify: `lib/hooks/characters/useCharacters.ts` (add `useCharacter`, `useCreateCharacter`, `useUpdateCharacter`; `useLevelUpCharacter` invalidates more), `lib/hooks/characters/index.ts`, `lib/hooks/skills/index.ts`, `lib/hooks/spells/useSpells.ts` (options object)
- Modify: `app/campaigns/[id]/character/edit/edit-client.tsx`, `app/campaigns/[id]/dm/characters/[characterId]/{page,DmCharacterEditForm,DmCharacterEditFormAccordion}.tsx`, `app/campaigns/[id]/dm/characters/new/page.tsx`, `app/campaigns/[id]/dm/spells/page-client.tsx` (useSpells call)
- Modify: `components/characters/stats/CharacterDamagePreview.tsx`, `components/characters/abilities/CharacterSkillTreeView.tsx`, `components/characters/artifacts/{CharacterSpellbook,CharacterArtifactsSection}.tsx`, the five importers of `damage-calculator-utils` (`components/characters/stats/{DamageCalculatorResult,SkillsAffectingDamageList,CharacterDamageCalculator,DamageCalculatorSkillsLog}.tsx`, `lib/hooks/characters/{useDamageCalculator,useDamageCalculator-skills}.ts`)
- Test: `lib/utils/artifacts/__tests__/equipment.test.ts`, `lib/hooks/characters/__tests__/useCharacterEditor.test.tsx`

**Interfaces:**
- Consumes: `DamagePreviewResponse` (`@/types/characters`, Task 1), `useCampaignMembers` (Task 5), `useArtifactsList`, `useArtifactSetsList` (Task 2), `useCharacterForm`, `characterToFormData` (existing).
- Produces:
  - `useSpells(campaignId: string, opts?: { initialData?: Spell[]; enabled?: boolean })` — signature change; the only caller passing initial data (`dm/spells/page-client.tsx`) becomes `useSpells(campaignId, { initialData: initialSpells })`
  - `useSkillTrees(campaignId: string, opts?: { enabled?: boolean }): UseQueryResult<SkillTree[]>` — key `["skill-trees", campaignId]`, exported from `@/lib/hooks/skills`
  - `useCharacter(campaignId, characterId)` — key `["character", campaignId, characterId]`, `staleTime: ENTITY_STALE_MS`
  - `useCreateCharacter(campaignId)` (`(data: CharacterFormData) => createCharacter(campaignId, data)`), `useUpdateCharacter(campaignId, characterId)` (`(data: CharacterFormData) => updateCharacter(campaignId, characterId, data)`) — both invalidate `["characters", campaignId]`, update also `["character", campaignId, characterId]`
  - `useLevelUpCharacter(campaignId)` additionally invalidates `["character", campaignId]`, `["character-damage-preview", campaignId]`, `["damage-calculator-melee-ranged", campaignId]`, `["damage-calculator-magic-spell", campaignId]` (prefix match)
  - `useCharacterEditor({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved: () => void })` → `{ query, form: ReturnType<typeof useCharacterForm>, equipped: EquippedItems, setEquipped, members, membersLoading, races }` — seeds `form` and `equipped` from the query **once per `characterId`**
  - `useDmCharacterEditor({ campaignId, characterId })` → `CharacterEditor & { campaignId, characterId, artifacts, artifactSets, levelUp(): Promise<void> }`; type `DmCharacterEditor = ReturnType<typeof useDmCharacterEditor>`
  - `useDamagePreview(campaignId, characterId, coefficients: { melee: number; ranged: number })` — key `["character-damage-preview", campaignId, characterId, melee, ranged]`
  - `fetchDamagePreview(...)` (same signature as today) in `lib/hooks/characters/damage-preview.ts`
  - `buildEquipped(equipped: EquippedItems, slotKey: string, artifactId: string | null): EquippedItems` (`lib/utils/artifacts/equipment.ts`)
  - `useEquipArtifact(campaignId, characterId?)` → mutation `(equipped: EquippedItems) => updateInventory(campaignId, characterId!, { equipped })`

- [ ] **Step 1: Failing test** — `lib/utils/artifacts/__tests__/equipment.test.ts`

```ts
import { describe, expect, it } from "vitest";

import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { buildEquipped } from "@/lib/utils/artifacts/equipment";

const [first, second] = ARTIFACT_GRID_9.map((c) => c.key);

describe("buildEquipped", () => {
  it("puts the artifact into the slot and keeps the others", () => {
    expect(buildEquipped({ [second]: "b" }, first, "a")).toEqual({ [first]: "a", [second]: "b" });
  });

  it("clears the slot on null and drops keys outside the grid", () => {
    expect(buildEquipped({ [first]: "a", junk: "x" }, first, null)).toEqual({});
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** — `lib/utils/artifacts/equipment.ts` (the loop from `CharacterArtifactsSection.tsx:84-93`):

```ts
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import type { EquippedItems } from "@/types/inventory";

export function buildEquipped(equipped: EquippedItems, slotKey: string, artifactId: string | null): EquippedItems {
  const next: EquippedItems = {};

  for (const cell of ARTIFACT_GRID_9) {
    const id = cell.key === slotKey ? (artifactId ?? undefined) : (equipped[cell.key] as string | undefined);

    if (id) next[cell.key] = id;
  }

  return next;
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Query hooks**

`lib/hooks/skills/useSkillTrees.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { getSkillTrees } from "@/lib/api/skill-trees";
import { REFERENCE_STALE_MS } from "@/lib/providers/query-provider";

export function useSkillTrees(campaignId: string, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["skill-trees", campaignId],
    queryFn: () => getSkillTrees(campaignId),
    staleTime: REFERENCE_STALE_MS,
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}
```

`useSpells` in `lib/hooks/spells/useSpells.ts` becomes:

```ts
export function useSpells(campaignId: string, opts?: { initialData?: Spell[]; enabled?: boolean }) {
  return useQuery<Spell[]>({
    queryKey: ["spells", campaignId],
    queryFn: () => getSpells(campaignId),
    staleTime: REFERENCE_STALE_MS,
    ...(opts?.initialData !== undefined && { initialData: opts.initialData }),
    enabled: !!campaignId && (opts?.enabled ?? true),
  });
}
```

Add to `useCharacters.ts`: `useCharacter`, `useCreateCharacter`, `useUpdateCharacter` as in Interfaces (`useQuery` / `useCrudMutation`), and extend `useLevelUpCharacter`'s `invalidateKeys` with the four prefixes.

- [ ] **Step 6: Failing test for the editor's seed-once rule** — `lib/hooks/characters/__tests__/useCharacterEditor.test.tsx`

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/api/characters", () => ({
  getCharacter: vi.fn(async () => ({ id: "ch1", name: "Арвен", level: 3, inventory: { equipped: { ring1: "a1" } } })),
  updateCharacter: vi.fn(async () => ({})),
  createCharacter: vi.fn(),
  getCharacters: vi.fn(async () => []),
  levelUpCharacter: vi.fn(),
  deleteCharacter: vi.fn(),
  deleteAllCharacters: vi.fn(),
}));
vi.mock("@/lib/api/campaigns", () => ({ getCampaignMembers: vi.fn(async () => []) }));
vi.mock("@/lib/api/races", () => ({ getRaces: vi.fn(async () => []) }));

import { useCharacterEditor } from "@/lib/hooks/characters";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

afterEach(cleanup);

describe("useCharacterEditor", () => {
  it("seeds the form once and keeps user edits across refetches", async () => {
    const { result } = renderHook(() => useCharacterEditor({ campaignId: "c1", characterId: "ch1", onSaved: vi.fn() }), { wrapper });

    await waitFor(() => expect(result.current.form.formData.basicInfo.name).toBe("Арвен"));
    expect(result.current.equipped).toEqual({ ring1: "a1" });

    act(() => result.current.form.setFormData((prev) => ({ ...prev, basicInfo: { ...prev.basicInfo, name: "Арвен II" } })));
    await act(() => client.invalidateQueries({ queryKey: ["character", "c1", "ch1"] }));

    expect(result.current.form.formData.basicInfo.name).toBe("Арвен II");
  });
});
```

Before running, check `characterToFormData` (`lib/utils/characters/character-form.ts`) maps `name` → `basicInfo.name` and how `getRaces`/`getCampaignMembers` are exported — adjust the mocks to the real export names.

Run: `pnpm test:run lib/hooks/characters/__tests__/useCharacterEditor.test.tsx` — Expected: FAIL (`useCharacterEditor` not exported).

- [ ] **Step 7: Implement the editors**

`lib/hooks/characters/useCharacterEditor.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";

import { useCharacter, useUpdateCharacter } from "./useCharacters";
import { useCharacterForm } from "./useCharacterForm";

import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useRaces } from "@/lib/hooks/races";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { EquippedItems } from "@/types/inventory";

export function useCharacterEditor({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved: () => void }) {
  const query = useCharacter(campaignId, characterId);

  const update = useUpdateCharacter(campaignId, characterId);

  const { members, loading: membersLoading } = useCampaignMembers(campaignId);

  const { data: races = [] } = useRaces(campaignId);

  const [equipped, setEquipped] = useState<EquippedItems>({});

  const form = useCharacterForm({
    onSubmit: async (data) => {
      await update.mutateAsync(data);
      onSaved();
    },
  });

  const { setFormData } = form;

  // Refetches (focus, invalidation) must not overwrite what the user is typing.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!query.data || seededFor.current === characterId) return;

    seededFor.current = characterId;
    setFormData(characterToFormData(query.data)); // eslint-disable-line react-hooks/set-state-in-effect -- seed form from the first server snapshot
    setEquipped((query.data.inventory?.equipped as EquippedItems) ?? {});
  }, [query.data, characterId, setFormData]);

  return { query, form, equipped, setEquipped, members, membersLoading, races };
}

export type CharacterEditor = ReturnType<typeof useCharacterEditor>;
```

If `pnpm lint` reports the disable comment as unused (rule not enabled for this path), drop it.

`lib/hooks/characters/useDmCharacterEditor.ts` — adds artifacts/sets and level-up (logic from `DmCharacterEditForm.tsx:87-124`):

```ts
"use client";

import { useRouter } from "next/navigation";

import { useCharacterEditor } from "./useCharacterEditor";
import { useLevelUpCharacter } from "./useCharacters";

import { useArtifactSetsList } from "@/lib/hooks/artifact-sets";
import { useArtifactsList } from "@/lib/hooks/artifacts";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { ArtifactSetRow } from "@/types/artifact-sets";

export function useDmCharacterEditor({ campaignId, characterId }: { campaignId: string; characterId: string }) {
  const router = useRouter();

  const confirm = useConfirm();

  const notify = useNotify();

  const editor = useCharacterEditor({ campaignId, characterId, onSaved: () => router.push(`/campaigns/${campaignId}/dm/characters`) });

  const loaded = !!editor.query.data;

  const { data: artifacts = [] } = useArtifactsList(campaignId, { enabled: loaded });

  const { data: artifactSets = [] } = useArtifactSetsList(campaignId, { enabled: loaded });

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const levelUp = async () => {
    const { name, level } = editor.form.basicInfo;

    let details: { abilityIncreased?: string; hpGain?: number } | undefined;

    const ok = await confirm({
      title: `Підняти рівень персонажа ${name}? (Рівень ${level} → ${level + 1})`,
      confirmLabel: "Підняти",
      onConfirm: async () => {
        const updated = await levelUpMutation.mutateAsync(characterId);

        editor.form.setFormData(characterToFormData(updated));
        details = updated.levelUpDetails as typeof details;
      },
    });

    if (ok && details) {
      void notify(`Рівень піднято! ${details.abilityIncreased ?? "Характеристика"}: +1, HP: +${details.hpGain ?? 0}, Додано магічні слоти.`);
    }
  };

  return { ...editor, campaignId, characterId, artifacts, artifactSets: artifactSets as ArtifactSetRow[], levelUp };
}

export type DmCharacterEditor = ReturnType<typeof useDmCharacterEditor>;
```

(`router.refresh()` after level-up is not needed: the page is a client page and the mutation invalidates every dependent query.) Export `useCharacterEditor`, `useDmCharacterEditor`, `type CharacterEditor`, `type DmCharacterEditor`, `useCharacter`, `useCreateCharacter`, `useUpdateCharacter`, `useDamagePreview`, `useEquipArtifact` from `lib/hooks/characters/index.ts`.

Run the Step 6 test — Expected: PASS.

- [ ] **Step 8: Pages use the editors**

`app/campaigns/[id]/character/edit/edit-client.tsx`:

```tsx
const router = useRouter();

const { query, form, members, races } = useCharacterEditor({ campaignId: id, characterId, onSaved: () => router.push(`/campaigns/${id}/character`) });

const { formData, error, basicInfo, abilityScores, combatStats, skills, abilities, spellcasting, handleSubmit } = form;

return (
  <div className="container mx-auto p-4 max-w-4xl">
    <QueryState query={query} loading={<LoadingState rows={6} label="Завантаження персонажа…" />}>
      {() => (
        <Card>{/* existing card body unchanged */}</Card>
      )}
    </QueryState>
  </div>
);
```

The `characterLoaded` state, the `useEffect(getCharacter)` and the manual «Завантаження...» card go. Keep the existing `CardTitle` fallback text.

`app/campaigns/[id]/dm/characters/[characterId]/page.tsx`: everything except `viewAsPlayer` moves out; it becomes

```tsx
const editor = useDmCharacterEditor({ campaignId: id, characterId });

const [viewAsPlayer, setViewAsPlayer] = useState(false);
// …toggle bar unchanged…
{viewAsPlayer ? (
  <CharacterViewClient campaignId={id} characterId={characterId} allowPlayerEdit={false} />
) : (
  <QueryState query={editor.query} loading={<LoadingState rows={6} label="Завантаження персонажа…" />}>
    {() => <DmCharacterEditForm editor={editor} />}
  </QueryState>
)}
```

`DmCharacterEditForm` props: `{ editor: DmCharacterEditor }` only. Inside: destructure `const { form, campaignId, characterId, levelUp } = editor;`; the level-up button calls `() => void levelUp()`; delete the local `handleLevelUp`, `useConfirm`, `useNotify`, `useRouter`, `QueryClient` import. `DmCharacterEditFormAccordion` props: `{ editor: DmCharacterEditor }` too (it reads `editor.form.*`, `editor.equipped`, `editor.setEquipped`, `editor.artifacts`, `editor.artifactSets`, `editor.members`, `editor.races`, `editor.membersLoading`, `editor.campaignId`, `editor.characterId`); its existing skill-tree reset `confirm` stays.

`app/campaigns/[id]/dm/characters/new/page.tsx`: `const create = useCreateCharacter(id);` and `useCharacterForm({ onSubmit: async (data) => { await create.mutateAsync(data); router.push(\`/campaigns/${id}/dm/characters\`); } })`.

- [ ] **Step 9: Damage preview**

1. `git mv components/characters/stats/damage-calculator-utils.ts lib/utils/characters/damage-calculator.ts`; cut `fetchDamagePreview` out of it into `lib/hooks/characters/damage-preview.ts` (same body; returns `DamagePreviewResponse` from `@/types/characters`); delete its local `DamagePreviewItem`/`DamagePreviewResponse` and re-export them from `@/types/characters` (`export type { DamagePreviewItem, DamagePreviewResponse } from "@/types/characters";`) so importers keep compiling.
2. Update the six importers: `grep -rln "damage-calculator-utils" app components lib` → `@/lib/utils/characters/damage-calculator` (types, `parseDiceFormulaToSides`, `SkillAffectingDamage`, `SpellEffectKind`) and `./damage-preview` inside `lib/hooks/characters` (`fetchDamagePreview`).
3. `lib/hooks/characters/useDamagePreview.ts`:

```ts
import { useQuery } from "@tanstack/react-query";

import { fetchDamagePreview } from "./damage-preview";

export function useDamagePreview(campaignId: string, characterId: string, coefficients: { melee: number; ranged: number }) {
  return useQuery({
    queryKey: ["character-damage-preview", campaignId, characterId, coefficients.melee, coefficients.ranged],
    queryFn: () => fetchDamagePreview(campaignId, characterId, coefficients.melee, coefficients.ranged, null, null),
    enabled: !!campaignId && !!characterId,
  });
}
```

Check `fetchDamagePreview`'s parameter list first; pass `null` for the dice sums (the component never sent them).

4. `CharacterDamagePreview.tsx`: delete the local types and `fetchDamagePreview`; `const query = useDamagePreview(campaignId, characterId, { melee: meleeCoefficient, ranged: rangedCoefficient });`; move the skeleton JSX into a local `function DamagePreviewSkeleton()` in the same file and render `<QueryState query={query} loading={<DamagePreviewSkeleton />}>{(data) => …existing success JSX using data…}</QueryState>`. The bespoke error card is replaced by `QueryState`'s `ErrorState` with retry.

- [ ] **Step 10: Skill tree, spellbook, equipment**

- `CharacterSkillTreeView.tsx`: replace `trees` state + `useEffect(getSkillTrees)` with `const { data: trees = [] } = useSkillTrees(campaignId);` (cast to `PrismaSkillTree[]` where the existing code expects it). Nothing else changes (item 7 rewrites this view).
- `CharacterSpellbook.tsx`: `const { data: allSpells = [] } = useSpells(campaignId, { enabled: spellbookOpen });` and `const { data: rawTrees = [] } = useSkillTrees(campaignId, { enabled: spellbookOpen && !!characterRace });`. These stay plain `data ?? []` (Review Focus 2 — disabled queries never go into `QueryState`).
- `lib/hooks/characters/useEquipArtifact.ts`:

```ts
import { useMutation } from "@tanstack/react-query";

import { updateInventory } from "@/lib/api/inventory";
import type { EquippedItems } from "@/types/inventory";

export function useEquipArtifact(campaignId: string, characterId?: string) {
  return useMutation({
    mutationFn: (equipped: EquippedItems) => {
      if (!characterId) throw new Error("Немає персонажа");

      return updateInventory(campaignId, characterId, { equipped });
    },
  });
}
```

- `CharacterArtifactsSection.tsx`: `const equip = useEquipArtifact(campaignId, characterId);` and

```tsx
const handleSlotChange = (slotKey: string, artifactId: string | null) => {
  if (!characterId || !onEquippedChange) return;

  const next = buildEquipped(equipped, slotKey, artifactId);

  equip.mutate(next, { onSuccess: () => onEquippedChange(next), onError: () => void notify("Не вдалося змінити спорядження") });
};
// updatingSlot → equip.isPending ? slot being changed : null — keep a `pendingSlot` state set before mutate and cleared in onSettled
```

Keep `updatingSlot` as local UI state (`setUpdatingSlot(slotKey)` before `mutate`, `onSettled: () => setUpdatingSlot(null)`), `notify` from `useNotify()` replaces the `console.error`.

- [ ] **Step 11: Verify and commit**

Run: `grep -rn "@/lib/api" components/characters "app/campaigns/[id]/character" "app/campaigns/[id]/dm/characters"` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks lib/utils components/characters "app/campaigns/[id]/character" "app/campaigns/[id]/dm/characters" "app/campaigns/[id]/dm/spells" && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A lib components app
git commit -m "refactor(characters): character editor, damage preview and equipment in hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 7: Skills, abilities, races

**Files:**
- Create: `lib/hooks/abilities/useCopyOwnerAbilities.ts`, `lib/utils/races/race-summary.ts`, `lib/utils/skills/spell-enhancement.ts`
- Modify: `lib/hooks/skills/useSkills.ts` (add `useSkill`), `lib/hooks/skills/index.ts`, `lib/hooks/abilities/index.ts`
- Modify: `app/campaigns/[id]/dm/skills/[skillId]/edit-skill-client.tsx`, `components/abilities/AbilityCopySourcePicker.tsx`, `components/races/RaceCard.tsx`, `components/skills/form/spell/{SkillSpellEnhancement,SkillSpellSection}.tsx`
- Test: `lib/utils/races/__tests__/race-summary.test.ts`, `lib/utils/skills/__tests__/spell-enhancement.test.ts`; existing `components/abilities/__tests__/AbilityCopySourcePicker.test.tsx` stays green

**Interfaces:**
- Produces:
  - `useSkill(campaignId, skillId)` — key `["skill", campaignId, skillId]`, `staleTime: 0` (as today)
  - `useCopyOwnerAbilities(campaignId)` — `useMutation({ mutationFn: (s: AbilitySourceRef) => getOwnerAbilities(campaignId, s.kind, s.id).then((r) => r.abilities) })`
  - `countRaceSkills(race: Race, skills: Skill[]): number`, `raceMainSkillsForDisplay(race: Race, mainSkills: MainSkill[]): MainSkill[]`, `normalizePassiveAbility(race: Race): { description: string; statImprovements?: string; statModifiers?: Record<string, StatModifier> } | null`, `modifiedAbilityScores(passive): typeof ABILITY_SCORES` (`lib/utils/races/race-summary.ts`)
  - `parseDamageDice(dice?: string): { count: string; sides: string }` (`lib/utils/skills/spell-enhancement.ts`); module constants `SPELL_TARGET_SELECT_OPTIONS`, `DAMAGE_MODIFIER_SELECT_OPTIONS`, `DICE_SIDE_OPTIONS`
  - `SkillSpellEnhancement` props: `{ value: SpellEnhancementValue; spells: SpellOption[]; actions: SpellEnhancementActions }` where `SpellEnhancementValue = { types: SpellEnhancementType[]; effectIncrease: string; targetChange: string | null; additionalModifier: { modifier?: string; damageDice?: string; duration?: number }; newSpellId: string | null }` and `SpellEnhancementActions = { toggleType(t); setEffectIncrease(v); setTargetChange(v); setAdditionalModifier(m); setNewSpellId(v) }`

- [ ] **Step 1: Failing tests**

`lib/utils/races/__tests__/race-summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { countRaceSkills, normalizePassiveAbility, raceMainSkillsForDisplay } from "@/lib/utils/races/race-summary";
import type { MainSkill } from "@/types/main-skills";
import type { Race } from "@/types/races";
import type { Skill } from "@/types/skills";

const race = { id: "r1", name: "Ельф", availableSkills: ["ms1"], passiveAbility: "Темний зір" } as unknown as Race;

const skill = (mainSkillId: string | null, races: string[] = []) => ({ id: `${mainSkillId}-${races.join()}`, mainSkillId, races }) as unknown as Skill;

describe("race summary", () => {
  it("counts skills of allowed main skills that are open to the race", () => {
    expect(countRaceSkills(race, [skill("ms1"), skill("ms2"), skill("ms1", ["r2"]), skill("ms1", ["Ельф"])])).toBe(2);
  });

  it("without main-skill limits counts every skill open to the race", () => {
    expect(countRaceSkills({ ...race, availableSkills: [] } as Race, [skill("ms1"), skill("ms2", ["r2"])])).toBe(1);
  });

  it("shows all regular main skills when the race has no limits", () => {
    const ms = [{ id: "ms1" }, { id: "racial" }, { id: "ultimate" }] as MainSkill[];

    expect(raceMainSkillsForDisplay({ ...race, availableSkills: [] } as Race, ms).map((m) => m.id)).toEqual(["ms1"]);
  });

  it("normalizes a string passive ability", () => {
    expect(normalizePassiveAbility(race)).toEqual({ description: "Темний зір", statImprovements: undefined, statModifiers: undefined });
  });
});
```

Before writing it, read `getSkillMainSkillId`/`getSkillRaces` in `lib/utils/skills/skill-helpers.ts` and build the `skill()` fixture in the shape they read (field names may differ from `mainSkillId`/`races`).

`lib/utils/skills/__tests__/spell-enhancement.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseDamageDice } from "@/lib/utils/skills/spell-enhancement";

describe("parseDamageDice", () => {
  it("splits count and sides", () => expect(parseDamageDice("2d8")).toEqual({ count: "2", sides: "8" }));
  it("defaults sides to 6 and count to empty", () => expect(parseDamageDice(undefined)).toEqual({ count: "", sides: "6" }));
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm test:run lib/utils/races lib/utils/skills/__tests__/spell-enhancement.test.ts`

- [ ] **Step 3: Implement**

`race-summary.ts`: move the bodies of `availableSkillsCount` (`RaceCard.tsx:35-77`, minus the narrating comments), `availableMainSkillsForDisplay` (84–95), `passiveAbility` (97–123) and `modifiedAbilities` (126–133) into the four exported functions, unchanged in behavior.

`spell-enhancement.ts`:

```ts
import { DICE_OPTIONS } from "@/lib/constants/dice";
import { DAMAGE_MODIFIER_OPTIONS, SPELL_TARGET_OPTIONS } from "@/lib/constants/spells";

export const SPELL_TARGET_SELECT_OPTIONS = SPELL_TARGET_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const DAMAGE_MODIFIER_SELECT_OPTIONS = DAMAGE_MODIFIER_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

export const DICE_SIDE_OPTIONS = DICE_OPTIONS.map((d) => ({ value: d.value.replace("d", ""), label: d.label }));

export function parseDamageDice(dice?: string) {
  return { count: dice?.match(/^(\d+)/)?.[1] || "", sides: dice?.match(/d(\d+)/)?.[1] || "6" };
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Components**

- `RaceCard.tsx`: keep `useSkills`/`useMainSkills`; replace the inline logic with `const skillsCount = useMemo(() => countRaceSkills(race, allSkills), [race, allSkills]);`, `const mainSkillsForDisplay = useMemo(() => raceMainSkillsForDisplay(race, mainSkills), [race, mainSkills]);`, `const passiveAbility = normalizePassiveAbility(race);`, `const modifiedAbilities = modifiedAbilityScores(passiveAbility);`.
- `SkillSpellEnhancement.tsx`: props become `{ value, spells, actions }` (Interfaces); delete the four `has*` memos (use `value.types.includes(...)` inline via a local `const has = (t: SpellEnhancementType) => value.types.includes(t);`), the three static-option memos (use the module constants), and `diceCount`/`diceType` memos (`const dice = parseDamageDice(value.additionalModifier.damageDice);`). `spellOptions` stays a `useMemo` over `spells`. `SkillSpellSection.tsx` passes
  `value={{ types: spellEnhancementTypes, effectIncrease: spellEffectIncrease, targetChange: spellTargetChange, additionalModifier: spellAdditionalModifier, newSpellId: spellNewSpellId }}` and
  `actions={{ toggleType: handlers.handleEnhancementTypeToggle, setEffectIncrease: enhancementSetters.setSpellEffectIncrease, setTargetChange: enhancementSetters.setSpellTargetChange, setAdditionalModifier: enhancementSetters.setSpellAdditionalModifier, setNewSpellId: enhancementSetters.setSpellNewSpellId }}`. Keep `memo(...)` on the component; since `value`/`actions` are new objects each render, wrap both in `useMemo` in `SkillSpellSection` (deps = the listed fields/setters) so memoization still works.
- `edit-skill-client.tsx`: `const query = useSkill(campaignId, skillId);` and render

```tsx
<div className="container mx-auto p-4 max-w-4xl">
  <QueryState query={query} loading={<LoadingState rows={6} label="Завантаження скіла…" />}>
    {(skill) => <SkillCreateForm campaignId={campaignId} spells={spells} spellGroups={spellGroups} initialMainSkills={initialMainSkills} initialData={skill as unknown as GroupedSkill} />}
  </QueryState>
</div>
```

  The custom error block (with «Назад до бібліотеки скілів») is replaced by `ErrorState`; keep the back link by rendering it under the `QueryState` only when `query.isError`.
- `AbilityCopySourcePicker.tsx`: `const copy = useCopyOwnerAbilities(campaignId);` replaces `busy`/`error`/try-catch: `pick = (s) => copy.mutate(s, { onSuccess: onPick })`; `busy` → `copy.isPending`; error text → `copy.isError ? \`Не вдалося завантажити вміння «${copy.variables?.name}». Спробуйте ще раз.\` : null`. Its test mocks `@/lib/api/abilities` — still valid.

- [ ] **Step 6: Verify and commit**

Run: `grep -rn "@/lib/api" components/abilities components/races components/skills "app/campaigns/[id]/dm/skills"` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks/skills lib/hooks/abilities lib/utils/races lib/utils/skills components/abilities components/races components/skills "app/campaigns/[id]/dm/skills" && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A lib components app
git commit -m "refactor(skills): skill query, ability copy, race summary and spell enhancement out of components

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Battles (setup pages, spell preview, spell dialog)

**Files:**
- Move: `app/campaigns/[id]/dm/battles/new/{useBattleForm,useNewBattleData,useNewBattlePage,useBattleParticipants,useBalanceSuggestions}.ts` and `app/campaigns/[id]/dm/battles/[battleId]/useEditBattleData.ts` → `lib/hooks/battles/setup/`
- Move: `app/campaigns/[id]/dm/battles/new/types.ts` → `types/battle-setup.ts`; `EditBattleCharacter`, `EditBattleUnit` from `useEditBattleData.ts` → `types/battle-setup.ts`
- Create: `lib/hooks/battles/useBattleSetupQueries.ts`, `lib/hooks/battles/useSpellPreview.ts`
- Modify: `lib/hooks/battles/useBattles.ts` (add `useCreateBattle`, `useDeleteAllBattles`), `lib/hooks/battles/index.ts`
- Modify: `app/campaigns/[id]/dm/battles/new/{page,SidePanelCard,AutopickCard,CharactersListCard,UnitsListCard}.tsx`, `app/campaigns/[id]/dm/battles/[battleId]/{page,AvailableCharactersCard,AvailableUnitsCard,ParticipantSideCard}.tsx`, `app/campaigns/[id]/dm/battles/page-client.tsx`, `app/campaigns/[id]/battles/[battleId]/page.tsx`, `components/battle/dialogs/spell-dialog/useSpellDialog.ts`
- Test: `lib/hooks/battles/__tests__/useEditBattleData.test.tsx`

**Interfaces:**
- Produces:
  - types in `@/types/battle-setup`: `SetupCharacter` (was `Character`), `SetupUnit` (was `Unit`), `AllyStats`, `SuggestedEnemy`, `SetupParticipant` (was `Participant`), `CharacterDprBreakdown`, `EntityStats`, `Difficulty`, `EditBattleCharacter`, `EditBattleUnit` — renamed to avoid clashing with the domain `Character`/`Unit`/`Participant` types in `types/`
  - `useSetupRoster(campaignId)` → `{ characters: SetupCharacter[]; units: SetupUnit[]; isPending: boolean }` — `useCharacters(campaignId, { compact: true })` + `useUnits(campaignId)` (existing hooks, shared cache)
  - `useBattleBalanceStats(campaignId)` → `useQuery({ queryKey: ["battle-balance", campaignId], queryFn: () => getBattleBalance(campaignId, {}), select: (d) => d.characterStats != null || d.unitStats != null ? { characterStats: d.characterStats ?? {}, unitStats: d.unitStats ?? {} } : null })`
  - `useBattleBalance(campaignId)` → `useMutation({ mutationFn: (body: BattleBalanceBody) => getBattleBalance(campaignId, body) })` (on-demand ally stats / suggestions)
  - `useCreateBattle(campaignId)` → `useCrudMutation({ mutationFn: (data: CreateBattleData) => createBattle(campaignId, data), invalidateKeys: [["battles", campaignId]] })` — check the battles list key in `useBattles.ts` and use it
  - `useDeleteAllBattles(campaignId)` → mutation `deleteAllBattles`, `onSuccess` → `router.refresh()`
  - `useSpellPreview(campaignId, battleId)` → `useMutation({ mutationFn: (data: SpellCastData) => spellPreview(campaignId, battleId, data) })`
  - all moved hooks keep their names and return shapes and are exported from `@/lib/hooks/battles`

- [ ] **Step 1: Move types**

`git mv "app/campaigns/[id]/dm/battles/new/types.ts" types/battle-setup.ts`; rename `Character` → `SetupCharacter`, `Unit` → `SetupUnit`, `Participant` → `SetupParticipant`; append `EditBattleCharacter` and `EditBattleUnit` (cut from `useEditBattleData.ts:17-30`). Re-export from `types/index.ts` only if that barrel re-exports every domain file (check it; follow its pattern). Update the five components under `new/` and three under `[battleId]/` to `import type { … } from "@/types/battle-setup";` with the new names.

- [ ] **Step 2: Move hooks**

```bash
mkdir -p lib/hooks/battles/setup
git mv "app/campaigns/[id]/dm/battles/new/useBattleForm.ts" lib/hooks/battles/setup/useBattleForm.ts
git mv "app/campaigns/[id]/dm/battles/new/useNewBattleData.ts" lib/hooks/battles/setup/useNewBattleData.ts
git mv "app/campaigns/[id]/dm/battles/new/useNewBattlePage.ts" lib/hooks/battles/setup/useNewBattlePage.ts
git mv "app/campaigns/[id]/dm/battles/new/useBattleParticipants.ts" lib/hooks/battles/setup/useBattleParticipants.ts
git mv "app/campaigns/[id]/dm/battles/new/useBalanceSuggestions.ts" lib/hooks/battles/setup/useBalanceSuggestions.ts
git mv "app/campaigns/[id]/dm/battles/[battleId]/useEditBattleData.ts" lib/hooks/battles/setup/useEditBattleData.ts
```

Fix `./types` imports → `@/types/battle-setup`; export `useNewBattlePage`, `useEditBattleData` from `lib/hooks/battles/index.ts` (the other four are internal to `useNewBattlePage` — keep them unexported). Pages import from `@/lib/hooks/battles`.

Run: `pnpm exec tsc --noEmit` — Expected: clean (pure move).
Commit the move alone so the later diff is readable:

```bash
git add -A app lib types
git commit -m "refactor(battles): move battle setup hooks and types into lib/hooks and types

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Failing test for the edit page seed-once rule** — `lib/hooks/battles/__tests__/useEditBattleData.test.tsx`

Mock `next/navigation`, `@/lib/api/battles` (`getBattle` → `{ id: "b1", name: "Засідка", description: "", participants: [{ id: "ch1", type: "character", side: "ally" }] }`, plus the other functions `useBattles.ts` imports as `vi.fn()`), `@/lib/api/characters` (`getCharacters` → `[]`), `@/lib/api/units` (`getUnits` → `[]`); wrap in `QueryClientProvider` + `ConfirmProvider`. Assert: after load `formData.name === "Засідка"`; after `setFormData({ name: "Нова", description: "" })` and `invalidateQueries({ queryKey: [<battle key>] })` (read the key from `useBattle` in `useBattles.ts`) the name stays `"Нова"` and `participants` are not reset; `loading` is `false` once both queries resolve.

Run it — Expected: FAIL on the "stays" assertion (current effect re-seeds on every `battle` change).

- [ ] **Step 4: Queries instead of effects**

`lib/hooks/battles/useBattleSetupQueries.ts` with `useSetupRoster`, `useBattleBalanceStats`, `useBattleBalance` as in Interfaces. The `console.info` debug block from `useNewBattleData` goes (debug-only output).

- `useNewBattleData` → `const roster = useSetupRoster(campaignId); const { data: entityStats = null } = useBattleBalanceStats(campaignId);` returns `{ characters: roster.characters, units: roster.units, entityStats, loadingData: roster.isPending, races }`.
- `useEditBattleData` → `useSetupRoster` replaces the load effect (`loading: roster.isPending || loadingBattle`); the battle → form effect becomes seed-once per `battleId` (same `useRef` pattern as `useCharacterEditor`, Task 6 Step 7); `console.error` lines in `onError` go (the `notify` stays).
- `useBalanceSuggestions` → `const balance = useBattleBalance(campaignId);` replaces `balanceLoading` (`balance.isPending`) and both try/catch blocks: `fetchAllyStats = () => hasAllies && balance.mutate({ allyParticipants }, { onSuccess: (d) => setAllyStats((d.allyStats ?? null) as AllyStats | null) })`; `suggestEnemies` analogous with the full body and `setSuggestedEnemies`. Keep `useCallback` where today's code has it.
- `useBattleForm` → `const create = useCreateBattle(campaignId);` replaces `loading` + try/catch: `create.mutate({ name, description, participants }, { onSuccess: (battle) => router.push(\`/campaigns/${campaignId}/dm/battles/${battle.id}\`), onError: (error) => void notify(error instanceof Error ? error.message : "Помилка при створенні бою") })` (the «Оберіть хоча б одного учасника» guard stays before it); return `{ loading: create.isPending, handleSubmit }`.

Run the Step 3 test — Expected: PASS.

- [ ] **Step 5: Spell preview and spell dialog**

`useSpellPreview` as in Interfaces. In `app/campaigns/[id]/battles/[battleId]/page.tsx` replace `spellPreviewLoading` state and the try/catch with

```tsx
const preview = useSpellPreview(id, battleId);

const handleSpellPreview = (data: PendingSpellData) =>
  preview.mutate(data, {
    onSuccess: (json) => {
      if (json.preview && json.battleAction) {
        setSpellPreviewAction(json.battleAction as BattleAction);
        setPendingSpellData(data);
        setSpellResultModalOpen(true);
      }
    },
    onError: () => void notify("Не вдалося порахувати превʼю заклинання"),
  });
// spellPreviewLoading → preview.isPending
```

Name the inline object type of `pendingSpellData` `PendingSpellData` (local `type`) — it is used twice. Check how `handleSpellPreview` is passed down: it was a stable `useMemo`; if a child lists it in effect deps, wrap the new function in `useCallback` with `[preview.mutate]`.

`useSpellDialog.ts`: replace `spells` state + the load effect with

```ts
const { data: allSpells = [] } = useSpells(campaignId, { enabled: open && !!caster && !!campaignId });

const spells = useMemo(() => {
  if (allowAllSpells) return allSpells as SpellDialogSpell[];

  const knownIds = caster?.spellcasting.knownSpells ?? [];

  return (allSpells as SpellDialogSpell[]).filter((s) => knownIds.includes(s.id));
}, [allSpells, allowAllSpells, caster]);
```

- [ ] **Step 6: Delete-all battles via `useConfirm`**

In `app/campaigns/[id]/dm/battles/page-client.tsx` `DeleteAllBattlesButton`: delete `showDeleteDialog`, `isDeleting`, `handleDeleteAll` and the `ResponsiveDialog`; use

```tsx
const confirm = useConfirm();

const deleteAll = useDeleteAllBattles(campaignId);

const handleClick = () =>
  confirm({
    title: "Видалити всі битви?",
    description: `Ця дія видалить всі сцени бою з кампанії (${battlesCount} битв). Цю дію неможливо скасувати.`,
    confirmLabel: "Видалити всі",
    destructive: true,
    onConfirm: () => deleteAll.mutateAsync(),
  });
// <Button variant="destructive" … onClick={() => void handleClick()} disabled={deleteAll.isPending}>
```

- [ ] **Step 7: Verify and commit**

Run: `grep -rn "@/lib/api" "app/campaigns/[id]/dm/battles" "app/campaigns/[id]/battles" components/battle` — Expected: no output.
Run: `find app -name "use*.ts"` — Expected: no output.
Run: `pnpm exec eslint --fix lib/hooks/battles types "app/campaigns/[id]/dm/battles" "app/campaigns/[id]/battles" components/battle && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A lib types app components
git commit -m "refactor(battles): setup data, balance, spell preview and delete-all through hooks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Confirm dialogs → `useConfirm`; DM characters page

**Files:**
- Delete: `app/campaigns/[id]/dm/characters/__dialogs__/{DeleteAllCharactersDialog,DeleteCharacterDialog}.tsx`, `app/campaigns/[id]/dm/skills/__dialogs__/DeleteAllSkillsDialog.tsx`, `components/skills/list/SkillCardDeleteDialog.tsx`, `components/spells/dialogs/{DeleteAllSpellsDialog,RemoveAllSpellsDialog}.tsx`, `components/units/dialogs/DeleteAllUnitsDialog.tsx`
- Create: `app/campaigns/[id]/dm/characters/DmCharacterCard.tsx`, `lib/hooks/characters/useDmCharactersPage.ts`
- Modify: `app/campaigns/[id]/dm/{characters,skills,spells,units}/page-client.tsx`, `components/skills/list/{SkillCard,SkillGroupAccordion}.tsx`, `components/spells/list/{SpellGroupAccordion,SpellLevelAccordion}.tsx`, `lib/hooks/spells/useSpellGroupActions.ts`, `components/spells/dialogs/index.ts` / `components/units/dialogs/index.ts` (if they re-export the deleted files)
- Test: `components/spells/__tests__/SpellLevelAccordion.test.tsx`, `app/campaigns/[id]/dm/characters/__tests__/page-client.test.tsx`; update `components/skills/__tests__/SkillCard.test.tsx`, `components/skills/__tests__/SkillGroupAccordionItem.test.tsx` if they open the old dialogs

**Interfaces:**
- Consumes: `useConfirm` (`ConfirmOptions` with `onConfirm: () => Promise<unknown>`), existing mutations `useDeleteAllCharacters`, `useDeleteCharacter`, `useLevelUpCharacter`, `useDeleteAllSkills`, `useDeleteSkill`, `useDeleteAllSpells`, `useDeleteSpellsByLevel`, `useRemoveAllSpellsFromGroup`, `useDeleteAllUnits`.
- Produces:
  - `useSpellGroupActions` returns `dialogs.rename` only (no `dialogs.removeAll`), `handlers.confirmRemoveAll(): Promise<boolean>` (replaces `handleRemoveAllSpells`), `pending.isRemoving` stays
  - `useDmCharactersPage(campaignId)` → `{ query, levelUp(character), confirmDelete(character), confirmDeleteAll(), isDeletingAll }`
  - `DmCharacterCard` props `{ character: Character; campaignId: string; actions: { onLevelUp(): void; onDelete(): void }; busy: boolean }`

Every replacement uses `onConfirm: () => mutation.mutateAsync(...)` (Review Focus 3) — never `mutate`, never close-then-mutate.

- [ ] **Step 1: Failing test** — `components/spells/__tests__/SpellLevelAccordion.test.tsx`

```tsx
// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithConfirm } from "@/components/ui/__tests__/render-with-confirm";

const mutateAsync = vi.fn(async () => ({}));

vi.mock("@/lib/hooks/spells", async (orig) => ({ ...(await orig<typeof import("@/lib/hooks/spells")>()), useDeleteSpellsByLevel: () => ({ mutateAsync, isPending: false }) }));

import { SpellLevelAccordion } from "@/components/spells/list/SpellLevelAccordion";

afterEach(() => {
  cleanup();
  mutateAsync.mockClear();
});

const renderIt = () =>
  renderWithConfirm(
    <QueryClientProvider client={new QueryClient()}>
      <SpellLevelAccordion levelName="Рівень 3" level={3} spells={[]} campaignId="c1" spellGroups={[]} onRemoveSpellFromGroup={vi.fn()} onMoveSpellToGroup={vi.fn()} />
    </QueryClientProvider>,
  );

describe("SpellLevelAccordion delete level", () => {
  it("deletes after confirm", async () => {
    renderIt();
    fireEvent.click(screen.getByTitle("Видалити всі заклинання рівня"));
    fireEvent.click(await screen.findByRole("button", { name: /видалити/i, hidden: false }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(3));
  });

  it("does nothing on cancel", async () => {
    renderIt();
    fireEvent.click(screen.getByTitle("Видалити всі заклинання рівня"));
    fireEvent.click(await screen.findByRole("button", { name: "Скасувати" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
```

Read `components/ui/__tests__/confirm-dialog.test.tsx` first and locate the confirm button the same way it does (by the confirm label «Видалити»; the trash trigger has only a `title`, so the name query does not collide). If `SpellLevelAccordion` has more required props than listed, add them from its props interface. The trigger sits in the accordion header row, so it is rendered while collapsed.

Run: `pnpm test:run components/spells/__tests__/SpellLevelAccordion.test.tsx` — Expected: FAIL (the old inline dialog uses `mutate`, not `mutateAsync`).

- [ ] **Step 2: `SpellLevelAccordion`**

Delete `deleteDialogOpen` and the `ResponsiveDialog`; the trash button calls

```tsx
const confirm = useConfirm();

const handleDelete = () =>
  confirm({
    title: "Видалити всі заклинання рівня?",
    description: `Ви впевнені, що хочете видалити всі заклинання рівня "${levelName}"? Ця дія незворотна. Буде видалено ${spells.length} заклинань.`,
    confirmLabel: "Видалити",
    destructive: true,
    onConfirm: () => deleteSpellsByLevelMutation.mutateAsync(level),
  });
```

Run the Step 1 test — Expected: PASS.

- [ ] **Step 3: Same replacement at the other sites**

For each, delete the dialog's open state and JSX, call `confirm(...)` with the old dialog's title/description/confirm label and `destructive: true`, `onConfirm: () => <mutation>.mutateAsync(<args>)`, then delete the dialog component file:

| Site | Title / description source | Mutation |
|---|---|---|
| `dm/skills/page-client.tsx` | `DeleteAllSkillsDialog.tsx` (keeps its count text) | `deleteAllSkillsMutation.mutateAsync()` |
| `components/skills/list/SkillCard.tsx` | `SkillCardDeleteDialog.tsx` | the mutation `handleConfirmRemove` calls today |
| `dm/spells/page-client.tsx` | `DeleteAllSpellsDialog.tsx` | `deleteAllSpellsMutation.mutateAsync()` |
| `dm/units/page-client.tsx` | `DeleteAllUnitsDialog.tsx` | `deleteAllUnitsMutation.mutateAsync()` |
| `useSpellGroupActions.ts` (`SpellGroupAccordion`, `SkillGroupAccordion`) | `RemoveAllSpellsDialog.tsx`, with `groupName` in the description | `removeAllSpellsMutation.mutateAsync(groupId)` inside `confirmRemoveAll` |

`useSpellGroupActions` gets `const confirm = useConfirm();` and

```ts
const confirmRemoveAll = useCallback(
  () =>
    groupId
      ? confirm({
          title: "Видалити всі заклинання з групи?",
          description: `Ви впевнені, що хочете видалити всі заклинання з групи "${groupName}"? Заклинання не будуть видалені, але вони втратять зв'язок з цією групою.`,
          confirmLabel: "Видалити всі з групи",
          destructive: true,
          onConfirm: () => removeAllSpellsMutation.mutateAsync(groupId),
        })
      : Promise.resolve(false),
  [confirm, groupId, groupName, removeAllSpellsMutation],
);
```

The two accordions call `() => void actions.handlers.confirmRemoveAll()` where they opened the dialog. Where the old sites caught errors and called `notify`, drop that (`useConfirm` shows the error in the dialog).


- [ ] **Step 4: DM characters page**

`lib/hooks/characters/useDmCharactersPage.ts`:

```ts
"use client";

import { useCharacters, useDeleteAllCharacters, useDeleteCharacter, useLevelUpCharacter } from "./useCharacters";

import { useConfirm, useNotify } from "@/lib/hooks/common";
import type { Character } from "@/types/characters";

export function useDmCharactersPage(campaignId: string) {
  const confirm = useConfirm();

  const notify = useNotify();

  const query = useCharacters(campaignId);

  const deleteAll = useDeleteAllCharacters(campaignId);

  const deleteOne = useDeleteCharacter(campaignId);

  const levelUpMutation = useLevelUpCharacter(campaignId);

  const levelUp = (character: Character) =>
    levelUpMutation.mutate(character.id, { onError: () => void notify("Не вдалося підняти рівень. Спробуйте ще раз.") });

  const confirmDelete = (character: Character) =>
    confirm({
      title: "Видалити персонажа?",
      description: `Персонажа "${character.name}" буде видалено. Цю дію не можна скасувати.`,
      confirmLabel: "Видалити",
      destructive: true,
      onConfirm: () => deleteOne.mutateAsync(character.id),
    });

  const confirmDeleteAll = () =>
    confirm({
      title: "Видалити всіх персонажів?",
      description: "Буде видалено всіх персонажів гравців у цій кампанії. Цю дію не можна скасувати.",
      confirmLabel: "Видалити всіх",
      destructive: true,
      onConfirm: () => deleteAll.mutateAsync(),
    });

  return { query, levelUp, confirmDelete, confirmDeleteAll, isDeletingAll: deleteAll.isPending, levelingUpId: levelUpMutation.isPending ? levelUpMutation.variables : undefined };
}
```


`page-client.tsx`: extract the per-character `<Card>` JSX (from `characters.map` to the end of the card) into `DmCharacterCard.tsx` (props per Interfaces; the dropdown items call `actions.onLevelUp`/`actions.onDelete`). The page becomes header + `<QueryState query={page.query} loading={<LoadingState rows={6} label="Завантаження персонажів…" />} empty={/* the current `<EmptyState icon={Users} title="Ще немає персонажів" …>` block from page-client.tsx:230, moved as is */}>{(characters) => <div className="grid …">{characters.map((c) => <DmCharacterCard key={c.id} character={c} campaignId={campaignId} busy={page.levelingUpId === c.id} actions={{ onLevelUp: () => page.levelUp(c), onDelete: () => void page.confirmDelete(c) }} />)}</div>}</QueryState>`. The «Видалити всіх» button needs the list length: read `page.query.data?.length ?? 0`.

Test `app/campaigns/[id]/dm/characters/__tests__/page-client.test.tsx`: mock `@/lib/api/characters` (`getCharacters` → two characters, `deleteAllCharacters` → `vi.fn(async () => ({}))`), `next/link`, `@/components/common/OptimizedImage` (copy the stubs from `components/skills/__tests__/SkillCard.test.tsx`); render inside `QueryClientProvider` via `renderWithConfirm`; click «Видалити всіх», confirm → `deleteAllCharacters` called with `"c1"`; and a case where `deleteAllCharacters` rejects with `new Error("Збій")` → the dialog stays open and shows `Збій` (Review Focus 3).

- [ ] **Step 5: Verify and commit**

Run: `grep -rln "DeleteAllCharactersDialog\|DeleteCharacterDialog\|DeleteAllSkillsDialog\|SkillCardDeleteDialog\|DeleteAllSpellsDialog\|RemoveAllSpellsDialog\|DeleteAllUnitsDialog" app components lib` — Expected: no output.
Run: `grep -rln "ResponsiveDialog" app components | grep -v components/ui | xargs grep -l 'variant="destructive"'` — Expected: no output (no hand-rolled confirm left).
Run: `pnpm exec eslint --fix app components lib/hooks && pnpm exec tsc --noEmit && pnpm test:run`

```bash
git add -A app components lib
git commit -m "refactor(ui): every confirmation through useConfirm; DM characters page via hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: ESLint guard, docs, final verification

**Files:**
- Modify: `eslint.config.mjs`, `ARCHITECTURE.md` (§3.1, line ~114), `CLAUDE.md` (Component API conventions → Layering bullet mentions the lint rule)

- [ ] **Step 1: Guard**

In `eslint.config.mjs`, above `const eslintConfig = …`, extract the dialog paths:

```js
const DIALOG_RESTRICTED_PATHS = [
  { name: "@/components/ui/dialog", message: "Використайте ResponsiveDialog з @/components/ui/responsive-dialog" },
  { name: "@/components/ui/alert-dialog", message: "Використайте useConfirm з @/lib/hooks/common" },
  { name: "vaul", message: "Використайте ResponsiveDialog з @/components/ui/responsive-dialog" },
];
```

The existing block uses `paths: DIALOG_RESTRICTED_PATHS`. Add a block right after it (later block wins for overlapping files, so it repeats the paths):

```js
{
  files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  ignores: ["app/api/**", "components/ui/**", "**/__tests__/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: DIALOG_RESTRICTED_PATHS,
        patterns: [{ group: ["@/lib/api", "@/lib/api/*"], message: "Компоненти не ходять в API — використайте хук із @/lib/hooks/<domain>." }],
      },
    ],
  },
},
```

- [ ] **Step 2: Prove the guard works**

Run: `printf 'import { getSpells } from "@/lib/api/spells";\nimport { Dialog } from "@/components/ui/dialog";\nexport const x = [getSpells, Dialog];\n' > components/__guard_probe.ts && pnpm exec eslint components/__guard_probe.ts; rm components/__guard_probe.ts`
Expected: two `no-restricted-imports` errors (the api pattern message and the dialog path message).

Run: `pnpm lint`
Expected: 0 errors (warnings allowed only if they existed on `main`; compare with `git stash; pnpm lint; git stash pop` if unsure).

- [ ] **Step 3: Docs**

`ARCHITECTURE.md` §3.1: replace «Виклики йдуть з клієнтських компонентів або з хуків» with «Виклики йдуть лише з хуків (`lib/hooks/<domain>`); компоненти й сторінки імпортувати `@/lib/api/*` не можуть — це перевіряє ESLint (`no-restricted-imports`). Типи, потрібні компонентам, лежать у `types/`.» `CLAUDE.md` → "Component API conventions" → the Layering bullet: append «enforced by ESLint (`no-restricted-imports` on `@/lib/api/*` in `app/**` except `app/api/**` and `components/**`)».

- [ ] **Step 4: Full verification**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm test:run`
Expected: all green; note the test count.

Run: `grep -rln "@/lib/api" app components | grep -v "^app/api" | grep -v __tests__` — Expected: no output.
Run: `find app -name "use*.ts" -not -path "app/api/*"` — Expected: no output.

Run (local DB only — check `.env.local` `DATABASE_URL` points at `127.0.0.1:54322` first; start it with `pnpm db:local` if needed): `pnpm simulate-battle`
Expected: `34/34`.

- [ ] **Step 5: Browser check at phone width**

`pnpm dev`, then in Chrome at 390px (resize the window; if it does not resize, an iframe of width 390 on the same origin): DM artifacts list (slot change, delete with confirm, «Видалити всі»), artifact set form (members picker loads), DM characters list (level up, delete one, delete all — confirm sheet), DM character edit (loads, level up, save), player character edit, unit edit page + quick stats on the units list (bad AC reverts), spells list (delete level, remove all from group), skill edit page, new battle (roster loads, ally stats, suggestions) and edit battle, spell cast preview in a battle. Note anything off in the ledger.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.mjs ARCHITECTURE.md CLAUDE.md
git commit -m "chore(lint): forbid @/lib/api in components and pages; docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

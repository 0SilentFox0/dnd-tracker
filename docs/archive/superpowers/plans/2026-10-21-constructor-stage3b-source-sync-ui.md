# Етап 3b — оновлення з джерела: UI. План реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ кампанії чи шаблону з `createdFromId` відкриває діалог «Оновлення з шаблону» (на шаблоні — «з джерела»), бачить зміни з галочками й статусами і застосовує або ігнорує вибране.

**Architecture:**
- Шари за CLAUDE.md:
  - `lib/api/source-sync.ts` — запити;
  - `lib/hooks/campaigns/useSourceSync.ts` — TanStack Query;
  - `lib/utils/campaigns/source-sync.ts` — чиста логіка вибору, залежностей і групування;
  - `components/campaigns/templates/SourceSyncDialog.tsx` — рендер.
- Кнопка відкриття — `SourceSyncButton`: у `CampaignSettingsDialog` (секція «Шаблони») і в банері шаблону на сторінці кампанії.

**Tech Stack:** React 19, TanStack Query, `ResponsiveDialog hud`, `HudSection`, `HudPill`, `Checkbox`, `EmptyState`/`LoadingState`/`ErrorState`, `useNotify`, Vitest + happy-dom + Testing Library.

**Spec:** `docs/archive/superpowers/specs/2026-10-21-constructor-stage3-source-sync-design.md` (розділ 4 «UI»). API з 3a описано в `docs/architecture/content-api.md` («Оновлення з джерела»).

## Global Constraints

- Worktree `/Users/silentfox/Work/dnd-tracker-constructor`, гілка `feat/constructor`; основну папку не чіпати; БД лише `constructor`. Не зливати в `main`, нічого не деплоїти.
- Компоненти не імпортують `@/lib/api/*` (ESLint); запити — у `lib/api`, стан і логіка — в хуках або `lib/utils`; компонент викликає хук і рендерить.
- Діалоги тільки через `ResponsiveDialog` (`hud`); кнопки — у `footer`. Підтвердження й повідомлення — `useConfirm()`/`useNotify()`.
- Ключі запитів — фабрика в `lib/hooks/campaigns/keys.ts`, не інлайн-масиви. Імпорт хуків — з barrel `@/lib/hooks/campaigns`.
- Diff запитується лише при відкритому діалозі (`enabled: open`), без фонового опитування й лічильника на кнопці (egress).
- Тіло apply/ignore: `{ apply: SyncRef[], ignore: SyncRef[] }`, `SyncRef = { scope, key, sourceHash, status }` — значення беруться з пункту diff як є.
- Тексти українською. Коментарі мінімальні; ≤ ~7 пропсів; колбеки групуються в об'єкт.
- Тести UI: `// @vitest-environment happy-dom` у першому рядку, рендер у `ConfirmProvider` (`components/ui/__tests__/render-with-confirm.tsx`). Під час роботи — `pnpm test:related <files>`, повний `pnpm test:run` — лише в останній задачі.
- Коміти з трейлером `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Після apply екрани бібліотек (заклинання, юніти, правила тощо) лишаються зі старими даними, бо не інвалідовано кеш. Тест: після успіху викликається `invalidateQueries` з предикатом за `campaignId` і `router.refresh()` (Task 1, Task 2).
2. 409 «Джерело змінилося» залишає діалог з неактуальним списком. Очікування: повідомлення + перезапит diff (Task 2).
3. Конфлікт або видалення в джерелі увімкнено за замовчуванням → тихий перезапис або видалення. Тест вибору за замовчуванням (Task 1).
4. Вибрано пункт із `requires`, а залежність не вибрано. Користувач має бачити «Також буде додано: …» (Task 1, Task 2).
5. Кампанія без `createdFromId` або гравець (не ДМ) бачить кнопку. Тест (Task 3).

---

## File Structure

| Файл | Відповідальність |
|---|---|
| `lib/constants/source-sync.ts` | + підписи scope і статусів |
| `lib/api/source-sync.ts` | `getSourceDiff`, `applySourceChanges` |
| `lib/hooks/campaigns/keys.ts` | + `sourceDiff(campaignId)` |
| `lib/hooks/campaigns/useSourceSync.ts` | `useSourceDiff`, `useApplySourceChanges`, `useSourceSyncSelection` |
| `lib/utils/campaigns/source-sync.ts` | чиста логіка: вибір за замовчуванням, групи, автододані, refs |
| `components/campaigns/templates/SourceSyncDialog.tsx` | діалог |
| `components/campaigns/templates/SourceSyncButton.tsx` | кнопка + діалог |
| `components/campaigns/settings/CampaignSettingsDialog.tsx`, `CampaignSettingsButton.tsx`, `types/campaigns.ts` (`CampaignSettings.createdFromId`) | кнопка в налаштуваннях |
| `app/campaigns/[id]/page.tsx` | передає `createdFromId`; кнопка в банері шаблону |

---

### Task 1: Дані, хуки й логіка вибору

**Files:**
- Modify: `lib/constants/source-sync.ts`, `lib/hooks/campaigns/keys.ts`, `lib/hooks/campaigns/index.ts`
- Create: `lib/api/source-sync.ts`, `lib/utils/campaigns/source-sync.ts`, `lib/hooks/campaigns/useSourceSync.ts`
- Test: `lib/utils/campaigns/__tests__/source-sync.test.ts`, `lib/hooks/campaigns/__tests__/useSourceSync.test.tsx`

**Interfaces:**
- Consumes: типи `SourceDiff`, `SourceDiffItem`, `SourceApplyResult`, `SyncRef`, `SourceSyncScope`, `SourceSyncStatus` з `@/types/campaigns`; `SYNC_SCOPES` з `lib/constants/source-sync.ts`.
- Produces:
  - `SYNC_SCOPE_LABELS: Record<SourceSyncScope, string>`, `SYNC_STATUS_LABELS: Record<SourceSyncStatus, string>`;
  - `getSourceDiff(campaignId): Promise<SourceDiff>`, `applySourceChanges(campaignId, body: { apply: SyncRef[]; ignore: SyncRef[] }): Promise<SourceApplyResult>`;
  - `campaignKeys.sourceDiff(campaignId)` = `["campaign-source-diff", campaignId]`;
  - `itemKey(i)`, `defaultSelection(items): Set<string>`, `groupItems(items): Array<{ scope; label; items }>`, `autoAddedPreview(items, selected): Array<{ scope; key; name }>`, `toRefs(items, selected): SyncRef[]`;
  - `useSourceDiff(campaignId, enabled)`, `useApplySourceChanges(campaignId)`, `useSourceSyncSelection(items)` → `{ selected, isSelected(item), toggle(item), setGroup(scope, on), autoAdded, refs }`.

- [ ] **Step 1: Підписи**

У `lib/constants/source-sync.ts` додати:

```ts
export const SYNC_SCOPE_LABELS = {
  rules: "Правила",
  settings: "Налаштування",
  spellGroups: "Школи магії",
  races: "Раси",
  units: "Юніти",
  spells: "Заклинання",
  mainSkills: "Основні скіли",
  skills: "Скіли",
  skillTrees: "Дерева прокачки",
  artifactSets: "Сети артефактів",
  artifacts: "Артефакти",
  tracks: "Музика",
} as const satisfies Record<(typeof SYNC_SCOPES)[number], string>;

export const SYNC_STATUS_LABELS = {
  new: "Нове",
  updated: "Оновлено",
  conflict: "Конфлікт",
  deletedInSource: "Видалено в джерелі",
  deletedLocally: "Видалено у вас",
} as const satisfies Record<(typeof SYNC_STATUSES)[number], string>;

export const SYNC_DEFAULT_ON: ReadonlySet<string> = new Set(["new", "updated"]);
```

Порядок груп у UI: спершу «Правила» й «Налаштування», далі таблиці в порядку `SYNC_TABLE_SCOPES`. Цей порядок задає `SYNC_SCOPE_LABELS` (`Object.keys`).

- [ ] **Step 2: Падаючі тести чистої логіки**

`lib/utils/campaigns/__tests__/source-sync.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { autoAddedPreview, defaultSelection, groupItems, itemKey, toRefs } from "@/lib/utils/campaigns/source-sync";
import type { SourceDiffItem } from "@/types/campaigns";

const item = (over: Partial<SourceDiffItem>): SourceDiffItem => ({
  scope: "spells",
  key: "k",
  localId: null,
  name: "X",
  status: "new",
  changedFields: [],
  sourceHash: "h",
  requires: [],
  ...over,
});

describe("source sync selection", () => {
  it("defaults: new and updated on; conflict and deletions off", () => {
    const items = [
      item({ key: "a", status: "new" }),
      item({ key: "b", status: "updated" }),
      item({ key: "c", status: "conflict" }),
      item({ key: "d", status: "deletedInSource", sourceHash: null }),
      item({ key: "e", status: "deletedLocally" }),
    ];

    expect([...defaultSelection(items)]).toEqual(["spells:a", "spells:b"]);
  });

  it("groups rules and settings first, then tables in bundle order, skipping empty groups", () => {
    const groups = groupItems([item({ scope: "units", key: "u" }), item({ scope: "rules", key: "morale" }), item({ scope: "spellGroups", key: "g" })]);

    expect(groups.map((g) => g.scope)).toEqual(["rules", "spellGroups", "units"]);
    expect(groups[0].label).toBe("Правила");
  });

  it("autoAddedPreview lists requires that are not selected, once", () => {
    const race = item({ scope: "races", key: "r", name: "Inferno" });

    const unit = item({ scope: "units", key: "u", requires: [{ scope: "races", key: "r", name: "Inferno" }] });

    const unit2 = item({ scope: "units", key: "u2", requires: [{ scope: "races", key: "r", name: "Inferno" }] });

    const items = [race, unit, unit2];

    expect(autoAddedPreview(items, new Set([itemKey(unit), itemKey(unit2)]))).toEqual([{ scope: "races", key: "r", name: "Inferno" }]);
    expect(autoAddedPreview(items, new Set([itemKey(unit), itemKey(race)]))).toEqual([]);
  });

  it("toRefs keeps scope, key, sourceHash and status of selected items", () => {
    const a = item({ key: "a", sourceHash: "h1", status: "conflict" });

    expect(toRefs([a, item({ key: "b" })], new Set([itemKey(a)]))).toEqual([{ scope: "spells", key: "a", sourceHash: "h1", status: "conflict" }]);
  });
});
```

Run: `pnpm test:run lib/utils/campaigns/__tests__/source-sync.test.ts` → FAIL.

- [ ] **Step 3: Реалізація логіки**

`lib/utils/campaigns/source-sync.ts`:

```ts
import { SYNC_DEFAULT_ON, SYNC_SCOPE_LABELS } from "@/lib/constants/source-sync";
import type { SourceDiffItem, SourceSyncScope, SyncRef } from "@/types/campaigns";

export const itemKey = (i: { scope: string; key: string }) => `${i.scope}:${i.key}`;

export const defaultSelection = (items: SourceDiffItem[]) => new Set(items.filter((i) => SYNC_DEFAULT_ON.has(i.status)).map(itemKey));

const SCOPE_ORDER = Object.keys(SYNC_SCOPE_LABELS) as SourceSyncScope[];

export function groupItems(items: SourceDiffItem[]) {
  return SCOPE_ORDER.map((scope) => ({ scope, label: SYNC_SCOPE_LABELS[scope], items: items.filter((i) => i.scope === scope) })).filter((g) => g.items.length > 0);
}

export function autoAddedPreview(items: SourceDiffItem[], selected: ReadonlySet<string>) {
  const out = new Map<string, SourceDiffItem["requires"][number]>();

  for (const i of items) {
    if (!selected.has(itemKey(i))) continue;

    for (const r of i.requires) if (!selected.has(itemKey(r))) out.set(itemKey(r), r);
  }

  return [...out.values()];
}

export const toRefs = (items: SourceDiffItem[], selected: ReadonlySet<string>): SyncRef[] =>
  items.filter((i) => selected.has(itemKey(i))).map(({ scope, key, sourceHash, status }) => ({ scope, key, sourceHash, status }));
```

Залежності на сервері замикаються рекурсивно. Прев'ю показує лише перший рівень — цього достатньо для підказки. Повний перелік повертає `autoAdded` у відповіді apply, і він показується у звіті.

Run → PASS.

- [ ] **Step 4: API і ключ**

`lib/api/source-sync.ts`:

```ts
import { campaignGet, campaignPost } from "@/lib/api/client";
import type { SourceApplyResult, SourceDiff, SyncRef } from "@/types/campaigns";

export const getSourceDiff = (campaignId: string) => campaignGet<SourceDiff>(campaignId, "/source-sync");

export const applySourceChanges = (campaignId: string, body: { apply: SyncRef[]; ignore: SyncRef[] }) =>
  campaignPost<SourceApplyResult>(campaignId, "/source-sync", body);
```

Сигнатури `campaignGet`/`campaignPost` звірити з `lib/api/client.ts` (за зразком `lib/api/templates.ts`).

`lib/hooks/campaigns/keys.ts`: додати `sourceDiff: (campaignId: string) => ["campaign-source-diff", campaignId] as const,`.

- [ ] **Step 5: Хуки**

`lib/hooks/campaigns/useSourceSync.ts`:

```ts
"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { campaignKeys } from "./keys";

import { applySourceChanges, getSourceDiff } from "@/lib/api/source-sync";
import { autoAddedPreview, defaultSelection, itemKey, toRefs } from "@/lib/utils/campaigns/source-sync";
import type { SourceDiffItem, SourceSyncScope, SyncRef } from "@/types/campaigns";

export function useSourceDiff(campaignId: string, enabled: boolean) {
  return useQuery({ queryKey: campaignKeys.sourceDiff(campaignId), queryFn: () => getSourceDiff(campaignId), enabled, staleTime: 0, gcTime: 0 });
}

export function useApplySourceChanges(campaignId: string) {
  const queryClient = useQueryClient();

  const router = useRouter();

  return useMutation({
    mutationFn: (body: { apply: SyncRef[]; ignore: SyncRef[] }) => applySourceChanges(campaignId, body),
    onSettled: () => {
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(campaignId) });
      router.refresh();
    },
  });
}

export function useSourceSyncSelection(items: SourceDiffItem[]) {
  const [state, setState] = useState(() => ({ items, selected: defaultSelection(items) }));

  // new diff (refetch after 409 or apply) → reset to its defaults
  const selected = state.items === items ? state.selected : defaultSelection(items);

  const update = (next: Set<string>) => setState({ items, selected: next });

  return useMemo(
    () => ({
      selected,
      isSelected: (i: SourceDiffItem) => selected.has(itemKey(i)),
      toggle: (i: SourceDiffItem) => {
        const next = new Set(selected);

        if (!next.delete(itemKey(i))) next.add(itemKey(i));
        update(next);
      },
      setGroup: (scope: SourceSyncScope, on: boolean) => {
        const next = new Set(selected);

        for (const i of items) if (i.scope === scope) (on ? next.add(itemKey(i)) : next.delete(itemKey(i)));
        update(next);
      },
      autoAdded: autoAddedPreview(items, selected),
      refs: toRefs(items, selected),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- update is recreated each render but only closes over items
    [items, selected],
  );
}
```

`invalidateQueries` з предикатом за `campaignId` у ключі оновлює всі запити кампанії: бібліотеки, правила й деталі. Активні запити перезавантажуються, неактивні лише позначаються застарілими. `router.refresh()` оновлює серверну сторінку кампанії (макс. рівень, назва джерела).

Якщо `react-hooks/exhaustive-deps` скаржиться на `update`, обгорнути `update` в `useCallback([items])` і прибрати `eslint-disable` (так чистіше). Звичайний `useMemo` без disable — переважний варіант.

Експорт у `lib/hooks/campaigns/index.ts`: `export { useApplySourceChanges, useSourceDiff, useSourceSyncSelection } from "./useSourceSync";`.

- [ ] **Step 6: Тест хука**

`lib/hooks/campaigns/__tests__/useSourceSync.test.tsx` (`// @vitest-environment happy-dom`). Мок `@/lib/api/source-sync` і `next/navigation` (`useRouter: () => ({ refresh })`). Обгортка `QueryClientProvider` з новим `QueryClient` — за зразком наявних тестів хуків у `lib/hooks/*/__tests__`.

1. `useApplySourceChanges("c1").mutateAsync({ apply: [], ignore: [] })` → `applySourceChanges` викликано з `"c1"`, потім `refresh` викликано; запит з ключем `["spells", "c1"]` у кеші стає `isInvalidated`, а `["spells", "c2"]` — ні.
2. `useSourceSyncSelection`: стартує з `defaultSelection`, `toggle` прибирає/додає, `setGroup("spells", false)` знімає всі пункти групи, `refs` відповідає вибору. Новий масив `items` (rerender з іншими пунктами) скидає вибір до значень за замовчуванням.

Run: `pnpm test:related lib/hooks/campaigns/useSourceSync.ts lib/utils/campaigns/source-sync.ts` → PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/constants/source-sync.ts lib/api/source-sync.ts lib/utils/campaigns lib/hooks/campaigns
git commit -m "feat(constructor): source sync client data layer — api, hooks, selection logic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Діалог `SourceSyncDialog`

**Files:**
- Create: `components/campaigns/templates/SourceSyncDialog.tsx`
- Test: `components/campaigns/__tests__/source-sync-dialog.test.tsx`

**Interfaces:**
- Consumes: `useSourceDiff`, `useApplySourceChanges`, `useSourceSyncSelection`, `groupItems`, `itemKey`, `SYNC_STATUS_LABELS`, `useNotify`.
- Produces: `SourceSyncDialog({ campaignId, isTemplate, open, onOpenChange })`.

- [ ] **Step 1: Компонент**

Поведінка:
- `const diff = useSourceDiff(campaignId, open)`.
- Заголовок: `isTemplate ? "Оновлення з джерела" : "Оновлення з шаблону"`. `description`: `Джерело: «${diff.data.source.name}»` + ` · остання синхронізація ${new Date(syncedAt).toLocaleString("uk-UA")}`, якщо `syncedAt`.
- Стан:
  - `LoadingState` під час завантаження;
  - `ErrorState` з текстом помилки;
  - без пунктів — `EmptyState` «Усе синхронізовано» з описом «Джерело не має змін, яких би не було у вас».
- Список: `groupItems(items)` → для кожної групи `HudSection` з `title={`${label} (${items.length})`}` і `action` — кнопкою «Вибрати все»/«Зняти все». Текст залежить від того, чи вся група вибрана; кнопка викликає `setGroup`.
- Пункт — рядок `<label>`:
  - `Checkbox` (`checked={isSelected(i)}`, `onCheckedChange={() => toggle(i)}`, `aria-label={i.name}`);
  - назва;
  - `HudPill` зі статусом: тон `accent` для `conflict`, `muted` для видалень, `bone` для решти;
  - другий рядок дрібним текстом `text-hud-muted`:
    - для `changedFields.length > 0` — `Змінено: ${changedFields.join(", ")}`;
    - для `conflict` — «Ви теж змінили цей запис — галочка замінить вашу версію версією джерела»;
    - для `deletedInSource` з `usage` — `Використовується: ${usage.characters} персонаж., ${usage.content} записів`, лише ненульові частини, з `pluralUk` з `@/lib/utils/common/plural`;
    - для `deletedLocally` — «Ви видалили цей запис; галочка поверне його».
- Під списком, якщо `autoAdded.length > 0`, — `HudPanel` або абзац: `Також буде додано: ${autoAdded.map(n => n.name).join(", ")}`.
- Футер:
  - «Скасувати»;
  - «Ігнорувати вибране» (`variant="outline"`, вимкнена без вибору) → `apply.mutate({ apply: [], ignore: refs })`;
  - «Застосувати (N)» (`N = refs.length`, вимкнена без вибору або під час `isPending`) → `apply.mutate({ apply: refs, ignore: [] })`.
- Обробка відповіді:
  - успіх apply → `notify` «Застосовано: N» (+ «, автоматично додано: …» з `autoAdded` відповіді, + `warnings`, якщо є) і закрити діалог;
  - успіх ignore → `notify` «Приховано: N», діалог лишається відкритим (diff перезапитується інвалідацією);
  - помилка → текст помилки (`err.message`) у `role="alert"` блоці, як у `CampaignSettingsDialog`. Для 409 (`ApiError` зі `status === 409`, якщо клас має статус — звірити `lib/api/client.ts`) — `diff.refetch()`.
- Перед apply, якщо серед вибраних є `deletedInSource`, — `useConfirm` «Видалити N записів, яких немає в джерелі?» (`destructive: true`).
- Довгий список: контейнер `max-h-[60vh] overflow-y-auto` усередині діалогу, якщо `ResponsiveDialog` сам не скролить. Перевірити, як інші великі діалоги це роблять.

Компонент не імпортує `@/lib/api/*`. Пропсів 4.

- [ ] **Step 2: Тест**

`components/campaigns/__tests__/source-sync-dialog.test.tsx` (`// @vitest-environment happy-dom`). Мок `@/lib/hooks/campaigns` для `useSourceDiff`/`useApplySourceChanges`, але `useSourceSyncSelection` справжній: `vi.mock` з `importActual`. Рендер через `renderWithConfirm` + `QueryClientProvider` не потрібен, бо хуки замокано. Для `useNotify` перевірити, чи потрібен провайдер — подивитися наявні тести діалогів (`components/campaigns/__tests__/template-picker.test.tsx`).

Кейси:
1. Пункти `new` (Fireball), `conflict` (Bless), `deletedInSource` (Old, `usage: { characters: 2, content: 1 }`) у двох групах:
   - видно заголовки груп «Заклинання (2)», «Артефакти (1)»;
   - чекбокс Fireball вибраний, Bless і Old — ні;
   - видно текст про конфлікт і «Використовується: 2 персонажі…»;
   - кнопка «Застосувати (1)».
2. Клік «Застосувати (1)» → `mutate` викликано з `{ apply: [{ scope: "spells", key: <Fireball>, sourceHash, status: "new" }], ignore: [] }`.
3. Вибрати Old і застосувати → з'являється підтвердження; після підтвердження `mutate` містить Old.
4. «Ігнорувати вибране» → `mutate({ apply: [], ignore: [...] })`.
5. Порожній список → «Усе синхронізовано».
6. Вибрано юніт з `requires` (раса не вибрана) → «Також буде додано: Inferno».

Run: `pnpm test:run components/campaigns/__tests__/source-sync-dialog.test.tsx` → PASS.

- [ ] **Step 3: Commit**

```bash
git add components/campaigns
git commit -m "feat(constructor): SourceSyncDialog — grouped changes with defaults, ignore, apply

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Кнопки в налаштуваннях і банері шаблону

**Files:**
- Create: `components/campaigns/templates/SourceSyncButton.tsx`
- Modify: `types/campaigns.ts` (`CampaignSettings.createdFromId: string | null`), `components/campaigns/settings/CampaignSettingsDialog.tsx`, `app/campaigns/[id]/page.tsx`
- Test: `components/campaigns/__tests__/source-sync-button.test.tsx`, наявні тести `CampaignSettingsDialog` (якщо є — знайти `grep -rl CampaignSettingsDialog components app --include=*.test.tsx`)

**Interfaces:**
- Consumes: `SourceSyncDialog`.
- Produces: `SourceSyncButton({ campaignId, isTemplate, variant? })` — кнопка «Оновлення з шаблону» / «Оновлення з джерела» + діалог (стан `open` усередині).

- [ ] **Step 1: Кнопка**

```tsx
"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { SourceSyncDialog } from "@/components/campaigns/templates/SourceSyncDialog";
import { Button } from "@/components/ui/button";

interface SourceSyncButtonProps {
  campaignId: string;
  isTemplate: boolean;
}

export function SourceSyncButton({ campaignId, isTemplate }: SourceSyncButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {isTemplate ? "Оновлення з джерела" : "Оновлення з шаблону"}
      </Button>
      <SourceSyncDialog campaignId={campaignId} isTemplate={isTemplate} open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: Налаштування кампанії**

- `CampaignSettings` отримує `createdFromId: string | null`.
- `app/campaigns/[id]/page.tsx` передає `createdFromId: campaign.createdFromId ?? null` у `CampaignSettingsButton`. Перевірити, що `requireCampaignWithMembers` повертає це поле; якщо `select` обмежений — додати його.
- У `CampaignSettingsDialog`, секція «Шаблони»: якщо `campaign.createdFromId`, додати кнопку «Оновлення з шаблону», яка закриває діалог налаштувань і відкриває `SourceSyncDialog`. Так само зроблено з `SaveAsTemplateDialog`: стан `syncOpen`, діалог рендериться поза `ResponsiveDialog` налаштувань. Тут потрібен окремий стан, а не `SourceSyncButton`, бо діалог налаштувань закривається.
- `isTemplate` для діалогу з налаштувань: передати `kind` у `CampaignSettings` не потрібно — на сторінці шаблону кнопка налаштувань теж є. Додати в `CampaignSettings` поле `isTemplate: boolean` і заповнити його на сторінці (`isTemplate` вже обчислено).

- [ ] **Step 3: Банер шаблону**

У `app/campaigns/[id]/page.tsx`, у `HudPanel` банера шаблону: якщо `isDM && campaign.createdFromId`, праворуч від тексту рендерити `<SourceSyncButton campaignId={id} isTemplate />`. Розмітка `flex flex-wrap items-start gap-2`, кнопка `ml-auto`, на телефоні переноситься.

- [ ] **Step 4: Тести**

`components/campaigns/__tests__/source-sync-button.test.tsx` (happy-dom):
- текст кнопки залежить від `isTemplate`;
- клік відкриває діалог (замокати `SourceSyncDialog`, перевірити `open: true` у пропсах).

Для `CampaignSettingsDialog` (наявний або новий тест):
- з `createdFromId: null` кнопки «Оновлення з шаблону» немає;
- з `createdFromId: "t1"` вона є і після кліку рендерить `SourceSyncDialog` з `open`.

Хуки `@/lib/hooks/campaigns` замокати, як у наявних тестах налаштувань.

Run: `pnpm test:related components/campaigns/settings/CampaignSettingsDialog.tsx components/campaigns/templates/SourceSyncButton.tsx "app/campaigns/[id]/page.tsx"` → PASS.

- [ ] **Step 5: Повна перевірка + commit**

```bash
pnpm test:run
pnpm lint
pnpm build
```

Expected: усі тести зелені (відомо нестабільний `lib/hooks/battle/__tests__/battle-fx.test.tsx` — перезапустити окремо), 0 errors lint, build OK.

```bash
git add types/campaigns.ts components/campaigns "app/campaigns/[id]/page.tsx"
git commit -m "feat(constructor): source sync buttons in campaign settings and template banner

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 (контролер): браузер

Виконує контролер, не субагент.
1. `pnpm dev -p 3001` у worktree.
2. Створити кампанію з офіційного шаблону HOMM5 через UI.
3. У шаблоні змінити одне заклинання і додати расу + юніт, що на неї посилається.
4. У кампанії змінити друге заклинання.
5. Відкрити «Оновлення з шаблону»:
   - групи;
   - статуси;
   - галочки за замовчуванням;
   - «Також буде додано».
6. Застосувати → повідомлення; бібліотека заклинань і юнітів показує нові дані; повторне відкриття — «Усе синхронізовано».
7. Ігнорування й 409 (змінити шаблон у другій вкладці між відкриттям і застосуванням).
8. Мобільний вигляд (вузьке вікно): нижня шторка, прокрутка списку, футер.
9. Банер шаблону HOMM5 → «Оновлення з джерела» (джерело — жива HOMM5) — лише перегляд.
10. Прибрати: тестова кампанія, повернення змін у шаблоні.

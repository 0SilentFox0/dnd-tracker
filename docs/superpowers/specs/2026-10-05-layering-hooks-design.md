# Шари api → хуки → компоненти — дизайн (пункт 5 роадмапу)

## Мета

Компоненти й клієнтські сторінки лише викликають хук і рендерять. Запити живуть тільки в `lib/api/<domain>`, завантаження, мутації, стан помилок і нетривіальна логіка — у хуках `lib/hooks/<domain>` (TanStack Query), чисті обчислення — у `lib/utils/<domain>`. Заразом прибираємо другий спосіб підтвердження (керовані діалоги-підтвердження → `useConfirm`) і ставимо `QueryState` там, де компонент сам тягнув дані.

**Готово, коли:**

- жоден файл у `components/**` і `app/**` (крім `app/api/**`) не імпортує `@/lib/api/*` — і ESLint це забороняє;
- усі хуки лежать у `lib/hooks/<domain>` (жодного `use*.ts` під `app/`);
- 7 компонентів-діалогів підтвердження видалено, місця виклику працюють через `useConfirm`;
- компоненти з переліку «B-набір» не тримають логіки, крім виклику хука й рендеру;
- `pnpm lint`, `pnpm test:run`, `tsc --noEmit` зелені; `pnpm simulate-battle` — 34/34.

## Рішення

- **Серверні `page.tsx`, що читають Prisma напряму, лишаються** — це окремий легітимний шар (RSC). Правило стосується клієнтського коду.
- **Артефакти й сети лишаються серверно-рендереними.** Нові хуки-мутації після успіху роблять `router.refresh()`; клієнтські пікери отримують query-хуки.
- **Бій, дерево вмінь і профіль персонажа** (`battles/[battleId]/page.tsx`, `CharacterSkillTreeView`, `CharacterDamagePreview`, `CharacterSpellbook`) отримують лише виправлення шару — без глибшого рефактору: їх переписують пункти 6–8.
- **Типи, що компоненти брали з `lib/api`**, переїжджають у `types/<domain>.ts`; `lib/api` реекспортує їх для зворотної сумісності.

## 1. Гард

`eslint.config.mjs` уже має блок `no-restricted-imports` (діалоги, `vaul`) для `app/**`, `components/**`, `lib/**`. У flat config пізніший блок із тим самим правилом **перезаписує** його для збіжних файлів, тож новий блок після нього повторює ті самі `paths` і додає `patterns`:

```js
{
  files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  ignores: ["app/api/**", "components/ui/**", "**/__tests__/**"],
  rules: {
    "no-restricted-imports": ["error", {
      paths: DIALOG_RESTRICTED_PATHS,
      patterns: [{
        group: ["@/lib/api", "@/lib/api/*"],
        message: "Компоненти не ходять в API — використайте хук із @/lib/hooks/<domain>.",
      }],
    }],
  },
}
```

`DIALOG_RESTRICTED_PATHS` — константа, винесена з наявного блоку, щоб списки не розійшлися. Тести виключено: їм легітимно потрібні `ApiError` і моки (`components/common/__tests__/states.test.tsx`).

## 2. Хуки

Усі експортуються через барел `lib/hooks/<domain>/index.ts`. Мутації — через `useCrudMutation` (інвалідація ключів), де список живе в TanStack Query; для серверно-рендерених списків — `useMutation` + `router.refresh()` в `onSuccess`.

| Домен | Нові / розширені хуки | Хто використовує |
|---|---|---|
| `artifacts` (новий) | `useCreateArtifact`, `useUpdateArtifact`, `useDeleteArtifact`, `useDeleteAllArtifacts`, `useArtifactsList` | `ArtifactCreateForm`, `ArtifactEditForm`, `ArtifactCard`, `ArtifactDeleteButton`, `DeleteAllArtifactsButton`, `ArtifactSetForm`, `dm/characters/[characterId]/page` |
| `artifact-sets` (новий) | `useCreateArtifactSet`, `useUpdateArtifactSet`, `useDeleteArtifactSet`, `useArtifactSetsList` | `ArtifactSetForm`, `dm/characters/[characterId]/page` |
| `spells` | наявні `useSpells`, `useSpellGroups`; нові `useCreateSpellGroup`, `useImportSpells`; переїзд `useSpellFormSync` з `app/…/dm/spells` | `ImmuneSpellsLibraryPicker`, `useSpellDialog`, `dm/units/[unitId]/page`, `CharacterSpellbook`, `CreateMainSkillDialog`, `MainSkillEditForm`, `skills/dialogs/CreateGroupDialog`, `SpellImportDialog` |
| `units` | `useImportUnits` | `UnitImportDialog` |
| `campaigns` | `useCreateCampaign`, `useJoinCampaign`, `useUpdateCampaign`, `useRemoveCampaignMember`, `useActiveBattles` | `campaigns/new/page`, `JoinCampaignDialog`, `CampaignSettingsDialog`, `CampaignMembersList`, `JoinBattleButton` |
| `characters` | `useCharacter(campaignId, id)`, `useCreateCharacter`, `useUpdateCharacter`, `useDamagePreview`, `useSkillTrees`; `useInventory` отримує збереження (`updateInventory`) | `edit-client`, `dm/characters/[characterId]/page`, `dm/characters/new/page`, `DmCharacterEditForm` (вже є `useLevelUpCharacter`), `CharacterDamagePreview`, `damage-calculator-utils`, `CharacterSkillTreeView`, `CharacterSpellbook`, `CharacterArtifactsSection` |
| `skills` | `useSkill(campaignId, id)` | `edit-skill-client` |
| `abilities` | `useOwnerAbilities` | `AbilityCopySourcePicker` |
| `battles` | `useSpellPreview`, `useDeleteAllBattles`, `useCreateBattle`, `useBattleBalance`; переїзд `useBattleForm`, `useNewBattleData`, `useNewBattlePage`, `useBattleParticipants`, `useBalanceSuggestions`, `useEditBattleData` з `app/…/dm/battles/*` | `battles/[battleId]/page`, `dm/battles/page-client`, сторінки створення й редагування бою |

Ручні `useEffect` + `useState` + `try/catch`-завантаження в переїжджих хуках стають `useQuery`; ключі — у стилі наявних (`["spells", campaignId]`, `["characters", campaignId]` тощо), щоб спільний кеш не дублював запити.

`damage-calculator-utils.ts` — частина з запитом іде в `useDamagePreview`, чисті функції лишаються або переїжджають у `lib/utils/characters`.

## 3. Компоненти

### Компоненти, що самі тягнули дані

Сторінки DM для персонажа, юніта й вміння, `character/edit/edit-client`, `JoinBattleButton`, пікери (`ImmuneSpellsLibraryPicker`, `AbilityCopySourcePicker`), `CharacterDamagePreview` — викликають query-хук і рендерять через `QueryState` (`components/common/states`). Власні «Завантаження…», `isLoading`/`error`-гілки й `try/catch` зникають. Помилки мутацій показуються через `useNotify` (або в діалозі `useConfirm`, якщо мутацію запускає підтвердження).

### Діалоги-підтвердження → `useConfirm`

Видаляються:

| Компонент | Місце виклику |
|---|---|
| `dm/characters/__dialogs__/DeleteAllCharactersDialog` | `dm/characters/page-client` |
| `dm/characters/__dialogs__/DeleteCharacterDialog` | `dm/characters/page-client` |
| `dm/skills/__dialogs__/DeleteAllSkillsDialog` | `dm/skills/page-client` |
| `skills/list/SkillCardDeleteDialog` | `SkillCard` |
| `spells/dialogs/DeleteAllSpellsDialog` | `dm/spells/page-client` |
| `spells/dialogs/RemoveAllSpellsDialog` | `SpellGroupAccordion`, `SkillGroupAccordion` |
| `units/dialogs/DeleteAllUnitsDialog` | `dm/units/page-client` |

Виклик:

```ts
await confirm({
  title: "Видалити всі заклинання?",
  description: `Буде видалено ${count} заклинань. Дію не можна скасувати.`,
  confirmLabel: "Видалити",
  destructive: true,
  onConfirm: () => deleteAll.mutateAsync(),
});
```

Стан «…» і помилку в діалозі дає `useConfirm`; локальні `open`-стани й `isDeleting`-пропси в сторінках зникають.

### B-набір: логіка з великих компонентів

Критерій: ≥ 200 рядків, тримає стан чи похідну логіку, поза боєм / деревом / профілем.

| Компонент | Що виноситься | Куди |
|---|---|---|
| `artifacts/ArtifactForm` | стан форми, нормалізація перед збереженням | `useArtifactForm` (`lib/hooks/artifacts`) |
| `artifact-sets/ArtifactSetForm` | стан форми, вибір учасників, збереження/видалення | `useArtifactSetForm` (`lib/hooks/artifact-sets`) |
| `artifacts/ArtifactCard` | швидке оновлення полів | `useUpdateArtifact` |
| `units/list/UnitQuickStatsEditor` | парсинг, «епохи» полів, збереження AC/ініціативи/кубів | `useUnitQuickStats` (`lib/hooks/units`), парсер — `lib/utils/units` |
| `dm/units/[unitId]/page` | завантаження заклинань, обробники форми | `useUnitEditPage` (`lib/hooks/units`) |
| `races/RaceCard` | підрахунок доступних/вимкнених вмінь, головні вміння для показу | чиста `summarizeRace` у `lib/utils/races` + виклик у компоненті через `useMemo` |
| `skills/form/spell/SkillSpellEnhancement` | 10 `useMemo` похідних прапорців і опцій | `useSkillSpellEnhancement` (`lib/hooks/skills`), чисті частини — `lib/utils/skills` |
| `dm/characters/page-client` | обробники видалення, підтвердження | `useConfirm` + наявні мутації; решта обробників — у `useDmCharactersPage` (`lib/hooks/characters`), якщо їх більше одного-двох |
| `characters/artifacts/CharacterArtifactsSection` | збереження інвентарю | `useInventory` |

Назви хуків — орієнтир; фінальні визначає план після читання кожного файлу. Пропси компонентів не збільшуються (≤ ~7), публічна поведінка UI не змінюється.

## 4. Тестування

- **Хуки з нетривіальною логікою** — `renderHook` у `QueryClientProvider` з `vi.mock("@/lib/api/<domain>")`: успіх, помилка, інвалідація/`router.refresh`. Тривіальні обгортки `useQuery`/`useCrudMutation` без власної логіки тестів не потребують.
- **Чисті утиліти**, винесені з B-набору (`summarizeRace`, парсер quick-stats, похідні enhancement) — юніт-тести в сусідніх `__tests__`.
- **Заміна підтверджень** — тест на кожну сторінку/компонент-власник: «Видалити» → діалог `useConfirm` → «Підтвердити» → мутацію викликано; «Скасувати» → не викликано (через `renderWithConfirm`).
- **Гард** — `pnpm lint` з новим правилом дає 0 порушень.
- **Кінець роботи:** `pnpm lint && pnpm test:run && pnpm exec tsc --noEmit`; `pnpm simulate-battle` (локальна БД, 34/34), бо зачіпаються хуки створення бою й `spellPreview`; перевірка в браузері на 390 px: списки DM із підтвердженнями, сторінки DM персонажа/юніта/вміння, редагування персонажа гравцем, створення бою.

## Поза обсягом

- Глибокий рефактор бою (пункт 6), дерева вмінь (7), профілю (8).
- Переведення серверно-рендерених списків на клієнтські.
- Зміна `lib/api`-контрактів чи маршрутів API.

# S8 — шари і хуки (re-audit, main d871500da)

## 1. Оцінки
- **Хуки (критерій плану): 8.5** (було 7; ціль 9). Усі виміряні критерії виходу майже виконані, лишаються 2 компоненти >400 і 5 доменів без `keys.ts`.
- **Розділення шарів / layering: 9.5** (було 9). 0 порушень з `@/lib/api` та `fetch` у components/app/systems-ui.
- **Тонкі маршрути: 9** — 0 прямих prisma в 208 route.ts, окрім health, закріплено тестом.

## 2. Що змінилося (докази)
- Компоненти >400: було ≥10, тепер 2 — `components/battle/map/BattleMap.tsx` (436), `components/battle/map/MapStage.tsx` (408). Ціль «0» не досягнута (смуга L2 лишила їх). `MapEditorScreen` уже 242.
- Хук-файли >300: 0 (найбільші рівно 300: `battles/setup/useBattleMapEditor.ts`, `battle/useSpellBook.ts`, `battle/useBattleMapScene.ts`). Ціль виконана, але «рівно на межі» — кандидати на регрес.
- Inline `queryKey: [` у не-тестовому коді: 0 (`rg`). Тести ще мають літеральні ключі (напр. `lib/hooks/units/__tests__/useUnits.test.tsx:51`) — це припустимо.
- Deep-імпорти хуків поза `lib/hooks`: 0 (`rg "@/lib/hooks/<dom>/<file>"`); правило `hooks-barrel/deep` заявлено в журналі, саме правило ESLint я не запускав.
- `@/lib/api/*` у components/app: 0. У `systems/*` лише `api/` шар і `hooks/` (wfrp `draft-form-helpers.ts`, skilltrees `useCharacterProgression`, `useProgressionActions`, `useLevelUpCelebration`) — відповідає шаруванню (hooks → api). `fetch(` поза `app/api`: 0.
- Маршрути з prisma: `rg` по `app/api` дає 0 імпортів `@/lib/db`/`prisma.` у route.ts, крім `health`; є тест-ratchet `lib/__tests__/route-no-prisma.test.ts` (виняток лише health). Тест перевіряє лише `route.ts`, не сусідні handler-файли (ці не перевіряв).
- Товщина route.ts: найбільший 133 рядки (`campaigns/[id]/maps/[mapId]/route.ts`), далі 101, 90 — всі тонкі.

## 3. Відкриті дефекти
- **I** `components/battle/map/BattleMap.tsx` (436) і `MapStage.tsx` (408) >400: винести підкомпоненти/хуки (ціль плану «0 компонентів >400»).
- **I** `keys.ts` відсутній у доменах `lib/hooks/{audio,auth,battle,systems,theme}` — ціль «keys.ts у всіх доменах» формально не виконана. Факт пом'якшення: `battle` використовує `battles/keys.ts`; `systems/theme/auth/audio` власних `useQuery` не мають (є в `audio/useAudioState.ts`, `useAudioControl.ts` — перевірити, чи там не query-ключі; `battle/useBattleResync`, `usePusherBattleSync`, `useBattleScene`, `useBattleLogHistory` містять useQuery/useMutation — ключі беруться з `battles/keys`). Рекомендація: або `keys.ts`-реекспорт, або зафіксувати виняток у плані.
- **M** God-хуки (кількість повернутих полів, евристика по останньому `return {`): `lib/hooks/battle/useBattleActions.ts` 35, `world/useTravelPanel.ts` 23, `battle/useAttackActions.ts` 22, `systems/wfrp/hooks/useWfrpDraftForm.ts` 20, `world/useNotesPanel.ts` 19. Рішення: групувати у об'єкти `{data,set}` (правило з memory «grouped objects»); `useBattleActions` — перше.
- **M** Три хуки рівно 300 рядків — будь-яке додавання порушить ціль; розбити заздалегідь.
- **M** Ratchet `props-budget-exempt.json`: 5 записів (ціль ≤5 виконано).
- **M** `route-no-prisma` не охоплює handler-файли поруч (`*-handler.ts`) — це дозволено архітектурою, але межа «route → сервіс» перевіряється лише на route.ts.

## 4. Не перевірено
- ESLint правила (`hooks-barrel/deep`, `ui-layers/zone`) — не запускались (заборона), лише `rg`.
- Міждоменні deep-імпорти всередині `lib/hooks` (за журналом лишені навмисно через SCC) — не рахував.
- Точність евристики god-хуків (парсив лише останній 4-пробільний `return {`; хуки з іншим відступом/кількома return пропущені).
- Компоненти >400 у `.ts` (не-tsx) та `app/**/page-client` — перевірено лише `*.tsx`.
- Тести/tsc не запускав (за брифом).

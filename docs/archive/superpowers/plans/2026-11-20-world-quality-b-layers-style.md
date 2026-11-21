# План: карта світу — якість, частина B (стиль шарів, зон і підписів)

> **Для виконавців:** використовуй `superpowers:subagent-driven-development`. Кроки з чекбоксами, одна видача = кілька задач (див. «Видача»).

**Ціль:** шар стає групою зі своїм виглядом (іконка, колір, прозорість зон, режим підписів), маркер перевизначає його, DM керує підписами зон, легенда має перемикач «Без шару».

**Архітектура:** нові nullable-колонки (5) → розширення Zod/хендлерів/`buildWorldView` → чиста `applyLayerStyle` розв'язує вигляд **один раз** у `WorldMapView`, тож `WorldPins`/`WorldZones` читають ті самі поля маркера й не змінюють сигнатур → UI-поля в `LayerRow` і картці маркера.

**Стек:** Next 16, Prisma 6, Zod, TanStack Query, next-intl, Vitest.

**Спека:** `docs/superpowers/specs/2026-11-20-world-quality-b-layers-style-design.md` (читати першою).

## Правила виконання (для всіх імплементерів)

- Тести **пишуться, але не запускаються**; `tsc` не запускати. Єдиний повний `pnpm test:run` + `tsc` — у T5.
- Після кожної задачі: `pnpm exec eslint --fix <змінені файли>`; коміт `feat(world): …` з рядком `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Коментарі мінімальні, англійською, один рядок про «чому». Кирилиця в коді заборонена (тільки `messages/*`).
- ≤ ~7 props; групи — об'єктами. `WorldMapView` лишається з 14 props (exempt 14) — **жодного нового пропа**. Хуки з барела `@/lib/hooks/world`; компоненти не імпортують `@/lib/api/*`. Діалоги — `ResponsiveDialog`; кнопки `HudButton`.
- Не чіпати основну папку `/Users/silentfox/Work/dnd-tracker`. Працювати лише у worktree `/Users/silentfox/Work/dnd-tracker-mapq`.
- Два зайві незакомічені файли `lib/utils/battle/view/{attack-result-fx,index}.ts` (перестановка імпортів) **не додавати в коміти**: `git add` лише свої файли.

## Глобальні обмеження (значення з спеки)

- Діапазон прозорості зон `0.1–1` (`WORLD_ZONE_OPACITY_MIN = 0.1`), крок слайдера `0.05`, системний дефолт заливки `0.6`, вибрана зона `+0.14` зі стелею `1`.
- `labelMode` маркера: `auto | hidden | always`, `null` = наслідувати шар. `zoneLabels` шару: `auto | hidden` (`null` у БД = `auto`).
- Порядок наслідування: маркер → шар → системний дефолт (`DEFAULT_ZONE_COLOR`, іконка `MapPin`, `0.6`, `auto`).
- Міграція `20261223000000_world_style`, expand-only, `ADD COLUMN IF NOT EXISTS`, без нових таблиць (RLS уже є).
- Приватність: `WorldViewLayer` не містить `visibility` і `heroIds`; стиль прихованого шару не віддається.

## Review Focus (кожному рядку є тест у відповідній задачі)

1. Зона зі збереженим `color` (усі наявні зони, бо створення писало `DEFAULT_ZONE_COLOR`) не змінюється, коли шар отримує колір (T2: тест `applyLayerStyle`).
2. `icon: null` / `color: null` у PATCH маркера скидають перевизначення (T1).
3. `labelMode='hidden'` ховає підпис навіть при hover; `always` показує попри колізію (T2).
4. Гравець не бачить `visibility`/`heroIds`/стилю прихованого шару в `buildWorldView` (T1).
5. Маркери без шару ховаються/показуються псевдорядком «Без шару» й не залипають після видалення шарів (T4).

## Файли

| Створити | Призначення |
|---|---|
| `prisma/migrations/20261223000000_world_style/migration.sql` | 5 колонок |
| `lib/utils/world/marker-style.ts` + `__tests__/marker-style.test.ts` | `applyLayerStyle` |
| `components/world/editor/MarkerStyleFields.tsx` + тест | іконка/колір/прозорість/підпис у картці маркера |

| Змінити | Що |
|---|---|
| `prisma/schema/core.prisma` | поля `WorldLayer` (`icon`, `zoneOpacity`, `zoneLabels`), `WorldMarker` (`labelMode`, `fillOpacity`) |
| `lib/constants/world.ts` | `ZONE_LABEL_MODES`, `LAYER_ZONE_LABELS`, `WORLD_ZONE_OPACITY_MIN`, `ZONE_FILL_DEFAULT`, `NO_LAYER_KEY` |
| `types/world.ts` | `ZoneLabelMode`, `LayerZoneLabels`; поля в `WorldLayer`, `WorldViewLayer`, `WorldMarker`, `Create/Update…Data` |
| `lib/schemas/world.ts` | Zod шару (рядки ~265–290) і маркера (~87–125) |
| `lib/server/world/layer-store.ts`, `layer-handlers.ts`, `map-store.ts` (`toWorldMarker`, ~рядок 49), `marker-handlers.ts` | нові поля |
| `lib/utils/world/player-view.ts` (`LayerInput`, мапінг `layers` ~184) | стиль у `WorldViewLayer` |
| `lib/server/assistant/actions/world-service/{inputs,writers-markers}.ts` | ті ж поля |
| `lib/utils/world/zone-labels.ts` | `labelMode` |
| `components/world/map/{WorldMapView,WorldZones,WorldPins}.tsx` | розв'язаний стиль |
| `components/world/nav/LayerLegend.tsx`, `lib/hooks/world/useLayerVisibility.ts` | «Без шару» |
| `components/world/editor/layers/LayerRow.tsx`, `lib/hooks/world/useLayerForm.ts` | поля шару |
| `components/world/editor/DmMarkerBubble.tsx`, `panels/WorldMarkerPanel.tsx`, `lib/hooks/world/useMarkerFields.ts` | поля маркера |
| `messages/{uk,en}/world.json`, `messages/{uk,en}/whatsNew.json`, `lib/onboarding/whats-new.ts` | тексти |

---

## T1. Дані, схеми, хендлери, `buildWorldView`, асистент

**Інтерфейси (виробляє):**

```ts
// types/world.ts
export type ZoneLabelMode = 'auto' | 'hidden' | 'always';
export type LayerZoneLabels = 'auto' | 'hidden';
// WorldLayer += icon: string | null; zoneOpacity: number | null; zoneLabels: LayerZoneLabels
// WorldViewLayer = Pick<WorldLayer, 'id'|'name'|'color'|'imageUrl'|'rect'|'opacity'|'icon'|'zoneOpacity'|'zoneLabels'>
// WorldMarker   += labelMode: ZoneLabelMode | null; fillOpacity: number | null
// CreateWorldLayerData += icon?, zoneOpacity?, zoneLabels?
// UpdateWorldLayerData += 'icon'|'zoneOpacity'|'zoneLabels'
// CreateWorldMarkerData += labelMode?, fillOpacity?   UpdateWorldMarkerData += 'labelMode'|'fillOpacity'
// lib/constants/world.ts
export const ZONE_LABEL_MODES = ['auto', 'hidden', 'always'] as const;
export const LAYER_ZONE_LABELS = ['auto', 'hidden'] as const;
export const WORLD_ZONE_OPACITY_MIN = 0.1;
export const ZONE_FILL_DEFAULT = 0.6;
export const NO_LAYER_KEY = '__none__';
```

**Кроки:**

- [ ] Додати 5 nullable-колонок у `core.prisma` (`WorldLayer`: `icon String?`, `zoneOpacity Float?`, `zoneLabels String?`; `WorldMarker`: `labelMode String?`, `fillOpacity Float?`); написати `migration.sql` з `ALTER TABLE "world_layers" ADD COLUMN IF NOT EXISTS …` та `"world_markers"`; `pnpm exec prisma generate`. Не видаляти часткового унікального індексу сесій (`world_sessions_one_active`) — у `migration.sql` лише `ADD COLUMN`.
- [ ] Константи й типи вище.
- [ ] `lib/schemas/world.ts`. Шар: `icon: iconSchema.nullable()`, `zoneOpacity: z.number().min(WORLD_ZONE_OPACITY_MIN).max(1).nullable()`, `zoneLabels: z.enum(LAYER_ZONE_LABELS)` — у `updateWorldLayerSchema` (усі optional) і `createWorldLayerSchema` (optional, без `nullable`). Маркер: create `labelMode: z.enum(ZONE_LABEL_MODES).optional()`, `fillOpacity` як вище `.optional()`; update — обидва `.nullable()` (optional). Пересвідчитись, що `iconSchema`/`color` у PATCH маркера вже `nullable` (так).
- [ ] `layer-store.ts`: `listLayerInputs`/`toWorldLayer`/`createLayer` — нові поля (`zoneLabels: row.zoneLabels === 'hidden' ? 'hidden' : 'auto'`). `layer-handlers.ts` PATCH: у `Prisma.WorldLayerUpdateInput` (~рядок 114) додати `icon`, `zoneOpacity`, `zoneLabels` (`undefined` = не чіпати, `null` = скинути). `player-view.ts`: `LayerInput` + мапінг `layers` віддають `icon`, `zoneOpacity`, `zoneLabels`; `visibility`/`heroIds` не віддавати.
- [ ] `map-store.ts` `toWorldMarker`: `labelMode` (лише допустимі значення, інакше `null`), `fillOpacity`. `marker-handlers.ts`: create приймає нові поля; PATCH передає `labelMode`/`fillOpacity`/`icon`/`color` як є (`null` скидає). **Зони більше не пишуть `DEFAULT_ZONE_COLOR` у БД** (`color: body.color ?? null`; прибрати імпорт, якщо не потрібен) — ефективний колір дає `applyLayerStyle` + фолбек у `WorldZones`; те саме в `world-service/writers-markers.ts` (рядок 55). Наявні зони зберігають свій колір.
- [ ] Асистент: `world-service/inputs.ts` — додати `labelMode`, `fillOpacity` у вхід створення/зміни маркера-зони і (якщо там є вхід шару) стиль шару; `writers-markers.ts` — писати їх.
- [ ] **Тести** (писати, не запускати):
  - `layer-handlers.test.ts`: PATCH ставить `icon`/`zoneOpacity`/`zoneLabels`; `icon: null` скидає; `zoneOpacity: 0.05` і `1.2` → 400; невідомий ключ іконки → 400; GET повертає нові поля.
  - `marker-create.test.ts`: зона без `color` пишеться з `color: null` (оновити наявне очікування `DEFAULT_ZONE_COLOR`); create/PATCH з `labelMode`/`fillOpacity`; `labelMode: null`, `icon: null`, `color: null` скидають; `labelMode: 'x'` → 400.
  - `view-handlers.test.ts` (або `lib/utils/world/__tests__/player-view*.test.ts`): `buildWorldView` віддає `icon`/`zoneOpacity`/`zoneLabels` видимого шару; у `layers[]` немає `visibility`/`heroIds`; стиль шару `dm` для гравця відсутній.
  - Тест асистента `world-service`: `labelMode`/`fillOpacity` проходять у запис (за наявним шаблоном тестів цього модуля).
- [ ] Коміт `feat(world): layer and marker style columns, schemas and handlers`.

## T2. Чиста логіка: `applyLayerStyle`, `labelMode` у підписах

**Залежить від T1 (типи/константи).**

**Інтерфейси:**

```ts
// lib/utils/world/marker-style.ts
export function applyLayerStyle(
    markers: WorldMarker[],
    layers: Pick<WorldViewLayer, 'id'|'color'|'icon'|'zoneOpacity'|'zoneLabels'>[]
): WorldMarker[]; // same order/identity-free copies; returns input array when `layers` is empty

// lib/utils/world/zone-labels.ts
ZoneLabelInput += labelMode?: ZoneLabelMode;   // default 'auto'
```

**Правила `applyLayerStyle` (для кожного маркера з `layerId`, що є в `layers`):**
- `icon = m.icon ?? layer.icon`; `color = m.color ?? layer.color`;
- зона: `fillOpacity = m.fillOpacity ?? layer.zoneOpacity` (залишається `null`, якщо обох нема — споживач бере `ZONE_FILL_DEFAULT`);
- зона: `labelMode = m.labelMode ?? (layer.zoneLabels === 'hidden' ? 'hidden' : null)`;
- маркер без шару чи з невідомим шаром — без змін; пін не отримує `fillOpacity`/`labelMode`.

**Правила `zoneLabelVisible`:** `labelMode === 'hidden'` → `false` (перед hover); `'always'` → `true` (після перевірки `hidden`, до колізій); інакше стара логіка.

- [ ] **Тести** `marker-style.test.ts`: власні значення маркера перемагають шар; `null` наслідує; шар без іконки/кольору лишає `null`; зона зі своїм `color` не тінується (**Review Focus 1**); пін не отримує `labelMode`; `zoneLabels: 'hidden'` → зона `labelMode 'hidden'`, але маркерне `'always'` перемагає; невідомий `layerId` без змін; порожній `layers` повертає той самий масив.
- [ ] **Тести** `zone-labels.test.ts`: `hidden` + `hovered` → `false`; `always` + `clashes`/`overlaps`/високий зум → `true`; `auto`/відсутній — наявні кейси без змін (**Review Focus 3**).
- [ ] Реалізація; коміт `feat(world): layer style resolution and zone label modes`.

## T3. Карта: застосувати стиль

**Залежить від T2.** Без нових props.

- [ ] `WorldMapView.tsx` (~рядки 266–290): замінити блок `layerColors`/`pinMarkers` на `const styled = useMemo(() => applyLayerStyle(markers, layers?.items ?? []), [markers, layers?.items])`; далі `visibleMarkers` фільтрує `styled` (фільтр видимості — з T4: `layerHidden.has(m.layerId ?? NO_LAYER_KEY)`), `pinMarkers = visibleMarkers`. Тепер тінт кольору й успадкована іконка діють і для зон.
- [ ] `WorldZones.tsx`: `fillOpacity={selected ? Math.min(1, base + 0.14) : base}`, де `base = m.fillOpacity ?? ZONE_FILL_DEFAULT`. Колір і далі `m.color ?? DEFAULT_ZONE_COLOR`.
- [ ] `WorldPins.tsx` (~рядок 150): передати `labelMode: m.labelMode ?? 'auto'` у `zoneLabelVisible`. Іконка вже `m.icon && MARKER_ICON[m.icon]`.
- [ ] **Тести:** `WorldZones` — `fillOpacity` з маркера, фолбек `0.6`, вибрана `+0.14` зі стелею `1`; `WorldPins` — зона з `labelMode: 'hidden'` без підпису, `'always'` з підписом попри колізію (використати наявні тести в `components/world/map/__tests__/`); `WorldMapView` — маркер успадковує іконку й колір шару, а свій не втрачає.
- [ ] Коміт `feat(world): render layer-resolved marker style`.

## T4. UI: поля стилю, легенда «Без шару», тексти

**Залежить від T1–T3.**

**Легенда.**
- `useLayerVisibility`: `isShown(layerId)` → `!hidden.has(layerId ?? NO_LAYER_KEY)`; фільтр «живих» ідентифікаторів завжди додає `NO_LAYER_KEY`; `toggle(NO_LAYER_KEY)` працює як для шару.
- `LayerLegend`: новий необов'язковий проп `showUnlayered?: boolean`; коли `true` — додатковий чип «Без шару» (`world.layers.unlayered`, нейтральна крапка `WORLD_NO_SESSION_COLOR`), `onToggle(NO_LAYER_KEY)`; легенда й далі повертає `null`, якщо шарів нема.
- Хости (`WorldPlayClient.tsx`, `app/campaigns/[id]/dm/world/page-client.tsx`, `useHeroEyes`/`useWorldPlay`/`useWorldEditorPage`): передати `showUnlayered = markers.some((m) => !m.layerId)`. Ніяких інших змін у спільному `hidden`.

**Поля шару (`LayerRow` + `useLayerForm`).** Іконка (`SelectField` з `marker-icon-options`, опція «Без іконки» → `icon: null`), прозорість зон (`Slider`, `WORLD_ZONE_OPACITY_MIN`–`1`, крок `0.05`, коміт через `useDebouncedCommit`, як `opacity` картинки; кнопка «За замовчуванням» → `null`), підписи зон (`SelectField` `auto/hidden`). Існуючий колір лишається.

**Поля маркера.** `MarkerStyleFields` (props: `{ marker, layer, form }`, де `form` — вихід `useMarkerFields`): іконка й колір із підписом «успадковано від шару», коли власне значення `null` і шар його має; кнопка «Наслідувати від шару» (видима, лише якщо в маркера є шар і власне значення) → PATCH `icon: null`/`color: null`; для зони — `SelectField` режиму підпису (`Наслідувати | Авто | Сховати | Завжди`; «Наслідувати» → `labelMode: null`) і слайдер прозорості (з кнопкою скидання → `null`). Підключити в `DmMarkerBubble` і `WorldMarkerPanel` (замість наявного окремого `MarkerColorField`, якщо той лише дублює). `useMarkerFields` отримує `labelMode`/`fillOpacity` у вихід-об'єкт, `colorValue` лишається (`color ?? DEFAULT_ZONE_COLOR`) для відображення.

**i18n і what's new.** Ключі `world.layers.{unlayered,icon,iconNone,zoneOpacity,zoneOpacityReset,zoneLabels.{label,auto,hidden}}`, `world.marker.style.{inherit,inherited,labelMode.{label,inherit,auto,hidden,always},opacity,opacityReset}` у `messages/{uk,en}/world.json` (EN — первинна мова контенту; UK — переклад). Запис у `lib/onboarding/whats-new.ts` + `whatsNew.<id>` в обох `messages/*/whatsNew.json`.

- [ ] **Тести:** `useLayerVisibility` — `NO_LAYER_KEY` ховає/показує маркери без шару, не губиться після зміни `layerIds` (**Review Focus 5**); `LayerLegend` — чип «Без шару» лише з `showUnlayered`, клік викликає `onToggle('__none__')`; `LayersPanel`/`LayerRow` — зміна іконки/прозорості/підписів викликає `update` із правильним `data` (`null` для «Без іконки»/скидання); `MarkerStyleFields` — «успадковано» й кнопка «Наслідувати» з'являються лише за умови шару й власного значення, клік шле `null`; режим підпису шле `labelMode`; тест ключів i18n (наявний тест перевіряє паритет `uk`/`en`).
- [ ] Коміт `feat(world): layer and marker style controls, no-layer toggle`.

## T5. Гейти, документи, жива перевірка (контролер + Sonnet)

- [ ] Одноразово (не паралельно з іншим важким): `pnpm exec tsc --noEmit`, `pnpm cycles`, `pnpm lint:dirs --changed main`, повний `pnpm test:run`. Перед стартом `ps -Ao pid,pcpu,command -r | grep -E "eslint|vitest|next"`.
- [ ] Застосувати міграцію до `prodcopy_layers` (той самий `DATABASE_URL`/`DIRECT_URL`, що й у `next start -p 3010`; **не** прод): `pnpm exec prisma migrate deploy`; перевірити, що часткового індексу `world_sessions_one_active` не втрачено.
- [ ] `NODE_OPTIONS=--max-old-space-size=10240 pnpm build` у worktree, `next start -p 3010` (не `next dev`).
- [ ] Жива перевірка підагентом Sonnet на `meauvil-test` (масштабовані скріни, перевірки через JS/текст, а не лише очима; сценарії зі спеки): шар → іконка/колір/прозорість → маркери без власного стилю змінилися, зі своїм — ні; «Наслідувати від шару»; сховати підписи шару + один підпис «Завжди»; чип «Без шару»; гравець бачить стиль, але не `visibility`; телефон 390 px. Лишки тестових даних прибрати.
- [ ] Документи: розділ «Стиль шарів (2026-11-20, якість B)» у `docs/architecture/world-map.md` (наслідування, `applyLayerStyle` у `WorldMapView`, зони не пишуть дефолтний колір, граблі), `docs/STATUS.md`. Спеку/план **не** архівувати до мерджу.
- [ ] Один фінальний рев'ю Opus по всій гілці (`git diff 7a88f348f..HEAD`), виправлення, ще один коміт. Далі — оновити пам'ять і дати користувачеві прохання про мердж (без push у main без його слова).

## Видача (економія ходів)

- **Імплементер A (Sonnet):** T1 + T2.
- **Імплементер B (Sonnet):** T3 + T4, після A.
- **T5:** контролер запускає гейти й міграцію, підагент Sonnet — жива перевірка, потім **один** Opus-рев'ю.

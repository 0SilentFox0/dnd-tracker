# Ревʼю battle FX, раунд 2: сигнатурні анімації (2026-10-19)

Гілка `feat/battle-fx-lab`, обсяг — `5f57fa1e..HEAD` (05425d2b manuscript-превʼю, bdb8fc92 прототипи сигнатур, 6e36ee0f Light, 18c90906 Dark, 4a251735 Nature/summons): 91 файл, +9 047 рядків, з них ~7 700 рядків у `components/battle/fx/animations/` (50 файлів), 16 нових аур у `auras/canvas/`, нові помічники `runtime/{badge,beam,figure,geometry,ghosts,motion,shapes,streaks}.ts`, зміни в `lib/utils/battle/fx/{overrides,aura,impact,timing}.ts`.

Правило «одна анімація = один файл, одна аура = один файл» усі пропозиції зберігають — спільне йде лише в `runtime/` та `auras/canvas/kit.ts`.

Код не змінювався. Тимчасовий тест (видалений) підтвердив: усі 43 ключі `SPELL_FX_OVERRIDES` зараз існують у `data/library/spells.ts` (54 заклинання).

---

## (a) Рекомендації за пріоритетом

| # | Рекомендація | Користь | Зусилля | Ризик | Коли |
|---|---|---|---|---|---|
| 1 | `MAX_FX_MS` = 3000 замало для сигнатур: підняти до ~4500 і додати тест «тривалість + stagger < MAX_FX_MS» | Висока: guard обриває анімації на середині | S | низький | **NOW** |
| 2 | Регресія perf в аурі `holyweapon` (градієнт + живий `shadowBlur` щокадру), а також `lifedome` (radial gradient щокадру): перевести на кешовані спрайти/шари | Середня–висока (безперервно 30 fps × N портретів) | S | низький | **NOW** |
| 3 | Тест-запобіжник: кожне імʼя в `SPELL_FX_OVERRIDES` і `AURA_BY_NAME` існує в `data/library/spells` | Середня: перейменування в бібліотеці мовчки ламає сигнатуру | S | нульовий | **NOW** |
| 4 | Прибрати `export` з внутрішніх символів runtime (`findAnchor`, `centerOf`, `FigurePose`, `figureOutline`, `figureHeight`, `MotionStep`, `StreakOptions`) | Низька (чистота API) | S | нульовий | **NOW** |
| 5 | Один реєстр заклинань `SPELL_FX` (archetype, element, aura) і один реєстр архетипів `ARCHETYPE_FX` (impactMs, impact: damage/heal/none, staggerMs) замість 5 окремих мап/множин | Висока для підтримки: вичерпна перевірка TS замість ручних `Set` | S–M | низький | LATER |
| 6 | Розмір лінивого чанка анімацій виріс у 5.5 раза (8.8 → 48.3 KB gzip): динамічний `import()` на архетип з передзавантаженням при постановці в чергу | Середня (мобільні, превʼю в книзі заклинань) | M | середній | LATER |
| 7 | Помічники runtime: `timeline()`, `animateEl` з `null`-елементом і `delay`, `glowPulse()`, `risingBadge()`, `prune()` | Середня: −3…6 рядків у ~30 файлах, однакова поведінка | S–M | низький | LATER |
| 8 | Емісія частинок залежить від частоти кадрів (`Math.random() < p` на тік, ~50 місць у 32 файлах): на 120 Гц удвічі більше частинок | Середня (perf на ProMotion/120 Гц Android) | M | низький | LATER |
| 9 | Тести «бюджету кадру» для аур і «завершення в межах MAX_FX_MS без залишків» для анімацій; зараз тести лише фіксують мапінг | Середня: ловили б пп. 1–2 автоматично | M | нульовий | LATER |
| 10 | Перевірка сигнатур на справжньому екрані бою (анкер = портрет 48 px або 32 px у треку ініціативи), а не лише в арені й книзі | Висока для UX, але це ручна перевірка | S–M | — | LATER (перед релізом) |
| 11 | Розсинхрон рамки удару з анімацією: затримка рахується від зміни HP, а не від старту анімації; черга послідовна, сигнатури 2.3–2.7 с | Середня | M | середній | LATER |
| 12 | `haste`-аура: градієнт на кожну частинку (18/с на портрет) → `memo` за квантованою довжиною | Низька | S | низький | LATER |

---

## (b) Що безпечно застосувати зараз (до мерджу) і що лишити на потім

### NOW (кожен пункт S, локальний, не змінює вигляд)

1. **`MAX_FX_MS`** (`lib/utils/battle/fx/timing.ts:8`) → 4500. Обґрунтування — у (c1).
2. **`holyweapon` / `lifedome`** — кешування за зразком `moonmark` / `might` (див. c2). Вигляд не змінюється, бо пульс квантується на ~12 рівнів, як у `moonmark.ts:43-48`.
3. **Тест імен** у `lib/utils/battle/fx/__tests__/` (наприклад `overrides.test.ts`): `Object.keys(SPELL_FX_OVERRIDES)` і ключі `AURA_BY_NAME` ⊂ `SPELLS.map(s => s.name)`. Для цього `AURA_BY_NAME` треба експортувати з файлу (не з barrel), або це закриє п. 5.
4. **Un-export** (див. c6).

### LATER (follow-ups після мерджу)

- П. 5 (реєстри) — природно робити разом з п. 9 (тести), бо тести тоді перебирають один реєстр.
- П. 7 (помічники) торкається ~30 файлів анімацій. Ризик низький, але потрібен повторний смоук усіх 50 архетипів у лабораторії, тому не перед мерджем.
- П. 8 (емісія) — механічна заміна `Math.random() < p` → `chance(p, dt)`, де `chance = (p, dt) => Math.random() < p * 60 * dt`. На 60 Гц вигляд ідентичний.
- П. 6 (бандл) — після п. 5, бо реєстр архетипів стане місцем для `load: () => import("./haste")`.
- П. 10–11 — після ручної перевірки в справжньому бою.

---

## (c) Деталі й докази

### c1. Guard `MAX_FX_MS` обриває сигнатури (NOW)

- Guard: `components/battle/fx/BattleFxLayer.tsx:42-45` — через 3000 мс wall-clock викликає `cancelLayer(el)`.
- Тривалості сигнатур: `TOTAL_MS` — 2300 (2 файли), 2400 (2), 2500 (5), **2600 (13), 2700 (11)**. Запас до guard лише 300–400 мс.
- **Stagger понад TOTAL:** `animations/rebirth.ts:18` (`TOTAL_MS = 2700`) + `rebirth.ts:76` `perTarget(stage, to, 120, …)`. На 4 цілі виходить 2700 + 3 × 120 = 3060 мс, тож хвіст анімації гарантовано обрізається. Відродження лісу — масове лікування союзників, 4+ цілі для нього типові.
- **Повільні кадри:** `runtime/stage.ts:139` обмежує `dt` до 0.05 с. Нижче 20 fps (мобільний, багато аур, фонова вкладка, що повертається) час tween іде повільніше за wall-clock. Тоді 2700 мс анімації тривають > 3000 мс реального часу і обриваються, хоча анімація справна.
- **Пропозиція:** `MAX_FX_MS = 4500`. Guard лишається запобіжником від «завислої» анімації, а не обмеженням тривалості. Плюс тест: для кожного архетипу «оголошена тривалість + stagger × (MAX_TARGETS − 1) < MAX_FX_MS». Найпростіше це зробити через п. 5 (`ARCHETYPE_FX[a].totalMs`), а до того — константою в тесті.

### c2. Аури: регресія після perf-проходу (NOW)

Попередній прохід (2026-10-18, d1) прибрав градієнти й blur щокадру з безперервних аур (`kit.ts`: `memo`, `staticLayer`, `centredSprite`). Більшість нових аур правило дотримують: `might.ts:11-27` (лезо з blur намальоване один раз), `moonmark.ts:43-48` (квантовані рівні blur), `thorncrown.ts:65`, `rust.ts:73`, `vines.ts:85`, `stoneskin.ts:14`, `raincloud.ts:38` (статичні шари/спрайти). Два порушення:

- **`auras/canvas/holyweapon.ts:44-52`** — щокадру `g.shadowBlur = (6 + ring * 8) * s` і `createLinearGradient` для леза. Це найдорожча операція Canvas 2D, і вона безперервна, поки діє «Божественна сила».
  Виправлення: `centredSprite(ctx, \`blade${level}\`, …)` з `level = Math.round(ring * 8)`, як у `moonmark`. Тремтіння (`rotate(ANGLE + sin(t*60)*0.02*ring)`) лишається через `g.rotate` перед `drawCentred`, або дрібний зсув x/y.
- **`auras/canvas/lifedome.ts:42-45`** — `createRadialGradient` щокадру, бо альфа стопів залежить від `b`. Виправлення: два кешовані шари (`staticLayer` для `b = 0` і для `b = 1`) і змішування через `globalAlpha`, або один шар + `globalAlpha = 0.6 + b * 0.4`. Різниця на око мінімальна.
- Дрібне: `auras/canvas/haste.ts:56` — `p.data.grad ??= streakGradient(...)`, тобто новий градієнт на кожну частинку (emit 18/с на портрет). Можна `memo(ctx, \`streak${Math.round(len*4)}\`, …)` (п. 12).
- `auras/canvas/spellward.ts:58` використовує `Math.random()` замість `rand` — косметика.

### c3. Назви заклинань: три джерела правди (п. 3, 5)

Імʼя заклинання зараз ключ у:
- `lib/utils/battle/fx/overrides.ts:3` — `SPELL_FX_OVERRIDES` (43 записи: archetype + element);
- `lib/utils/battle/fx/aura.ts:26` — `AURA_BY_NAME` (23 записи, ключ — `effect.name`, `aura.ts:81`).

Додати сигнатуру нового заклинання означає правити обидва файли. Плюс п'ять мап за архетипом:
- `timing.ts:3` `IMPACT_MS`, `impact.ts:12` `NO_IMPACT`, `impact.ts:14` `HEALS` — у `lib`;
- `components/battle/fx/labels.ts` `ARCHETYPE_LABEL`, `animations/index.ts` `ANIMATIONS` — у `components`.

`Record<FxArchetype, …>` перевіряється компілятором, а `Set` у `impact.ts` — ні. Тому новий архетип мовчки стає «damage». Зараз так неявно класифіковано 17 архетипів, серед них `teleport` і `death`; teleport нешкідливий лише тому, що рамка зʼявляється тільки при зміні HP.

**Пропозиція (LATER):**
```ts
// lib/utils/battle/fx/spells.ts
export const SPELL_FX: Record<string, { archetype?: FxArchetype; element?: FxElement; aura?: FxAuraKind }> = { "Поспіх": { archetype: "haste", element: "wind", aura: "haste" }, … };
// lib/utils/battle/fx/archetypes.ts
export const ARCHETYPE_FX: Record<FxArchetype, { impactMs: number; impact: "damage" | "heal" | "none"; staggerMs?: number; totalMs?: number }> = { … };
```
`SPELL_FX_OVERRIDES`, `AURA_BY_NAME`, `IMPACT_MS`, `NO_IMPACT` і `HEALS` тоді виводяться з цих двох таблиць, або їх зовсім прибирають. Підписи (`ARCHETYPE_LABEL`) лишаються в `components`, бо це UI. Тест з п. 3 перебирає `SPELL_FX`.

**Крихкість у рантаймі** (не виправляється реєстром): мапінг за `spellName` / `effect.name` з БД. Якщо DM перейменує заклинання кампанії, анімація тихо падає на загальний архетип. Довгостроково варто мати стабільний ключ (наприклад `libraryKey`/`slug` у заклинанні). Поки ціна низька: фолбек коректний, лише менш виразний.

### c4. Розмір бандла (п. 6)

Заміряно esbuild (`--bundle --minify`, external react/next) на `5f57fa1e` і на HEAD:

| Точка входу | 5f57fa1e min / gzip | HEAD min / gzip |
|---|---|---|
| `runtime/play.ts` (чанк `BattleFxLayer`: усі анімації + runtime) | 21.8 KB / 8.8 KB | **136.8 KB / 48.3 KB** |
| `auras/canvas/AuraCanvas.tsx` (чанк аур) | 31.5 KB / 11.0 KB | 51.4 KB / 17.3 KB |

Обидва чанки ліниві (`BattleScreen.tsx:50`, `StatusAuras.tsx:9`, `preload.ts`), гідратацію вони не блокують. Але на сторінці бою й у превʼю книги заклинань (`SpellBattlePreview.tsx:6`) завантажується весь набір з 50 архетипів, хоча в конкретному бою грають 3–6.

**Пропозиція (LATER, M):** `ARCHETYPE_FX[a].load = () => import("@/components/battle/fx/animations/haste")`. Turbopack створить окремий чанк на кожен файл, і правило «одна анімація = один файл» тут якраз допомагає. Базові архетипи (`melee/ranged/bolt/area/heal/buff/debuff/summon/death`) лишаються в основному чанку FX. Сигнатуру завантажують, щойно spec потрапляє в чергу (`advanceFxQueue`), і так у неї є фора щонайменше в одну анімацію. Для превʼю — при відкритті сторінки заклинання. Ризик середній: перший показ без кешу може запізнитися. Тому при помилці завантаження — фолбек на базовий архетип (`spellRules`).

Альтернатива простіша: 4 чанки за школами (light/dark/nature/summons). Виграш менший, а мапа «архетип → школа» додає ще одне джерело правди. Тому радимо per-file.

### c5. Дублювання в анімаціях → помічники runtime (п. 7)

| Патерн | Де | Помічник |
|---|---|---|
| `let t = 0; const hide = show(stage, draw); tween(stage, TOTAL_MS, (k) => (t = k * TOTAL_MS)).then(hide)` | `let t = 0` у 36 файлах, `t = k * TOTAL_MS` у 29 (напр. `might.ts:69-197`, `stoneskin.ts:149-207`, `slow.ts:201-211`) | `timeline(stage, ms, draw: (g, t) => void, onTick?: (t, dt) => void): Promise<void>` у `runtime/stage.ts` |
| `el ? animateEl(stage, el, KF, opts) : wait(stage, 0)` і `el ? wait(stage, X).then(() => animateEl(...)) : wait(stage, 0)` | 17 місць: `might.ts:195`, `puppet.ts:154`, `resurrect.ts:123`, `stoneskin.ts:138`, `slow.ts:193-199`, `cleanse.ts:238-242`, `thorns.ts:203`, `whispers.ts:197`, `rust.ts:155`, `siphon.ts:123`, `raincloud.ts:114`, `pestilence.ts:176`, `blindfold.ts:202`, `haste.ts:189`, `melee.ts:19` | `animateEl(s, el: Element \| null \| undefined, kf, opts)`: при `!el` повертає `Promise.resolve()`. Затримку передавати через нативну опцію WAAPI `delay` замість `wait().then()` (без `fill: "backwards"` елемент до старту не змінюється) |
| Пульс `filter: brightness(..) drop-shadow(0 0 6px C)` | `healwave.ts:18`, `forestspirit.ts:22`, `healword.ts:19`, `regenerate.ts:22` | `glowPulse(color, { brightness, saturate?, peak })` у `runtime/motion.ts` |
| Бейдж, що піднімається: `b = clamp01((t - X)/D); if (b>0&&b<1) shieldBadge(g, x, top - easeOutCubic(b)*N, envelope(b,0.12,0.3), …)` | `might.ts:173-175`, `stoneskin.ts:189-191` | `risingBadge(g, x, top, k, text, look)` поряд із `sinkingBadge` (`runtime/badge.ts:46`) |
| Золоте лезо з градієнтом `#fffbe8 → #ffe39a → #d8a030` | `animations/might.ts:116-124`, `auras/canvas/holyweapon.ts:47-52`, `auras/canvas/might.ts:20-25` | `GOLD_BLADE` stops + `goldBlade(g, len)` у `runtime/shapes.ts` (поряд із `sword`) |
| `list.splice(0, list.length, ...list.filter(keep))` щокадру | `raincloud.ts:147`, `siphon.ts:139` | `prune(list, keep)` на місці (як компакція в `particles.ts`) |

Вже добре винесено: `perTarget`, `streakBurst`, `lightBeam` (11 файлів), `summonSpot`/`figurePath` (4 призиви), `motionPath` (5), `playGhost`, `halfSize`/`faceOf` (25 файлів), `shieldBadge`/`sinkingBadge`, а `IMPACT_MS` імпортують усі 48 анімацій, без локальних констант удару. Тайминги синхронізовані з `impactFor` структурно.

### c6. Мертвий код і залишки прототипів (п. 4)

- **Hourglass:** залишків немає. Аура `slow` з прототипу (`signature-proto-report.md:38`) замінена на `shackles`, а в коді, тестах і підписах слова `hourglass` немає.
- `console.log`/`debug` у FX: немає.
- Експорти без зовнішніх споживачів (використовуються лише всередині свого файлу):
  - `runtime/anchors.ts:13` `findAnchor`, `:19` `centerOf`;
  - `runtime/figure.ts` `FigurePose`, `figureOutline`, `figureHeight`;
  - `runtime/motion.ts:1` `MotionStep`;
  - `runtime/streaks.ts` `StreakOptions`.
  
  Прибрати `export` (типи можна лишити, якщо потрібні сигнатурам — зараз не потрібні).
- `runtime/ghosts.ts` `ghostOf` використовують лише тест і `playGhost`, тож export виправданий для тесту.
- `components/battle/fx/labels.ts` тепер використовується в продакшн-UI (`SpellBattlePreviewPanel.tsx:7`, чип «Анімація»). Перенесення в `fx-lab/labels.ts` із stage 4 фактично скасоване, і це коректно.

### c7. Скасування: рух рядків і привиди (п. 3 завдання) — у порядку

- Усі DOM-анімації цілей йдуть через `animateEl` (`runtime/stage.ts:194-205`; прямого `.animate(` в animations/auras немає). `stopStage` скасовує їх (`stage.ts:71`), `cancelLayer` прибирає `.fx-ghost` (`stage.ts:95`), `playGhost` чистить у `finally` (`ghosts.ts:37-41`).
- `wait(...).then(() => animateEl(...))` після `stopStage`: `wait` резолвиться одразу, а `animateEl` повертає resolved без запуску (`stage.ts:195`). Нічого не «застрягає».
- `schedule` після зупинки не виконується (`stage.ts:67-69`). Прямих `setTimeout`/`requestAnimationFrame` в анімаціях і аурах немає.
- **Ризик (LATER, п. 10):** у бою анкер — це `Portrait` (`hud/Portrait.tsx:26`), а не рядок. Тому `motionPath`-ривки (slow, puppet), `scale(1.07)` (might) і привиди рухають портрет 48 px, а коли рядок поза екраном — портрет 32 px у треку ініціативи, який сам анімується `useFlip` через `transform` (`lib/hooks/common/useFlip.ts:35-36`). WAAPI-анімації FX і FLIP можуть перекрити одна одну. Звіти прямо кажуть, що все перевірено лише в арені та книзі: `sig-nature-report.md:144`, `sig-dark-report.md:131`, `signature-proto-report.md:78`.

### c8. Тайминги удару (п. 11)

- `impactFor` (`impact.ts:20`) дає `delayMs = IMPACT_MS[a]` для всіх цілей. Але `perTarget` зі stagger (`rebirth.ts:76` 120 мс, `area.ts:14` 70, `swarm.ts:33` 80, `entangle.ts:99` 60, `quake.ts:42` 50) зсуває удар i-ї цілі на `i × stagger`. Для 4-ї цілі rebirth рамка лікування спалахує на 360 мс раніше за промінь. Виправлення: `staggerMs` в `ARCHETYPE_FX` + індекс цілі в `impactFor`.
- `delayMs` відраховується від зміни HP у `useHpChange`, а не від старту анімації. Черга послідовна (`queue.ts:15`, `MAX_FX_QUEUE = 12`), і з сигнатурами 2.3–2.7 с замість ~1–1.5 с раніше беклог при швидких ходах (контратаки + смерті) росте. Тоді рамки й тремтіння приходять до того, як анімація заклинання почнеться. Варіанти: `playbackRate` 1.5–2 для анімацій, коли `queue.length > 1`; або рамку запускає сама анімація (подія «impact» з `playFx`).
- Тести таймингів тавтологічні: `impact.test.ts:14,20` порівнюють `delayMs` з тим самим `IMPACT_MS`. Жоден тест не перевіряє, що анімація завершується в межах guard (див. c9).

### c9. Тести, яких бракує (п. 9)

1. **Бюджет кадру аур** (`components/battle/fx/__tests__/aura-budget.test.ts`): для кожного `AURA_ANIMATIONS[k]` — 10 викликів `frame()` з записуючим fake-ctx. Після першого кадру має бути 0 викликів `create*Gradient`, а `shadowBlur > 0` на основному ctx — ніколи. Зараз такий тест упав би на `holyweapon` і `lifedome`, тобто зловив би регресію з c2.
2. **Завершення анімацій** (`animations-run.test.ts`): для кожного `ANIMATIONS[a]` — fake stage (як у `stage.test.ts`), 1–4 цілі, ручний tick по 16 мс. Анімація резолвиться до `MAX_FX_MS`, а після завершення `s.draws.size === 0`, `s.animations.size === 0` і немає `.fx-ghost`. Зараз упав би на rebirth × 4 (c1).

### c10. Що з першого ревʼю (2026-10-18) ще не зроблено

Виконано: п. 1–8 топ-таблиці (stopStage/cancelLayer, кеш аур, єдиний ticker, kit/recipes, `useHitFx`+`PortraitFx`, спільні хуки, ліниві аури/рамки, чистка лабораторії). Також e3 (`Portrait` з пропом `fx`) і fix-wave M1–M11.

Відкрите (низький пріоритет, LATER):
- d2: рамки досі створюють градієнти щокадру (10 викликів у `frames/canvas/*` + `frame-kit.ts`); `frames/canvas/wind.ts:46` — градієнт на кожен порив. Рамки короткі, тож це не регресія.
- d5: подвійний `getBoundingClientRect` на анкер (`runtime/anchors.ts:5-7` `visible()` + `:19` `centerOf()`), а сигнатури додають ще `halfSize`/`faceOf` (ще 1–3 виміри на ціль). Це не гарячий шлях: один раз на старт.
- e4: тести на `perimeter` (frame-kit) так і не додані.

### c11. Що добре

- Нові аури в більшості дотримуються кешування (`staticLayer`/`centredSprite`/`memo`), а `moonmark` показує правильний підхід до змінного blur (квантовані рівні).
- `runtime/beam.ts` кешує текстуру променя за кольором — 11 анімацій малюють промені одним `drawImage`.
- `motionPath` (`runtime/motion.ts`) дає і WAAPI-keyframes, і `sample(t)` для canvas. Ланцюги й нитки точно йдуть за рядком, без вимірювань DOM щокадру.
- `figure.ts`: один силует для 4 елементалів з `warp` — гарний приклад «спільна форма, одна анімація = один файл».
- Скасування повністю централізоване в `Stage`, і нові анімації його не обходять.

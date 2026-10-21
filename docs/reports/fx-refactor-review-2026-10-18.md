# Ревʼю battle FX: оптимізації, рефактор, декомпозиція (2026-10-18)

Гілка `feat/battle-fx-lab`, обсяг — `git diff $(git merge-base main HEAD)..HEAD` у частині FX: `components/battle/fx/**`, `components/battle/fx-lab/**`, `lib/utils/battle/fx/**`, `lib/hooks/battle/{useBattleFxQueue,useFxEnabled,useFxImpact,usePageHidden,useHpChange}.ts`, зміни в `participants/*`, `hud/Portrait.tsx`, `spell/{cast,applied-effects}.ts`.

Правило «одна анімація = один файл» (`animations/`, `frames/canvas/`, `auras/canvas/`) зберігається в усіх пропозиціях: спільними стають лише помічники в `runtime/`, кожна анімація лишається у своєму файлі.

Розмір FX-коду (сирий source / gzip source): animations 28.8 KB / 7.1 KB, auras/canvas 57.2 KB / 14.0 KB, frames/canvas 48.5 KB / 12.3 KB, runtime 11.8 KB / 4.2 KB. Разом 4 418 рядків.

---

## (a) Топ рекомендацій (за співвідношенням користь/зусилля)

| # | Рекомендація | Зусилля | Очікуваний виграш |
|---|---|---|---|
| 1 | Явне скасування сцени в runtime: `stopStage(s)` / `cancelLayer(layer)` + скасовні `wait`/`schedule`, щоб не було трюку з перемонтуванням шару і ручного чищення внутрішніх полів | S–M | Немає «зомбі»-анімацій, які до ~2 с малюють на відʼєднаному canvas; простіші `BattleFxLayer`/`CanvasFrame`; `setTimeout` у buff/death більше не переживають скасування |
| 2 | Кеш статичних шарів і градієнтів для аур (безперервно 30 fps × N портретів), прибрати `shadowBlur` з безперервних аур | M | Найбільший виграш у runtime на мобільних: frozen/shield/blind/frost/moonmark/dust/bind перестають щокадру створювати градієнти й робити blur |
| 3 | Один rAF-тікер і один пул частинок для `Stage` і циклу аур; `tween` передає `dt` | M | Удар по 4 цілях: 6–7 паралельних ланцюжків rAF → 1; без виділення масиву на кожен тік (`filter`); прибирається ручний облік `last`/`dt` у 4 файлах (і крихкий `dt` у quake) |
| 4 | Набір помічників у `runtime/` для рамок, аур і анімацій: `edgeGlow`, `envelope`, `emitOnPerimeter`, спільні фігури (leaf/star/poly/polyline/taperedStroke/cubic), `perTarget`, `burst`, `impactSplash`, `pillar`, `palette.accent` | M | За оцінкою −20…30 % рядків у frames/auras/animations, однакові рамки стають візуально узгодженими, одна анімація лишається в одному файлі |
| 5 | `useHitFx` + `<PortraitFx>`: прибрати дубль між `ParticipantRow` і `MyHeroPanel`; `Portrait` знову ≤ 7 пропсів | S–M | Один шлях «зміна HP → рамка/спалах/тремтіння/аури», менше пропсів і ручних `animationDelay` |
| 6 | Спільні хуки в `lib/hooks/common`: `useMediaQuery` з кешем MQL, `useReducedMotion`, `usePageHidden` (перенести), сховище прапорця localStorage з кешованим знімком | S | `useFxEnabled` скорочується вдвічі; не читається `localStorage` на кожному рендері кожного рядка; `useFlip` використовує той самий reduced-motion |
| 7 | Ліниво завантажувати аури й рамки (≈106 KB сирого source разом з runtime) поза основним чанком бою | M | Менший початковий JS сторінки бою; FX уже частково ліниві (`BattleFxLayer` через `dynamic`), а `StatusAuras`/`ImpactFrame` — ні |
| 8 | Прибирання лабораторії: спільний `playFx` з `BattleFxLayer`, `frameFor` замість 3 аліасів, видалити мертвий CSS і `fireball.png`, винести підписи | S | Лабораторія тоншає приблизно на 40 %, зникають мертві експорти й ресурси |

---

## (b) Пропоновані спільні хуки

### b1. `useReducedMotion()` + кешований `useMediaQuery`
- **Сигнатура:** `useMediaQuery(query: string, serverValue = false): boolean` (без змін), всередині — `Map<string, MediaQueryList>` на рівні модуля; `useReducedMotion(): boolean` = `useMediaQuery("(prefers-reduced-motion: reduce)")`; не-хук `prefersReducedMotion(): boolean` для коду в ефектах.
- **Де замінить:**
  - `lib/hooks/battle/useFxEnabled.ts:9-16, 26-28, 40-46` — власні `reducedMotionQuery`/`readMotion`/`subscribeMotion` (≈20 рядків) дублюють `useMediaQuery`. Кеш там зʼявився саме тому, що `lib/hooks/common/useMediaQuery.ts:15` викликає `window.matchMedia(query)` на кожен `getSnapshot`.
  - `lib/hooks/common/useFlip.ts:16` — інлайн `matchMedia("(prefers-reduced-motion: reduce)")`.
- **Виграш:** одне джерело правди для reduced-motion. `useIsMobile` та інші споживачі `useMediaQuery` теж перестають створювати MQL на кожен рендер.
- **Зусилля:** S. **Ризик:** низький, бо кешування MQL безпечне. Тести `useMediaQuery` (якщо є) мокають `matchMedia`, тож кеш треба скидати між тестами (експортувати `__resetMediaQueryCache` або ключувати кеш за `window.matchMedia`).

### b2. `usePageHidden()` → `lib/hooks/common`
- Хук `lib/hooks/battle/usePageHidden.ts:1-13` не має нічого спільного з боєм.
- **Де ще:** `lib/hooks/battle/usePusherBattleSync.ts:229-249` має власний слухач `visibilitychange`. Там потрібна тривалість приховування, тому повна заміна не підходить. Варіант: `usePageHidden` + `useEffect` на перехід `hidden → visible` з `hiddenAt` у ref. Це опційно.
- **Зусилля:** S. **Ризик:** мінімальний, бо змінюється лише шлях імпорту.

### b3. `createStorageFlag(key, default)` / `useStorageFlag(key, default)`
- **Сигнатура:** `const flag = createStorageFlag("battle-fx", true); flag.use(): boolean; flag.set(v: boolean): void`. Значення кешується в змінній модуля, оновлюється в `set` і на подію `storage`, а `getSnapshot` повертає кеш.
- **Що замінить:** `lib/hooks/battle/useFxEnabled.ts:5-7, 18-24, 30-38, 54-62`. Зараз `readUser` викликає `localStorage.getItem` на кожен `getSnapshot`, тобто на кожен рендер кожного `StatusAuras` (`components/battle/fx/auras/StatusAuras.tsx:10`), кожного `useFxImpacts` (`lib/hooks/battle/useFxImpact.ts:19`), `BattleFxLayer.tsx:17` і `BattleTopBar.tsx`. При 10 рядках — ≥ 13 синхронних читань localStorage на рендер сцени, а React ще й повторно читає знімок для перевірки tearing.
- **Зусилля:** S. **Ризик:** низький. Інших користувачів localStorage у `lib/`/`components/` поки немає, тому фабрику можна покласти поруч з `useFxEnabled` і перенести в common, щойно зʼявиться другий користувач.

### b4. `useDelayedEffect(effect, delayMs, deps)` (або `useTimeout`)
- **Сигнатура:** `useDelayedEffect(() => cleanup | void, delayMs: number, deps: unknown[])`. Хук запускає `effect` через `delayMs` і скасовує таймер та cleanup при зміні deps або розмонтуванні.
- **Де:**
  - `components/battle/fx/frames/canvas/CanvasFrame.tsx:14-43` — `wait(delayMs).then(...)` + прапорець `cancelled`. Таймер `wait` не скасовується, тож після розмонтування він усе одно спрацює.
  - `lib/hooks/battle/useHpChange.ts:37-43` — `setTimeout(animate, delayMs)` у `useDamageShake`.
- **Зусилля:** S. **Ризик:** низький. Правила react-hooks v7 вимагають, щоб `deps` були статичним масивом. Інакше простіше зробити хук з параметрами `(delayMs, key)` і колбеком через `useEffectEvent`.

### b5. `useHitFx(participant, impact)` + компонент `<PortraitFx>`
- **Сигнатура:** `useHitFx(hp: number, impact: FxImpact | null) → { change: HpChange | null; shakeRef: RefObject<HTMLDivElement>; delayStyle: CSSProperties }`.
- **Дубль, який прибирається:**
  - `components/battle/participants/ParticipantRow.tsx:28-30, 37, 39, 43-46` і `components/battle/participants/MyHeroPanel.tsx:21-27, 37-38, 40-43`. Обидва компоненти повторюють `useHpChange` → `useDamageShake`, `ImpactFrame key={frame:id}`, `style={{ animationDelay: … }}` і обгортку `<span className="relative shrink-0">` з порт­ретом і `StatusAuras`.
  - `<PortraitFx effects size>{portrait}</PortraitFx>` = обгортка + `StatusAuras`.
- **Зусилля:** S–M. **Ризик:** середній, бо треба зберегти поведінку з тестів `field.test.tsx:197-230` (декорації фіксуються в момент зміни HP).

### b6. Що не варто робити хуком
- IntersectionObserver для аур уже спільний на рівні модуля (`auras/canvas/loop.ts:32-47`) — це правильно. Хук `useInView` на кожен портрет дав би N спостерігачів.
- `AuraCanvas` (`auras/canvas/AuraCanvas.tsx:14-20`) — єдиний користувач патерну «attach canvas → detach». Окремий хук не окупиться.

---

## (c) Пропоновані помічники в runtime

### c1. Скасування сцени: `stopStage` / `cancelLayer` / скасовний `schedule` (топ-1)
- **Доказ:**
  - `CanvasFrame.tsx:37-41` вручну чистить внутрішні поля сцени (`stage.draws.clear(); stage.tweens.clear(); stage.particles = []`). Це протікання абстракції з `runtime/canvas.ts`.
  - `BattleFxLayer.tsx:21-24, 57` скасовує анімацію через `key={stage.n}`: новий DOM-шар. Стара `Stage` лишається у `WeakMap`, її rAF-цикл крутиться, поки не закінчаться твіни, і малює на відʼєднаний canvas. Для meteor на 4 цілі (`animations/meteor.ts:16-20, 174-180`) це до ≈1.9 с марної роботи.
  - `animations/buff.ts:22-24` і `animations/death.ts:8-10` випускають частинки через голий `setTimeout`. Ці таймери не привʼязані до сцени й переживають будь-яке скасування.
- **Пропозиція:** у `runtime/canvas.ts` (або новому `runtime/stage.ts`):
  - `stopStage(s)` — очищає draws/tweens/particles і резолвить висячі твіни, щоб `await` завершився;
  - `cancelLayer(layer)` — `stopStage` + видаляє `.fxs-sheet` з шару;
  - `schedule(s, ms, fn)` — таймер, який знімає `stopStage`;
  - `wait` всередині анімацій → `stageWait(s, ms)`.

  Тоді `BattleFxLayer` у cleanup ефекту викликає `cancelLayer(el)` без трюку з `key`, а `CanvasFrame` у cleanup — `stopStage(stage)`.
- **Зусилля:** S–M. **Ризик:** середній. Резолв висячих твінів продовжить виконання `async`-анімацій після скасування, тому кожна `show`/`tween` має безпечно відпрацювати на зупиненій сцені (вона вже не прокидається, якщо `stopped`).

### c2. Один тікер і один пул частинок (топ-3)
- **Доказ:**
  - Дві майже ідентичні системи частинок. `runtime/canvas.ts:5-19, 137-151` (`Particle`, інтегрування drag/gravity, `filter`) і `auras/canvas/types.ts:4-68` (`AuraParticles.step` — той самий інтегратор + `move`/`draw`-хуки, теж `filter`).
  - Три незалежні «петлі». `Stage.tick` (`runtime/canvas.ts:102-157`) — по одній на кожен шар: `BattleFxLayer` + кожна `CanvasFrame` (`CanvasFrame.tsx:27`). Цикл аур (`auras/canvas/loop.ts:63-91`) — свій rAF.
  - **Кількісно:** `area`/`meteor`/`quake` по 4 цілях дає 1 (overlay) + 4 рамки (+1, якщо ціль — власний герой і в `MyHeroPanel`, і в рядку) + 1 (аури) = **6–7 ланцюжків rAF на кадр**, кожен робить свій `clearRect` і `filter` масиву частинок.
- **Пропозиція:**
  - `runtime/ticker.ts`: `subscribe(fn: (now, dt) => boolean | void, { fps? }) → unsubscribe`. Один `requestAnimationFrame`, підписник з `fps: 30` (аури) пропускає кадри сам.
  - `runtime/particles.ts`: `ParticlePool` з `spawn/emit(rate, dt, make)/step(g, dt)`, компакція на місці (swap-remove або індекс запису) замість `filter`, і текстура `glow(tint)` один раз на частинку (зараз `glow(p.tint)` — пошук у Map на кожну частинку щокадру, `auras/canvas/types.ts:61`). `Stage.particles` і `AuraCtx.parts` використовують той самий клас.
  - `tween(s, ms, fn: (k, dt) => void)` — передавати `dt` у секундах. Це прибирає ручний облік:
    - `animations/meteor.ts:111-113, 157-161`;
    - `animations/quake.ts:53, 103-106` — там `dt = v - last`, тобто це частка твіна, а не секунди. Працює лише тому, що твін триває рівно 1000 мс; зміна тривалості зламає фізику;
    - `frames/canvas/poison.ts:65-71, 95`;
    - `frames/canvas/earth.ts:84, 142-145, 176`.
- **Зусилля:** M. **Ризик:** середній, потрібні оновлені тести `auras/canvas/__tests__/loop.test.ts` (`auraLoopState`).

### c3. Помічники для рамок (`frames/canvas/*`)
- **`edgeGlow(g, box, { fill?, stroke, width, blur, shadow, radius? })`** — патерн «roundRect fill градієнтом + roundRect stroke з `shadowBlur`» повторюється у 13 з 14 рамок: `fire.ts:17-33`, `fury.ts:23-35`, `heal.ts:42-55`, `necrotic.ts:27-47`, `nature.ts:43-56`, `poison.ts:29-43`, `cold.ts:62-70, 90-95`, `earth.ts:93-104`, `lightning.ts:66-74`, `physical-melee.ts:107-116`, `physical-ranged.ts:160-170`, `wind.ts:129-135`, `radiant.ts:89-94`.
- **`verticalFill(g, box, stops: [offset, rgba][])`** — вертикальний лінійний градієнт знизу вгору: `fire.ts:17`, `heal.ts:42`, `nature.ts:43`, `poison.ts:29`, `earth.ts:93`.
- **`bloodFlash(g, box, red, alpha)`** — `physical-melee.ts:104-116` і `physical-ranged.ts:158-170` майже дослівно однакові (червоний спалах + рамка).
- **`envelope(k, inEdge, outEdge)` і `pulse(k, peak)`** у `runtime/easing.ts` разом з `clamp01` (зараз `frames/canvas/types.ts:43`) і `fadeInOut` (зараз `auras/canvas/types.ts:84`):
  - `clamp01(k/a) * clamp01((1-k)/b)` — `heal.ts:37`, `nature.ts:39`, `wind.ts:49`;
  - `k < a ? k/a : 1-(k-a)/(1-a)` — `fire.ts:15`, `physical-melee.ts:104`, `physical-ranged.ts:158`, `animations/teleport.ts:34`, `animations/heal.ts:14`, `animations/summon.ts:14`;
  - `easeOutCubic` — `runtime/canvas.ts:230`, `animations/meteor.ts:116`.
- **`emitOnPerimeter(s, box, opts, { offset?, outward? })` і `emitOnEdge(s, box, "bottom", opts)`:**
  - периметр — `fury.ts:52-55`, `necrotic.ts:54-62`, `nature.ts:80-84`;
  - низ рамки — `fire.ts:53`, `heal.ts:77`, `earth.ts:168, 174`, `cold.ts:108`.
- **Шлях:** перенести `roundRect`, `perimeter`, `clamp01` з `frames/canvas/types.ts` у `runtime/frame-kit.ts`. Файл `types.ts` має містити лише типи — зараз у ньому логіка.
- **Зусилля:** M. **Ризик:** низький, але візуальний. Кожну рамку треба звірити в лабораторії до/після.

### c4. Спільні фігури (`runtime/shapes.ts`, туди ж перенести `auras/canvas/shapes.ts`)
- **Листок:** `animations/entangle.ts:53-67` і `auras/canvas/roots.ts:21-35` майже ідентичні. Варіації того самого — `frames/canvas/nature.ts:21-31`, `frames/canvas/wind.ts:117-120`, `auras/canvas/marked.ts:4-10`. Пропозиція: `leafPath(g, size, fatness)`.
- **Зірка:** `frames/canvas/radiant.ts:18-31` (`star`, 8 вершин, inner 0.22) — це той самий `twinkle`/`starPath(…, 4, 0)` з `auras/canvas/shapes.ts:1-22`.
- **Кубічна Безьє:**
  - `animations/entangle.ts:21-25` і `auras/canvas/roots.ts:15-19`. Версія в roots ще й виділяє масив через `[0, 1].map` на кожну точку щокадру.
  - Пропозиція: `cubicBezier(p0, p1, p2, p3, t, out?)` у `runtime/geometry.ts` поряд з `bezier`.
- **Звужений штрих:** `entangle.ts:78-88` і `roots.ts:60-74` — один і той самий алгоритм (сегменти зі спадною товщиною у 3 проходи). Пропозиція: `taperedStroke(g, pts, width, color, taper)`, групувати сегменти в 4–6 смуг товщини замість окремого `stroke()` на сегмент. Зараз це 24 × 3 × 5 = **360 `stroke()` на кадр на портрет** для roots (30 fps, безперервно) і ≈28 × 3 × 6–8 ≈ 500–670 на ціль для entangle.
- **Ламаний багатокутник/камінь:** `meteor.ts:24-40` (`rockShape` + `poly`), `earth.ts:48-60, 122-137`, `auras/canvas/dust.ts:44-52`. Пропозиція: `jaggedPoly(n, size, jitter)` + `fillPoly`.
- **Полілінія:** `earth.ts:62-71`, `lightning.ts:45-52` (виділяє масив через `path.slice(1)` на кожен штрих), `auras/canvas/static.ts:23-30`, `quake.ts:64-82`. Пропозиція: `polyline(g, pts, upTo?)`.
- **Падаючі уламки:** `meteor.ts:163-168`, `quake.ts:111-117`, `earth.ts:142-166`. Пропозиція: `stepBodies(bodies, dt, gravity, floor?)`.
- **Зусилля:** M. **Ризик:** низький.

### c5. Рецепти анімацій дій (`animations/*`)
- **`perTarget(to, staggerMs, fn)`** — `Promise.all(to.map(async (t, i) => { await wait(i*X); … }))` є в 11 з 14 файлів (`area`, `buff`, `death`, `debuff`, `heal`, `summon`, `swarm`, `quake`, `teleport`, `entangle`, `meteor`).
- **`burst(s, at, palette, count)`** — однаковий вибух частинок:
  - `bolt.ts:15` і `area.ts:17`: `speed [60, 300…340], life [.4, .9], scale [.55….6, .05], drag 3.5, gravity 60`;
  - `meteor.ts:151`: та сама форма з `speed [60, 320], life [.35, .8], scale [.6, .05], gravity 80`.
- **`impactSplash(run, target, { flash, sheetScale, ms })`** — трійка `flash + playSheet(palette.sprite) + wait` у `bolt.ts:17-22`, `area.ts:19-23`, `meteor.ts:154-156`.
- **`pillar(s, target, tint, { ms, height, emit })`** — `animations/heal.ts:10-20` і `animations/summon.ts:10-20` майже дослівно однакові (стовп світла + частинки вгору + ring).
- **`palette.accent`** (у `runtime/palette.ts`) замість `palette.tints[1] ?? palette.core` — 5 місць: `bolt.ts:19`, `debuff.ts:20`, `heal.ts:12, 22`, `meteor.ts:120`.
- **Кольори з `PALETTE` замість копій:**
  - `FLAME` у `frames/canvas/fire.ts:5` і `auras/canvas/burning.ts:5` = `PALETTE.fire.tints` (`runtime/palette.ts:13`);
  - `EMBER` продубльовано у `fire.ts:7` і `burning.ts:7`.
- **`IMPACT_MS` як єдине джерело таймінгів:**
  - Таймінги удару існують двічі: у `lib/utils/battle/fx/timing.ts:3` і як літерали в анімаціях — `bolt.ts:11` (600), `area.ts:11` (650), `heal.ts:8` (450), `debuff.ts:11` (650), `ranged.ts:39` (380), `melee.ts:17, 41` (190 + 40 = 230), `swarm.ts:7` (700), `teleport.ts:5` (300), `meteor.ts:16` (700), `entangle.ts:107, 15` (120 + 380 = 500), `buff.ts:20` (400). Розійдуться — рамка й тремтіння в рядку будуть не в такт з анімацією.
  - Пропозиція: анімації імпортують `IMPACT_MS.<archetype>` з `@/lib/utils/battle/fx`.
  - Туди ж `MAX_FX_MS = 3000` з `BattleFxLayer.tsx:12`.
- **Зусилля:** S–M. **Ризик:** низький.

### c6. Помічники для аур (`auras/canvas/*`)
- **Розмір у px замість `/64`:** `spritePx(g, tex, x, y, wPx, hPx?, alpha, additive)` — 36 місць ділять на `TEX = 64` вручну, наприклад `auras/canvas/burning.ts:21-22`, `curse.ts:18-21`, `rage.ts:26-27`. `TEX` — деталь реалізації `runtime/canvas.ts:38`.
- **Типізоване поле `data` у частинці:**
  - Зараз поля частинки перевантажені під інші значення: `decay.ts:7-14` (`vx` = кутова швидкість, `gravity` = радіальний зсув), `dust.ts:19, 35-41` і `bloodlust.ts:6-9`, `haste.ts:5, 14` (`pts` як масив параметрів з «магічними» індексами).
  - Пропозиція: `AuraParticle<D = undefined>` з полем `data: D`, а `move`/`draw` читають `cx/cy/r` з `data`. Тоді їх можна оголосити один раз на рівні модуля.
  - Зараз ці функції створюються щокадру: `decay.ts:21` (`curl(...)`), `bloodlust.ts:64` (`drain(...)`), `haste.ts:53` (`makeDraw(...)`), а також інлайн-лямбди `draw` для `twinkle` у `frost.ts:65`, `frozen.ts:151`, `moonmark.ts:65`, `blessing.ts:41`.
- **Обрізання диском:** `outside()` (`auras/canvas/types.ts:93-101`) дублюється вручну в `dust.ts:26-32` (інший розмір прямокутника). Пропозиція: параметр `extent` в `outside()`.
- **Зусилля:** S–M. **Ризик:** низький.

---

## (d) Продуктивність

### d1. Аури: градієнти й blur щокадру при 30 fps × N портретів (топ-2)
Аури крутяться безперервно, поки на учасника діє ефект: до 2 аур на портрет (`MAX_AURAS`), десятки портретів на екрані.

**Градієнти, що не залежать від часу** (залежать лише від `cx, cy, r` — константи сутності):
- `shield.ts:11` (shell) — кешувати в `ctx`;
- `blind.ts:34` (band) — кешувати;
- `frozen.ts:50` (body) — кешувати;
- `moonmark.ts:39` (fill у локальних координатах) — кешувати.

**Градієнти з альфою, що змінюється в часі:**
- `frost.ts:39` (shimmer в alpha stop) — один градієнт + `globalAlpha`;
- `frozen.ts:126` (рухома смуга) — кешований градієнт + `translate`;
- `haste.ts:22` — **один градієнт на кожну частинку щокадру** (до ~10 частинок). Варіант: градієнт у локальних координатах від 0 до `len` + `translate`, альфа через `globalAlpha`.

**Безперервний `shadowBlur`:**
- `frozen.ts:103-111` (`6*s` на обведенні оболонки щокадру);
- `moonmark.ts:45-50`.

Blur на Canvas 2D — одна з найдорожчих операцій, особливо на мобільних. Пропозиція: «статичний шар» — `ctx.cache(key, (g) => draw)`. Він рендерить незмінну частину (оболонка й грані frozen, шестикутники shield, тріщини dust `dust.ts:66-77`, голки frost `frost.ts:50-57`) один раз в `OffscreenCanvas`/`canvas` розміром `box × dpr`, а потім лише `drawImage`.

**Виділення памʼяті щокадру:**
- `frozen.ts:42-44` — `SHELL.map`/`CORE.map` → кешувати точки в `ctx`;
- `roots.ts:53-57` — `pts` і `line` на кожен корінь + `[0, 1].map` у `cubic`;
- `stun.ts:16-22` — масив + `sort` на 3 елементи (дрібниця).

**Оцінка ефекту:** для frozen/shield/frost/blind/dust/moonmark/roots робота на кадр падає в рази. Точний виграш треба заміряти: Performance-профіль у лабораторії, сітка з 23 аур, `(prefers-reduced-motion)` вимкнено.

**Зусилля:** M. **Ризик:** низький. Інвалідація кешу — за `size`/`dpr`, а `attachAura` і так створює новий `ctx` на зміну.

### d2. Рамки (короткочасні, ≈1–2.7 с) — менш критично, але масово
- Усі 14 рамок щокадру створюють 1–3 градієнти і майже всі ставлять `shadowBlur` (див. c3). Під час `area` по 4 цілях це 4 одночасні canvas розміром рядка (`CanvasFrame.tsx:9, 45`: рядок + 2 × 16 px × DPR).
- **Пропозиція:**
  - для `edgeGlow` — градієнт з константними stops + `globalAlpha`, кешувати на `box` в замиканні рамки (box для рамки фіксований);
  - blur — один stroke з blur, а не fill + stroke з blur.
- `wind.ts:79` — новий градієнт на кожен з 7 поривів щокадру.
- **Зусилля:** S (разом з c3). **Ризик:** низький.

### d3. Цикл частинок: `filter` на кожен тік
- `runtime/canvas.ts:137` і `auras/canvas/types.ts:45` створюють новий масив щотіку на кожну сцену/шар аури.
- При 46 частинках/с у `burning` (`burning.ts:24`) і 20 портретах це ≈ 20 × 30 = 600 масивів/с лише від аур.
- Вирішується разом з c2 (компакція на місці).

### d4. Ре-рендери і пропси memo-рядків
- **Нова порожня колекція на кожен рендер:**
  - `ParticipantList.tsx:40` — `effects.get(id) ?? []` створює новий масив, тож `memo(ParticipantRow)` інвалідовується для кожного учасника без ефектів;
  - те саме в `MyHeroPanel.tsx:21`.
  
  Це було й до гілки, але тепер кожен такий зайвий рендер ще запускає `StatusAuras` → `aurasOf(effects)` → `AURA_PRIORITY.filter` і дві `useSyncExternalStore`. Пропозиція: `const NO_EFFECTS: ActiveEffect[] = []`. **S**, ризик нульовий.
- **`useFxImpacts` рахується тричі** (`ParticipantList` × 2 сторони + `MyHeroPanel` через `useFxImpact`). Всередині `impactFor(last, id)` (`lib/utils/battle/fx/impact.ts:18`) повторно викликає `mapAction(action)` для кожної цілі: 1 + T разів на кожен з 3 хуків.
  - Пропозиція: `impactFor(spec, id)` приймає вже готовий `FxSpec` (`useFxImpact.ts:24-26`).
  - Опційно: рахувати мапу один раз у `useBattleSceneValue` і віддавати через `BattleSceneDataContext`.
  - **S.**
- **`StatusAuras` має власний `useFxEnabled`** (`StatusAuras.tsx:10`) — нормально, лише після кешування знімка (b3).

### d5. `getBoundingClientRect`
- `runtime/anchors.ts:5-23` викликає `gBCR` двічі на анкер: у `visible()` і `centerOf()`. `querySelectorAll` з `filter(visible)` — один раз на старт анімації, не в циклі.
- Можна повертати прямокутник з `findAnchor`, щоб не міряти двічі. Виграш мізерний, бо це не гарячий шлях. **S, опційно.**
- `FxLabPanel.tsx:33-39` має свій `center()` (див. e5).

### d6. Розмір бандла
- `BattleFxLayer` — `dynamic(..., { ssr: false })` (`BattleScreen.tsx:50`), тож `animations/*` + `sprites` лінуються. Добре.
- **Проблема:** `StatusAuras` і `ImpactFrame` імпортуються статично (`ParticipantRow.tsx:6-7`, `MyHeroPanel.tsx:6-7`). Через них в основний чанк бою потрапляють усі 23 аури, 14 рамок, `runtime/canvas.ts` і `geometry.ts`: ≈ 57 + 48 + ~12 KB сирого source, ~30 KB gzip source; після мініфікації орієнтовно 10–15 KB gzip.
- **Пропозиція:**
  - **(а)** `next/dynamic` для `AuraCanvas` і `CanvasFrame` з `ssr: false`, модуль попередньо завантажувати при монтуванні сцени, якщо `enabled`;
  - **(б)** або реєстри `AURA_ANIMATIONS`/`FRAME_ANIMATIONS` з `() => import("./burning")` на кожен вид і кешем модулів.

  Варіант (а) простіший.
- **Зусилля:** M. **Ризик:** середній. Перший удар без попереднього завантаження може пропустити рамку, тому треба `preload` у `BattleScreen`.

### d7. Розмір canvas і DPR
- `stageFor` змінює розмір canvas при кожному виклику (`runtime/canvas.ts:92-96`), а `BattleFxLayer` викликає його на кожну анімацію. Встановлення `width` очищає canvas, тож частинки попередньої анімації, що ще летять, зникають на кадр.
- Під час анімації немає реакції на resize/зміну DPR.
- **Пропозиція:** `fitCanvas(canvas, w, h)` — змінювати розмір лише при зміні `w × h × dpr`; один хелпер для `stageFor` і `attachAura` (`loop.ts:110-113`).
- **Зусилля:** S. **Ризик:** низький.

---

## (e) Декомпозиція

### e1. `runtime/canvas.ts` (252 рядки, 4 відповідальності)
- Текстури (`glow`, `sprite`, рядки 38–72) → `runtime/texture.ts`.
- Сцена й цикл (`stageFor`, `wake`, `tick`, `tween`, `show`, рядки 74–200) → `runtime/stage.ts` (+ `ticker.ts`, c2).
- Примітиви ефектів (`shoot`, `ring`, `flash`, `emit`, `pick`, рядки 159–252) → `runtime/primitives.ts` (+ `burst`, `impactSplash`, `pillar` з c5).
- **Зусилля:** M (механічно). **Ризик:** низький.

### e2. «types.ts», що містять логіку
- `auras/canvas/types.ts` містить клас `AuraParticles` і помічники `fadeInOut`, `onRim`, `outside`, `rimGlow` → `auras/canvas/kit.ts` (а `AuraParticles` → `runtime/particles.ts`).
- `frames/canvas/types.ts` містить `roundRect`, `perimeter`, `clamp01` → `runtime/frame-kit.ts`.
- **S.**

### e3. Портрет і декорації удару
- `Portrait` тепер має 8 пропсів (`hud/Portrait.tsx:8-19`): `participant, size, current, me, extra, className, fxId, fxAnchor`. `fxId` завжди дорівнює `participant.basicInfo.id` (`ParticipantRow.tsx:44`, `MyHeroPanel.tsx:41`, `InitiativeTrack.tsx:34`).
  - Пропозиція: один проп `fx?: "main" | "track"`, `data-fx-participant` береться з `participant`. Знову 7 пропсів. **S**, ризик низький (тест `field.test.tsx:203` шукає `[data-fx-participant="gob"]` — не зміниться).
- `useHitFx` + `<PortraitFx>` — див. b5.

### e4. Чиста логіка, яку варто перенести в `lib/utils/battle/fx` (з тестами)
- **`frameFor(impact)`** (`frames/canvas/index.ts:40-46`) — чисте зіставлення. Розділити на `frameKindOf(impact): FxElement | "heal" | "physical-melee" | "physical-ranged"` у lib (тест) + реєстр у компонентах. Тоді зникають аліаси `HEAL_FRAME`, `PHYSICAL_MELEE_FRAME`, `PHYSICAL_RANGED_FRAME` (`frames/canvas/index.ts:34-38`), які використовує лише лабораторія.
- **`impactFor(spec, id)`** — див. d4.
- **Геометрія без DOM:** `perimeter`, `bezier`, `arcControl`, `lungeOffset`, `envelope`, `cubicBezier`. Можна лишити в `runtime/`, але покрити тестами в `components/battle/fx/__tests__/`. Тестів на `perimeter` (нормалі, обгортання `t`) зараз немає, хоча на ньому тримаються 6 рамок.
- **Підписи** `ARCHETYPE_LABEL`, `ELEMENT_LABEL`, `AURA_LABEL` (`fx-lab/FxLab.tsx:24-28`) → `lib/constants/battle-fx.ts`, якщо плануються підказки до аур у `EffectLine`; інакше → `fx-lab/labels.ts`.

### e5. Спільний запуск анімації: `playFx`
- `BattleFxLayer.tsx:26-55` (guard 3 с, `resolvePoints`, `ANIMATIONS[...]({ stage: stageFor(el), … palette: PALETTE[...] })`, `catch` + `finally`) і `FxLabPanel.tsx:58-97` (те саме: свій `find`/`center`, `stageFor`, `PALETTE`, заміри часу) збирають `FxRun` двічі.
- **Пропозиція:** `runtime/play.ts`: `playFx(layer, spec, { root?, origin? }): Promise<void>`. Функція збирає `FxRun`, застосовує guard і рахує точки відносно `origin` (viewport для бою, `layer.getBoundingClientRect()` для лабораторії) через існуючий `findAnchor(id, root)` (`runtime/anchors.ts:13`, вже приймає `root`).
- **Зусилля:** S–M. **Ризик:** низький.

### e6. Мертвий код і експорти
- `SHEETS.fireball` (`runtime/sprites.ts:11`) і `public/fx/sprites/fireball.png` ніде не використовуються → видалити, а в `LICENSE.txt` прибрати згадку, якщо вона є.
- `fx-lab/fx-lab.css:2, 4-5`: класи `.fxs-sheet--loop`, `.fx-react-flash-purple` і `@keyframes fx-flash-purple` ніде не використовуються → видалити.
- `PALETTE.cold.filter = "hue-rotate(0deg)"` (`runtime/palette.ts:14`) — no-op → прибрати.
- Barrel `lib/utils/battle/fx/index.ts` експортує `auraOf`, `MAX_AURAS`, `takeNewActions`, `SPELL_FX_OVERRIDES`, `MAX_FX_QUEUE`, `MAX_FX_BATCH`, `elementOf`. Поза модулем їх використовують лише тести (рядки 1–8). Прибрати з barrel, а тести хай імпортують з файлів напряму. **S.**
- `useFxImpact` (одиночний) — обгортка над `useFxImpacts` для одного користувача (`MyHeroPanel`). Можна лишити, але після b5 вона стане частиною `useHitFx`.
- `auraLoopState` (`loop.ts:133`) потрібен лише тестам — допустимо.

---

## (f) Що добре і не потребує змін

- **Чиста доменна частина** `lib/utils/battle/fx` (`map-action`, `queue`, `new-events`, `aura`, `impact`) — чисті функції з тестами. Черга через «derive state during render» (`useBattleFxQueue.ts:20`) без ефектів, з захистом від запізнілого `done` (`queue.ts:32-34`).
- **Один спільний IntersectionObserver на всі аури** і пауза малювання поза екраном (`loop.ts:34-47, 83`), 30 fps для аур (`loop.ts:71`), випадкова фаза, щоб сусіди не пульсували синхронно (`loop.ts:117-118`), режим `still` для reduced-motion.
- **Лінивий `BattleFxLayer`** (`dynamic`, `ssr: false`), а сцена `Stage` прокидається лише, коли щось живе (`runtime/canvas.ts:101-108`) — у простої битви FX-цикл нічого не коштує.
- **Кеш текстур `glow()`** за кольором (`runtime/canvas.ts:40-66`). Спрайт-листи — CSS `steps()` на DOM, без canvas (`sprites.ts`), і це правильний вибір для піксель-арту.
- **Стабільні обʼєкти `FxImpact`** у `useFxImpacts` (Map у `useMemo`) — memo-рядки не ламаються новим пропом `impact`.
- **Обробка прихованої вкладки**: `usePageHidden` → `active=false` → черга лише просуває `seen`, тож після повернення нічого не програється пачкою.
- **Поділ «одна анімація = один файл»** з реєстрами `ANIMATIONS`, `FRAME_ANIMATIONS`, `AURA_ANIMATIONS` — зручно для лабораторії й ревʼю. Усі пропозиції вище його зберігають.
- **`diffAppliedEffects` і `fxMeta`** у `spell/cast.ts` малі й покриті тестами; `fxElement` додається лише власним ефектам заклинання.
- **Анкери** через `data-fx-participant` + `data-fx-anchor="track"` з пріоритетом рядка над треком ініціативи (`anchors.ts:13-17`) — просто і з тестами.

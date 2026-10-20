# Погода й музика — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ДМ задає атмосферу бою: анімована погода на карті (дощ, гроза, сніг, хуртовина, туман, вогонь) і фонова музика з бібліотеки кампанії (MP3/M4A і YouTube), синхронно для всіх учасників у реальному часі.

**Architecture:** Погода — поле `BattleMapConfig.weather` у JSON карти (`battle_scenes.map`); змінюється звичайною мутацією бою `map-weather` через `runBattleMutation` (версія росте, дельта несе `scene.map`), малюється одним `<canvas>` прямо в `[data-fx-clip]`, поза шарами зуму й повороту, тож частинки рухаються в екранних координатах. Музика — таблиця `campaign_tracks` (Storage-бакет `battle-music`, файли вантажить браузер напряму за підписаним URL) і колонка `battle_scenes.audio JSONB` зі станом відтворення `{ trackId, track, playing, offsetSec, startedAt, seq }`. Маршрут `POST .../audio` змінює лише цю колонку (без `version`, без журналу) з умовним `updateMany` за `seq` і після відповіді шле Pusher-подію `battle-audio`; клієнт тримає стан у власному query key `battleKeys.audio`, зливає джерела за `seq` (сцена, Pusher, відповіді) і веде `<audio loop>` або YouTube IFrame Player до позиції `offsetSec + (now + clockOffset − startedAt)/1000 mod duration`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, TanStack Query 5, Prisma 6 + PostgreSQL (Supabase), Supabase Storage (`@supabase/supabase-js` 2.95: `createSignedUploadUrl` / `uploadToSignedUrl` / `info`), Pusher, Zod 4, Vitest (`environment: node`; DOM-тести — `// @vitest-environment happy-dom`), Canvas 2D.

**Spec:** docs/superpowers/specs/2026-10-19-weather-music-design.md

## Global Constraints

- Специфікація — обовʼязкова; рішення користувача з неї не переглядати: погода лише атмосфера й лише на карті (без карти й у вигляді «Колонки» — ні шару, ні перемикача); 6 ефектів; музика — бібліотека кампанії (файли + YouTube), трек грає по колу до перемикання чи паузи; плеєр справа внизу, синхронний; гравець змінює лише свою гучність і вимикає звук у себе (запамʼятовується на пристрої); трек і паузу керує ДМ; «Увімкнути звук» — один жест на кожне відкриття сторінки; синхронізація музики — окремий канал без підвищення `version`.
- Шари (`CLAUDE.md`): `route.ts` тонкий (Zod, сесія, делегування в сусідній handler-файл); запити — лише в `lib/api/<domain>.ts`; дані, мутації й логіка — у хуках `lib/hooks/<domain>/` (імпорт із теки-барела); чиста логіка — `lib/utils/<domain>/` з тестами в `__tests__/`; компоненти не імпортують `@/lib/api/*` (ESLint). Ключі запитів — фабрики в `keys.ts`, без інлайн-масивів.
- Помилки API — `{ error, issues? }` з українськими текстами з `lib/constants/api-errors.ts`; хелпери `parseBody`, `requireDM`/`requireCampaignAccess`, `loadOwned`, `errorResponse`.
- Міграції лише expand-only; кожен `CREATE TABLE` має `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (`prisma/__tests__/migrations-rls.test.ts`). Prod-БД не чіпати: міграцію застосовувати лише до локальної Docker-БД (`localhost:54322`), перед цим перевірити, що `DATABASE_URL` і `DIRECT_URL` у `.env.local` вказують на `localhost:54322`. `migrate deploy` на prod робить лише Vercel-збірка з `main`.
- Egress (Supabase free tier) — жорстке обмеження: файли треків з унікальним імʼям і `cacheControl` 1 рік; `<audio>` без `src` до «Увімкнути звук» (`preload="none"`); `GET .../audio` — лише після розблокування звуку й після resync; бібліотеку треків читає лише ДМ; Pusher шле лише зміни стану (жодних тиків позиції).
- Vercel обмежує тіло запиту 4,5 МБ — тому MP3 до 10 МБ іде не через наш маршрут, а з браузера в Storage за підписаним URL, який видає DM-only маршрут.
- YouTube: IFrame Player API з `host: https://www.youtube-nocookie.com`, видимий плеєр не менше 200×200, без прихованого аудіо: iframe існує лише поки панель розгорнута; згорнута панель на YouTube-треку — без звуку в цього гравця.
- `prefers-reduced-motion` → статичний відтінок погоди без руху; прихована вкладка або `weather = null` → жодного rAF.
- Телефонний режим карти (`phone`: обрізка, поворот, вертикальна прокрутка) працює з погодою; desktop не змінюється, крім описаного.
- Інший агент паралельно править `components/battle/map/BattleMap.tsx`, `MapToken.tsx`, `template.ts`, `lib/hooks/battle/useBattleMapScene.ts`, `types/battle.ts` на гілці `feat/battle-map-fx`. Працювати в окремому worktree на гілці `feat/weather-music` від вершини `feat/battle-map-fx` на момент старту; зміни в цих файлах — лише додавання (новий імпорт, новий рядок JSX, нове поле), без переформатування сусіднього коду; нові тести — у нових файлах, а не в `BattleMap.test.tsx`.
- Імпорти — `simple-import-sort`; порожній рядок навколо `const`/`let`/`if`/`return`/блоків; `react-hooks/exhaustive-deps` = error; без `console.log` (лише `info/warn/error`); без `any`. Перед кожним комітом: `pnpm exec tsc --noEmit`, `pnpm lint` чисті, тести задачі зелені.
- Коментарі лише для неочевидного «чому», один рядок, українською; ідентифікатори англійською; тексти UI українською.
- Компоненти: ≤ ~7 пропсів, колбеки групувати в обʼєкт (`actions={{ … }}`), діалоги — `ResponsiveDialog hud`, підтвердження — `useConfirm()`, сторінки — `HudPage` + `HudPageHeader`.
- Комітити лише свої файли явними шляхами (`git add <paths>`); повідомлення закінчується рядком `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Не мерджити, не пушити.

### Рішення цього плану (узгоджені зі специфікацією)

- **Pusher:** подія `battle-audio` (`BATTLE_AUDIO_EVENT` у `lib/pusher/channels.ts`) у канал `private-battle-<id>`, payload `BattleAudioEvent = { battleId: string; audio: BattleAudioState }` (~300 байт, ліміт 9 500 не загрожує). Шлеться через `after(() => safePusherTrigger(…))` після відповіді.
- **Розділення з версією бою:** `usePusherBattleSync` привʼязує `battle-audio` окремим обробником, який пише лише в `battleKeys.audio(c, b)` і ніколи не читає й не пише кеш сцени, тож аудіо не створює «пропусків версії». У `resync` (перепідключення, вкладка схована > 15 с) додатково інвалідовується `battleKeys.audio` — запит іде лише якщо звук уже розблоковано (query вимкнений до того).
- **`seq`:** сервер рахує `seq = prev.seq + 1` і пише з умовою `audio.seq = prev.seq` (або `audio IS NULL`); не вийшло → 409 `BATTLE_AUDIO_CONFLICT`, клієнт ДМ перечитує стан. Клієнт зливає будь-яке джерело чистою `mergeAudio`: приймає лише `incoming.seq > cached.seq`; `null` ніколи не затирає наявний стан. Однаковий `seq` з Pusher після власної відповіді ДМ ігнорується.
- **Знімок треку в стані:** стан несе `track: { title, kind, url, youtubeId, durationSec }` поруч із `trackId` (доповнення до форми зі специфікації): гравцям не потрібен доступ до бібліотеки, видалений трек не ламає стан. «Стоп» = `trackId: null, track: null, playing: false`.
- **Годинник:** `clockOffsetMs` рахує `lib/api/battle-audio.ts` із заголовка `Date` відповіді `GET/POST .../audio` (`clockOffsetFromDate`: `Date + 500 мс − середина запиту`, бо `Date` має цілі секунди). Офсет живе в кеші разом зі станом (`BattleAudioSnapshot`), до першого виміру — 0.
- **Міграція:** `prisma/migrations/20261020000000_campaign_tracks_battle_audio/migration.sql` (наступна після `20261019000000_battle_map`), одна на таблицю й колонку.
- **Завантаження файлу:** `POST /tracks/upload-url` (лише ДМ) перевіряє тип/розмір/ліміт 40 і видає `createSignedUploadUrl` у бакет `battle-music` (шлях `<campaignId>/<uuid32>.mp3|m4a`); браузер вантажить `uploadToSignedUrl(..., { contentType, cacheControl: "31536000" })`; `POST /tracks { kind: "file", path }` перевіряє, що шлях належить кампанії, і через `info()` — розмір ≤ 10 МБ і тип (інакше видаляє обʼєкт). Бакет створюється з `fileSizeLimit` 10 МБ і `allowedMimeTypes` `audio/mpeg`, `audio/mp4` — Storage сам відхилить чужий файл.
- **Плеєр:** один `BattleAudioProvider` у `BattleScreen` (стан, «звук увімкнено», гучність), док рендериться на desktop і в лобі `fixed` справа внизу, на телефоні — у `MobileBattleLayout` рядком нульової висоти просто над смугою ходу. Порядок треків на сторінці «Музика» — кнопки ↑/↓ (без drag-and-drop).
- **iOS:** клік «Увімкнути звук» синхронно викликає `play()` на тому самому `<audio>` (з реальним `src` або з тихим WAV) — елемент розблоковується. YouTube на iOS може проігнорувати `playVideo()` — тоді показуємо «Торкніться ▶ у плеєрі».

## Review Focus

1. **Музика не чіпає бій:** `POST .../audio` не змінює `version`, не пише журнал, а мутація бою (`saveBattle`) після зміни музики не затирає `audio`. → тести в Task 8.
2. **Застарілі й дубльовані стани:** подія `battle-audio` або сцена з `seq ≤` кешованого не відкочує плеєр; аудіо-подія ніколи не інвалідовує й не патчить кеш сцени. → тести в Task 5 (`mergeAudio`) і Task 9 (`usePusherBattleSync`).
3. **Позиція через межу петлі:** дрейф рахується по колу (поточна 1 с, ціль 179 с трека 180 с → 2 с, не 178), на паузі позиція не росте, некоректний `startedAt` у майбутньому не дає відʼємної позиції. → тести в Task 5 (`position.ts`) і Task 10.
4. **Погода на телефонній карті й без неї:** canvas — прямий нащадок `[data-fx-clip]`, а не всередині `[data-map-rotated]`; `weather` відсутня/`null`, reduced-motion чи прихована вкладка → без підписки на rAF. → тести в Task 2.
5. **Підробка завантаження:** `POST /tracks` зі шляхом іншої кампанії, неіснуючим чи завеликим обʼєктом → 400 без запису; ліміт 40 перевіряють і видача квитка, і створення. → тести в Task 6.

---

### Task 1: Погода в даних карти і мутація `map-weather`

**Files:**
- Modify: `types/battle.ts` (додати тип і поле — лише додавання)
- Create: `lib/constants/battle-weather.ts`
- Modify: `lib/schemas/battles.ts`, `lib/schemas/__tests__/battle-map-schema.test.ts`
- Create: `app/api/campaigns/[id]/battles/[battleId]/map-weather/map-weather-mutation.ts`, `app/api/campaigns/[id]/battles/[battleId]/map-weather/route.ts`
- Modify: `lib/utils/api/rate-limit.ts` (скоуп `mapWeather`)
- Modify: `types/api.ts` (`MapWeatherData`), `lib/api/battles.ts` (`setMapWeather`), `lib/hooks/battles/useBattles.ts` + `lib/hooks/battles/index.ts` (`useMapWeather`), `lib/hooks/battle/useBattleScene.ts` (`actions.mapWeather`), `lib/hooks/battle/__tests__/fake-scene.tsx` (`mapWeather: mutation()`)
- Test: `app/api/__tests__/battles/map-weather-mutation.test.ts`

**Interfaces:**
- Consumes: `runBattleMutation`, `BattleAccess`, `BattleMutationContext`, `MutationResult` (`lib/utils/battle/pipeline/run-battle-mutation.ts`); `BattleRuleError` (`lib/utils/battle/store`); `BattleStatus.ACTIVE`; `useBattleAction` (`lib/hooks/battles/useBattleAction.ts`); фікстура `context` (`app/api/__tests__/battles/fixtures.ts`).
- Produces:
  - `types/battle.ts`: `export type WeatherKind = "rain" | "storm" | "snow" | "blizzard" | "fog" | "embers";` і `BattleMapConfig.weather?: WeatherKind | null`.
  - `lib/constants/battle-weather.ts`: `WEATHER_KINDS` (кортеж), `WEATHER_LABELS: Record<WeatherKind, string>`, `CLEAR_WEATHER_LABEL = "Ясно"`.
  - `battleMapSchema` приймає `weather?: WeatherKind | null`.
  - `mapWeatherSchema` (`{ weather: WeatherKind | null }`), `type MapWeatherBody`, `mapWeatherMutation(ctx, body): MutationResult`.
  - `POST /api/campaigns/[id]/battles/[battleId]/map-weather` (`access: DM`, `requireStatus: ACTIVE`, `rateLimitScope: "mapWeather"`).
  - `types/api.ts`: `interface MapWeatherData { weather: WeatherKind | null }`.
  - `setMapWeather(campaignId, battleId, data: WithVersion<MapWeatherData>): Promise<BattleMutationResponse>`.
  - `useMapWeather(c, b, o)`; `BattleSceneActions.mapWeather: ReturnType<typeof useMapWeather>`.

- [ ] **Step 1: Write the failing tests**

У `lib/schemas/__tests__/battle-map-schema.test.ts` додати:

```ts
describe("battleMapSchema.weather", () => {
  it("приймає 6 видів погоди, null і відсутність; відхиляє невідоме", () => {
    expect(battleMapSchema.safeParse(map).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, weather: null }).success).toBe(true);

    for (const weather of ["rain", "storm", "snow", "blizzard", "fog", "embers"]) {
      expect(battleMapSchema.safeParse({ ...map, weather }).success).toBe(true);
    }

    expect(battleMapSchema.safeParse({ ...map, weather: "hail" }).success).toBe(false);
  });
});
```

Створити `app/api/__tests__/battles/map-weather-mutation.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { context, goblin, hero } from "./fixtures";

import { mapWeatherMutation, mapWeatherSchema } from "@/app/api/campaigns/[id]/battles/[battleId]/map-weather/map-weather-mutation";
import { BattleStatus } from "@/lib/constants/battle";
import { CLEAR_WEATHER_LABEL, WEATHER_KINDS, WEATHER_LABELS } from "@/lib/constants/battle-weather";
import { BattleAccess } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { BattleMapConfig } from "@/types/battle";

const runBattleMutation = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/battle/pipeline/run-battle-mutation", async (orig) => ({
  ...(await orig<typeof import("@/lib/utils/battle/pipeline/run-battle-mutation")>()),
  runBattleMutation,
}));

const map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3, terrain: { "1:1": { kind: "wall" } } };

const ctx = (m: BattleMapConfig | null = map) => {
  const base = context({ participants: [hero, goblin], isDM: true });

  return { ...base, meta: { ...base.meta, map: m } };
};

describe("weather constants", () => {
  it("кожен вид має український підпис, «Ясно» — для null", () => {
    expect(Object.keys(WEATHER_LABELS).sort()).toEqual([...WEATHER_KINDS].sort());
    expect(WEATHER_LABELS.embers).toBe("Вогонь");
    expect(CLEAR_WEATHER_LABEL).toBe("Ясно");
  });
});

describe("map-weather schema", () => {
  it("weather — вид або null; поле обовʼязкове", () => {
    expect(mapWeatherSchema.safeParse({ weather: "storm" }).success).toBe(true);
    expect(mapWeatherSchema.safeParse({ weather: null }).success).toBe(true);
    expect(mapWeatherSchema.safeParse({}).success).toBe(false);
    expect(mapWeatherSchema.safeParse({ weather: "hail" }).success).toBe(false);
  });
});

describe("map-weather mutation", () => {
  it("ставить погоду в карту сцени, решту карти не чіпає, без подій і змін учасників", () => {
    const c = ctx();

    const out = mapWeatherMutation(c, { weather: "snow" });

    expect(out.scene?.map).toEqual({ ...map, weather: "snow" });
    expect(out.events).toEqual([]);
    expect(out.participants).toBe(c.participants);
    expect(out.pending).toBe(c.pending);
  });

  it("null прибирає поле з JSON карти", () => {
    const out = mapWeatherMutation(ctx({ ...map, weather: "fog" }), { weather: null });

    expect(out.scene?.map).toEqual(map);
    expect(out.scene?.map).not.toHaveProperty("weather");
  });

  it("бій без карти — відмова", () => {
    expect(() => mapWeatherMutation(ctx(null), { weather: "rain" })).toThrow(BattleRuleError);
    expect(() => mapWeatherMutation(ctx(null), { weather: "rain" })).toThrow("У цьому бою немає карти");
  });
});

describe("map-weather route", () => {
  beforeEach(() => runBattleMutation.mockReset());

  it("лише ДМ, лише активний бій, власний ліміт частоти", async () => {
    const { POST } = await import("@/app/api/campaigns/[id]/battles/[battleId]/map-weather/route");

    await POST(new Request("http://x", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "c1", battleId: "b1" }) });

    expect(runBattleMutation).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ access: BattleAccess.DM, requireStatus: BattleStatus.ACTIVE, rateLimitScope: "mapWeather", schema: mapWeatherSchema, mutate: mapWeatherMutation }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/schemas/__tests__/battle-map-schema.test.ts app/api/__tests__/battles/map-weather-mutation.test.ts`
Expected: FAIL — модулів `battle-weather`, `map-weather-mutation`, `route` немає; схема не знає `weather`.

- [ ] **Step 3: Implement**

`types/battle.ts` — перед `BattleMapConfig` додати тип, в інтерфейс — поле (останнім рядком):

```ts
export type WeatherKind = "rain" | "storm" | "snow" | "blizzard" | "fog" | "embers";
```

```ts
  /** Атмосфера без механіки; відсутня або null — ясно */
  weather?: WeatherKind | null;
```

`lib/constants/battle-weather.ts`:

```ts
import type { WeatherKind } from "@/types/battle";

export const WEATHER_KINDS = ["rain", "storm", "snow", "blizzard", "fog", "embers"] as const satisfies readonly WeatherKind[];

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  rain: "Дощ",
  storm: "Гроза",
  snow: "Сніг",
  blizzard: "Хуртовина",
  fog: "Туман",
  embers: "Вогонь",
};

export const CLEAR_WEATHER_LABEL = "Ясно";
```

`lib/schemas/battles.ts` — імпорт `WEATHER_KINDS` з `@/lib/constants/battle-weather` і поле в `battleMapSchema` після `terrain`:

```ts
  weather: z.enum(WEATHER_KINDS).nullable().optional(),
```

`app/api/campaigns/[id]/battles/[battleId]/map-weather/map-weather-mutation.ts`:

```ts
import { z } from "zod";

import { WEATHER_KINDS } from "@/lib/constants/battle-weather";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";

export const mapWeatherSchema = z.object({ weather: z.enum(WEATHER_KINDS).nullable() });

export type MapWeatherBody = z.infer<typeof mapWeatherSchema>;

export function mapWeatherMutation(ctx: BattleMutationContext, body: MapWeatherBody): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", "У цьому бою немає карти");

  const { weather: _previous, ...rest } = map;

  return {
    participants: ctx.participants,
    pending: ctx.pending,
    events: [],
    scene: { map: body.weather ? { ...rest, weather: body.weather } : rest },
  };
}
```

`.../map-weather/route.ts`:

```ts
import { mapWeatherMutation, mapWeatherSchema } from "./map-weather-mutation";

import { BattleStatus } from "@/lib/constants/battle";
import { BattleAccess, runBattleMutation } from "@/lib/utils/battle/pipeline/run-battle-mutation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; battleId: string }> }) {
  return runBattleMutation(req, {
    params: await params,
    access: BattleAccess.DM,
    requireStatus: BattleStatus.ACTIVE,
    rateLimitScope: "mapWeather",
    schema: mapWeatherSchema,
    mutate: mapWeatherMutation,
  });
}
```

`lib/utils/api/rate-limit.ts` — у `BATTLE_RATE_LIMITS` після `mapTerrain`:

```ts
  /** Погода на карті (ДМ) — рідко. */
  mapWeather: { limit: 10, windowSeconds: 10 },
```

`types/api.ts` — після `MapTerrainResponse` (імпорт `WeatherKind` із `@/types/battle`):

```ts
export interface MapWeatherData {
  /** null — ясно */
  weather: WeatherKind | null;
}
```

`lib/api/battles.ts` — після `setMapTerrain` (і `MapWeatherData` в імпорт типів):

```ts
export async function setMapWeather(
  campaignId: string,
  battleId: string,
  data: WithVersion<MapWeatherData>,
): Promise<BattleMutationResponse> {
  return campaignPost<BattleMutationResponse>(campaignId, `/battles/${battleId}/map-weather`, data);
}
```

`lib/hooks/battles/useBattles.ts` — імпорти `setMapWeather`, `MapWeatherData`; після `useMapTerrain`:

```ts
export const useMapWeather = (c: string, b: string, o: ActionOpts = {}) =>
  useBattleAction<MapWeatherData>(c, b, (data) => setMapWeather(c, b, data), { ...o, retryOnConflict: true });
```

і `useMapWeather` у `lib/hooks/battles/index.ts` поруч із `useMapTerrain`.

`lib/hooks/battle/useBattleScene.ts`: в `BattleSceneActions` після `mapTerrain` — `mapWeather: ReturnType<typeof useMapWeather>;`, в обʼєкті `actions` — `mapWeather: useMapWeather(campaignId, battleId, o),` (імпорт `useMapWeather` з `@/lib/hooks/battles` поруч із `useMapTerrain`).

`lib/hooks/battle/__tests__/fake-scene.tsx`: в `actions` після `mapTerrain: mutation(),` — `mapWeather: mutation(),`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/schemas/__tests__/battle-map-schema.test.ts app/api/__tests__/battles/map-weather-mutation.test.ts app/api/__tests__/battles/map-terrain-mutation.test.ts lib/hooks/battle/__tests__`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add types/battle.ts types/api.ts lib/constants/battle-weather.ts lib/schemas/battles.ts lib/schemas/__tests__/battle-map-schema.test.ts \
  "app/api/campaigns/[id]/battles/[battleId]/map-weather" app/api/__tests__/battles/map-weather-mutation.test.ts \
  lib/utils/api/rate-limit.ts lib/api/battles.ts lib/hooks/battles/useBattles.ts lib/hooks/battles/index.ts \
  lib/hooks/battle/useBattleScene.ts lib/hooks/battle/__tests__/fake-scene.tsx
git commit -m "feat(battle-map): weather in the map config and DM-only map-weather mutation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Шар погоди на карті (canvas, 6 ефектів, reduced-motion, прихована вкладка, телефон)

**Files:**
- Create: `components/battle/map/weather/types.ts`, `rain.ts`, `storm.ts`, `snow.ts`, `drift.ts`, `fog.ts`, `embers.ts`, `index.ts`, `use-weather-canvas.ts`, `WeatherLayer.tsx`
- Modify: `components/battle/map/BattleMap.tsx` (один імпорт і один рядок JSX — лише додавання)
- Test: `components/battle/map/weather/__tests__/effects.test.ts`, `components/battle/map/__tests__/WeatherLayer.test.tsx`

**Interfaces:**
- Consumes: `subscribe(fn, { fps })` (`components/battle/fx/runtime/ticker.ts`), `fitCanvas(canvas, w, h, dpr)` (`components/battle/fx/runtime/canvas-size.ts`), `useReducedMotion`, `usePageHidden` (`@/lib/hooks/common`), `WeatherKind` (Task 1), `recordingContext` (`components/battle/fx/__tests__/recording-canvas.ts`).
- Produces:
  - `WeatherSize`, `Rand`, `WeatherSim { step(dt): void; draw(g): void }`, `WeatherEffect { tint; opacity; density; cap; create(size, count, rand): WeatherSim }`, `particleCount(size, effect, scale?)`, `wrap(v, max)`.
  - `createRain`, `createStorm`, `nextFlashIn(rand)`, `FLASH_SEC`, `createSnow`, `createDrift`, `createEmbers`.
  - `WEATHER_EFFECTS: Record<WeatherKind, WeatherEffect>`.
  - `useWeatherCanvas(canvas, { weather, running, scale })`.
  - `WeatherLayer({ weather, phone })` — `[data-weather=<kind>]`, всередині `<canvas>` або `[data-weather-tint]` (reduced-motion).
  - У `BattleMap`: `<WeatherLayer weather={map.weather} phone={phone} />` — прямий нащадок контейнера `[data-fx-clip]`, після шару зуму.

- [ ] **Step 1: Write the failing tests**

`components/battle/map/weather/__tests__/effects.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { WEATHER_EFFECTS } from "../index";
import { createRain } from "../rain";
import { createStorm, FLASH_SEC } from "../storm";
import { particleCount } from "../types";

import { recordingContext } from "@/components/battle/fx/__tests__/recording-canvas";
import { WEATHER_KINDS } from "@/lib/constants/battle-weather";

const size = { width: 800, height: 600 };

const fixed = (v: number) => () => v;

function pointsContext() {
  const ys: number[] = [];

  const g = recordingContext();

  (g as unknown as { moveTo: (x: number, y: number) => void }).moveTo = (_x, y) => ys.push(y);

  return { g, ys };
}

describe("particleCount", () => {
  it("росте з площею, обрізається стелею, на телефоні — половина", () => {
    const effect = { density: 300, cap: 200 };

    expect(particleCount({ width: 500, height: 400 }, effect)).toBe(60);
    expect(particleCount({ width: 4000, height: 3000 }, effect)).toBe(200);
    expect(particleCount({ width: 4000, height: 3000 }, effect, 0.5)).toBe(100);
  });
});

describe("ефекти погоди", () => {
  it.each(WEATHER_KINDS)("%s: 3 с кроків і малювання без винятків, щось намальовано", (kind) => {
    const effect = WEATHER_EFFECTS[kind];

    const sim = effect.create(size, particleCount(size, effect), Math.random);

    const g = recordingContext();

    for (let i = 0; i < 90; i++) {
      sim.step(1 / 30);
      sim.draw(g);
    }

    expect(g.rec.calls.some((c) => c === "stroke" || c === "fill" || c === "fillRect")).toBe(true);
    expect(effect.opacity).toBeGreaterThan(0);
    expect(effect.opacity).toBeLessThan(1);
  });

  it("дощ падає вниз екрана", () => {
    const sim = createRain(size, 1, fixed(0.5), { wind: 0, minSpeed: 600, maxSpeed: 600, color: "#fff" });

    const before = pointsContext();

    sim.draw(before.g);
    sim.step(0.1);

    const after = pointsContext();

    sim.draw(after.g);

    expect(after.ys[0] - before.ys[0]).toBeCloseTo(60);
  });

  it("гроза: перший спалах через 6–15 с і гасне за FLASH_SEC", () => {
    const sim = createStorm(size, 10, fixed(0));

    const flashes = () => {
      const g = recordingContext();

      sim.draw(g);

      return g.rec.calls.filter((c) => c === "fillRect").length;
    };

    sim.step(5.9);
    expect(flashes()).toBe(0);

    sim.step(0.2);
    expect(flashes()).toBe(1);

    sim.step(FLASH_SEC + 0.01);
    expect(flashes()).toBe(0);
  });
});
```

`components/battle/map/__tests__/WeatherLayer.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recordingContext } from "@/components/battle/fx/__tests__/recording-canvas";
import { BattleMap } from "@/components/battle/map";
import { WeatherLayer } from "@/components/battle/map/weather/WeatherLayer";
import type { BattleMapConfig } from "@/types/battle";

const unsubscribe = vi.hoisted(() => vi.fn());

const subscribe = vi.hoisted(() => vi.fn(() => unsubscribe));

vi.mock("@/components/battle/fx/runtime/ticker", () => ({ subscribe }));

class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: { width: 400, height: 800 } }]);
  }
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", RO);

let reduced = false;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "hidden", { value: state === "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  reduced = false;
  subscribe.mockClear();
  unsubscribe.mockClear();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduced-motion") && reduced, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
    return recordingContext(this) as never;
  });
});

afterEach(() => {
  cleanup();
  setVisibility("visible");
});

describe("WeatherLayer", () => {
  it("без погоди — нічого не рендерить і не підписується на кадри", () => {
    const { container } = render(<WeatherLayer weather={null} phone={false} />);

    expect(container.querySelector("[data-weather]")).toBeNull();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("дощ — canvas без подій вказівника, підписка на кадри 30 fps", () => {
    const { container } = render(<WeatherLayer weather="rain" phone={false} />);

    const layer = container.querySelector<HTMLElement>("[data-weather='rain']");

    expect(layer?.className).toContain("pointer-events-none");
    expect(layer?.querySelector("canvas")).not.toBeNull();
    expect(subscribe).toHaveBeenCalledWith(expect.any(Function), { fps: 30 });
  });

  it("prefers-reduced-motion — статичний відтінок без canvas і без кадрів", () => {
    reduced = true;

    const { container } = render(<WeatherLayer weather="fog" phone={false} />);

    expect(container.querySelector("[data-weather-tint]")).not.toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("прихована вкладка зупиняє кадри, повернення — відновлює", () => {
    render(<WeatherLayer weather="snow" phone={false} />);

    expect(subscribe).toHaveBeenCalledTimes(1);

    act(() => setVisibility("hidden"));
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    act(() => setVisibility("visible"));
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});

describe("BattleMap + погода", () => {
  const wide: BattleMapConfig = { cols: 12, rows: 4, background: null, opacity: 0.3, weather: "storm" };

  it("canvas — прямий нащадок [data-fx-clip], поза шаром повороту телефонної карти", () => {
    const { container } = render(<BattleMap map={wide} participants={[]} phone />);

    expect(container.querySelector("[data-map-rotated]")).not.toBeNull();
    expect(container.querySelector("[data-fx-clip] > [data-weather='storm']")).not.toBeNull();
    expect(container.querySelector("[data-map-rotated] [data-weather]")).toBeNull();
  });

  it("карта без погоди — без шару", () => {
    const { container } = render(<BattleMap map={{ ...wide, weather: undefined }} participants={[]} />);

    expect(container.querySelector("[data-weather]")).toBeNull();
  });
});
```

Примітка: широка карта 12×4 у вузькому високому контейнері 400×800 у телефонному режимі повертається (`fit.rotated`), тому `[data-map-rotated]` присутній — якщо `fitMapView` у цьому розмірі не повертає, збільшити `cols` до 20.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run components/battle/map/weather/__tests__/effects.test.ts components/battle/map/__tests__/WeatherLayer.test.tsx`
Expected: FAIL — модулів погоди немає.

- [ ] **Step 3: Implement**

`components/battle/map/weather/types.ts`:

```ts
export interface WeatherSize {
  width: number;
  height: number;
}

export type Rand = () => number;

export interface WeatherSim {
  step(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
}

export interface WeatherEffect {
  /** CSS-фон замість руху при prefers-reduced-motion */
  tint: string;
  /** прозорість шару: HP під токенами мусить лишатися читабельним */
  opacity: number;
  /** частинок на мегапіксель */
  density: number;
  cap: number;
  create(size: WeatherSize, count: number, rand: Rand): WeatherSim;
}

export function particleCount(size: WeatherSize, effect: Pick<WeatherEffect, "density" | "cap">, scale = 1): number {
  return Math.min(Math.round(effect.cap * scale), Math.round(((size.width * size.height) / 1e6) * effect.density * scale));
}

export const wrap = (v: number, max: number) => ((v % max) + max) % max;
```

`rain.ts`:

```ts
import { type Rand, type WeatherEffect, type WeatherSim, type WeatherSize, wrap } from "./types";

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export interface RainOptions {
  wind: number;
  minSpeed: number;
  maxSpeed: number;
  color: string;
}

export function createRain(size: WeatherSize, count: number, rand: Rand, o: RainOptions): WeatherSim {
  const drops: Drop[] = Array.from({ length: count }, () => ({
    x: rand() * size.width,
    y: rand() * size.height,
    len: 10 + rand() * 12,
    speed: o.minSpeed + rand() * (o.maxSpeed - o.minSpeed),
  }));

  const slant = o.wind / o.maxSpeed;

  return {
    step(dt) {
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x = wrap(d.x + o.wind * dt, size.width);

        if (d.y - d.len > size.height) {
          d.y = -d.len * rand();
          d.x = rand() * size.width;
        }
      }
    },
    draw(g) {
      g.strokeStyle = o.color;
      g.lineWidth = 1;
      g.beginPath();

      for (const d of drops) {
        g.moveTo(d.x, d.y);
        g.lineTo(d.x - slant * d.len, d.y - d.len);
      }

      g.stroke();
    },
  };
}

export const rain: WeatherEffect = {
  tint: "rgba(60,80,120,.22)",
  opacity: 0.75,
  density: 320,
  cap: 320,
  create: (size, count, rand) => createRain(size, count, rand, { wind: 60, minSpeed: 650, maxSpeed: 950, color: "rgba(190,210,255,.55)" }),
};
```

`storm.ts`:

```ts
import { createRain } from "./rain";
import type { Rand, WeatherEffect, WeatherSim, WeatherSize } from "./types";

export const FLASH_SEC = 0.25;

export const nextFlashIn = (rand: Rand) => 6 + rand() * 9;

export function createStorm(size: WeatherSize, count: number, rand: Rand): WeatherSim {
  const rainSim = createRain(size, count, rand, { wind: 140, minSpeed: 900, maxSpeed: 1300, color: "rgba(200,215,255,.6)" });

  let untilFlash = nextFlashIn(rand);

  let flash = 0;

  return {
    step(dt) {
      rainSim.step(dt);
      flash = Math.max(0, flash - dt / FLASH_SEC);
      untilFlash -= dt;

      if (untilFlash <= 0) {
        flash = 1;
        untilFlash = nextFlashIn(rand);
      }
    },
    draw(g) {
      rainSim.draw(g);

      if (flash <= 0) return;

      g.fillStyle = `rgba(255,255,255,${(0.55 * flash).toFixed(3)})`;
      g.fillRect(0, 0, size.width, size.height);
    },
  };
}

export const storm: WeatherEffect = { tint: "rgba(30,40,70,.35)", opacity: 0.8, density: 420, cap: 420, create: createStorm };
```

`snow.ts`:

```ts
import { type Rand, type WeatherEffect, type WeatherSim, type WeatherSize, wrap } from "./types";

interface Flake {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
}

export interface SnowOptions {
  wind: number;
  sway: number;
  minSpeed: number;
  maxSpeed: number;
  color: string;
  haze?: string;
}

export function createSnow(size: WeatherSize, count: number, rand: Rand, o: SnowOptions): WeatherSim {
  const flakes: Flake[] = Array.from({ length: count }, () => ({
    x: rand() * size.width,
    y: rand() * size.height,
    r: 1 + rand() * 2.2,
    speed: o.minSpeed + rand() * (o.maxSpeed - o.minSpeed),
    phase: rand() * Math.PI * 2,
  }));

  return {
    step(dt) {
      for (const f of flakes) {
        f.phase += dt * 1.5;
        f.y += f.speed * dt;
        f.x = wrap(f.x + (o.wind + Math.sin(f.phase) * o.sway) * dt, size.width);

        if (f.y - f.r > size.height) {
          f.y = -f.r;
          f.x = rand() * size.width;
        }
      }
    },
    draw(g) {
      if (o.haze) {
        g.fillStyle = o.haze;
        g.fillRect(0, 0, size.width, size.height);
      }

      g.fillStyle = o.color;
      g.beginPath();

      for (const f of flakes) {
        g.moveTo(f.x + f.r, f.y);
        g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      }

      g.fill();
    },
  };
}

export const snow: WeatherEffect = {
  tint: "rgba(200,215,240,.18)",
  opacity: 0.85,
  density: 220,
  cap: 220,
  create: (size, count, rand) => createSnow(size, count, rand, { wind: 12, sway: 18, minSpeed: 28, maxSpeed: 70, color: "rgba(255,255,255,.85)" }),
};

export const blizzard: WeatherEffect = {
  tint: "rgba(215,225,245,.3)",
  opacity: 0.85,
  density: 480,
  cap: 480,
  create: (size, count, rand) =>
    createSnow(size, count, rand, { wind: 260, sway: 40, minSpeed: 120, maxSpeed: 220, color: "rgba(255,255,255,.8)", haze: "rgba(220,230,250,.12)" }),
};
```

`drift.ts` (туман і дим вогню):

```ts
import type { Rand, WeatherSim, WeatherSize } from "./types";

interface Puff {
  x: number;
  y: number;
  r: number;
}

export interface DriftOptions {
  vx: number;
  vy: number;
  color: string;
  clear: string;
  /** радіус — частка більшої сторони рамки */
  minR: number;
  maxR: number;
}

export function createDrift(size: WeatherSize, count: number, rand: Rand, o: DriftOptions): WeatherSim {
  const span = Math.max(size.width, size.height);

  const puffs: Puff[] = Array.from({ length: count }, () => ({ x: rand() * size.width, y: rand() * size.height, r: span * (o.minR + rand() * (o.maxR - o.minR)) }));

  return {
    step(dt) {
      for (const p of puffs) {
        p.x += o.vx * dt;
        p.y += o.vy * dt;

        if (p.x - p.r > size.width) p.x = -p.r;

        if (p.x + p.r < 0) p.x = size.width + p.r;

        if (p.y + p.r < 0) p.y = size.height + p.r;

        if (p.y - p.r > size.height) p.y = -p.r;
      }
    },
    draw(g) {
      for (const p of puffs) {
        const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);

        grad.addColorStop(0, o.color);
        grad.addColorStop(1, o.clear);
        g.fillStyle = grad;
        g.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
    },
  };
}
```

`fog.ts`:

```ts
import { createDrift } from "./drift";
import type { WeatherEffect } from "./types";

export const fog: WeatherEffect = {
  tint: "rgba(190,195,205,.35)",
  opacity: 0.8,
  density: 14,
  cap: 12,
  create: (size, count, rand) =>
    createDrift(size, Math.max(count, 6), rand, { vx: 14, vy: 0, color: "rgba(205,210,220,.32)", clear: "rgba(205,210,220,0)", minR: 0.25, maxR: 0.45 }),
};
```

`embers.ts`:

```ts
import { createDrift } from "./drift";
import type { Rand, WeatherEffect, WeatherSim, WeatherSize } from "./types";

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
}

export function createEmbers(size: WeatherSize, count: number, rand: Rand): WeatherSim {
  const spawn = (fresh: boolean): Spark => ({
    x: rand() * size.width,
    y: fresh ? rand() * size.height : size.height + rand() * 20,
    vx: (rand() - 0.5) * 30,
    vy: -(40 + rand() * 90),
    age: fresh ? rand() * 2 : 0,
    life: 2 + rand() * 3,
    r: 0.8 + rand() * 1.6,
  });

  const sparks = Array.from({ length: count }, () => spawn(true));

  const smoke = createDrift(size, Math.max(3, Math.round(count / 25)), rand, { vx: 6, vy: -18, color: "rgba(60,55,50,.28)", clear: "rgba(60,55,50,0)", minR: 0.18, maxR: 0.3 });

  return {
    step(dt) {
      smoke.step(dt);

      sparks.forEach((s, i) => {
        s.age += dt;
        s.x += (s.vx + Math.sin(s.age * 3) * 12) * dt;
        s.y += s.vy * dt;

        if (s.age >= s.life || s.y < -10) sparks[i] = spawn(false);
      });
    },
    draw(g) {
      const top = size.height * 0.55;

      const glow = g.createLinearGradient(0, size.height, 0, top);

      glow.addColorStop(0, "rgba(255,90,20,.22)");
      glow.addColorStop(1, "rgba(255,90,20,0)");
      g.fillStyle = glow;
      g.fillRect(0, top, size.width, size.height - top);
      smoke.draw(g);
      g.globalCompositeOperation = "lighter";

      for (const s of sparks) {
        const k = 1 - s.age / s.life;

        g.fillStyle = `rgba(255,${Math.round(120 + 100 * k)},40,${(0.9 * k).toFixed(3)})`;
        g.beginPath();
        g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        g.fill();
      }

      g.globalCompositeOperation = "source-over";
    },
  };
}

export const embers: WeatherEffect = {
  tint: "linear-gradient(to top, rgba(255,90,20,.25), rgba(255,90,20,0) 60%)",
  opacity: 0.9,
  density: 160,
  cap: 160,
  create: createEmbers,
};
```

`index.ts`:

```ts
import { embers } from "./embers";
import { fog } from "./fog";
import { rain } from "./rain";
import { blizzard, snow } from "./snow";
import { storm } from "./storm";
import type { WeatherEffect } from "./types";

import type { WeatherKind } from "@/types/battle";

export const WEATHER_EFFECTS: Record<WeatherKind, WeatherEffect> = { rain, storm, snow, blizzard, fog, embers };
```

`use-weather-canvas.ts`:

```ts
"use client";

import { useEffect } from "react";

import { WEATHER_EFFECTS } from "./index";
import { particleCount, type WeatherSim, type WeatherSize } from "./types";

import { fitCanvas } from "@/components/battle/fx/runtime/canvas-size";
import { subscribe } from "@/components/battle/fx/runtime/ticker";
import type { WeatherKind } from "@/types/battle";

// частинки дрібні: понад 1.5× пікселів не видно, а заливка дорожчає квадратично
const MAX_WEATHER_DPR = 1.5;

export function useWeatherCanvas(canvas: HTMLCanvasElement | null, opts: { weather: WeatherKind | null; running: boolean; scale: number }) {
  const { weather, running, scale } = opts;

  useEffect(() => {
    if (!canvas || !weather || !running) return;

    const g = canvas.getContext("2d");

    if (!g) return;

    const effect = WEATHER_EFFECTS[weather];

    let sim: WeatherSim | null = null;

    let size: WeatherSize = { width: 0, height: 0 };

    const rebuild = (box: WeatherSize) => {
      size = { width: box.width, height: box.height };

      if (!size.width || !size.height) {
        sim = null;

        return;
      }

      const dpr = fitCanvas(canvas, size.width, size.height, Math.min(window.devicePixelRatio || 1, MAX_WEATHER_DPR));

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      sim = effect.create(size, particleCount(size, effect, scale), Math.random);
    };

    const observer = new ResizeObserver(([entry]) => rebuild(entry.contentRect));

    observer.observe(canvas);

    const unsubscribe = subscribe(
      (_now, dt) => {
        if (!sim) return;

        sim.step(Math.min(dt, 0.1));
        g.clearRect(0, 0, size.width, size.height);
        sim.draw(g);
      },
      { fps: 30 },
    );

    return () => {
      unsubscribe();
      observer.disconnect();
      g.clearRect(0, 0, size.width, size.height);
    };
  }, [canvas, weather, running, scale]);
}
```

`WeatherLayer.tsx`:

```tsx
"use client";

import { memo, useState } from "react";

import { WEATHER_EFFECTS } from "./index";
import { useWeatherCanvas } from "./use-weather-canvas";

import { usePageHidden, useReducedMotion } from "@/lib/hooks/common";
import type { WeatherKind } from "@/types/battle";

/** Поза шаром зуму й повороту: частинки летять в екранних координатах і на повернутій телефонній карті. */
export const WeatherLayer = memo(function WeatherLayer({ weather, phone }: { weather: WeatherKind | null | undefined; phone: boolean }) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);

  const reduced = useReducedMotion();

  const hidden = usePageHidden();

  useWeatherCanvas(canvas, { weather: weather ?? null, running: !reduced && !hidden, scale: phone ? 0.5 : 1 });

  if (!weather) return null;

  const effect = WEATHER_EFFECTS[weather];

  return (
    <div data-weather={weather} aria-hidden className="pointer-events-none absolute inset-0 z-10" style={{ opacity: effect.opacity }}>
      {reduced ? (
        <div data-weather-tint className="absolute inset-0" style={{ background: effect.tint }} />
      ) : (
        <canvas ref={setCanvas} className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
});
```

`components/battle/map/BattleMap.tsx` — лише додати імпорт `import { WeatherLayer } from "./weather/WeatherLayer";` і в контейнері `[data-fx-clip]` одразу після закривального `</div>` шару зуму (`<div className="absolute inset-0 origin-top-left" style={{ transform: … }}>…</div>`), перед закриттям контейнера:

```tsx
      <WeatherLayer weather={map.weather} phone={phone} />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run components/battle/map`
Expected: PASS (нові й наявні тести карти).

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add components/battle/map/weather components/battle/map/__tests__/WeatherLayer.test.tsx components/battle/map/BattleMap.tsx
git commit -m "feat(battle-map): animated weather layer over the map in screen space

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Кнопка «Погода» в інструментах карти ДМ

**Files:**
- Create: `lib/hooks/battle/useMapWeatherTool.ts`, `components/battle/map/MapWeatherPicker.tsx`
- Modify: `lib/hooks/battle/useBattleMapScene.ts` (поле `weatherTool` — лише додавання), `lib/hooks/battle/index.ts`, `components/battle/map/BattleMapPanel.tsx`
- Test: `components/battle/map/__tests__/MapWeatherPicker.test.tsx`

**Interfaces:**
- Consumes: `actions.mapWeather` (Task 1), `WEATHER_KINDS`, `WEATHER_LABELS`, `CLEAR_WEATHER_LABEL`, `fakeScene` (`lib/hooks/battle/__tests__/fake-scene.tsx`), `ModeButton` у `BattleMapPanel.tsx`.
- Produces:
  - `interface MapWeatherTool { open: boolean; toggle(): void; close(): void; current: WeatherKind | null; pending: boolean; choose(kind: WeatherKind | null): void }`.
  - `useMapWeatherTool({ isDM, current, mutation }): MapWeatherTool | null` (`mutation: { mutate(data: MapWeatherData): void; isPending: boolean }`).
  - `BattleMapScene.weatherTool: MapWeatherTool | null`.
  - `MapWeatherPicker({ tool })` — `role="group"` з підписом «Погода», кнопки «Ясно» + 6 видів, `aria-pressed` на поточній.

- [ ] **Step 1: Write the failing test** — `components/battle/map/__tests__/MapWeatherPicker.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BattleMapPanel } from "../BattleMapPanel";

import { TooltipProvider } from "@/components/ui/tooltip";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleMapConfig } from "@/types/battle";

vi.mock("@/components/battle/fx/runtime/ticker", () => ({ subscribe: vi.fn(() => vi.fn()) }));

afterEach(cleanup);

class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: { width: 800, height: 600 } }]);
  }
  disconnect() {}
  unobserve() {}
}

vi.stubGlobal("ResizeObserver", RO);

function panel(isDM: boolean, map: BattleMapConfig = { cols: 10, rows: 5, background: null, opacity: 0.3 }) {
  const scene = fakeScene({ isDM, map });

  const Wrapper = scene.wrapper;

  const view = render(
    <Wrapper>
      <TooltipProvider>
        <BattleMapPanel />
      </TooltipProvider>
    </Wrapper>,
  );

  return { ...view, mutate: (scene.value.actions.mapWeather as unknown as { mutate: ReturnType<typeof vi.fn> }).mutate };
}

describe("Погода в інструментах карти", () => {
  it("гравець не бачить кнопки «Погода»", () => {
    const { queryByRole } = panel(false);

    expect(queryByRole("button", { name: "Погода" })).toBeNull();
  });

  it("ДМ відкриває палітру: «Ясно» + 6 ефектів, поточний позначено", () => {
    const { getByRole } = panel(true, { cols: 10, rows: 5, background: null, opacity: 0.3, weather: "rain" });

    fireEvent.click(getByRole("button", { name: "Погода" }));

    for (const label of ["Ясно", "Дощ", "Гроза", "Сніг", "Хуртовина", "Туман", "Вогонь"]) {
      expect(getByRole("button", { name: label })).toBeTruthy();
    }

    expect(getByRole("button", { name: "Дощ" }).getAttribute("aria-pressed")).toBe("true");
    expect(getByRole("button", { name: "Ясно" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("вибір шле мутацію й закриває палітру; той самий вид — без запиту", () => {
    const { getByRole, queryByRole, mutate } = panel(true, { cols: 10, rows: 5, background: null, opacity: 0.3, weather: "rain" });

    fireEvent.click(getByRole("button", { name: "Погода" }));
    fireEvent.click(getByRole("button", { name: "Сніг" }));

    expect(mutate).toHaveBeenCalledWith({ weather: "snow" });
    expect(queryByRole("group", { name: "Погода" })).toBeNull();

    fireEvent.click(getByRole("button", { name: "Погода" }));
    fireEvent.click(getByRole("button", { name: "Дощ" }));
    expect(mutate).toHaveBeenCalledTimes(1);

    fireEvent.click(getByRole("button", { name: "Погода" }));
    fireEvent.click(getByRole("button", { name: "Ясно" }));
    expect(mutate).toHaveBeenLastCalledWith({ weather: null });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run components/battle/map/__tests__/MapWeatherPicker.test.tsx`
Expected: FAIL — кнопки «Погода» немає.

- [ ] **Step 3: Implement**

`lib/hooks/battle/useMapWeatherTool.ts`:

```ts
"use client";

import { useCallback, useMemo, useState } from "react";

import type { MapWeatherData } from "@/types/api";
import type { WeatherKind } from "@/types/battle";

export interface MapWeatherTool {
  open: boolean;
  toggle(): void;
  close(): void;
  current: WeatherKind | null;
  pending: boolean;
  choose(kind: WeatherKind | null): void;
}

export function useMapWeatherTool(args: {
  isDM: boolean;
  current: WeatherKind | null;
  mutation: { mutate(data: MapWeatherData): void; isPending: boolean };
}): MapWeatherTool | null {
  const { isDM, current, mutation: { mutate, isPending } } = args;

  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const close = useCallback(() => setOpen(false), []);

  const choose = useCallback(
    (kind: WeatherKind | null) => {
      setOpen(false);

      if (kind !== current) mutate({ weather: kind });
    },
    [current, mutate],
  );

  const tool = useMemo(() => ({ open, toggle, close, current, pending: isPending, choose }), [open, toggle, close, current, isPending, choose]);

  return isDM ? tool : null;
}
```

`lib/hooks/battle/index.ts` — додати `export { type MapWeatherTool, useMapWeatherTool } from "./useMapWeatherTool";`.

`lib/hooks/battle/useBattleMapScene.ts` (лише додавання):
- в `BattleMapScene` — `weatherTool: MapWeatherTool | null;`;
- імпорт `import { type MapWeatherTool, useMapWeatherTool } from "./useMapWeatherTool";`;
- перед рядком `if (!map || !scene || !view) return null;`:

```ts
  const weatherTool = useMapWeatherTool({ isDM, current: map?.weather ?? null, mutation: actions.mapWeather });
```

- в обʼєкт, що повертається, додати `weatherTool`.

`components/battle/map/MapWeatherPicker.tsx`:

```tsx
"use client";

import { CLEAR_WEATHER_LABEL, WEATHER_KINDS, WEATHER_LABELS } from "@/lib/constants/battle-weather";
import type { MapWeatherTool } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";
import type { WeatherKind } from "@/types/battle";

const OPTIONS: { value: WeatherKind | null; label: string }[] = [
  { value: null, label: CLEAR_WEATHER_LABEL },
  ...WEATHER_KINDS.map((value) => ({ value, label: WEATHER_LABELS[value] })),
];

export function MapWeatherPicker({ tool }: { tool: MapWeatherTool }) {
  return (
    <div role="group" aria-label="Погода" className="flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1.5 rounded-md border border-hud-rule bg-black/70 p-1.5 text-xs">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={tool.current === value}
          disabled={tool.pending}
          onClick={() => tool.choose(value)}
          className={cn(
            "h-7 rounded border px-2",
            tool.current === value ? "border-[var(--gold)] text-hud-gold-bright" : "border-hud-rule text-hud-muted hover:text-hud-bone",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

`components/battle/map/BattleMapPanel.tsx`: імпорт `MapWeatherPicker`; `const { placement, terrainTool, weatherTool } = scene;`; умова `placement && terrainTool && weatherTool && (`; третя кнопка після «Місцевість» і палітра після `MapTerrainToolbar`:

```tsx
        <ModeButton active={weatherTool.open} onClick={weatherTool.toggle}>
          Погода
        </ModeButton>
```

```tsx
      {weatherTool.open && <MapWeatherPicker tool={weatherTool} />}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run components/battle/map lib/hooks/battle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add lib/hooks/battle/useMapWeatherTool.ts lib/hooks/battle/index.ts lib/hooks/battle/useBattleMapScene.ts \
  components/battle/map/MapWeatherPicker.tsx components/battle/map/BattleMapPanel.tsx components/battle/map/__tests__/MapWeatherPicker.test.tsx
git commit -m "feat(battle-map): DM weather picker next to placement and terrain tools

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Міграція `campaign_tracks` + `battle_scenes.audio`, моделі Prisma, типи й константи музики

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261020000000_campaign_tracks_battle_audio/migration.sql`
- Create: `types/audio.ts`, `lib/constants/music.ts`
- Test: `prisma/__tests__/campaign-tracks-migration.test.ts` (+ наявний `prisma/__tests__/migrations-rls.test.ts`)

**Interfaces:**
- Consumes: моделі `Campaign`, `BattleScene`.
- Produces:
  - Prisma: `model CampaignTrack` (`campaign_tracks`), `Campaign.tracks`, `BattleScene.audio Json?`; клієнт `prisma.campaignTrack`.
  - `types/audio.ts`: `TrackKind`, `CampaignTrack`, `BattleAudioTrack`, `BattleAudioState`, `BattleAudioCommand`, `BattleAudioResponse`, `BattleAudioEvent`, `BattleAudioSnapshot`, `TrackUploadRequest`, `TrackUploadTicket`, `CreateTrackData`, `UpdateTrackData`, `ReorderTracksData`.
  - `lib/constants/music.ts`: `BATTLE_MUSIC_BUCKET`, `MAX_TRACK_BYTES`, `MAX_TRACKS_PER_CAMPAIGN`, `TRACK_TITLE_MAX`, `TRACK_CACHE_SECONDS`, `TRACK_FORMATS`, `TRACK_CONTENT_TYPES`, `AUDIO_DRIFT_TOLERANCE_SEC`, `AUDIO_DRIFT_CHECK_MS`, `YOUTUBE_PLAYER_PX`, `YOUTUBE_NOCOOKIE_HOST`, `YOUTUBE_IFRAME_API_SRC`, `AUDIO_VOLUME_KEY`, `AUDIO_MUTED_KEY`, `DEFAULT_AUDIO_VOLUME`.

- [ ] **Step 1: Write the failing test** — `prisma/__tests__/campaign-tracks-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.resolve(__dirname, "../migrations/20261020000000_campaign_tracks_battle_audio/migration.sql"), "utf8");

describe("міграція музики", () => {
  it("лише розширює схему: без DROP, ALTER COLUMN і NOT NULL на наявних таблицях", () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/ALTER COLUMN/i);
    expect(sql).toMatch(/ALTER TABLE "battle_scenes" ADD COLUMN "audio" JSONB;/);
  });

  it("campaign_tracks: каскад від кампанії, індекс порядку, RLS", () => {
    expect(sql).toMatch(/CREATE TABLE "campaign_tracks"/);
    expect(sql).toMatch(/REFERENCES "campaigns"\("id"\) ON DELETE CASCADE/);
    expect(sql).toMatch(/CREATE INDEX "campaign_tracks_campaignId_sortOrder_idx"/);
    expect(sql).toMatch(/ALTER TABLE "campaign_tracks" ENABLE ROW LEVEL SECURITY;/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run prisma/__tests__/campaign-tracks-migration.test.ts`
Expected: FAIL — файлу міграції немає.

- [ ] **Step 3: Implement**

`prisma/schema.prisma`: у `BattleScene` після `map Json?` — `audio Json?`; у `Campaign` після `spells Spell[]` — `tracks CampaignTrack[]`; нова модель після `BattleScene`:

```prisma
model CampaignTrack {
  id          String   @id @default(cuid())
  campaignId  String
  title       String
  kind        String
  url         String?
  youtubeId   String?
  durationSec Int?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@index([campaignId, sortOrder])
  @@map("campaign_tracks")
}
```

`prisma/migrations/20261020000000_campaign_tracks_battle_audio/migration.sql`:

```sql
ALTER TABLE "battle_scenes" ADD COLUMN "audio" JSONB;

CREATE TABLE "campaign_tracks" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "youtubeId" TEXT,
    "durationSec" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_tracks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "campaign_tracks_campaignId_sortOrder_idx" ON "campaign_tracks"("campaignId", "sortOrder");

ALTER TABLE "campaign_tracks" ADD CONSTRAINT "campaign_tracks_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_tracks" ENABLE ROW LEVEL SECURITY;
```

`types/audio.ts`:

```ts
export type TrackKind = "file" | "youtube";

export interface CampaignTrack {
  id: string;
  title: string;
  kind: TrackKind;
  /** публічний URL у бакеті battle-music (лише file) */
  url: string | null;
  youtubeId: string | null;
  durationSec: number | null;
  sortOrder: number;
  createdAt: string;
}

/** Знімок треку в стані бою: гравцям не потрібна бібліотека, видалення треку не ламає стан */
export type BattleAudioTrack = Pick<CampaignTrack, "title" | "kind" | "url" | "youtubeId" | "durationSec">;

export interface BattleAudioState {
  /** null — «Стоп» */
  trackId: string | null;
  track: BattleAudioTrack | null;
  playing: boolean;
  offsetSec: number;
  /** мс годинника сервера, коли почалося відтворення з offsetSec */
  startedAt: number;
  seq: number;
}

export type BattleAudioCommand =
  | { action: "play"; trackId: string }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "next" }
  | { action: "prev" }
  | { action: "stop" };

export interface BattleAudioResponse {
  audio: BattleAudioState | null;
}

/** Pusher `battle-audio` */
export interface BattleAudioEvent {
  battleId: string;
  audio: BattleAudioState;
}

/** Кеш клієнта: стан і зсув годинника сервера відносно локального */
export interface BattleAudioSnapshot {
  audio: BattleAudioState | null;
  clockOffsetMs: number | null;
}

export interface TrackUploadRequest {
  name: string;
  size: number;
  contentType: string;
}

export interface TrackUploadTicket {
  bucket: string;
  path: string;
  token: string;
  contentType: string;
}

export type CreateTrackData =
  | { kind: "file"; path: string; title: string; durationSec?: number }
  | { kind: "youtube"; url: string; title?: string };

export interface UpdateTrackData {
  title: string;
}

export interface ReorderTracksData {
  ids: string[];
}
```

`lib/constants/music.ts`:

```ts
export const BATTLE_MUSIC_BUCKET = "battle-music";

export const MAX_TRACK_BYTES = 10 * 1024 * 1024;

export const MAX_TRACKS_PER_CAMPAIGN = 40;

export const TRACK_TITLE_MAX = 120;

export const TRACK_CACHE_SECONDS = "31536000";

export const TRACK_FORMATS = {
  mp3: { ext: "mp3", contentType: "audio/mpeg" },
  m4a: { ext: "m4a", contentType: "audio/mp4" },
} as const;

export const TRACK_CONTENT_TYPES: string[] = Object.values(TRACK_FORMATS).map((f) => f.contentType);

export const AUDIO_DRIFT_TOLERANCE_SEC = 1.5;

export const AUDIO_DRIFT_CHECK_MS = 10_000;

/** Мінімум YouTube Required Minimum Functionality */
export const YOUTUBE_PLAYER_PX = 200;

export const YOUTUBE_NOCOOKIE_HOST = "https://www.youtube-nocookie.com";

export const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

export const AUDIO_VOLUME_KEY = "battle-music-volume";

export const AUDIO_MUTED_KEY = "battle-music-muted";

export const DEFAULT_AUDIO_VOLUME = 0.6;
```

Генерація й локальне застосування (prod не чіпати):

```bash
grep -E "^(DATABASE_URL|DIRECT_URL)=" .env.local | grep -v "localhost:54322" && echo "STOP: .env.local не на локальній БД" || true
pnpm exec prisma generate
pnpm db:local
pnpm exec prisma migrate status
```

Expected: `migrate status` — «Database schema is up to date»; `prisma generate` без помилок. Якщо перший рядок надрукував «STOP» — не запускати `db:local`, а виправити `.env.local` на локальну БД.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run prisma/__tests__`
Expected: PASS (`migrations-rls` бачить RLS для `campaign_tracks`).

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add prisma/schema.prisma prisma/migrations/20261020000000_campaign_tracks_battle_audio prisma/__tests__/campaign-tracks-migration.test.ts types/audio.ts lib/constants/music.ts
git commit -m "feat(music): campaign_tracks table and battle_scenes.audio column (expand-only, RLS)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Чиста логіка музики (YouTube-id, файли, позиція й дрейф, годинник, команди, злиття, порядок) і схеми

**Files:**
- Create: `lib/utils/audio/youtube-id.ts`, `track-file.ts`, `position.ts`, `clock.ts`, `audio-command.ts`, `merge.ts`, `order.ts`
- Create: `lib/schemas/music.ts`; Modify: `lib/schemas/index.ts`
- Modify: `lib/constants/api-errors.ts`
- Test: `lib/utils/audio/__tests__/youtube-id.test.ts`, `track-file.test.ts`, `position.test.ts`, `clock.test.ts`, `audio-command.test.ts`, `merge.test.ts`, `order.test.ts`, `lib/schemas/__tests__/music-schema.test.ts`

**Interfaces:**
- Consumes: типи й константи з Task 4.
- Produces:
  - `parseYoutubeId(input: string): string | null`.
  - `type TrackFormat = keyof typeof TRACK_FORMATS`; `detectTrackFormat({ name, type }): TrackFormat | null`; `validateTrackFile({ name, type, size }): { ok: true; format: TrackFormat } | { ok: false; message: string }`.
  - `audioPosition(state, { now, clockOffsetMs, durationSec }): number`; `loopDrift(current, target, durationSec): number`; `planSync({ shouldPlay, paused, current, target, durationSec }): { seekTo: number | null; play: boolean; pause: boolean }`.
  - `clockOffsetFromDate(dateHeader: string | null, sentAt: number, receivedAt: number): number | null`.
  - `interface AudioLibraryEntry { id: string; track: BattleAudioTrack }`; `commandNeedsLibrary(cmd): boolean`; `applyAudioCommand(prev, cmd, { now, library }): BattleAudioState | { error: string }`.
  - `mergeAudio(cached, incoming): BattleAudioState | null`.
  - `moveTrack(ids: string[], index: number, dir: -1 | 1): string[]`.
  - Схеми: `trackTitleSchema`, `trackUploadRequestSchema`, `createTrackSchema`, `updateTrackSchema`, `reorderTracksSchema`, `battleAudioCommandSchema`.
  - `API_ERRORS`: `TRACK_NOT_FOUND`, `TRACK_LIMIT`, `TRACK_FILE_INVALID`, `TRACK_UPLOAD_MISSING`, `TRACK_ORDER_MISMATCH`, `YOUTUBE_URL_INVALID`, `BATTLE_AUDIO_NO_TRACK`, `BATTLE_AUDIO_EMPTY_LIBRARY`, `BATTLE_AUDIO_CONFLICT`.

- [ ] **Step 1: Write the failing tests**

`lib/utils/audio/__tests__/youtube-id.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseYoutubeId } from "../youtube-id";

describe("parseYoutubeId", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=42", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["  https://youtu.be/dQw4w9WgXcQ  ", "dQw4w9WgXcQ"],
  ])("%s → %s", (input, id) => {
    expect(parseYoutubeId(input)).toBe(id);
  });

  it.each(["dQw4w9WgXcQ", "https://vimeo.com/123", "https://youtu.be/short", "https://www.youtube.com/watch?v=", "javascript:alert(1)", "https://www.youtube.com/channel/UC123"])("%s → null", (input) => {
    expect(parseYoutubeId(input)).toBeNull();
  });
});
```

`lib/utils/audio/__tests__/track-file.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { detectTrackFormat, validateTrackFile } from "../track-file";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACK_BYTES } from "@/lib/constants/music";

describe("track file", () => {
  it("формат за MIME, а без MIME — за розширенням", () => {
    expect(detectTrackFormat({ name: "a.bin", type: "audio/mpeg" })).toBe("mp3");
    expect(detectTrackFormat({ name: "a.bin", type: "audio/x-m4a" })).toBe("m4a");
    expect(detectTrackFormat({ name: "Battle.M4A", type: "" })).toBe("m4a");
    expect(detectTrackFormat({ name: "a.mp3", type: "application/octet-stream" })).toBe("mp3");
    expect(detectTrackFormat({ name: "a.mp3", type: "audio/ogg" })).toBeNull();
    expect(detectTrackFormat({ name: "a.wav", type: "" })).toBeNull();
  });

  it("розмір 1 байт..10 МБ", () => {
    expect(validateTrackFile({ name: "a.mp3", type: "audio/mpeg", size: MAX_TRACK_BYTES })).toEqual({ ok: true, format: "mp3" });
    expect(validateTrackFile({ name: "a.mp3", type: "audio/mpeg", size: MAX_TRACK_BYTES + 1 })).toEqual({ ok: false, message: API_ERRORS.TRACK_FILE_INVALID });
    expect(validateTrackFile({ name: "a.mp3", type: "audio/mpeg", size: 0 })).toEqual({ ok: false, message: API_ERRORS.TRACK_FILE_INVALID });
    expect(validateTrackFile({ name: "a.ogg", type: "audio/ogg", size: 10 })).toEqual({ ok: false, message: API_ERRORS.TRACK_FILE_INVALID });
  });
});
```

`lib/utils/audio/__tests__/position.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { audioPosition, loopDrift, planSync } from "../position";

const playing = { playing: true, offsetSec: 10, startedAt: 1_000 };

describe("audioPosition", () => {
  it("грає: offset + минулий час за годинником сервера", () => {
    expect(audioPosition(playing, { now: 6_000, clockOffsetMs: 0, durationSec: null })).toBe(15);
    expect(audioPosition(playing, { now: 5_000, clockOffsetMs: 1_000, durationSec: null })).toBe(15);
  });

  it("по колу: модуль тривалості", () => {
    expect(audioPosition({ playing: true, offsetSec: 170, startedAt: 0 }, { now: 20_000, clockOffsetMs: 0, durationSec: 180 })).toBe(10);
  });

  it("пауза: позиція не росте", () => {
    expect(audioPosition({ ...playing, playing: false }, { now: 999_000, clockOffsetMs: 0, durationSec: 180 })).toBe(10);
  });

  it("startedAt у майбутньому (розбіжність годинників) — не відʼємна позиція", () => {
    expect(audioPosition(playing, { now: 0, clockOffsetMs: 0, durationSec: null })).toBe(10);
  });
});

describe("loopDrift", () => {
  it("по колу: 1 с і 179 с трека 180 с — 2 с, не 178", () => {
    expect(loopDrift(1, 179, 180)).toBe(2);
    expect(loopDrift(179.5, 0.5, 180)).toBe(1);
  });

  it("без тривалості — пряма різниця", () => {
    expect(loopDrift(1, 179, null)).toBe(178);
  });
});

describe("planSync", () => {
  it("дрейф ≤ 1,5 с — не чіпати; більше — перемотати", () => {
    expect(planSync({ shouldPlay: true, paused: false, current: 10, target: 11.4, durationSec: 180 })).toEqual({ seekTo: null, play: false, pause: false });
    expect(planSync({ shouldPlay: true, paused: false, current: 10, target: 12, durationSec: 180 })).toEqual({ seekTo: 12, play: false, pause: false });
  });

  it("має грати, а стоїть — play; не має — pause лише якщо грає", () => {
    expect(planSync({ shouldPlay: true, paused: true, current: 0, target: 0, durationSec: null }).play).toBe(true);
    expect(planSync({ shouldPlay: false, paused: false, current: 5, target: 50, durationSec: null })).toEqual({ seekTo: null, play: false, pause: true });
    expect(planSync({ shouldPlay: false, paused: true, current: 5, target: 50, durationSec: null })).toEqual({ seekTo: null, play: false, pause: false });
  });
});
```

`lib/utils/audio/__tests__/clock.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { clockOffsetFromDate } from "../clock";

describe("clockOffsetFromDate", () => {
  it("сервер на 3 с попереду: офсет ≈ 3,5 с (заголовок Date обрізає частку секунди)", () => {
    const server = Date.UTC(2026, 9, 19, 10, 0, 0);

    const local = server - 3_000;

    expect(clockOffsetFromDate(new Date(server).toUTCString(), local - 100, local + 100)).toBe(3_500);
  });

  it("без заголовка або з невалідним — null", () => {
    expect(clockOffsetFromDate(null, 0, 10)).toBeNull();
    expect(clockOffsetFromDate("not a date", 0, 10)).toBeNull();
  });
});
```

`lib/utils/audio/__tests__/audio-command.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { type AudioLibraryEntry, applyAudioCommand, commandNeedsLibrary } from "../audio-command";

import { API_ERRORS } from "@/lib/constants/api-errors";
import type { BattleAudioState } from "@/types/audio";

const entry = (id: string, durationSec: number | null = 100): AudioLibraryEntry => ({ id, track: { title: id, kind: "file", url: `https://s/${id}.mp3`, youtubeId: null, durationSec } });

const library = [entry("a"), entry("b"), entry("c")];

const ctx = { now: 50_000, library };

const playingA: BattleAudioState = { trackId: "a", track: library[0].track, playing: true, offsetSec: 0, startedAt: 10_000, seq: 4 };

describe("applyAudioCommand", () => {
  it("play: трек з бібліотеки з нуля, seq+1; чужий id — помилка", () => {
    expect(applyAudioCommand(null, { action: "play", trackId: "b" }, ctx)).toEqual({ trackId: "b", track: library[1].track, playing: true, offsetSec: 0, startedAt: 50_000, seq: 1 });
    expect(applyAudioCommand(null, { action: "play", trackId: "x" }, ctx)).toEqual({ error: API_ERRORS.TRACK_NOT_FOUND });
  });

  it("pause фіксує позицію по колу; resume продовжує з неї", () => {
    const paused = applyAudioCommand(playingA, { action: "pause" }, ctx) as BattleAudioState;

    expect(paused).toMatchObject({ playing: false, offsetSec: 40, startedAt: 50_000, seq: 5 });

    const later = applyAudioCommand({ ...playingA, startedAt: 0 }, { action: "pause" }, { ...ctx, now: 250_000 }) as BattleAudioState;

    expect(later.offsetSec).toBe(50);

    expect(applyAudioCommand(paused, { action: "resume" }, { ...ctx, now: 70_000 })).toMatchObject({ playing: true, offsetSec: 40, startedAt: 70_000, seq: 6 });
  });

  it("pause/resume без треку — помилка; повторна pause — лише seq", () => {
    expect(applyAudioCommand(null, { action: "pause" }, ctx)).toEqual({ error: API_ERRORS.BATTLE_AUDIO_NO_TRACK });
    expect(applyAudioCommand(null, { action: "resume" }, ctx)).toEqual({ error: API_ERRORS.BATTLE_AUDIO_NO_TRACK });

    const paused = { ...playingA, playing: false, offsetSec: 7 };

    expect(applyAudioCommand(paused, { action: "pause" }, ctx)).toEqual({ ...paused, seq: 5 });
  });

  it("next/prev ходять по колу бібліотеки; без поточного — перший/останній; порожня — помилка", () => {
    expect(applyAudioCommand(playingA, { action: "next" }, ctx)).toMatchObject({ trackId: "b", offsetSec: 0, playing: true });
    expect(applyAudioCommand(playingA, { action: "prev" }, ctx)).toMatchObject({ trackId: "c" });
    expect(applyAudioCommand({ ...playingA, trackId: "c" }, { action: "next" }, ctx)).toMatchObject({ trackId: "a" });
    expect(applyAudioCommand(null, { action: "next" }, ctx)).toMatchObject({ trackId: "a" });
    expect(applyAudioCommand(null, { action: "prev" }, ctx)).toMatchObject({ trackId: "c" });
    expect(applyAudioCommand(playingA, { action: "next" }, { ...ctx, library: [] })).toEqual({ error: API_ERRORS.BATTLE_AUDIO_EMPTY_LIBRARY });
  });

  it("stop: без треку, на паузі, seq+1", () => {
    expect(applyAudioCommand(playingA, { action: "stop" }, ctx)).toEqual({ trackId: null, track: null, playing: false, offsetSec: 0, startedAt: 50_000, seq: 5 });
  });

  it("бібліотеку читаємо лише для play/next/prev", () => {
    expect(["play", "next", "prev", "pause", "resume", "stop"].map((action) => commandNeedsLibrary({ action, trackId: "a" } as never))).toEqual([true, true, true, false, false, false]);
  });
});
```

`lib/utils/audio/__tests__/merge.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { mergeAudio } from "../merge";

import type { BattleAudioState } from "@/types/audio";

const state = (seq: number): BattleAudioState => ({ trackId: "a", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

describe("mergeAudio", () => {
  it("приймає лише новіший seq", () => {
    expect(mergeAudio(state(2), state(3))?.seq).toBe(3);
    expect(mergeAudio(state(3), state(2))?.seq).toBe(3);
  });

  it("рівний seq (власна відповідь, потім та сама подія) — той самий обʼєкт", () => {
    const cached = state(3);

    expect(mergeAudio(cached, state(3))).toBe(cached);
  });

  it("null/undefined не затирають наявний стан; порожній кеш бере будь-який", () => {
    expect(mergeAudio(state(1), null)?.seq).toBe(1);
    expect(mergeAudio(state(1), undefined)?.seq).toBe(1);
    expect(mergeAudio(null, state(1))?.seq).toBe(1);
  });
});
```

`lib/utils/audio/__tests__/order.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { moveTrack } from "../order";

describe("moveTrack", () => {
  it("міняє місцями з сусідом; за межами — той самий масив", () => {
    const ids = ["a", "b", "c"];

    expect(moveTrack(ids, 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveTrack(ids, 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveTrack(ids, 0, -1)).toBe(ids);
    expect(moveTrack(ids, 2, 1)).toBe(ids);
  });
});
```

`lib/schemas/__tests__/music-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { battleAudioCommandSchema, createTrackSchema, reorderTracksSchema, updateTrackSchema } from "../music";

describe("music schemas", () => {
  it("createTrack: файл зі шляхом і назвою; YouTube — лише розпізнане посилання", () => {
    expect(createTrackSchema.safeParse({ kind: "file", path: "c1/abc.mp3", title: "Бій", durationSec: 120 }).success).toBe(true);
    expect(createTrackSchema.safeParse({ kind: "file", path: "c1/abc.mp3", title: "   " }).success).toBe(false);
    expect(createTrackSchema.safeParse({ kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
    expect(createTrackSchema.safeParse({ kind: "youtube", url: "https://vimeo.com/1" }).success).toBe(false);
    expect(createTrackSchema.safeParse({ kind: "radio", url: "x" }).success).toBe(false);
  });

  it("назва 1..120 після обрізання пробілів", () => {
    expect(updateTrackSchema.parse({ title: "  Таверна  " })).toEqual({ title: "Таверна" });
    expect(updateTrackSchema.safeParse({ title: "x".repeat(121) }).success).toBe(false);
  });

  it("reorder: 1..40 id", () => {
    expect(reorderTracksSchema.safeParse({ ids: ["a"] }).success).toBe(true);
    expect(reorderTracksSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(reorderTracksSchema.safeParse({ ids: Array.from({ length: 41 }, (_, i) => `t${i}`) }).success).toBe(false);
  });

  it("команди аудіо: play вимагає trackId, невідома дія — ні", () => {
    expect(battleAudioCommandSchema.safeParse({ action: "play", trackId: "t1" }).success).toBe(true);
    expect(battleAudioCommandSchema.safeParse({ action: "play" }).success).toBe(false);

    for (const action of ["pause", "resume", "next", "prev", "stop"]) {
      expect(battleAudioCommandSchema.safeParse({ action }).success).toBe(true);
    }

    expect(battleAudioCommandSchema.safeParse({ action: "seek" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/utils/audio lib/schemas/__tests__/music-schema.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Implement**

`lib/constants/api-errors.ts` — додати в кінець обʼєкта:

```ts
  TRACK_NOT_FOUND: "Трек не знайдено",
  TRACK_LIMIT: "У бібліотеці вже 40 треків — видаліть зайві",
  TRACK_FILE_INVALID: "Потрібен файл MP3 або M4A до 10 МБ",
  TRACK_UPLOAD_MISSING: "Файл не завантажено — спробуйте ще раз",
  TRACK_ORDER_MISMATCH: "Порядок має містити всі треки кампанії",
  YOUTUBE_URL_INVALID: "Не вдалося розпізнати посилання YouTube",
  BATTLE_AUDIO_NO_TRACK: "Немає обраного треку",
  BATTLE_AUDIO_EMPTY_LIBRARY: "Бібліотека музики порожня",
  BATTLE_AUDIO_CONFLICT: "Стан музики змінився — повторіть",
```

`lib/utils/audio/youtube-id.ts`:

```ts
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"]);

const PATH_KINDS = new Set(["shorts", "embed", "live"]);

function fromYoutubePath(url: URL): string | null {
  if (url.pathname === "/watch") return url.searchParams.get("v");

  const [, kind, id] = url.pathname.split("/");

  return PATH_KINDS.has(kind) ? (id ?? null) : null;
}

export function parseYoutubeId(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();

  const candidate = host === "youtu.be" ? url.pathname.split("/")[1] : YOUTUBE_HOSTS.has(host) ? fromYoutubePath(url) : null;

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}
```

`lib/utils/audio/track-file.ts`:

```ts
import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACK_BYTES, TRACK_FORMATS } from "@/lib/constants/music";

export type TrackFormat = keyof typeof TRACK_FORMATS;

const BY_MIME: Record<string, TrackFormat> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
};

// Safari/Windows інколи не дають MIME для .m4a — тоді вирішує розширення
const UNTYPED = new Set(["", "application/octet-stream"]);

export function detectTrackFormat(file: { name: string; type: string }): TrackFormat | null {
  const type = file.type.toLowerCase();

  if (BY_MIME[type]) return BY_MIME[type];

  if (!UNTYPED.has(type)) return null;

  const ext = file.name.toLowerCase().split(".").pop();

  return ext === "mp3" || ext === "m4a" ? ext : null;
}

export function validateTrackFile(file: { name: string; type: string; size: number }): { ok: true; format: TrackFormat } | { ok: false; message: string } {
  const format = detectTrackFormat(file);

  if (!format || file.size <= 0 || file.size > MAX_TRACK_BYTES) return { ok: false, message: API_ERRORS.TRACK_FILE_INVALID };

  return { ok: true, format };
}
```

`lib/utils/audio/position.ts`:

```ts
import { AUDIO_DRIFT_TOLERANCE_SEC } from "@/lib/constants/music";
import type { BattleAudioState } from "@/types/audio";

export function audioPosition(
  state: Pick<BattleAudioState, "playing" | "offsetSec" | "startedAt">,
  at: { now: number; clockOffsetMs: number; durationSec: number | null },
): number {
  const raw = state.playing ? state.offsetSec + Math.max(0, at.now + at.clockOffsetMs - state.startedAt) / 1000 : state.offsetSec;

  return at.durationSec && at.durationSec > 0 ? raw % at.durationSec : raw;
}

/** Відстань по колу: кінець і початок петлі — сусіди. */
export function loopDrift(current: number, target: number, durationSec: number | null): number {
  const d = Math.abs(current - target);

  if (!durationSec || durationSec <= 0) return d;

  const m = d % durationSec;

  return Math.min(m, durationSec - m);
}

export interface SyncInput {
  shouldPlay: boolean;
  paused: boolean;
  current: number;
  target: number;
  durationSec: number | null;
}

export interface SyncPlan {
  seekTo: number | null;
  play: boolean;
  pause: boolean;
}

export function planSync(i: SyncInput): SyncPlan {
  if (!i.shouldPlay) return { seekTo: null, play: false, pause: !i.paused };

  return { seekTo: loopDrift(i.current, i.target, i.durationSec) > AUDIO_DRIFT_TOLERANCE_SEC ? i.target : null, play: i.paused, pause: false };
}
```

`lib/utils/audio/clock.ts`:

```ts
/** serverNow ≈ localNow + offset. */
export function clockOffsetFromDate(dateHeader: string | null, sentAt: number, receivedAt: number): number | null {
  if (!dateHeader) return null;

  const server = Date.parse(dateHeader);

  if (!Number.isFinite(server)) return null;

  // Date має цілі секунди: +500 мс — середнє відкинутої частки
  return server + 500 - (sentAt + receivedAt) / 2;
}
```

`lib/utils/audio/audio-command.ts`:

```ts
import { API_ERRORS } from "@/lib/constants/api-errors";
import type { BattleAudioCommand, BattleAudioState, BattleAudioTrack } from "@/types/audio";

export interface AudioLibraryEntry {
  id: string;
  track: BattleAudioTrack;
}

interface Ctx {
  now: number;
  library: AudioLibraryEntry[];
  seq: number;
}

type Result = BattleAudioState | { error: string };

export const commandNeedsLibrary = (cmd: BattleAudioCommand) => cmd.action === "play" || cmd.action === "next" || cmd.action === "prev";

function positionAt(prev: BattleAudioState, now: number): number {
  const raw = prev.offsetSec + Math.max(0, now - prev.startedAt) / 1000;

  const duration = prev.track?.durationSec;

  return duration ? raw % duration : raw;
}

const start = (entry: AudioLibraryEntry, ctx: Ctx): BattleAudioState => ({ trackId: entry.id, track: entry.track, playing: true, offsetSec: 0, startedAt: ctx.now, seq: ctx.seq });

function step(prev: BattleAudioState | null, ctx: Ctx, dir: 1 | -1): Result {
  const n = ctx.library.length;

  if (n === 0) return { error: API_ERRORS.BATTLE_AUDIO_EMPTY_LIBRARY };

  const at = ctx.library.findIndex((e) => e.id === prev?.trackId);

  const index = at === -1 ? (dir === 1 ? 0 : n - 1) : (at + dir + n) % n;

  return start(ctx.library[index], ctx);
}

type Handlers = { [A in BattleAudioCommand["action"]]: (prev: BattleAudioState | null, cmd: Extract<BattleAudioCommand, { action: A }>, ctx: Ctx) => Result };

const handlers: Handlers = {
  play: (_prev, cmd, ctx) => {
    const entry = ctx.library.find((e) => e.id === cmd.trackId);

    return entry ? start(entry, ctx) : { error: API_ERRORS.TRACK_NOT_FOUND };
  },
  pause: (prev, _cmd, ctx) => {
    if (!prev?.trackId) return { error: API_ERRORS.BATTLE_AUDIO_NO_TRACK };

    return prev.playing ? { ...prev, playing: false, offsetSec: positionAt(prev, ctx.now), startedAt: ctx.now, seq: ctx.seq } : { ...prev, seq: ctx.seq };
  },
  resume: (prev, _cmd, ctx) => {
    if (!prev?.trackId) return { error: API_ERRORS.BATTLE_AUDIO_NO_TRACK };

    return prev.playing ? { ...prev, seq: ctx.seq } : { ...prev, playing: true, startedAt: ctx.now, seq: ctx.seq };
  },
  next: (prev, _cmd, ctx) => step(prev, ctx, 1),
  prev: (prev, _cmd, ctx) => step(prev, ctx, -1),
  stop: (_prev, _cmd, ctx) => ({ trackId: null, track: null, playing: false, offsetSec: 0, startedAt: ctx.now, seq: ctx.seq }),
};

export function applyAudioCommand(prev: BattleAudioState | null, cmd: BattleAudioCommand, ctx: { now: number; library: AudioLibraryEntry[] }): Result {
  const run = handlers[cmd.action] as (p: BattleAudioState | null, c: BattleAudioCommand, x: Ctx) => Result;

  return run(prev, cmd, { ...ctx, seq: (prev?.seq ?? 0) + 1 });
}
```

`lib/utils/audio/merge.ts`:

```ts
import type { BattleAudioState } from "@/types/audio";

export function mergeAudio(cached: BattleAudioState | null, incoming: BattleAudioState | null | undefined): BattleAudioState | null {
  if (!incoming) return cached;

  return !cached || incoming.seq > cached.seq ? incoming : cached;
}
```

`lib/utils/audio/order.ts`:

```ts
export function moveTrack(ids: string[], index: number, dir: -1 | 1): string[] {
  const to = index + dir;

  if (index < 0 || to < 0 || to >= ids.length) return ids;

  const next = [...ids];

  [next[index], next[to]] = [next[to], next[index]];

  return next;
}
```

`lib/schemas/music.ts`:

```ts
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACK_BYTES, MAX_TRACKS_PER_CAMPAIGN, TRACK_TITLE_MAX } from "@/lib/constants/music";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";

export const trackTitleSchema = z.string().trim().min(1).max(TRACK_TITLE_MAX);

export const trackUploadRequestSchema = z.object({
  name: z.string().max(255),
  size: z.number().int().positive().max(MAX_TRACK_BYTES),
  contentType: z.string().max(100),
});

const youtubeUrlSchema = z.string().max(300).refine((v) => parseYoutubeId(v) !== null, API_ERRORS.YOUTUBE_URL_INVALID);

export const createTrackSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("file"), path: z.string().min(1).max(200), title: trackTitleSchema, durationSec: z.number().int().positive().max(86_400).optional() }),
  z.object({ kind: z.literal("youtube"), url: youtubeUrlSchema, title: trackTitleSchema.optional() }),
]);

export const updateTrackSchema = z.object({ title: trackTitleSchema });

export const reorderTracksSchema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(MAX_TRACKS_PER_CAMPAIGN) });

export const battleAudioCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("play"), trackId: z.string().min(1).max(64) }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("next") }),
  z.object({ action: z.literal("prev") }),
  z.object({ action: z.literal("stop") }),
]);
```

`lib/schemas/index.ts` — додати `export * from "./music";`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/utils/audio lib/schemas`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add lib/utils/audio lib/schemas/music.ts lib/schemas/index.ts lib/schemas/__tests__/music-schema.test.ts lib/constants/api-errors.ts
git commit -m "feat(music): pure audio logic — youtube ids, file checks, loop position, clock offset, commands, merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Бакет `battle-music` і API бібліотеки треків

**Files:**
- Create: `lib/supabase/battle-music-storage.ts`, `lib/utils/audio/youtube-oembed.ts`
- Create: `app/api/campaigns/[id]/tracks/track-handlers.ts`, `app/api/campaigns/[id]/tracks/route.ts`, `app/api/campaigns/[id]/tracks/upload-url/route.ts`, `app/api/campaigns/[id]/tracks/[trackId]/route.ts`, `app/api/campaigns/[id]/tracks/order/route.ts`
- Modify: `app/api/__tests__/dm-only-routes-api.test.ts`
- Test: `lib/supabase/__tests__/battle-music-storage.test.ts`, `app/api/__tests__/tracks-api.test.ts`

**Interfaces:**
- Consumes: `createAdminClient` (`lib/supabase/admin.ts`), `safeFetchBuffer` (`lib/utils/api/safe-fetch.ts`), `requireDM`, `parseBody`, `loadOwned`, `errorResponse`, `handleApiError`, схеми й утиліти Task 5, константи Task 4.
- Produces:
  - `trackPathOwnedBy(path, campaignId): boolean`; `createTrackUploadTicket(campaignId, format): Promise<{ ok: true; ticket: TrackUploadTicket } | { ok: false; message: string }>`; `verifyUploadedTrack(path): Promise<{ ok: true; url: string } | { ok: false; message: string }>`; `trackObjectPath(url): string | null`; `removeTrackFile(url): Promise<void>`.
  - `fetchYoutubeTitle(youtubeId): Promise<string | null>`.
  - `toCampaignTrack(row)`, `listTracks(campaignId)`; хендлери `getTracksHandler`, `createTrackHandler`, `issueUploadTicketHandler`, `renameTrackHandler`, `deleteTrackHandler`, `reorderTracksHandler`.
  - Маршрути (усі лише ДМ): `GET/POST /api/campaigns/[id]/tracks` (список / створення, 201), `POST /tracks/upload-url` (`TrackUploadTicket`), `PATCH/DELETE /tracks/[trackId]` (`CampaignTrack` / `{ ok: true }`), `PUT /tracks/order` (`CampaignTrack[]`).

- [ ] **Step 1: Write the failing tests**

`lib/supabase/__tests__/battle-music-storage.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTrackUploadTicket,
  removeTrackFile,
  trackObjectPath,
  trackPathOwnedBy,
  verifyUploadedTrack,
} from "@/lib/supabase/battle-music-storage";

const bucketApi = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  info: vi.fn(),
  remove: vi.fn(async () => ({ data: [], error: null })),
  getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/battle-music/${path}` } })),
}));

const storage = vi.hoisted(() => ({
  listBuckets: vi.fn(async () => ({ data: [{ name: "battle-music" }], error: null })),
  createBucket: vi.fn(async () => ({ data: { name: "battle-music" }, error: null })),
  from: vi.fn(() => bucketApi),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage }) }));

const PATH = "camp1/0123456789abcdef0123456789abcdef.mp3";

describe("battle-music storage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("шлях належить кампанії лише у форматі <campaignId>/<uuid32>.mp3|m4a", () => {
    expect(trackPathOwnedBy(PATH, "camp1")).toBe(true);
    expect(trackPathOwnedBy(PATH, "camp2")).toBe(false);
    expect(trackPathOwnedBy("camp1/../camp2/x.mp3", "camp1")).toBe(false);
    expect(trackPathOwnedBy("camp1/0123456789abcdef0123456789abcdef.ogg", "camp1")).toBe(false);
  });

  it("квиток: бакет створюється з лімітом 10 МБ і аудіо-типами, шлях у теці кампанії", async () => {
    storage.listBuckets.mockResolvedValueOnce({ data: [], error: null });
    bucketApi.createSignedUploadUrl.mockImplementation(async (path: string) => ({ data: { path, token: "tok", signedUrl: "u" }, error: null }));

    const r = await createTrackUploadTicket("camp1", "m4a");

    expect(storage.createBucket).toHaveBeenCalledWith("battle-music", { public: true, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/mp4"] });
    expect(r).toMatchObject({ ok: true, ticket: { bucket: "battle-music", token: "tok", contentType: "audio/mp4" } });
    expect(r.ok && trackPathOwnedBy(r.ticket.path, "camp1")).toBe(true);
  });

  it("перевірка: існує, ≤ 10 МБ, аудіо — публічний URL; інакше обʼєкт видаляється", async () => {
    bucketApi.info.mockResolvedValueOnce({ data: { size: 5_000_000, contentType: "audio/mpeg" }, error: null });
    expect(await verifyUploadedTrack(PATH)).toEqual({ ok: true, url: `https://x.supabase.co/storage/v1/object/public/battle-music/${PATH}` });

    bucketApi.info.mockResolvedValueOnce({ data: { size: 20_000_000, contentType: "audio/mpeg" }, error: null });
    expect(await verifyUploadedTrack(PATH)).toEqual({ ok: false, message: "Потрібен файл MP3 або M4A до 10 МБ" });
    expect(bucketApi.remove).toHaveBeenCalledWith([PATH]);

    bucketApi.info.mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    expect(await verifyUploadedTrack(PATH)).toEqual({ ok: false, message: "Файл не завантажено — спробуйте ще раз" });
  });

  it("видалення: шлях із публічного URL; чужий URL — нічого", async () => {
    const url = `https://x.supabase.co/storage/v1/object/public/battle-music/${PATH}`;

    expect(trackObjectPath(url)).toBe(PATH);
    expect(trackObjectPath("https://example.com/a.mp3")).toBeNull();

    await removeTrackFile(url);
    expect(bucketApi.remove).toHaveBeenCalledWith([PATH]);

    bucketApi.remove.mockClear();
    await removeTrackFile("https://example.com/a.mp3");
    expect(bucketApi.remove).not.toHaveBeenCalled();
  });
});
```

`app/api/__tests__/tracks-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as storage from "@/lib/supabase/battle-music-storage";
import * as apiAuth from "@/lib/utils/api/api-auth";
import * as oembed from "@/lib/utils/audio/youtube-oembed";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/supabase/battle-music-storage", async (orig) => ({
  ...(await orig<typeof storage>()),
  createTrackUploadTicket: vi.fn(),
  verifyUploadedTrack: vi.fn(),
  removeTrackFile: vi.fn(),
}));
vi.mock("@/lib/utils/audio/youtube-oembed", () => ({ fetchYoutubeTitle: vi.fn(async () => null) }));
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => cb() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    campaignTrack: { count: vi.fn(), findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

const dm = { userId: "dm", isDM: true, campaign: { id: "camp1", maxLevel: 20, members: [] } } as never;

const PATH = "camp1/0123456789abcdef0123456789abcdef.mp3";

const row = (over: Record<string, unknown> = {}) => ({
  id: "t1", campaignId: "camp1", title: "Бій", kind: "file", url: "https://s/battle-music/x.mp3", youtubeId: null, durationSec: 120, sortOrder: 0, createdAt: new Date("2026-10-19T00:00:00Z"), ...over,
});

const req = (method: string, body?: unknown) => new Request("http://x", { method, ...(body !== undefined && { body: JSON.stringify(body) }) });

const params = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: "camp1", ...extra }) });

async function tracksRoute() {
  return import("@/app/api/campaigns/[id]/tracks/route");
}

describe("tracks API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue(dm);
    vi.mocked(prisma.campaignTrack.count).mockResolvedValue(3);
    vi.mocked(prisma.campaignTrack.aggregate).mockResolvedValue({ _max: { sortOrder: 2 } } as never);
    vi.mocked(prisma.campaignTrack.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => row({ ...data, id: "new" })) as never);
    vi.mocked(storage.verifyUploadedTrack).mockResolvedValue({ ok: true, url: "https://s/battle-music/x.mp3" });
  });

  it("не ДМ — 403 і без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }) as never);

    const { POST } = await tracksRoute();

    expect((await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params())).status).toBe(403);
    expect(prisma.campaignTrack.create).not.toHaveBeenCalled();
  });

  it("файл: перевірений шлях кампанії → 201, url зі Storage, sortOrder у кінець", async () => {
    const { POST } = await tracksRoute();

    const res = await POST(req("POST", { kind: "file", path: PATH, title: "  Бій  ", durationSec: 120 }), params());

    expect(res.status).toBe(201);
    expect(prisma.campaignTrack.create).toHaveBeenCalledWith({
      data: { campaignId: "camp1", kind: "file", title: "Бій", url: "https://s/battle-music/x.mp3", youtubeId: null, durationSec: 120, sortOrder: 3 },
    });
    expect(await res.json()).toMatchObject({ id: "new", kind: "file", createdAt: "2026-10-19T00:00:00.000Z" });
  });

  it("файл: шлях іншої кампанії або неперевірений обʼєкт — 400 без запису", async () => {
    const { POST } = await tracksRoute();

    expect((await POST(req("POST", { kind: "file", path: PATH.replace("camp1", "camp2"), title: "x" }), params())).status).toBe(400);
    expect(storage.verifyUploadedTrack).not.toHaveBeenCalled();

    vi.mocked(storage.verifyUploadedTrack).mockResolvedValue({ ok: false, message: "Потрібен файл MP3 або M4A до 10 МБ" });
    expect((await POST(req("POST", { kind: "file", path: PATH, title: "x" }), params())).status).toBe(400);
    expect(prisma.campaignTrack.create).not.toHaveBeenCalled();
  });

  it("YouTube: id з посилання, назва ДМ або oEmbed, інакше «YouTube <id>»", async () => {
    const { POST } = await tracksRoute();

    await POST(req("POST", { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Таверна" }), params());
    expect(prisma.campaignTrack.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ kind: "youtube", youtubeId: "dQw4w9WgXcQ", title: "Таверна", url: null }) });
    expect(oembed.fetchYoutubeTitle).not.toHaveBeenCalled();

    vi.mocked(oembed.fetchYoutubeTitle).mockResolvedValueOnce("Epic Battle");
    await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params());
    expect(prisma.campaignTrack.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ title: "Epic Battle" }) });

    await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params());
    expect(prisma.campaignTrack.create).toHaveBeenLastCalledWith({ data: expect.objectContaining({ title: "YouTube dQw4w9WgXcQ" }) });
  });

  it("ліміт 40: і квиток, і створення відмовляють", async () => {
    vi.mocked(prisma.campaignTrack.count).mockResolvedValue(40);

    const { POST } = await tracksRoute();

    const { POST: ticket } = await import("@/app/api/campaigns/[id]/tracks/upload-url/route");

    const created = await POST(req("POST", { kind: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }), params());

    expect(created.status).toBe(400);
    expect(await created.json()).toEqual({ error: "У бібліотеці вже 40 треків — видаліть зайві" });
    expect((await ticket(req("POST", { name: "a.mp3", size: 100, contentType: "audio/mpeg" }), params())).status).toBe(400);
    expect(storage.createTrackUploadTicket).not.toHaveBeenCalled();
  });

  it("квиток: перевіряє тип і розмір, видає підписаний шлях", async () => {
    vi.mocked(storage.createTrackUploadTicket).mockResolvedValue({ ok: true, ticket: { bucket: "battle-music", path: PATH, token: "tok", contentType: "audio/mpeg" } });

    const { POST: ticket } = await import("@/app/api/campaigns/[id]/tracks/upload-url/route");

    expect((await ticket(req("POST", { name: "a.ogg", size: 100, contentType: "audio/ogg" }), params())).status).toBe(400);

    const ok = await ticket(req("POST", { name: "a.mp3", size: 100, contentType: "audio/mpeg" }), params());

    expect(await ok.json()).toEqual({ bucket: "battle-music", path: PATH, token: "tok", contentType: "audio/mpeg" });
    expect(storage.createTrackUploadTicket).toHaveBeenCalledWith("camp1", "mp3");
  });

  it("DELETE: трек іншої кампанії — 403; свій файл — запис і обʼєкт Storage", async () => {
    const { DELETE } = await import("@/app/api/campaigns/[id]/tracks/[trackId]/route");

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValueOnce(row({ campaignId: "other" }) as never);
    expect((await DELETE(req("DELETE"), params({ trackId: "t1" }))).status).toBe(403);

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValueOnce(row() as never);

    const res = await DELETE(req("DELETE"), params({ trackId: "t1" }));

    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.campaignTrack.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
    expect(storage.removeTrackFile).toHaveBeenCalledWith("https://s/battle-music/x.mp3");
  });

  it("PATCH перейменовує", async () => {
    const { PATCH } = await import("@/app/api/campaigns/[id]/tracks/[trackId]/route");

    vi.mocked(prisma.campaignTrack.findUnique).mockResolvedValueOnce(row() as never);
    vi.mocked(prisma.campaignTrack.update).mockResolvedValueOnce(row({ title: "Нова" }) as never);

    const res = await PATCH(req("PATCH", { title: " Нова " }), params({ trackId: "t1" }));

    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "t1" }, data: { title: "Нова" } });
    expect(await res.json()).toMatchObject({ title: "Нова" });
  });

  it("PUT order: лише повний набір треків кампанії", async () => {
    const { PUT } = await import("@/app/api/campaigns/[id]/tracks/order/route");

    vi.mocked(prisma.campaignTrack.findMany).mockResolvedValue([row({ id: "a" }), row({ id: "b" })] as never);

    expect((await PUT(req("PUT", { ids: ["a"] }), params())).status).toBe(400);
    expect((await PUT(req("PUT", { ids: ["a", "x"] }), params())).status).toBe(400);
    expect((await PUT(req("PUT", { ids: ["a", "a"] }), params())).status).toBe(400);

    await PUT(req("PUT", { ids: ["b", "a"] }), params());

    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { sortOrder: 0 } });
    expect(prisma.campaignTrack.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { sortOrder: 1 } });
  });
});
```

`app/api/__tests__/dm-only-routes-api.test.ts` — додати імпорти й випадки (усі хендлери мусять викликати `requireDM` до будь-якого іншого звернення до БД):

```ts
import * as trackOne from "@/app/api/campaigns/[id]/tracks/[trackId]/route";
import * as trackOrder from "@/app/api/campaigns/[id]/tracks/order/route";
import * as tracks from "@/app/api/campaigns/[id]/tracks/route";
import * as trackUpload from "@/app/api/campaigns/[id]/tracks/upload-url/route";
```

```ts
  ["GET tracks", tracks.GET],
  ["POST tracks", tracks.POST],
  ["POST tracks/upload-url", trackUpload.POST],
  ["PATCH tracks/:trackId", trackOne.PATCH],
  ["DELETE tracks/:trackId", trackOne.DELETE],
  ["PUT tracks/order", trackOrder.PUT],
```

і `trackId: "t1"` в обʼєкт `ids`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/supabase/__tests__/battle-music-storage.test.ts app/api/__tests__/tracks-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Implement**

`lib/supabase/battle-music-storage.ts`:

```ts
import { API_ERRORS } from "@/lib/constants/api-errors";
import { BATTLE_MUSIC_BUCKET, MAX_TRACK_BYTES, TRACK_CONTENT_TYPES, TRACK_FORMATS } from "@/lib/constants/music";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackFormat } from "@/lib/utils/audio/track-file";
import type { TrackUploadTicket } from "@/types/audio";

type Admin = ReturnType<typeof createAdminClient>;

const TRACK_OBJECT = /^([^/]+)\/[a-f0-9]{32}\.(mp3|m4a)$/;

const PUBLIC_MARKER = `/storage/v1/object/public/${BATTLE_MUSIC_BUCKET}/`;

export function trackPathOwnedBy(path: string, campaignId: string): boolean {
  return TRACK_OBJECT.exec(path)?.[1] === campaignId;
}

async function ensureMusicBucket(supabase: Admin): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) return { ok: false, message: error.message };

  if (data?.some((b) => b.name === BATTLE_MUSIC_BUCKET)) return { ok: true };

  // ліміт і типи на рівні бакета: Storage сам відхилить чужий файл за підписаним URL
  const created = await supabase.storage.createBucket(BATTLE_MUSIC_BUCKET, { public: true, fileSizeLimit: MAX_TRACK_BYTES, allowedMimeTypes: TRACK_CONTENT_TYPES });

  return created.error ? { ok: false, message: created.error.message } : { ok: true };
}

export async function createTrackUploadTicket(campaignId: string, format: TrackFormat): Promise<{ ok: true; ticket: TrackUploadTicket } | { ok: false; message: string }> {
  const supabase = createAdminClient();

  const ensured = await ensureMusicBucket(supabase);

  if (!ensured.ok) return ensured;

  const { ext, contentType } = TRACK_FORMATS[format];

  const path = `${campaignId}/${crypto.randomUUID().replace(/-/g, "")}.${ext}`;

  const { data, error } = await supabase.storage.from(BATTLE_MUSIC_BUCKET).createSignedUploadUrl(path);

  if (error || !data) return { ok: false, message: error?.message ?? API_ERRORS.INTERNAL };

  return { ok: true, ticket: { bucket: BATTLE_MUSIC_BUCKET, path: data.path, token: data.token, contentType } };
}

export async function verifyUploadedTrack(path: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const bucket = createAdminClient().storage.from(BATTLE_MUSIC_BUCKET);

  const { data, error } = await bucket.info(path);

  if (error || !data) return { ok: false, message: API_ERRORS.TRACK_UPLOAD_MISSING };

  const type = (data.contentType ?? "").toLowerCase();

  if (!TRACK_CONTENT_TYPES.includes(type) || !data.size || data.size > MAX_TRACK_BYTES) {
    await bucket.remove([path]);

    return { ok: false, message: API_ERRORS.TRACK_FILE_INVALID };
  }

  return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
}

export function trackObjectPath(url: string): string | null {
  try {
    const { pathname } = new URL(url);

    const at = pathname.indexOf(PUBLIC_MARKER);

    return at === -1 ? null : decodeURIComponent(pathname.slice(at + PUBLIC_MARKER.length));
  } catch {
    return null;
  }
}

export async function removeTrackFile(url: string): Promise<void> {
  const path = trackObjectPath(url);

  if (!path) return;

  try {
    const { error } = await createAdminClient().storage.from(BATTLE_MUSIC_BUCKET).remove([path]);

    if (error) console.warn("[battle-music] remove failed", path, error.message);
  } catch (e) {
    console.warn("[battle-music] remove failed", path, e);
  }
}
```

`lib/utils/audio/youtube-oembed.ts`:

```ts
import { safeFetchBuffer } from "@/lib/utils/api/safe-fetch";

const OEMBED_MAX_BYTES = 64 * 1024;

export async function fetchYoutubeTitle(youtubeId: string): Promise<string | null> {
  const watch = `https://www.youtube.com/watch?v=${youtubeId}`;

  try {
    const res = await safeFetchBuffer(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`, { maxBytes: OEMBED_MAX_BYTES });

    if (res.status !== 200) return null;

    const title = (JSON.parse(res.body.toString("utf8")) as { title?: unknown }).title;

    return typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : null;
  } catch {
    return null;
  }
}
```

`app/api/campaigns/[id]/tracks/track-handlers.ts`:

```ts
import { after, NextResponse } from "next/server";
import type { CampaignTrack as TrackRow } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { MAX_TRACKS_PER_CAMPAIGN } from "@/lib/constants/music";
import { prisma } from "@/lib/db";
import { createTrackSchema, reorderTracksSchema, trackUploadRequestSchema, updateTrackSchema } from "@/lib/schemas/music";
import { createTrackUploadTicket, removeTrackFile, trackPathOwnedBy, verifyUploadedTrack } from "@/lib/supabase/battle-music-storage";
import { requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { loadOwned } from "@/lib/utils/api/load-owned";
import { parseBody } from "@/lib/utils/api/parse-body";
import { validateTrackFile } from "@/lib/utils/audio/track-file";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";
import { fetchYoutubeTitle } from "@/lib/utils/audio/youtube-oembed";
import type { CampaignTrack, TrackKind } from "@/types/audio";

const ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

type TrackSource = Pick<TrackRow, "kind" | "title" | "url" | "youtubeId" | "durationSec">;

export function toCampaignTrack(row: TrackRow): CampaignTrack {
  return { id: row.id, title: row.title, kind: row.kind as TrackKind, url: row.url, youtubeId: row.youtubeId, durationSec: row.durationSec, sortOrder: row.sortOrder, createdAt: row.createdAt.toISOString() };
}

export async function listTracks(campaignId: string): Promise<CampaignTrack[]> {
  return (await prisma.campaignTrack.findMany({ where: { campaignId }, orderBy: ORDER })).map(toCampaignTrack);
}

const full = async (campaignId: string) => (await prisma.campaignTrack.count({ where: { campaignId } })) >= MAX_TRACKS_PER_CAMPAIGN;

export async function getTracksHandler(campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    return NextResponse.json(await listTracks(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "list tracks" });
  }
}

export async function issueUploadTicketHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(trackUploadRequestSchema, req);

    if (body instanceof NextResponse) return body;

    const file = validateTrackFile({ name: body.name, type: body.contentType, size: body.size });

    if (!file.ok) return errorResponse(file.message, 400);

    if (await full(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const ticket = await createTrackUploadTicket(campaignId, file.format);

    return ticket.ok ? NextResponse.json(ticket.ticket) : errorResponse(ticket.message, 500);
  } catch (error) {
    return handleApiError(error, { action: "issue track upload" });
  }
}

async function fileSource(campaignId: string, body: { path: string; title: string; durationSec?: number }): Promise<TrackSource | { error: string }> {
  if (!trackPathOwnedBy(body.path, campaignId)) return { error: API_ERRORS.TRACK_UPLOAD_MISSING };

  const verified = await verifyUploadedTrack(body.path);

  if (!verified.ok) return { error: verified.message };

  return { kind: "file", title: body.title, url: verified.url, youtubeId: null, durationSec: body.durationSec ?? null };
}

async function youtubeSource(body: { url: string; title?: string }): Promise<TrackSource | { error: string }> {
  const youtubeId = parseYoutubeId(body.url);

  if (!youtubeId) return { error: API_ERRORS.YOUTUBE_URL_INVALID };

  const title = body.title ?? (await fetchYoutubeTitle(youtubeId)) ?? `YouTube ${youtubeId}`;

  return { kind: "youtube", title, url: null, youtubeId, durationSec: null };
}

export async function createTrackHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(createTrackSchema, req);

    if (body instanceof NextResponse) return body;

    if (await full(campaignId)) return errorResponse(API_ERRORS.TRACK_LIMIT, 400);

    const source = body.kind === "file" ? await fileSource(campaignId, body) : await youtubeSource(body);

    if ("error" in source) return errorResponse(source.error, 400);

    const last = await prisma.campaignTrack.aggregate({ where: { campaignId }, _max: { sortOrder: true } });

    const row = await prisma.campaignTrack.create({ data: { campaignId, ...source, sortOrder: (last._max.sortOrder ?? -1) + 1 } });

    return NextResponse.json(toCampaignTrack(row), { status: 201 });
  } catch (error) {
    return handleApiError(error, { action: "create track" });
  }
}

async function ownedTrack(campaignId: string, trackId: string) {
  return loadOwned(prisma.campaignTrack.findUnique({ where: { id: trackId } }), campaignId, API_ERRORS.TRACK_NOT_FOUND);
}

export async function renameTrackHandler(req: Request, campaignId: string, trackId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(updateTrackSchema, req);

    if (body instanceof NextResponse) return body;

    const track = await ownedTrack(campaignId, trackId);

    if (track instanceof NextResponse) return track;

    return NextResponse.json(toCampaignTrack(await prisma.campaignTrack.update({ where: { id: trackId }, data: { title: body.title } })));
  } catch (error) {
    return handleApiError(error, { action: "rename track" });
  }
}

export async function deleteTrackHandler(campaignId: string, trackId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const track = await ownedTrack(campaignId, trackId);

    if (track instanceof NextResponse) return track;

    await prisma.campaignTrack.delete({ where: { id: trackId } });

    const { url } = track;

    if (track.kind === "file" && url) after(() => removeTrackFile(url));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, { action: "delete track" });
  }
}

export async function reorderTracksHandler(req: Request, campaignId: string) {
  try {
    const access = await requireDM(campaignId);

    if (access instanceof NextResponse) return access;

    const body = await parseBody(reorderTracksSchema, req);

    if (body instanceof NextResponse) return body;

    const known = new Set((await prisma.campaignTrack.findMany({ where: { campaignId }, select: { id: true } })).map((r) => r.id));

    const exact = body.ids.length === known.size && new Set(body.ids).size === body.ids.length && body.ids.every((id) => known.has(id));

    if (!exact) return errorResponse(API_ERRORS.TRACK_ORDER_MISMATCH, 400);

    await prisma.$transaction(body.ids.map((id, sortOrder) => prisma.campaignTrack.update({ where: { id }, data: { sortOrder } })));

    return NextResponse.json(await listTracks(campaignId));
  } catch (error) {
    return handleApiError(error, { action: "reorder tracks" });
  }
}
```

Маршрути (тонкі):

`app/api/campaigns/[id]/tracks/route.ts`:

```ts
import { createTrackHandler, getTracksHandler } from "./track-handlers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  return getTracksHandler((await params).id);
}

export async function POST(req: Request, { params }: Params) {
  return createTrackHandler(req, (await params).id);
}
```

`.../tracks/upload-url/route.ts`:

```ts
import { issueUploadTicketHandler } from "../track-handlers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return issueUploadTicketHandler(req, (await params).id);
}
```

`.../tracks/[trackId]/route.ts`:

```ts
import { deleteTrackHandler, renameTrackHandler } from "../track-handlers";

type Params = { params: Promise<{ id: string; trackId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id, trackId } = await params;

  return renameTrackHandler(req, id, trackId);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, trackId } = await params;

  return deleteTrackHandler(id, trackId);
}
```

`.../tracks/order/route.ts`:

```ts
import { reorderTracksHandler } from "../track-handlers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return reorderTracksHandler(req, (await params).id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/supabase/__tests__/battle-music-storage.test.ts app/api/__tests__/tracks-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add lib/supabase/battle-music-storage.ts lib/supabase/__tests__/battle-music-storage.test.ts lib/utils/audio/youtube-oembed.ts \
  "app/api/campaigns/[id]/tracks" app/api/__tests__/tracks-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts
git commit -m "feat(music): battle-music bucket with signed uploads and DM-only tracks API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Клієнт бібліотеки (`lib/api/tracks`, `lib/hooks/tracks`) і сторінка ДМ «Музика»

**Files:**
- Create: `lib/api/tracks.ts`, `lib/utils/audio/read-duration.ts`
- Create: `lib/hooks/tracks/keys.ts`, `lib/hooks/tracks/useTracks.ts`, `lib/hooks/tracks/useMusicLibrary.ts`, `lib/hooks/tracks/index.ts`
- Create: `components/music/TrackList.tsx`, `components/music/AddYoutubeTrackDialog.tsx`, `components/music/UploadTrackButton.tsx`
- Create: `app/campaigns/[id]/dm/music/page.tsx`, `app/campaigns/[id]/dm/music/page-client.tsx`
- Modify: `components/layout/Header.tsx` (пункт «Музика»), `components/layout/Breadcrumbs.tsx` (`music: "Музика"`)
- Test: `lib/api/__tests__/tracks.test.ts`, `components/music/__tests__/TrackList.test.tsx`, `lib/hooks/tracks/__tests__/useMusicLibrary.test.tsx`

**Interfaces:**
- Consumes: маршрути Task 6, `createCampaignCrudApi`/`campaignPost`/`campaignPut` (`lib/api/client.ts`), `createClient` (`lib/supabase/client.ts`), `validateTrackFile`, `moveTrack`, `useConfirm`, `useNotify`, `useCrudMutation` (`@/lib/hooks/common`), `HudPage`, `HudPageHeader`, `HudCard`, `EmptyState`, `LoadingState`, `ResponsiveDialog`, `Button`, `Input`, `requireCampaignDM` (`lib/campaigns/access.ts`).
- Produces:
  - `getTracks`, `createTrack`, `updateTrack`, `deleteTrack`, `reorderTracks(campaignId, ids)`, `uploadTrackFile(campaignId, file, meta: { title: string; durationSec: number | null })`.
  - `readAudioDuration(file: File): Promise<number | null>`.
  - `trackKeys.list(campaignId)`; `useTracks(campaignId, { initial?, enabled? })`; `useMusicLibrary(campaignId, initial)` → `MusicLibrary { tracks; loading; busy; upload(file): Promise<void>; addYoutube(data: { url: string; title?: string }): Promise<boolean>; rename(id, title): void; remove(track): Promise<void>; move(index, dir): void }`.
  - Компоненти `TrackList({ tracks, busy, actions: { onRename, onDelete, onMove } })`, `AddYoutubeTrackDialog({ open, onOpenChange, onSubmit, pending })`, `UploadTrackButton({ onFile, pending })`.
  - Сторінка `/campaigns/[id]/dm/music`.

- [ ] **Step 1: Write the failing tests**

`lib/api/__tests__/tracks.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadTrackFile } from "../tracks";

const uploadToSignedUrl = vi.hoisted(() => vi.fn(async () => ({ data: { path: "p", fullPath: "p" }, error: null })));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ storage: { from: () => ({ uploadToSignedUrl }) } }) }));

const PATH = "c1/0123456789abcdef0123456789abcdef.mp3";

describe("uploadTrackFile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("квиток → пряме завантаження в Storage з річним кешем → запис треку", async () => {
    const fetch = vi.fn(async (url: string, _init?: RequestInit) =>
      url.endsWith("/tracks/upload-url")
        ? new Response(JSON.stringify({ bucket: "battle-music", path: PATH, token: "tok", contentType: "audio/mpeg" }), { status: 200 })
        : new Response(JSON.stringify({ id: "t1", title: "Бій" }), { status: 201 }),
    );

    vi.stubGlobal("fetch", fetch);

    const file = new File([new Uint8Array(100)], "Бій.mp3", { type: "audio/mpeg" });

    await uploadTrackFile("c1", file, { title: "Бій", durationSec: 121.6 });

    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({ name: "Бій.mp3", size: 100, contentType: "audio/mpeg" });
    expect(uploadToSignedUrl).toHaveBeenCalledWith(PATH, "tok", file, { contentType: "audio/mpeg", cacheControl: "31536000" });
    expect(JSON.parse(fetch.mock.calls[1][1]?.body as string)).toEqual({ kind: "file", path: PATH, title: "Бій", durationSec: 122 });
  });

  it("невалідний файл — помилка без жодного запиту", async () => {
    const fetch = vi.fn();

    vi.stubGlobal("fetch", fetch);

    await expect(uploadTrackFile("c1", new File(["x"], "a.wav", { type: "audio/wav" }), { title: "a", durationSec: null })).rejects.toThrow("Потрібен файл MP3 або M4A до 10 МБ");
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

`components/music/__tests__/TrackList.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackList } from "../TrackList";

import type { CampaignTrack } from "@/types/audio";

afterEach(cleanup);

const track = (id: string, kind: CampaignTrack["kind"] = "file"): CampaignTrack => ({ id, title: `Трек ${id}`, kind, url: null, youtubeId: kind === "youtube" ? "dQw4w9WgXcQ" : null, durationSec: 61, sortOrder: 0, createdAt: "" });

function setup() {
  const actions = { onRename: vi.fn(), onDelete: vi.fn(), onMove: vi.fn() };

  const view = render(<TrackList tracks={[track("a"), track("b", "youtube")]} busy={false} actions={actions} />);

  return { ...view, actions };
}

describe("TrackList", () => {
  it("назва, тип і тривалість; крайні стрілки вимкнені", () => {
    const { getByText, getAllByRole } = setup();

    expect(getByText("Трек a")).toBeTruthy();
    expect(getByText("MP3 · 1:01")).toBeTruthy();
    expect(getByText("YouTube")).toBeTruthy();
    expect((getAllByRole("button", { name: "Вище" })[0] as HTMLButtonElement).disabled).toBe(true);
    expect((getAllByRole("button", { name: "Нижче" })[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it("стрілка, видалення й перейменування викликають дії", () => {
    const { getAllByRole, getAllByLabelText, actions } = setup();

    fireEvent.click(getAllByRole("button", { name: "Нижче" })[0]);
    expect(actions.onMove).toHaveBeenCalledWith(0, 1);

    fireEvent.click(getAllByRole("button", { name: "Видалити" })[1]);
    expect(actions.onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));

    const input = getAllByLabelText("Назва треку")[0];

    fireEvent.change(input, { target: { value: "Таверна" } });
    fireEvent.blur(input);
    expect(actions.onRename).toHaveBeenCalledWith("a", "Таверна");
  });

  it("незмінена або порожня назва — без перейменування", () => {
    const { getAllByLabelText, actions } = setup();

    const input = getAllByLabelText("Назва треку")[0];

    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(actions.onRename).not.toHaveBeenCalled();
  });
});
```

`lib/hooks/tracks/__tests__/useMusicLibrary.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMusicLibrary } from "../useMusicLibrary";

import { deleteTrack, reorderTracks } from "@/lib/api/tracks";
import { ConfirmContext } from "@/lib/hooks/common";
import type { CampaignTrack } from "@/types/audio";

vi.mock("@/lib/api/tracks", () => ({
  getTracks: vi.fn(),
  createTrack: vi.fn(),
  updateTrack: vi.fn(),
  deleteTrack: vi.fn(async () => ({ ok: true })),
  reorderTracks: vi.fn(async (_c: string, ids: string[]) => ids.map((id) => ({ id }))),
  uploadTrackFile: vi.fn(),
}));

const tracks = ["a", "b"].map((id, i) => ({ id, title: id, kind: "file", url: null, youtubeId: null, durationSec: null, sortOrder: i, createdAt: "" })) as CampaignTrack[];

function wrapper(answer: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const confirm = vi.fn(async () => answer);

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>
    </QueryClientProvider>
  );
}

describe("useMusicLibrary", () => {
  it("видалення лише після підтвердження", async () => {
    const no = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(false) });

    await act(() => no.result.current.remove(tracks[0]));
    expect(deleteTrack).not.toHaveBeenCalled();

    const yes = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(true) });

    await act(() => yes.result.current.remove(tracks[0]));
    await waitFor(() => expect(deleteTrack).toHaveBeenCalledWith("c1", "a"));
  });

  it("move шле повний новий порядок", async () => {
    const { result } = renderHook(() => useMusicLibrary("c1", tracks), { wrapper: wrapper(true) });

    act(() => result.current.move(0, 1));

    await waitFor(() => expect(reorderTracks).toHaveBeenCalledWith("c1", ["b", "a"]));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/api/__tests__/tracks.test.ts components/music lib/hooks/tracks`
Expected: FAIL — модулів немає.

- [ ] **Step 3: Implement**

`lib/api/tracks.ts`:

```ts
import { campaignPost, campaignPut, createCampaignCrudApi } from "./client";

import { TRACK_CACHE_SECONDS, TRACK_FORMATS } from "@/lib/constants/music";
import { createClient } from "@/lib/supabase/client";
import { validateTrackFile } from "@/lib/utils/audio/track-file";
import type { CampaignTrack, CreateTrackData, TrackUploadRequest, TrackUploadTicket, UpdateTrackData } from "@/types/audio";

const tracksApi = createCampaignCrudApi<CampaignTrack, CreateTrackData, UpdateTrackData, { ok: true }>("/tracks", { listCache: "no-store" });

export const getTracks = tracksApi.list;
export const createTrack = tracksApi.create;
export const updateTrack = tracksApi.update;
export const deleteTrack = tracksApi.remove;

export function reorderTracks(campaignId: string, ids: string[]): Promise<CampaignTrack[]> {
  return campaignPut<CampaignTrack[]>(campaignId, "/tracks/order", { ids });
}

/** Файл іде з браузера прямо в Storage: тіло запиту до Vercel обмежене 4,5 МБ. */
export async function uploadTrackFile(campaignId: string, file: File, meta: { title: string; durationSec: number | null }): Promise<CampaignTrack> {
  const checked = validateTrackFile(file);

  if (!checked.ok) throw new Error(checked.message);

  const request: TrackUploadRequest = { name: file.name, size: file.size, contentType: TRACK_FORMATS[checked.format].contentType };

  const ticket = await campaignPost<TrackUploadTicket>(campaignId, "/tracks/upload-url", request);

  const { error } = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: ticket.contentType, cacheControl: TRACK_CACHE_SECONDS });

  if (error) throw new Error(`Не вдалося завантажити файл: ${error.message}`);

  return createTrack(campaignId, { kind: "file", path: ticket.path, title: meta.title, ...(meta.durationSec ? { durationSec: Math.round(meta.durationSec) } : {}) });
}
```

`lib/utils/audio/read-duration.ts`:

```ts
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);

    const audio = new Audio();

    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    audio.onerror = () => done(null);
    audio.src = url;
  });
}
```

`lib/hooks/tracks/keys.ts`:

```ts
export const trackKeys = {
  list: (campaignId: string) => ["tracks", campaignId] as const,
};
```

`lib/hooks/tracks/useTracks.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { trackKeys } from "./keys";

import { getTracks } from "@/lib/api/tracks";
import type { CampaignTrack } from "@/types/audio";

export function useTracks(campaignId: string, options: { initial?: CampaignTrack[]; enabled?: boolean } = {}) {
  return useQuery<CampaignTrack[]>({
    queryKey: trackKeys.list(campaignId),
    queryFn: () => getTracks(campaignId),
    enabled: options.enabled ?? true,
    staleTime: 60_000,
    ...(options.initial && { initialData: options.initial }),
  });
}
```

`lib/hooks/tracks/useMusicLibrary.ts`:

```ts
"use client";

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { trackKeys } from "./keys";
import { useTracks } from "./useTracks";

import { createTrack, deleteTrack, reorderTracks, updateTrack, uploadTrackFile } from "@/lib/api/tracks";
import { useConfirm, useCrudMutation, useNotify } from "@/lib/hooks/common";
import { readAudioDuration } from "@/lib/utils/audio/read-duration";
import { moveTrack } from "@/lib/utils/audio/order";
import type { CampaignTrack } from "@/types/audio";

export interface MusicLibrary {
  tracks: CampaignTrack[];
  loading: boolean;
  busy: boolean;
  upload(file: File): Promise<void>;
  addYoutube(data: { url: string; title?: string }): Promise<boolean>;
  rename(id: string, title: string): void;
  remove(track: CampaignTrack): Promise<void>;
  move(index: number, dir: -1 | 1): void;
}

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, 120) || "Трек";

const messageOf = (e: unknown) => (e instanceof Error && e.message ? e.message : "Не вдалося зберегти");

export function useMusicLibrary(campaignId: string, initial: CampaignTrack[]): MusicLibrary {
  const queryClient = useQueryClient();

  const confirm = useConfirm();

  const notify = useNotify();

  const key = trackKeys.list(campaignId);

  const { data: tracks = initial, isLoading } = useTracks(campaignId, { initial });

  const onError = (e: unknown) => void notify(messageOf(e));

  const invalidateKeys = [key];

  const uploadM = useCrudMutation({
    mutationFn: async (file: File) => uploadTrackFile(campaignId, file, { title: stripExtension(file.name), durationSec: await readAudioDuration(file) }),
    invalidateKeys,
    onError,
  });

  const youtubeM = useCrudMutation({ mutationFn: (data: { url: string; title?: string }) => createTrack(campaignId, { kind: "youtube", ...data }), invalidateKeys, onError });

  const renameM = useCrudMutation({ mutationFn: ({ id, title }: { id: string; title: string }) => updateTrack(campaignId, id, { title }), invalidateKeys, onError });

  const deleteM = useCrudMutation({ mutationFn: (id: string) => deleteTrack(campaignId, id), invalidateKeys, onError });

  const reorderM = useMutation({
    mutationFn: (ids: string[]) => reorderTracks(campaignId, ids),
    onSuccess: (list) => queryClient.setQueryData(trackKeys.list(campaignId), list),
    onError,
  });

  const { mutateAsync: uploadAsync } = uploadM;

  const upload = useCallback(async (file: File) => {
    await uploadAsync(file).catch(() => undefined);
  }, [uploadAsync]);

  const { mutateAsync: youtubeAsync } = youtubeM;

  const addYoutube = useCallback(async (data: { url: string; title?: string }) => youtubeAsync(data).then(() => true, () => false), [youtubeAsync]);

  const { mutate: renameMutate } = renameM;

  const rename = useCallback((id: string, title: string) => renameMutate({ id, title }), [renameMutate]);

  const { mutate: deleteMutate } = deleteM;

  const remove = useCallback(
    async (track: CampaignTrack) => {
      if (await confirm({ title: `Видалити «${track.title}»?`, description: "Трек зникне з бібліотеки; у боях, де він грає, музика зупиниться після перемикання.", confirmLabel: "Видалити", destructive: true })) {
        deleteMutate(track.id);
      }
    },
    [confirm, deleteMutate],
  );

  const { mutate: reorderMutate } = reorderM;

  const move = useCallback((index: number, dir: -1 | 1) => {
    const ids = tracks.map((t) => t.id);

    const next = moveTrack(ids, index, dir);

    if (next !== ids) reorderMutate(next);
  }, [tracks, reorderMutate]);

  return {
    tracks,
    loading: isLoading,
    busy: uploadM.isPending || youtubeM.isPending || reorderM.isPending,
    upload,
    addYoutube,
    rename,
    remove,
    move,
  };
}
```

`lib/hooks/tracks/index.ts`:

```ts
export { trackKeys } from "./keys";
export { type MusicLibrary, useMusicLibrary } from "./useMusicLibrary";
export { useTracks } from "./useTracks";
```

`components/music/TrackList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { HudCard } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CampaignTrack } from "@/types/audio";

export interface TrackListActions {
  onRename(id: string, title: string): void;
  onDelete(track: CampaignTrack): void;
  onMove(index: number, dir: -1 | 1): void;
}

const duration = (sec: number | null) => (sec ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}` : null);

function kindLabel(t: CampaignTrack) {
  if (t.kind === "youtube") return "YouTube";

  const d = duration(t.durationSec);

  return d ? `MP3 · ${d}` : "MP3";
}

function TrackTitle({ track, onRename }: { track: CampaignTrack; onRename: TrackListActions["onRename"] }) {
  const [draft, setDraft] = useState(track.title);

  const commit = () => {
    const title = draft.trim();

    if (!title || title === track.title) {
      setDraft(track.title);

      return;
    }

    onRename(track.id, title);
  };

  return (
    <Input
      aria-label="Назва треку"
      value={draft}
      maxLength={120}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="h-8 min-w-0 flex-1"
    />
  );
}

export function TrackList({ tracks, busy, actions }: { tracks: CampaignTrack[]; busy: boolean; actions: TrackListActions }) {
  return (
    <ol className="flex flex-col gap-2">
      {tracks.map((t, i) => (
        <li key={t.id}>
          <HudCard className="flex items-center gap-2">
            <TrackTitle key={t.title} track={t} onRename={actions.onRename} />
            <span className="w-24 shrink-0 text-xs text-hud-muted">{kindLabel(t)}</span>
            <Button variant="ghost" size="icon" aria-label="Вище" disabled={busy || i === 0} onClick={() => actions.onMove(i, -1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Нижче" disabled={busy || i === tracks.length - 1} onClick={() => actions.onMove(i, 1)}>
              <ArrowDown className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Видалити" onClick={() => actions.onDelete(t)}>
              <Trash2 className="size-4" />
            </Button>
          </HudCard>
        </li>
      ))}
    </ol>
  );
}
```

`components/music/UploadTrackButton.tsx`:

```tsx
"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function UploadTrackButton({ onFile, pending }: { onFile: (file: File) => void; pending: boolean }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".mp3,.m4a,audio/mpeg,audio/mp4"
        hidden
        aria-label="Файл треку"
        onChange={(e) => {
          const file = e.target.files?.[0];

          e.target.value = "";

          if (file) onFile(file);
        }}
      />
      <Button onClick={() => input.current?.click()} disabled={pending} className="flex items-center gap-2">
        <Upload className="h-4 w-4" />
        {pending ? "Завантаження…" : "Завантажити MP3"}
      </Button>
    </>
  );
}
```

`components/music/AddYoutubeTrackDialog.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { parseYoutubeId } from "@/lib/utils/audio/youtube-id";

const FORM_ID = "add-youtube-track";

export function AddYoutubeTrackDialog({ open, onOpenChange, onSubmit, pending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { url: string; title?: string }) => Promise<boolean>;
  pending: boolean;
}) {
  const [url, setUrl] = useState("");

  const [title, setTitle] = useState("");

  const valid = parseYoutubeId(url) !== null;

  return (
    <ResponsiveDialog
      hud
      open={open}
      onOpenChange={onOpenChange}
      title="Додати з YouTube"
      description="Посилання youtu.be, watch?v= або shorts. Назву можна не вводити — візьмемо з YouTube."
      footer={
        <Button type="submit" form={FORM_ID} disabled={!valid || pending}>
          Додати
        </Button>
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();

          if (await onSubmit({ url: url.trim(), ...(title.trim() && { title: title.trim() }) })) {
            setUrl("");
            setTitle("");
            onOpenChange(false);
          }
        }}
      >
        <Input aria-label="Посилання YouTube" placeholder="https://youtu.be/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        {url && !valid && <p className="text-xs text-[var(--enemy)]">Не вдалося розпізнати посилання YouTube</p>}
        <Input aria-label="Назва (необовʼязково)" placeholder="Назва" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </form>
    </ResponsiveDialog>
  );
}
```

`app/campaigns/[id]/dm/music/page.tsx`:

```tsx
import { DMMusicPageClient } from "./page-client";

import { requireCampaignDM } from "@/lib/campaigns/access";
import { listTracks } from "@/app/api/campaigns/[id]/tracks/track-handlers";

export default async function DMMusicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  return <DMMusicPageClient campaignId={id} initialTracks={await listTracks(id)} />;
}
```

`app/campaigns/[id]/dm/music/page-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Music, Plus } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { AddYoutubeTrackDialog } from "@/components/music/AddYoutubeTrackDialog";
import { TrackList } from "@/components/music/TrackList";
import { UploadTrackButton } from "@/components/music/UploadTrackButton";
import { Button } from "@/components/ui/button";
import { MAX_TRACKS_PER_CAMPAIGN } from "@/lib/constants/music";
import { useMusicLibrary } from "@/lib/hooks/tracks";
import type { CampaignTrack } from "@/types/audio";

export function DMMusicPageClient({ campaignId, initialTracks }: { campaignId: string; initialTracks: CampaignTrack[] }) {
  const library = useMusicLibrary(campaignId, initialTracks);

  const [youtubeOpen, setYoutubeOpen] = useState(false);

  const full = library.tracks.length >= MAX_TRACKS_PER_CAMPAIGN;

  return (
    <HudPage>
      <HudPageHeader
        title="Музика"
        subtitle={`${library.tracks.length} з ${MAX_TRACKS_PER_CAMPAIGN} треків · MP3 або M4A до 10 МБ`}
        actions={
          <>
            <UploadTrackButton onFile={(file) => void library.upload(file)} pending={library.busy || full} />
            <Button variant="outline" onClick={() => setYoutubeOpen(true)} disabled={full} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              YouTube
            </Button>
          </>
        }
      />
      {library.loading && library.tracks.length === 0 ? (
        <LoadingState rows={4} label="Завантаження треків…" />
      ) : library.tracks.length === 0 ? (
        <EmptyState icon={Music} title="Ще немає треків" description="Завантажте MP3 або додайте посилання YouTube — ДМ вмикає їх у бою." />
      ) : (
        <TrackList tracks={library.tracks} busy={library.busy} actions={{ onRename: library.rename, onDelete: (t) => void library.remove(t), onMove: library.move }} />
      )}
      <AddYoutubeTrackDialog open={youtubeOpen} onOpenChange={setYoutubeOpen} onSubmit={library.addYoutube} pending={library.busy} />
    </HudPage>
  );
}
```

`components/layout/Header.tsx` — пункт після «Сцени Боїв» у блоці `isDMPage`:

```tsx
                    <DropdownMenuItem asChild>
                      <Link href={`/campaigns/${campaignId}/dm/music`}>
                        Музика
                      </Link>
                    </DropdownMenuItem>
```

`components/layout/Breadcrumbs.tsx` — у `SEGMENT_LABELS`: `music: "Музика",`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/api/__tests__/tracks.test.ts components/music lib/hooks/tracks components/layout`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add lib/api/tracks.ts lib/api/__tests__/tracks.test.ts lib/utils/audio/read-duration.ts lib/hooks/tracks components/music \
  "app/campaigns/[id]/dm/music" components/layout/Header.tsx components/layout/Breadcrumbs.tsx
git commit -m "feat(music): DM music library page — upload MP3, add YouTube, rename, delete, reorder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Стан музики бою на сервері — `GET/POST .../audio`, `audio` у сцені, Pusher `battle-audio`

**Files:**
- Create: `app/api/campaigns/[id]/battles/[battleId]/audio/audio-handler.ts`, `app/api/campaigns/[id]/battles/[battleId]/audio/route.ts`
- Modify: `lib/pusher/channels.ts` (`BATTLE_AUDIO_EVENT`), `lib/utils/api/rate-limit.ts` (скоуп `audio`)
- Modify: `lib/utils/battle/store/types.ts` (`BattleMeta.audio?`), `lib/utils/battle/store/load-battle.ts` (select + meta), `lib/utils/battle/pipeline/battle-response.ts` (`audio` у відповіді), `types/api.ts` (`BattleScene.audio?`)
- Modify: `app/api/__tests__/dm-only-routes-api.test.ts`, `lib/utils/battle/pipeline/__tests__/battle-response.test.ts`, `lib/utils/battle/store/__tests__/load-battle-snapshots.test.ts`, `lib/utils/battle/store/__tests__/save-battle-map.test.ts`
- Test: `app/api/__tests__/battle-audio-api.test.ts`

**Interfaces:**
- Consumes: `applyAudioCommand`, `commandNeedsLibrary`, `AudioLibraryEntry` (Task 5), `battleAudioCommandSchema`, `prisma.campaignTrack`, `requireDM`, `requireCampaignAccess`, `checkRateLimit`, `rateLimitResponse`, `safePusherTrigger`, `pusherServer`, `battleChannelName`.
- Produces:
  - `BATTLE_AUDIO_EVENT = "battle-audio"`.
  - `readBattleAudio(params): Promise<NextResponse>` → `200 BattleAudioResponse` (учасник кампанії; `Cache-Control: no-store`).
  - `commandBattleAudio(req, params): Promise<NextResponse>` → `200 BattleAudioResponse` (ДМ), 422 `{ error }` для недоступної команди, 409 `BATTLE_AUDIO_CONFLICT`; пише лише `battle_scenes.audio`; Pusher `battle-audio` з `BattleAudioEvent` після відповіді.
  - `BattleMeta.audio?: BattleAudioState | null`; `BattleScene.audio?: BattleAudioState | null` у `GET /` (і `readBattleScene` для першого HTML).

- [ ] **Step 1: Write the failing tests**

`app/api/__tests__/battle-audio-api.test.ts`:

```ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";
import type { BattleAudioState } from "@/types/audio";

const trigger = vi.hoisted(() => vi.fn(async () => undefined));

const afterCallbacks = vi.hoisted(() => [] as Array<() => unknown>);

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: (cb: () => unknown) => afterCallbacks.push(cb) }));
vi.mock("@/lib/pusher/server", () => ({ pusherServer: { trigger } }));
vi.mock("@/lib/utils/api/rate-limit", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/rate-limit")>()), checkRateLimit: vi.fn(async () => ({ allowed: true, count: 1, limit: 20, retryAfterSeconds: 10 })) }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    battleScene: { findFirst: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })) },
    campaignTrack: { findMany: vi.fn() },
  },
}));

const access = (isDM: boolean) => ({ userId: isDM ? "dm" : "p", isDM, campaign: { id: "c1", maxLevel: 20, members: [] } }) as never;

const params = { id: "c1", battleId: "b1" };

const post = async (body: unknown) => {
  const { POST } = await import("@/app/api/campaigns/[id]/battles/[battleId]/audio/route");

  return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve(params) });
};

const rows = [
  { id: "t1", title: "Бій", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 },
  { id: "t2", title: "Таверна", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null },
];

const playing: BattleAudioState = { trackId: "t1", track: { title: "Бій", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 }, playing: true, offsetSec: 0, startedAt: 1_000, seq: 3 };

describe("battle audio API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    vi.useFakeTimers({ now: 21_000, toFake: ["Date"] });
    vi.mocked(apiAuth.requireDM).mockResolvedValue(access(true));
    vi.mocked(apiAuth.requireCampaignAccess).mockResolvedValue(access(false));
    vi.mocked(prisma.campaignTrack.findMany).mockResolvedValue(rows as never);
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ audio: null } as never);
  });

  afterEach(() => vi.useRealTimers());

  it("гравець — 403 без запису", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }) as never);

    expect((await post({ action: "pause" })).status).toBe(403);
    expect(prisma.battleScene.updateMany).not.toHaveBeenCalled();
  });

  it("play з порожнього стану: пише лише audio з умовою IS NULL, version не чіпає; відповідь і Pusher після неї", async () => {
    const res = await post({ action: "play", trackId: "t2" });

    const expected = { trackId: "t2", track: { title: "Таверна", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null }, playing: true, offsetSec: 0, startedAt: 21_000, seq: 1 };

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ audio: expected });

    const call = vi.mocked(prisma.battleScene.updateMany).mock.calls[0][0] as { where: Record<string, unknown>; data: Record<string, unknown> };

    expect(call.where).toEqual({ id: "b1", campaignId: "c1", audio: { equals: Prisma.DbNull } });
    expect(Object.keys(call.data)).toEqual(["audio"]);
    expect(trigger).not.toHaveBeenCalled();

    await Promise.all(afterCallbacks.map((cb) => cb()));
    expect(trigger).toHaveBeenCalledWith("private-battle-b1", "battle-audio", { battleId: "b1", audio: expected });
  });

  it("pause: умова за попереднім seq, позиція на момент паузи", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ audio: playing } as never);

    const res = await post({ action: "pause" });

    expect(await res.json()).toEqual({ audio: { ...playing, playing: false, offsetSec: 20, startedAt: 21_000, seq: 4 } });
    expect(vi.mocked(prisma.battleScene.updateMany).mock.calls[0][0]).toMatchObject({ where: { audio: { path: ["seq"], equals: 3 } } });
    expect(prisma.campaignTrack.findMany).not.toHaveBeenCalled();
  });

  it("гонка двох команд — 409 і без Pusher", async () => {
    vi.mocked(prisma.battleScene.updateMany).mockResolvedValueOnce({ count: 0 });

    const res = await post({ action: "next" });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Стан музики змінився — повторіть" });
    expect(afterCallbacks).toHaveLength(0);
  });

  it("недоступна команда — 422; чужий бій — 404; невідома дія — 400", async () => {
    expect((await post({ action: "resume" })).status).toBe(422);

    vi.mocked(prisma.battleScene.findFirst).mockResolvedValueOnce(null);
    expect((await post({ action: "stop" })).status).toBe(404);

    expect((await post({ action: "seek" })).status).toBe(400);
  });

  it("GET для учасника: поточний стан без кешу", async () => {
    vi.mocked(prisma.battleScene.findFirst).mockResolvedValue({ audio: playing } as never);

    const { GET } = await import("@/app/api/campaigns/[id]/battles/[battleId]/audio/route");

    const res = await GET(new Request("http://x"), { params: Promise.resolve(params) });

    expect(await res.json()).toEqual({ audio: playing });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
```

`app/api/__tests__/dm-only-routes-api.test.ts` — імпорт `import * as battleAudio from "@/app/api/campaigns/[id]/battles/[battleId]/audio/route";`, випадок `["POST battles/:battleId/audio", battleAudio.POST],` і `battleId: "b1"` в `ids`.

`lib/utils/battle/pipeline/__tests__/battle-response.test.ts` — новий кейс:

```ts
  it("стан музики з meta йде у сцену; без нього — null", () => {
    const audio = { trackId: "t1", track: null, playing: true, offsetSec: 0, startedAt: 1, seq: 2 };

    expect(toBattleResponse({ meta: { ...meta, audio } }, scene, [], [], { mode: "full", entries: [] }).audio).toEqual(audio);
    expect(toBattleResponse({ meta }, scene, [], [], { mode: "full", entries: [] }).audio).toBeNull();
  });
```

`lib/utils/battle/store/__tests__/load-battle-snapshots.test.ts` — у `fakeDb` рядок отримує `audio: { trackId: "t1", track: null, playing: false, offsetSec: 5, startedAt: 1, seq: 7 },` і новий кейс:

```ts
  it("читає колонку audio в meta", async () => {
    const { db, findFirst } = fakeDb();

    const loaded = await load(db);

    expect((findFirst.mock.calls[0] as unknown as [{ select: Record<string, unknown> }])[0].select.audio).toBe(true);
    expect(loaded?.meta.audio).toMatchObject({ seq: 7, offsetSec: 5 });
  });
```

`lib/utils/battle/store/__tests__/save-battle-map.test.ts` — новий кейс (Review Focus 1):

```ts
  it("збереження бою ніколи не пише колонку audio", async () => {
    const { db, tx } = fakeDb();

    await saveBattle(db, { ...before, meta: { ...before.meta, audio: { trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq: 1 } } }, { participants: [hero], pending: [], events: [event], scene: { turnIndex: 0 } });

    expect((tx.battleScene.updateMany.mock.calls[0] as unknown as [{ data: object }])[0].data).not.toHaveProperty("audio");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run app/api/__tests__/battle-audio-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts lib/utils/battle/pipeline/__tests__/battle-response.test.ts lib/utils/battle/store/__tests__`
Expected: FAIL — маршруту немає, `meta.audio` не читається, у сцені немає `audio`.

- [ ] **Step 3: Implement**

`lib/pusher/channels.ts` — додати:

```ts
/** Окремо від battle-delta: музика не підвищує версію бою. */
export const BATTLE_AUDIO_EVENT = "battle-audio";
```

`lib/utils/api/rate-limit.ts` — у `BATTLE_RATE_LIMITS`:

```ts
  /** Музика бою (ДМ): перемикання треків. */
  audio: { limit: 20, windowSeconds: 10 },
```

`lib/utils/battle/store/types.ts` — імпорт `BattleAudioState` з `@/types/audio`; у `BattleMeta` після `map` — `audio?: BattleAudioState | null;`.

`lib/utils/battle/store/load-battle.ts` — у `select` після `map: true,` — `audio: true,`; у `meta` після `map:` — `audio: (row.audio ?? null) as BattleAudioState | null,` (імпорт типу).

`types/api.ts` — у `BattleScene` після `map?:`:

```ts
  /** Стан музики бою; оновлюється окремо від версії (Pusher battle-audio) */
  audio?: BattleAudioState | null;
```

`lib/utils/battle/pipeline/battle-response.ts` — у `toBattleResponse` після `map: meta.map,` — `audio: meta.audio ?? null,`.

`app/api/campaigns/[id]/battles/[battleId]/audio/audio-handler.ts`:

```ts
import { after, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import { BATTLE_AUDIO_EVENT, battleChannelName } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import { battleAudioCommandSchema } from "@/lib/schemas/music";
import { requireCampaignAccess, requireDM } from "@/lib/utils/api/api-auth";
import { errorResponse } from "@/lib/utils/api/api-response";
import { handleApiError } from "@/lib/utils/api/error-handler";
import { parseBody } from "@/lib/utils/api/parse-body";
import { BATTLE_RATE_LIMITS, checkRateLimit, rateLimitResponse } from "@/lib/utils/api/rate-limit";
import { type AudioLibraryEntry, applyAudioCommand, commandNeedsLibrary } from "@/lib/utils/audio/audio-command";
import type { BattleAudioEvent, BattleAudioResponse, BattleAudioState, TrackKind } from "@/types/audio";

type BattleParams = { id: string; battleId: string };

const findAudio = (p: BattleParams) => prisma.battleScene.findFirst({ where: { id: p.battleId, campaignId: p.id }, select: { audio: true } });

async function loadLibrary(campaignId: string): Promise<AudioLibraryEntry[]> {
  const rows = await prisma.campaignTrack.findMany({
    where: { campaignId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, kind: true, url: true, youtubeId: true, durationSec: true },
  });

  return rows.map(({ id, ...t }) => ({ id, track: { ...t, kind: t.kind as TrackKind } }));
}

export async function readBattleAudio(params: BattleParams): Promise<NextResponse> {
  try {
    const access = await requireCampaignAccess(params.id);

    if (access instanceof NextResponse) return access;

    const battle = await findAudio(params);

    if (!battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const body: BattleAudioResponse = { audio: (battle.audio ?? null) as BattleAudioState | null };

    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, { action: "read battle audio" });
  }
}

export async function commandBattleAudio(req: Request, params: BattleParams): Promise<NextResponse> {
  try {
    const access = await requireDM(params.id);

    if (access instanceof NextResponse) return access;

    const rate = await checkRateLimit({ userId: access.userId, scope: "audio", battleId: params.battleId, ...BATTLE_RATE_LIMITS.audio });

    if (!rate.allowed) return rateLimitResponse(rate);

    const cmd = await parseBody(battleAudioCommandSchema, req);

    if (cmd instanceof NextResponse) return cmd;

    const battle = await findAudio(params);

    if (!battle) return errorResponse(API_ERRORS.NOT_FOUND, 404);

    const prev = (battle.audio ?? null) as BattleAudioState | null;

    const next = applyAudioCommand(prev, cmd, { now: Date.now(), library: commandNeedsLibrary(cmd) ? await loadLibrary(params.id) : [] });

    if ("error" in next) return errorResponse(next.error, 422);

    // без version і журналу; умова за seq відсікає паралельну команду з іншої вкладки ДМ
    const { count } = await prisma.battleScene.updateMany({
      where: { id: params.battleId, campaignId: params.id, audio: prev ? { path: ["seq"], equals: prev.seq } : { equals: Prisma.DbNull } },
      data: { audio: next as unknown as Prisma.InputJsonValue },
    });

    if (count === 0) return errorResponse(API_ERRORS.BATTLE_AUDIO_CONFLICT, 409);

    const event: BattleAudioEvent = { battleId: params.battleId, audio: next };

    after(() => safePusherTrigger(pusherServer, battleChannelName(params.battleId), BATTLE_AUDIO_EVENT, event, { action: "battle audio" }));

    return NextResponse.json({ audio: next } satisfies BattleAudioResponse);
  } catch (error) {
    return handleApiError(error, { action: "battle audio" });
  }
}
```

`.../audio/route.ts`:

```ts
import { commandBattleAudio, readBattleAudio } from "./audio-handler";

type Params = { params: Promise<{ id: string; battleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  return readBattleAudio(await params);
}

export async function POST(req: Request, { params }: Params) {
  return commandBattleAudio(req, await params);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run app/api/__tests__ lib/utils/battle/pipeline lib/utils/battle/store`
Expected: PASS (включно з наявними тестами бою — `meta.audio` опційне, фікстури не ламаються).

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add "app/api/campaigns/[id]/battles/[battleId]/audio" app/api/__tests__/battle-audio-api.test.ts app/api/__tests__/dm-only-routes-api.test.ts \
  lib/pusher/channels.ts lib/utils/api/rate-limit.ts lib/utils/battle/store/types.ts lib/utils/battle/store/load-battle.ts \
  lib/utils/battle/pipeline/battle-response.ts types/api.ts lib/utils/battle/pipeline/__tests__/battle-response.test.ts \
  lib/utils/battle/store/__tests__/load-battle-snapshots.test.ts lib/utils/battle/store/__tests__/save-battle-map.test.ts
git commit -m "feat(music): battle audio state route without version bump, battle-audio Pusher event, audio in the scene

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Стан музики на клієнті — годинник, кеш за `seq`, Pusher, налаштування гравця, керування ДМ

**Files:**
- Modify: `lib/api/client.ts` (`onResponse` в опціях запиту), `lib/api/__tests__/client.test.ts`
- Create: `lib/api/battle-audio.ts`
- Modify: `lib/hooks/battles/keys.ts` (`battleKeys.audio`)
- Create: `lib/hooks/common/storage-number.ts`; Modify: `lib/hooks/common/index.ts`
- Create: `lib/hooks/battle/useBattleAudioState.ts`, `lib/hooks/battle/useAudioPrefs.ts`, `lib/hooks/battle/useBattleAudioControl.ts`, `lib/hooks/battle/useBattleAudio.ts`; Modify: `lib/hooks/battle/index.ts`
- Modify: `lib/hooks/battle/usePusherBattleSync.ts`, `lib/hooks/battle/__tests__/usePusherBattleSync.test.tsx`
- Test: `lib/api/__tests__/battle-audio.test.ts`, `lib/hooks/battle/__tests__/useBattleAudioState.test.tsx`, `lib/hooks/common/__tests__/storage-number.test.ts`

**Interfaces:**
- Consumes: `clockOffsetFromDate`, `mergeAudio` (Task 5), маршрути Task 8, `BATTLE_AUDIO_EVENT`, `useTracks` (Task 7), `useBattleScene` (`campaignId`, `battleId`, `battle.audio`, `viewer.isDM`, `toast.show`).
- Produces:
  - `request`/`campaign*` приймають `onResponse?: (response: Response) => void`.
  - `getBattleAudio(c, b): Promise<BattleAudioSnapshot>`, `sendBattleAudio(c, b, cmd): Promise<BattleAudioSnapshot>`.
  - `battleKeys.audio(campaignId, battleId) = ["battle-audio", campaignId, battleId]`.
  - `createStorageNumber(key, defaultValue, clamp?)`, `useStorageNumber(store, serverValue)`.
  - `useBattleAudioState({ campaignId, battleId, seed, live }): BattleAudioSnapshot`.
  - `interface AudioPrefs { volume: number; muted: boolean; setVolume(v: number): void; toggleMute(): void }`; `useAudioPrefs(): AudioPrefs`.
  - `interface BattleAudioControl { send(cmd: BattleAudioCommand): void; pending: boolean }`; `useBattleAudioControl({ campaignId, battleId, enabled, onFailure }): BattleAudioControl | null`.
  - `interface BattleAudioValue { state; clockOffsetMs: number; sound: { unlocked: boolean; unlock(): void }; prefs: AudioPrefs; control: BattleAudioControl | null; library: { tracks: CampaignTrack[]; loading: boolean } | null }`; `BattleAudioContext`, `useBattleAudioValue()`, `useBattleAudio()`.
  - `usePusherBattleSync` привʼязує `battle-audio` → `battleKeys.audio`; `resync` інвалідовує `battleKeys.audio`.

- [ ] **Step 1: Write the failing tests**

`lib/api/__tests__/client.test.ts` — новий кейс:

```ts
describe("request onResponse", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("віддає сиру відповідь до розбору тіла (заголовок Date для годинника)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200, headers: { date: "Mon, 19 Oct 2026 10:00:00 GMT" } })));

    const onResponse = vi.fn();

    await campaignGet("c1", "/x", { onResponse });

    expect(onResponse.mock.calls[0][0].headers.get("date")).toBe("Mon, 19 Oct 2026 10:00:00 GMT");
  });
});
```

`lib/api/__tests__/battle-audio.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { getBattleAudio, sendBattleAudio } from "../battle-audio";

describe("battle-audio api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("GET: стан і зсув годинника із заголовка Date", async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 19, 9, 59, 57), toFake: ["Date"] });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ audio: null }), { status: 200, headers: { date: "Mon, 19 Oct 2026 10:00:00 GMT" } })));

    expect(await getBattleAudio("c1", "b1")).toEqual({ audio: null, clockOffsetMs: 3_500 });
  });

  it("POST шле команду на /battles/:id/audio", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ audio: null }), { status: 200 }));

    vi.stubGlobal("fetch", fetch);

    expect(await sendBattleAudio("c1", "b1", { action: "stop" })).toEqual({ audio: null, clockOffsetMs: null });
    expect(fetch).toHaveBeenCalledWith("/api/campaigns/c1/battles/b1/audio", expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "stop" }) }));
  });
});
```

`lib/hooks/common/__tests__/storage-number.test.ts`:

```ts
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { createStorageNumber } from "../storage-number";

afterEach(() => localStorage.clear());

describe("createStorageNumber", () => {
  it("читає, обрізає до 0..1 і пише в localStorage", () => {
    localStorage.setItem("vol", "2");

    const store = createStorageNumber("vol", 0.6, (v) => Math.min(1, Math.max(0, v)));

    expect(store.get()).toBe(1);

    store.set(0.25);
    expect(localStorage.getItem("vol")).toBe("0.25");
    expect(store.get()).toBe(0.25);
  });

  it("сміття в сховищі — значення за замовчуванням", () => {
    localStorage.setItem("vol2", "abc");

    expect(createStorageNumber("vol2", 0.6).get()).toBe(0.6);
  });
});
```

`lib/hooks/battle/__tests__/useBattleAudioState.test.tsx`:

```tsx
// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useBattleAudioState } from "../useBattleAudioState";

import { getBattleAudio } from "@/lib/api/battle-audio";
import type { BattleAudioState } from "@/types/audio";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn() }));

const state = (seq: number): BattleAudioState => ({ trackId: "t", track: null, playing: true, offsetSec: 0, startedAt: 0, seq });

function setup(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  return { client, wrapper };
}

describe("useBattleAudioState", () => {
  it("до розблокування — стан зі сцени, без запиту; сцена з новішим seq оновлює, зі старішим — ні", () => {
    const { wrapper } = setup();

    const { result, rerender } = renderHook(({ seed }) => useBattleAudioState({ campaignId: "c1", battleId: "b1", seed, live: false }), { wrapper, initialProps: { seed: state(2) as BattleAudioState | null } });

    expect(result.current).toEqual({ audio: state(2), clockOffsetMs: null });

    rerender({ seed: state(5) });
    expect(result.current.audio?.seq).toBe(5);

    rerender({ seed: state(3) });
    expect(result.current.audio?.seq).toBe(5);

    rerender({ seed: null });
    expect(result.current.audio?.seq).toBe(5);
    expect(getBattleAudio).not.toHaveBeenCalled();
  });

  it("розблокування — один GET: свіжий стан (за seq) і зсув годинника", async () => {
    vi.mocked(getBattleAudio).mockResolvedValue({ audio: state(7), clockOffsetMs: 1_200 });

    const { wrapper } = setup();

    const { result, rerender } = renderHook(({ live }) => useBattleAudioState({ campaignId: "c1", battleId: "b1", seed: state(2), live }), { wrapper, initialProps: { live: false } });

    rerender({ live: true });

    await waitFor(() => expect(result.current).toEqual({ audio: state(7), clockOffsetMs: 1_200 }));
    expect(getBattleAudio).toHaveBeenCalledTimes(1);
  });
});
```

`lib/hooks/battle/__tests__/usePusherBattleSync.test.tsx` — нові кейси в `describe("usePusherBattleSync — two players receive same battle state")` (використовують наявні `PlayerSync`, `simulateTrigger`, `changeState`, `channelBindings`, `makeBattlePayload`, `key`):

```tsx
  const audioKey = ["battle-audio", campaignId, battleId];

  const audioState = (seq: number) => ({ trackId: "t1", track: { title: "Бій", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 }, playing: true, offsetSec: 0, startedAt: 1_000, seq });

  it("battle-audio пише лише кеш музики: новіший seq — так, старіший — ні; сцену й версію не чіпає", async () => {
    const qc = new QueryClient();

    qc.setQueryData(key, makeBattlePayload({ version: 4 }));

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    render(<PlayerSync campaignId={campaignId} battleId={battleId} userId="u1" client={qc} />);

    await waitFor(() => expect(channelBindings.get(channelName)?.has("battle-audio")).toBe(true));

    act(() => simulateTrigger(channelName, "battle-audio", { battleId, audio: audioState(2) }));
    expect(qc.getQueryData(audioKey)).toEqual({ audio: audioState(2), clockOffsetMs: null });

    act(() => simulateTrigger(channelName, "battle-audio", { battleId, audio: audioState(1) }));
    expect((qc.getQueryData(audioKey) as { audio: { seq: number } }).audio.seq).toBe(2);

    act(() => simulateTrigger(channelName, "battle-audio", { battleId }));
    expect((qc.getQueryData(audioKey) as { audio: { seq: number } }).audio.seq).toBe(2);

    expect((qc.getQueryData(key) as BattleScene).version).toBe(4);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("перепідключення інвалідовує й кеш музики (пропущені battle-audio)", async () => {
    vi.mocked(getBattleVersion).mockResolvedValue({ version: 1 });

    const qc = new QueryClient();

    qc.setQueryData(key, makeBattlePayload({ version: 1 }));

    const invalidate = vi.spyOn(qc, "invalidateQueries");

    render(<PlayerSync campaignId={campaignId} battleId={battleId} userId="u1" client={qc} />);

    await subscribed();

    act(() => changeState("connected", "disconnected"));
    act(() => changeState("disconnected", "connected"));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: audioKey }));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: key });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/api/__tests__ lib/hooks/common/__tests__/storage-number.test.ts lib/hooks/battle/__tests__/useBattleAudioState.test.tsx lib/hooks/battle/__tests__/usePusherBattleSync.test.tsx`
Expected: FAIL — `onResponse` не викликається, модулів немає, `battle-audio` не привʼязано.

- [ ] **Step 3: Implement**

`lib/api/client.ts` — спільний тип опцій і виклик після `fetch`:

```ts
export type RequestOptions = RequestInit & {
  parseResponse?: "json" | "text" | "none";
  /** сира відповідь до розбору тіла — для заголовків (Date) */
  onResponse?: (response: Response) => void;
};
```

`request<T>(url, options: RequestOptions = {})`: `const { parseResponse = "json", onResponse, ...fetchOptions } = options;` і одразу після `const response = await fetch(...)` — `onResponse?.(response);`. `CampaignRequestOptions = Omit<RequestOptions, "body"> & { body?: unknown };`.

`lib/api/battle-audio.ts`:

```ts
import { campaignGet, campaignPost } from "./client";

import { clockOffsetFromDate } from "@/lib/utils/audio/clock";
import type { BattleAudioCommand, BattleAudioResponse, BattleAudioSnapshot } from "@/types/audio";

async function withClock(run: (onResponse: (r: Response) => void) => Promise<BattleAudioResponse>): Promise<BattleAudioSnapshot> {
  const sentAt = Date.now();

  let date: string | null = null;

  const { audio } = await run((r) => {
    date = r.headers.get("date");
  });

  return { audio, clockOffsetMs: clockOffsetFromDate(date, sentAt, Date.now()) };
}

export function getBattleAudio(campaignId: string, battleId: string): Promise<BattleAudioSnapshot> {
  return withClock((onResponse) => campaignGet<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, { cache: "no-store", onResponse }));
}

export function sendBattleAudio(campaignId: string, battleId: string, cmd: BattleAudioCommand): Promise<BattleAudioSnapshot> {
  return withClock((onResponse) => campaignPost<BattleAudioResponse>(campaignId, `/battles/${battleId}/audio`, cmd, { onResponse }));
}
```

`lib/hooks/battles/keys.ts` — у `battleKeys`:

```ts
  audio: (campaignId: string, battleId: string) => ["battle-audio", campaignId, battleId] as const,
```

`lib/hooks/common/storage-number.ts`:

```ts
"use client";

import { useSyncExternalStore } from "react";

export interface StorageNumber {
  get(): number;
  set(value: number): void;
  subscribe(onChange: () => void): () => void;
}

export function createStorageNumber(key: string, defaultValue: number, clamp: (v: number) => number = (v) => v): StorageNumber {
  const listeners = new Set<() => void>();

  let cached: number | undefined;

  const read = () => {
    try {
      const raw = window.localStorage.getItem(key);

      const n = raw === null ? NaN : Number(raw);

      return Number.isFinite(n) ? clamp(n) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  return {
    get: () => (cached ??= read()),
    set(value) {
      cached = clamp(value);

      try {
        window.localStorage.setItem(key, String(cached));
      } catch {
        // приватний режим: значення просто не збережеться
      }

      listeners.forEach((l) => l());
    },
    subscribe(onChange) {
      listeners.add(onChange);

      return () => listeners.delete(onChange);
    },
  };
}

export function useStorageNumber(store: StorageNumber, serverValue: number): number {
  return useSyncExternalStore(store.subscribe, store.get, () => serverValue);
}
```

`lib/hooks/common/index.ts` — `export { createStorageNumber, type StorageNumber, useStorageNumber } from "./storage-number";`.

`lib/hooks/battle/useBattleAudioState.ts`:

```ts
"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getBattleAudio } from "@/lib/api/battle-audio";
import { battleKeys } from "@/lib/hooks/battles/keys";
import { mergeAudio } from "@/lib/utils/audio/merge";
import type { BattleAudioSnapshot, BattleAudioState } from "@/types/audio";

/** live = звук розблоковано: лише тоді GET (свіжий стан і годинник); до того — стан зі сцени й Pusher. */
export function useBattleAudioState(args: { campaignId: string; battleId: string; seed: BattleAudioState | null | undefined; live: boolean }): BattleAudioSnapshot {
  const { campaignId, battleId, seed, live } = args;

  const queryClient = useQueryClient();

  const { data } = useQuery<BattleAudioSnapshot>({
    queryKey: battleKeys.audio(campaignId, battleId),
    queryFn: async () => {
      const fresh = await getBattleAudio(campaignId, battleId);

      const prev = queryClient.getQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId));

      return { audio: mergeAudio(prev?.audio ?? null, fresh.audio), clockOffsetMs: fresh.clockOffsetMs ?? prev?.clockOffsetMs ?? null };
    },
    enabled: live,
    initialData: { audio: seed ?? null, clockOffsetMs: null },
    initialDataUpdatedAt: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!seed) return;

    queryClient.setQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId), (prev) => {
      const audio = mergeAudio(prev?.audio ?? null, seed);

      return prev && audio === prev.audio ? prev : { audio, clockOffsetMs: prev?.clockOffsetMs ?? null };
    });
  }, [queryClient, campaignId, battleId, seed]);

  return data;
}
```

`lib/hooks/battle/useAudioPrefs.ts`:

```ts
"use client";

import { useMemo } from "react";

import { AUDIO_MUTED_KEY, AUDIO_VOLUME_KEY, DEFAULT_AUDIO_VOLUME } from "@/lib/constants/music";
import { createStorageFlag, createStorageNumber, useStorageFlag, useStorageNumber } from "@/lib/hooks/common";

export interface AudioPrefs {
  volume: number;
  muted: boolean;
  setVolume(v: number): void;
  toggleMute(): void;
}

const volumeStore = createStorageNumber(AUDIO_VOLUME_KEY, DEFAULT_AUDIO_VOLUME, (v) => Math.min(1, Math.max(0, v)));

const mutedFlag = createStorageFlag(AUDIO_MUTED_KEY, false);

export function useAudioPrefs(): AudioPrefs {
  const volume = useStorageNumber(volumeStore, DEFAULT_AUDIO_VOLUME);

  const muted = useStorageFlag(mutedFlag, false);

  return useMemo(() => ({ volume, muted, setVolume: volumeStore.set, toggleMute: () => mutedFlag.set(!mutedFlag.get()) }), [volume, muted]);
}
```

`lib/hooks/battle/useBattleAudioControl.ts`:

```ts
"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { sendBattleAudio } from "@/lib/api/battle-audio";
import { ApiError } from "@/lib/api/client";
import { battleKeys } from "@/lib/hooks/battles/keys";
import { mergeAudio } from "@/lib/utils/audio/merge";
import type { BattleAudioCommand, BattleAudioSnapshot } from "@/types/audio";

export interface BattleAudioControl {
  send(cmd: BattleAudioCommand): void;
  pending: boolean;
}

export function useBattleAudioControl(args: { campaignId: string; battleId: string; enabled: boolean; onFailure(message: string): void }): BattleAudioControl | null {
  const { campaignId, battleId, enabled, onFailure } = args;

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (cmd: BattleAudioCommand) => sendBattleAudio(campaignId, battleId, cmd),
    onSuccess: (fresh) =>
      queryClient.setQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId), (prev) => ({
        audio: mergeAudio(prev?.audio ?? null, fresh.audio),
        clockOffsetMs: fresh.clockOffsetMs ?? prev?.clockOffsetMs ?? null,
      })),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) void queryClient.invalidateQueries({ queryKey: battleKeys.audio(campaignId, battleId) });

      onFailure(error instanceof Error && error.message ? error.message : "Не вдалося керувати музикою");
    },
  });

  const control = useMemo(() => ({ send: (cmd: BattleAudioCommand) => mutate(cmd), pending: isPending }), [mutate, isPending]);

  return enabled ? control : null;
}
```

`lib/hooks/battle/useBattleAudio.ts`:

```ts
"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
import { type BattleAudioControl, useBattleAudioControl } from "./useBattleAudioControl";
import { useBattleAudioState } from "./useBattleAudioState";
import { useBattleScene } from "./useBattleScene";

import { useTracks } from "@/lib/hooks/tracks";
import type { BattleAudioState, CampaignTrack } from "@/types/audio";

export interface BattleAudioValue {
  state: BattleAudioState | null;
  clockOffsetMs: number;
  sound: { unlocked: boolean; unlock(): void };
  prefs: AudioPrefs;
  control: BattleAudioControl | null;
  library: { tracks: CampaignTrack[]; loading: boolean } | null;
}

export const BattleAudioContext = createContext<BattleAudioValue | null>(null);

const NO_TRACKS: CampaignTrack[] = [];

export function useBattleAudioValue(): BattleAudioValue {
  const { campaignId, battleId, battle, viewer: { isDM }, toast: { show } } = useBattleScene();

  // браузери пускають звук лише після жесту: один клік на кожне відкриття сторінки
  const [unlocked, setUnlocked] = useState(false);

  const { audio, clockOffsetMs } = useBattleAudioState({ campaignId, battleId, seed: battle.audio, live: unlocked });

  const prefs = useAudioPrefs();

  const control = useBattleAudioControl({ campaignId, battleId, enabled: isDM, onFailure: show });

  const { data: tracks = NO_TRACKS, isLoading } = useTracks(campaignId, { enabled: isDM });

  const unlock = useCallback(() => setUnlocked(true), []);

  return useMemo(
    () => ({
      state: audio,
      clockOffsetMs: clockOffsetMs ?? 0,
      sound: { unlocked, unlock },
      prefs,
      control,
      library: isDM ? { tracks, loading: isLoading } : null,
    }),
    [audio, clockOffsetMs, unlocked, unlock, prefs, control, isDM, tracks, isLoading],
  );
}

export function useBattleAudio(): BattleAudioValue {
  const value = useContext(BattleAudioContext);

  if (!value) throw new Error("useBattleAudio: немає BattleAudioContext");

  return value;
}
```

`lib/hooks/battle/index.ts` — додати:

```ts
export { type AudioPrefs, useAudioPrefs } from "./useAudioPrefs";
export { BattleAudioContext, type BattleAudioValue, useBattleAudio, useBattleAudioValue } from "./useBattleAudio";
export { type BattleAudioControl, useBattleAudioControl } from "./useBattleAudioControl";
export { useBattleAudioState } from "./useBattleAudioState";
```

`lib/hooks/battle/usePusherBattleSync.ts`:
- імпорти: `BATTLE_AUDIO_EVENT` з `@/lib/pusher/channels`, `battleKeys` з `@/lib/hooks/battles`, `mergeAudio`, типи `BattleAudioEvent`, `BattleAudioSnapshot`;
- першим рядком тіла IIFE в `resync` (до перевірки кешу сцени):

```ts
      // музика не має версії: пропущені battle-audio перечитуються окремо (лише якщо звук увімкнено)
      void queryClient.invalidateQueries({ queryKey: battleKeys.audio(campaignId, battleId) });
```

- поруч з `onDelta`:

```ts
      const onAudio = (data: unknown) => {
        const audio = (data as Partial<BattleAudioEvent> | null)?.audio;

        if (!audio || typeof audio.seq !== "number") return;

        queryClient.setQueryData<BattleAudioSnapshot>(battleKeys.audio(campaignId, battleId), (prev) => ({
          audio: mergeAudio(prev?.audio ?? null, audio),
          clockOffsetMs: prev?.clockOffsetMs ?? null,
        }));
      };
```

- `battleChannel.bind(BATTLE_AUDIO_EVENT, onAudio);` після `bind("battle-delta", …)` і `battleChannel.unbind(BATTLE_AUDIO_EVENT, onAudio);` у `cleanupRef.current`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/api lib/hooks/common lib/hooks/battle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add lib/api/client.ts lib/api/__tests__/client.test.ts lib/api/battle-audio.ts lib/api/__tests__/battle-audio.test.ts lib/hooks/battles/keys.ts \
  lib/hooks/common/storage-number.ts lib/hooks/common/index.ts lib/hooks/common/__tests__/storage-number.test.ts \
  lib/hooks/battle/useBattleAudioState.ts lib/hooks/battle/useAudioPrefs.ts lib/hooks/battle/useBattleAudioControl.ts lib/hooks/battle/useBattleAudio.ts \
  lib/hooks/battle/index.ts lib/hooks/battle/usePusherBattleSync.ts lib/hooks/battle/__tests__/usePusherBattleSync.test.tsx lib/hooks/battle/__tests__/useBattleAudioState.test.tsx
git commit -m "feat(music): client audio state keyed by seq, server clock offset, battle-audio Pusher binding, player prefs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Рушії відтворення — `<audio loop>` і YouTube IFrame Player

**Files:**
- Create: `lib/utils/audio/youtube-iframe-api.ts`
- Create: `lib/hooks/battle/useAudioElementSync.ts`, `lib/hooks/battle/useYoutubeSync.ts`; Modify: `lib/hooks/battle/index.ts`
- Test: `lib/hooks/battle/__tests__/useAudioElementSync.test.tsx`, `lib/hooks/battle/__tests__/useYoutubeSync.test.tsx`

**Interfaces:**
- Consumes: `audioPosition`, `planSync` (Task 5), `AUDIO_DRIFT_CHECK_MS`, `YOUTUBE_NOCOOKIE_HOST`, `YOUTUBE_IFRAME_API_SRC`, `YOUTUBE_PLAYER_PX` (Task 4).
- Produces:
  - `YtPlayer`, `YtNamespace`, `YT_STATE`, `loadYoutubeIframeApi(): Promise<YtNamespace>`.
  - `interface MediaSyncInput { src: string | null; state: BattleAudioState | null; clockOffsetMs: number; active: boolean; volume: number; muted: boolean }`; `SILENT_WAV`; `useAudioElementSync(input): { ref(el: HTMLAudioElement | null): void; prime(): void; failed: boolean }`.
  - `useYoutubeSync({ videoId, state, clockOffsetMs, volume, muted }): { ref(el: HTMLDivElement | null): void; needsTap: boolean; failed: boolean }`.

- [ ] **Step 1: Write the failing tests**

`lib/hooks/battle/__tests__/useAudioElementSync.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type MediaSyncInput, useAudioElementSync } from "../useAudioElementSync";

import type { BattleAudioState } from "@/types/audio";

let api: ReturnType<typeof useAudioElementSync>;

function Harness(input: MediaSyncInput) {
  api = useAudioElementSync(input);

  return <audio ref={api.ref} data-testid="audio" />;
}

const state = (over: Partial<BattleAudioState> = {}): BattleAudioState => ({ trackId: "t", track: { title: "Бій", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 }, playing: true, offsetSec: 0, startedAt: 0, seq: 1, ...over });

const base: MediaSyncInput = { src: "https://s/1.mp3", state: state(), clockOffsetMs: 0, active: true, volume: 0.5, muted: false };

function media(el: HTMLAudioElement, m: { currentTime?: number; paused?: boolean; duration?: number }) {
  let current = m.currentTime ?? 0;

  Object.defineProperty(el, "currentTime", { configurable: true, get: () => current, set: (v: number) => (current = v) });
  Object.defineProperty(el, "paused", { configurable: true, get: () => m.paused ?? true });
  Object.defineProperty(el, "duration", { configurable: true, get: () => m.duration ?? NaN });
  Object.defineProperty(el, "readyState", { configurable: true, get: () => 4 });
}

beforeEach(() => {
  vi.useFakeTimers({ now: 30_000, toFake: ["Date", "setInterval", "clearInterval"] });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAudioElementSync", () => {
  it("до розблокування — без src (egress) і без play", () => {
    const { getByTestId } = render(<Harness {...base} active={false} />);

    expect(getByTestId("audio").getAttribute("src")).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("prime у жесті ставить src і викликає play на тому самому елементі", () => {
    const { getByTestId } = render(<Harness {...base} active={false} />);

    act(() => api.prime());

    expect(getByTestId("audio").getAttribute("src")).toBe("https://s/1.mp3");
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  });

  it("активний: гучність і mute з налаштувань; перемотка лише при дрейфі > 1,5 с", () => {
    const { getByTestId, rerender } = render(<Harness {...base} />);

    const el = getByTestId("audio") as HTMLAudioElement;

    expect(el.volume).toBe(0.5);

    media(el, { currentTime: 29, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ seq: 2 })} />);
    expect(el.currentTime).toBe(29);

    media(el, { currentTime: 10, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ seq: 3 })} muted />);
    expect(el.currentTime).toBe(30);
    expect(el.muted).toBe(true);
  });

  it("пауза ДМ — pause; перевірка дрейфу кожні 10 с", () => {
    const { getByTestId, rerender } = render(<Harness {...base} />);

    const el = getByTestId("audio") as HTMLAudioElement;

    media(el, { currentTime: 30, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ playing: false, offsetSec: 30, seq: 2 })} />);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    media(el, { currentTime: 30, paused: false, duration: 100 });
    rerender(<Harness {...base} state={state({ seq: 3 })} />);
    act(() => vi.advanceTimersByTime(10_000));
    expect(el.currentTime).toBe(40);
  });
});
```

`lib/hooks/battle/__tests__/useYoutubeSync.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useYoutubeSync } from "../useYoutubeSync";

import type { BattleAudioState } from "@/types/audio";

const created = vi.hoisted(() => [] as Array<{ options: Record<string, unknown>; player: Record<string, ReturnType<typeof vi.fn>> }>);

vi.mock("@/lib/utils/audio/youtube-iframe-api", () => ({
  YT_STATE: { PLAYING: 1, PAUSED: 2 },
  loadYoutubeIframeApi: vi.fn(async () => ({
    Player: class {
      constructor(_el: HTMLElement, options: { events: { onReady(): void } } & Record<string, unknown>) {
        const player = {
          playVideo: vi.fn(),
          pauseVideo: vi.fn(),
          seekTo: vi.fn(),
          getCurrentTime: vi.fn(() => 5),
          getDuration: vi.fn(() => 200),
          getPlayerState: vi.fn(() => 2),
          setVolume: vi.fn(),
          mute: vi.fn(),
          unMute: vi.fn(),
          destroy: vi.fn(),
        };

        created.push({ options, player });
        Object.assign(this, player);
        queueMicrotask(() => options.events.onReady());
      }
    },
  })),
}));

const state: BattleAudioState = { trackId: "t", track: { title: "YT", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null }, playing: true, offsetSec: 0, startedAt: 0, seq: 1 };

function Harness({ videoId }: { videoId: string | null }) {
  const yt = useYoutubeSync({ videoId, state, clockOffsetMs: 0, volume: 0.4, muted: false });

  return <div ref={yt.ref} />;
}

beforeEach(() => {
  created.length = 0;
  vi.useFakeTimers({ now: 60_000, toFake: ["Date"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useYoutubeSync", () => {
  it("nocookie-хост, видимий 200×200, петля через playlist, гучність, позиція з годинника", async () => {
    render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created).toHaveLength(1));

    const { options, player } = created[0];

    expect(options).toMatchObject({
      host: "https://www.youtube-nocookie.com",
      videoId: "dQw4w9WgXcQ",
      width: 200,
      height: 200,
      playerVars: expect.objectContaining({ loop: 1, playlist: "dQw4w9WgXcQ", playsinline: 1 }),
    });

    await waitFor(() => expect(player.seekTo).toHaveBeenCalledWith(60, true));
    expect(player.setVolume).toHaveBeenCalledWith(40);
    expect(player.playVideo).toHaveBeenCalled();
  });

  it("зміна відео або розмонтування — destroy", async () => {
    const { rerender, unmount } = render(<Harness videoId="dQw4w9WgXcQ" />);

    await waitFor(() => expect(created).toHaveLength(1));

    rerender(<Harness videoId={null} />);
    expect(created[0].player.destroy).toHaveBeenCalled();

    act(() => unmount());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test:run lib/hooks/battle/__tests__/useAudioElementSync.test.tsx lib/hooks/battle/__tests__/useYoutubeSync.test.tsx`
Expected: FAIL — хуків немає.

- [ ] **Step 3: Implement**

`lib/utils/audio/youtube-iframe-api.ts`:

```ts
import { YOUTUBE_IFRAME_API_SRC } from "@/lib/constants/music";

export interface YtPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

export interface YtPlayerOptions {
  host: string;
  videoId: string;
  width: number;
  height: number;
  playerVars: Record<string, string | number>;
  events: { onReady?(): void; onStateChange?(e: { data: number }): void; onError?(e: { data: number }): void };
}

export interface YtNamespace {
  Player: new (el: HTMLElement, options: YtPlayerOptions) => YtPlayer;
}

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE = { PLAYING: 1, PAUSED: 2 } as const;

let loading: Promise<YtNamespace> | null = null;

/** Скрипт YouTube вантажимо лише коли гравець увімкнув звук на YouTube-треку. */
export function loadYoutubeIframeApi(): Promise<YtNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);

  loading ??= new Promise<YtNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previous?.();

      if (window.YT) resolve(window.YT);
    };

    const script = document.createElement("script");

    script.src = YOUTUBE_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("YouTube API не завантажився"));
    };
    document.head.appendChild(script);
  });

  return loading;
}
```

`lib/hooks/battle/useAudioElementSync.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AUDIO_DRIFT_CHECK_MS } from "@/lib/constants/music";
import { audioPosition, planSync } from "@/lib/utils/audio/position";
import type { BattleAudioState } from "@/types/audio";

export interface MediaSyncInput {
  src: string | null;
  state: BattleAudioState | null;
  clockOffsetMs: number;
  active: boolean;
  volume: number;
  muted: boolean;
}

/** Порожній WAV: play() у жесті розблоковує елемент на iOS, коли треку ще немає. */
export const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const durationOf = (el: HTMLAudioElement, state: BattleAudioState | null) => (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : (state?.track?.durationSec ?? null));

export function useAudioElementSync(input: MediaSyncInput): { ref: (el: HTMLAudioElement | null) => void; prime(): void; failed: boolean } {
  const [el, setEl] = useState<HTMLAudioElement | null>(null);

  const [failed, setFailed] = useState(false);

  const latest = useRef(input);

  useEffect(() => {
    latest.current = input;
  });

  const sync = useCallback(() => {
    if (!el) return;

    const { state, clockOffsetMs, active, src } = latest.current;

    const durationSec = durationOf(el, state);

    const target = state ? audioPosition(state, { now: Date.now(), clockOffsetMs, durationSec }) : 0;

    const plan = planSync({ shouldPlay: active && !!state?.playing && !!src && el.getAttribute("src") === src, paused: el.paused, current: el.currentTime, target, durationSec });

    if (plan.pause) el.pause();

    if (plan.seekTo !== null && el.readyState >= 1) el.currentTime = plan.seekTo;

    if (plan.play) void el.play().catch(() => undefined);
  }, [el]);

  const { active, src, state, clockOffsetMs, volume, muted } = input;

  useEffect(() => {
    if (!el) return;

    const want = active ? src : null;

    const current = el.getAttribute("src");

    if (want && current !== want) {
      el.src = want;
      el.load();
    } else if (!want && current && current !== SILENT_WAV) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }

    sync();
  }, [el, active, src, state, clockOffsetMs, sync]);

  useEffect(() => {
    if (!el) return;

    el.volume = volume;
    el.muted = muted;
  }, [el, volume, muted]);

  useEffect(() => {
    if (!el) return;

    const onLoaded = () => {
      setFailed(false);
      sync();
    };

    const onError = () => setFailed(true);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("error", onError);

    const timer = window.setInterval(sync, AUDIO_DRIFT_CHECK_MS);

    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("error", onError);
      window.clearInterval(timer);
    };
  }, [el, sync]);

  const prime = useCallback(() => {
    if (!el) return;

    const want = latest.current.src;

    if (want && el.getAttribute("src") !== want) el.src = want;
    else if (!el.getAttribute("src")) el.src = SILENT_WAV;

    void el.play().catch(() => undefined);
  }, [el]);

  return { ref: setEl, prime, failed };
}
```

`lib/hooks/battle/useYoutubeSync.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AUDIO_DRIFT_CHECK_MS, YOUTUBE_NOCOOKIE_HOST, YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { audioPosition, planSync } from "@/lib/utils/audio/position";
import { loadYoutubeIframeApi, YT_STATE, type YtPlayer } from "@/lib/utils/audio/youtube-iframe-api";
import type { BattleAudioState } from "@/types/audio";

const TAP_HINT_AFTER_MS = 3_000;

export function useYoutubeSync(input: { videoId: string | null; state: BattleAudioState | null; clockOffsetMs: number; volume: number; muted: boolean }): {
  ref: (el: HTMLDivElement | null) => void;
  needsTap: boolean;
  failed: boolean;
} {
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  const [player, setPlayer] = useState<YtPlayer | null>(null);

  const [needsTap, setNeedsTap] = useState(false);

  const [failed, setFailed] = useState(false);

  const latest = useRef(input);

  useEffect(() => {
    latest.current = input;
  });

  const { videoId } = input;

  useEffect(() => {
    if (!host || !videoId) return;

    let alive = true;

    let created: YtPlayer | null = null;

    const mount = document.createElement("div");

    host.appendChild(mount);

    void loadYoutubeIframeApi().then(
      (YT) => {
        if (!alive) return;

        created = new YT.Player(mount, {
          host: YOUTUBE_NOCOOKIE_HOST,
          videoId,
          width: YOUTUBE_PLAYER_PX,
          height: YOUTUBE_PLAYER_PX,
          playerVars: { autoplay: 0, controls: 1, loop: 1, playlist: videoId, playsinline: 1, rel: 0 },
          events: {
            onReady: () => alive && setPlayer(created),
            onStateChange: (e) => e.data === YT_STATE.PLAYING && setNeedsTap(false),
            onError: () => setFailed(true),
          },
        });
      },
      () => alive && setFailed(true),
    );

    return () => {
      alive = false;
      created?.destroy();
      setPlayer(null);
      setNeedsTap(false);
      setFailed(false);
      mount.remove();
    };
  }, [host, videoId]);

  const sync = useCallback(() => {
    if (!player) return;

    const { state, clockOffsetMs, volume, muted } = latest.current;

    player.setVolume(Math.round(volume * 100));

    if (muted) player.mute();
    else player.unMute();

    const durationSec = player.getDuration() || null;

    const target = state ? audioPosition(state, { now: Date.now(), clockOffsetMs, durationSec }) : 0;

    const paused = player.getPlayerState() !== YT_STATE.PLAYING;

    const plan = planSync({ shouldPlay: !!state?.playing, paused, current: player.getCurrentTime(), target, durationSec });

    if (plan.pause) player.pauseVideo();

    if (plan.seekTo !== null) player.seekTo(plan.seekTo, true);

    if (plan.play) {
      player.playVideo();
      // iOS може проігнорувати playVideo без дотику до самого плеєра
      window.setTimeout(() => setNeedsTap(player.getPlayerState() !== YT_STATE.PLAYING), TAP_HINT_AFTER_MS);
    }
  }, [player]);

  const { state, clockOffsetMs, volume, muted } = input;

  useEffect(() => {
    sync();
  }, [sync, state, clockOffsetMs, volume, muted]);

  useEffect(() => {
    if (!player) return;

    const timer = window.setInterval(sync, AUDIO_DRIFT_CHECK_MS);

    return () => window.clearInterval(timer);
  }, [player, sync]);

  return { ref: setHost, needsTap, failed };
}
```

`lib/hooks/battle/index.ts` — додати:

```ts
export { type MediaSyncInput, SILENT_WAV, useAudioElementSync } from "./useAudioElementSync";
export { useYoutubeSync } from "./useYoutubeSync";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run lib/hooks/battle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add lib/utils/audio/youtube-iframe-api.ts lib/hooks/battle/useAudioElementSync.ts lib/hooks/battle/useYoutubeSync.ts lib/hooks/battle/index.ts \
  lib/hooks/battle/__tests__/useAudioElementSync.test.tsx lib/hooks/battle/__tests__/useYoutubeSync.test.tsx
git commit -m "feat(music): looping audio element and YouTube IFrame drivers synced to the server clock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Плеєр у бою — гравець і ДМ, desktop і телефон

**Files:**
- Create: `components/battle/audio/BattleAudioProvider.tsx`, `components/battle/audio/BattleAudioDock.tsx`, `components/battle/audio/AudioPlayerPanel.tsx`, `components/battle/audio/DmAudioControls.tsx`, `components/battle/audio/YoutubeAudioDriver.tsx`
- Modify: `components/battle/scene/BattleScreen.tsx`, `components/battle/scene/MobileBattleLayout.tsx`
- Modify: `lib/hooks/battle/__tests__/fake-scene.tsx` (опція `audio`)
- Test: `components/battle/audio/__tests__/BattleAudioDock.test.tsx`

**Interfaces:**
- Consumes: `useBattleAudioValue`, `useBattleAudio`, `BattleAudioContext`, `BattleAudioValue`, `useAudioElementSync`, `useYoutubeSync` (Tasks 9–10), `YOUTUBE_PLAYER_PX`, `fakeScene`.
- Produces:
  - `BattleAudioProvider({ children })` — контекст музики для всієї сторінки бою.
  - `BattleAudioDock({ placement: "corner" | "strip" })` — `section[aria-label="Музика бою"]` або згорнута кнопка «Розгорнути плеєр»; `<audio loop preload="none">`.
  - `AudioPlayerPanel({ audio, view: { failed, onCollapse, onUnlock }, children })`, `DmAudioControls({ state, control, library })`, `YoutubeAudioDriver({ videoId })` (`[data-youtube-player]` 200×200).
  - `fakeScene({ audio })` кладе `battle.audio`.

- [ ] **Step 1: Write the failing test** — `components/battle/audio/__tests__/BattleAudioDock.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BattleAudioDock } from "../BattleAudioDock";
import { BattleAudioProvider } from "../BattleAudioProvider";

import { sendBattleAudio } from "@/lib/api/battle-audio";
import { getTracks } from "@/lib/api/tracks";
import { fakeScene } from "@/lib/hooks/battle/__tests__/fake-scene";
import type { BattleAudioState } from "@/types/audio";

vi.mock("@/lib/api/battle-audio", () => ({ getBattleAudio: vi.fn(() => new Promise(() => undefined)), sendBattleAudio: vi.fn(async () => ({ audio: null, clockOffsetMs: 0 })) }));
vi.mock("@/lib/api/tracks", () => ({ getTracks: vi.fn() }));
vi.mock("@/lib/utils/audio/youtube-iframe-api", () => ({ YT_STATE: { PLAYING: 1, PAUSED: 2 }, loadYoutubeIframeApi: vi.fn(() => new Promise(() => undefined)) }));

const fileTrack: BattleAudioState = { trackId: "t1", track: { title: "Бій у таверні", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100 }, playing: true, offsetSec: 0, startedAt: 0, seq: 1 };

const ytTrack: BattleAudioState = { ...fileTrack, trackId: "t2", track: { title: "Епік", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null } };

function dock(opts: { isDM?: boolean; audio?: BattleAudioState | null }) {
  const scene = fakeScene({ isDM: opts.isDM ?? false, audio: opts.audio ?? null });

  const Wrapper = scene.wrapper;

  return render(
    <Wrapper>
      <BattleAudioProvider>
        <BattleAudioDock placement="corner" />
      </BattleAudioProvider>
    </Wrapper>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  vi.mocked(getTracks).mockResolvedValue([
    { id: "t1", title: "Бій у таверні", kind: "file", url: "https://s/1.mp3", youtubeId: null, durationSec: 100, sortOrder: 0, createdAt: "" },
    { id: "t2", title: "Епік", kind: "youtube", url: null, youtubeId: "dQw4w9WgXcQ", durationSec: null, sortOrder: 1, createdAt: "" },
  ]);
});

afterEach(cleanup);

describe("BattleAudioDock — гравець", () => {
  it("без треку — нічого", () => {
    const { container } = dock({ audio: null });

    expect(container.querySelector("[data-battle-audio]")).toBeNull();
  });

  it("назва й «Увімкнути звук»; без керування треком", () => {
    const { getByText, getByRole, queryByRole } = dock({ audio: fileTrack });

    expect(getByText("Бій у таверні")).toBeTruthy();
    expect(getByRole("button", { name: "Увімкнути звук" })).toBeTruthy();
    expect(queryByRole("button", { name: "Пауза" })).toBeNull();
    expect(queryByRole("list", { name: "Бібліотека музики" })).toBeNull();
  });

  it("клік «Увімкнути звук» — play у жесті, далі гучність і вимкнення звуку (запамʼятовується)", () => {
    const { getByRole, queryByRole } = dock({ audio: fileTrack });

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(queryByRole("button", { name: "Увімкнути звук" })).toBeNull();

    fireEvent.change(getByRole("slider", { name: "Гучність" }), { target: { value: "0.3" } });
    expect(localStorage.getItem("battle-music-volume")).toBe("0.3");

    fireEvent.click(getByRole("button", { name: "Вимкнути звук у мене" }));
    expect(localStorage.getItem("battle-music-muted")).toBe("on");
  });

  it("YouTube: видимий плеєр 200×200 лише після увімкнення звуку; згортання прибирає iframe", () => {
    const { container, getByRole } = dock({ audio: ytTrack });

    expect(container.querySelector("[data-youtube-player]")).toBeNull();

    fireEvent.click(getByRole("button", { name: "Увімкнути звук" }));

    const player = container.querySelector<HTMLElement>("[data-youtube-player]");

    expect(player?.style.width).toBe("200px");
    expect(player?.style.height).toBe("200px");

    fireEvent.click(getByRole("button", { name: "Згорнути плеєр" }));
    expect(container.querySelector("[data-youtube-player]")).toBeNull();
    expect(getByRole("button", { name: /Розгорнути плеєр/ })).toBeTruthy();
  });
});

describe("BattleAudioDock — ДМ", () => {
  it("без треку бачить бібліотеку; клік по треку — play", async () => {
    const { findByRole } = dock({ isDM: true, audio: null });

    fireEvent.click(await findByRole("button", { name: /Епік/ }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "play", trackId: "t2" }));
  });

  it("грає — пауза, наступний, попередній, стоп (кнопки вимкнені, поки команда в дорозі)", async () => {
    const { getByRole } = dock({ isDM: true, audio: fileTrack });

    const steps: Array<[string, string]> = [["Пауза", "pause"], ["Наступний трек", "next"], ["Попередній трек", "prev"], ["Стоп", "stop"]];

    for (const [name, action] of steps) {
      await waitFor(() => expect((getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(false));
      fireEvent.click(getByRole("button", { name }));
      await waitFor(() => expect(sendBattleAudio).toHaveBeenLastCalledWith("c1", "b1", { action }));
    }
  });

  it("на паузі кнопка — «Грати» → resume", async () => {
    const { getByRole } = dock({ isDM: true, audio: { ...fileTrack, playing: false } });

    fireEvent.click(getByRole("button", { name: "Грати" }));

    await waitFor(() => expect(sendBattleAudio).toHaveBeenCalledWith("c1", "b1", { action: "resume" }));
  });
});
```

Примітка: `fakeScene` створює `QueryClient` з `queries.enabled: false` за замовчуванням; `useTracks` явно передає `enabled: isDM`, тож для ДМ запит іде через змоканий `getTracks`. `useBattleAudioControl` використовує `useMutation` з тим самим клієнтом.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run components/battle/audio`
Expected: FAIL — компонентів немає, `fakeScene` не знає `audio`.

- [ ] **Step 3: Implement**

`lib/hooks/battle/__tests__/fake-scene.tsx` — у `FakeSceneOptions` `audio?: BattleScene["audio"];`, в обʼєкт `battle` — `audio: opts.audio ?? null,`.

`components/battle/audio/BattleAudioProvider.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";

import { BattleAudioContext, useBattleAudioValue } from "@/lib/hooks/battle";

export function BattleAudioProvider({ children }: { children: ReactNode }) {
  const value = useBattleAudioValue();

  return <BattleAudioContext value={value}>{children}</BattleAudioContext>;
}
```

`components/battle/audio/YoutubeAudioDriver.tsx`:

```tsx
"use client";

import { YOUTUBE_PLAYER_PX } from "@/lib/constants/music";
import { useBattleAudio, useYoutubeSync } from "@/lib/hooks/battle";

/** Видимий плеєр не менше 200×200 — вимога YouTube; приховане аудіо заборонене. */
export function YoutubeAudioDriver({ videoId }: { videoId: string }) {
  const { state, clockOffsetMs, prefs } = useBattleAudio();

  const yt = useYoutubeSync({ videoId, state, clockOffsetMs, volume: prefs.volume, muted: prefs.muted });

  return (
    <div className="mt-2 flex flex-col items-center gap-1">
      <div data-youtube-player ref={yt.ref} className="overflow-hidden rounded bg-black" style={{ width: YOUTUBE_PLAYER_PX, height: YOUTUBE_PLAYER_PX }} />
      {yt.needsTap && <p className="text-hud-muted">Торкніться ▶ у плеєрі</p>}
      {yt.failed && <p role="alert" className="text-[var(--enemy)]">Відео недоступне для вбудовування</p>}
    </div>
  );
}
```

`components/battle/audio/DmAudioControls.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";

import type { BattleAudioValue } from "@/lib/hooks/battle";
import { useBattleScene } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex size-8 items-center justify-center rounded border border-hud-rule hover:bg-white/10 disabled:opacity-40">
      {children}
    </button>
  );
}

export function DmAudioControls({ state, control, library }: { state: BattleAudioValue["state"]; control: NonNullable<BattleAudioValue["control"]>; library: NonNullable<BattleAudioValue["library"]> }) {
  const { campaignId } = useBattleScene();

  const { send, pending } = control;

  const hasTrack = !!state?.trackId;

  const playing = !!state?.playing;

  const empty = library.tracks.length === 0;

  return (
    <div className="mt-2 border-t border-hud-rule pt-2">
      <div className="flex justify-center gap-1">
        <IconButton label="Попередній трек" onClick={() => send({ action: "prev" })} disabled={pending || empty}>
          <SkipBack className="size-4" />
        </IconButton>
        <IconButton
          label={playing ? "Пауза" : "Грати"}
          onClick={() => send(playing ? { action: "pause" } : hasTrack ? { action: "resume" } : { action: "next" })}
          disabled={pending || (!hasTrack && empty)}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </IconButton>
        <IconButton label="Наступний трек" onClick={() => send({ action: "next" })} disabled={pending || empty}>
          <SkipForward className="size-4" />
        </IconButton>
        <IconButton label="Стоп" onClick={() => send({ action: "stop" })} disabled={pending || !hasTrack}>
          <Square className="size-4" />
        </IconButton>
      </div>
      {empty && !library.loading ? (
        <p className="mt-2 text-hud-muted">
          Бібліотека порожня — <Link href={`/campaigns/${campaignId}/dm/music`} className="underline">додайте треки</Link>.
        </p>
      ) : (
        <ul aria-label="Бібліотека музики" className="mt-2 max-h-40 overflow-y-auto">
          {library.tracks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={t.id === state?.trackId || undefined}
                disabled={pending}
                onClick={() => send({ action: "play", trackId: t.id })}
                className={cn("w-full truncate rounded px-1.5 py-1 text-left hover:bg-white/10", t.id === state?.trackId && "text-hud-gold-bright")}
              >
                {t.kind === "youtube" ? "▶ " : "♪ "}
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`components/battle/audio/AudioPlayerPanel.tsx`:

```tsx
"use client";

import type { ReactNode } from "react";
import { ChevronDown, Music, Volume2, VolumeX } from "lucide-react";

import { DmAudioControls } from "./DmAudioControls";

import { Button } from "@/components/ui/button";
import type { BattleAudioValue } from "@/lib/hooks/battle";

export interface AudioPanelView {
  failed: boolean;
  onCollapse(): void;
  onUnlock(): void;
}

export function AudioPlayerPanel({ audio, view, children }: { audio: BattleAudioValue; view: AudioPanelView; children?: ReactNode }) {
  const { state, sound, prefs, control, library } = audio;

  const title = state?.track?.title ?? "Тиша";

  return (
    <section aria-label="Музика бою" className="w-64 rounded-lg border border-hud-rule bg-black/85 p-2 text-xs text-hud-bone shadow-lg">
      <header className="flex items-center gap-2">
        <Music className="size-4 shrink-0 text-hud-gold" />
        <span className="min-w-0 flex-1 truncate" title={title}>
          {title}
        </span>
        {state?.trackId && !state.playing && <span className="text-hud-muted">пауза</span>}
        <button type="button" aria-label="Згорнути плеєр" onClick={view.onCollapse} className="text-hud-muted hover:text-hud-bone">
          <ChevronDown className="size-4" />
        </button>
      </header>
      {sound.unlocked ? (
        <div className="mt-2 flex items-center gap-2">
          <button type="button" aria-label={prefs.muted ? "Увімкнути звук у мене" : "Вимкнути звук у мене"} aria-pressed={prefs.muted} onClick={prefs.toggleMute}>
            {prefs.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <input
            type="range"
            aria-label="Гучність"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(e) => prefs.setVolume(Number(e.target.value))}
            className="flex-1 accent-[var(--gold)]"
          />
        </div>
      ) : (
        <Button size="sm" className="mt-2 w-full" onClick={view.onUnlock}>
          Увімкнути звук
        </Button>
      )}
      {view.failed && (
        <p role="alert" className="mt-1 text-[var(--enemy)]">
          Трек недоступний
        </p>
      )}
      {children}
      {control && library && <DmAudioControls state={state} control={control} library={library} />}
    </section>
  );
}
```

`components/battle/audio/BattleAudioDock.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Music } from "lucide-react";

import { AudioPlayerPanel } from "./AudioPlayerPanel";
import { YoutubeAudioDriver } from "./YoutubeAudioDriver";

import { useAudioElementSync, useBattleAudio } from "@/lib/hooks/battle";
import { cn } from "@/lib/utils";

/** corner — fixed справа внизу (desktop, лобі); strip — рядок нульової висоти над смугою ходу телефона. */
export function BattleAudioDock({ placement }: { placement: "corner" | "strip" }) {
  const audio = useBattleAudio();

  const { state, sound, prefs, control, clockOffsetMs } = audio;

  const [expanded, setExpanded] = useState(true);

  const track = state?.track ?? null;

  const file = useAudioElementSync({ src: track?.kind === "file" ? track.url : null, state, clockOffsetMs, active: sound.unlocked, volume: prefs.volume, muted: prefs.muted });

  if (!track && !control) return null;

  const unlock = () => {
    file.prime();
    sound.unlock();
  };

  // iframe лише в розгорнутій панелі: прихований YouTube-звук заборонений правилами
  const youtubeId = sound.unlocked && expanded && track?.kind === "youtube" ? track.youtubeId : null;

  return (
    <div data-battle-audio={placement} className={cn(placement === "corner" ? "fixed bottom-4 right-4 z-40" : "pointer-events-none relative h-0 shrink-0")}>
      <div className={cn(placement === "strip" && "pointer-events-auto absolute bottom-2 right-2 z-30")}>
        <audio ref={file.ref} loop preload="none" hidden />
        {expanded ? (
          <AudioPlayerPanel audio={audio} view={{ failed: file.failed, onCollapse: () => setExpanded(false), onUnlock: unlock }}>
            {youtubeId && <YoutubeAudioDriver videoId={youtubeId} />}
          </AudioPlayerPanel>
        ) : (
          <button
            type="button"
            aria-label={`Розгорнути плеєр: ${track?.title ?? "Музика"}`}
            onClick={() => setExpanded(true)}
            className="flex max-w-48 items-center gap-1.5 rounded-full border border-hud-rule bg-black/85 px-3 py-1.5 text-xs text-hud-bone shadow-lg"
          >
            <Music className="size-4 shrink-0 text-hud-gold" />
            <span className="truncate">{track?.title ?? "Музика"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
```

`components/battle/scene/BattleScreen.tsx`:
- імпорти `BattleAudioDock`, `BattleAudioProvider` з `@/components/battle/audio/...`;
- гілка `PREPARED`: обгорнути вміст у `<BattleAudioProvider>` і додати `<BattleAudioDock placement="corner" />` після `BattlePreparationView`;
- основна гілка: обгорнути кореневий `div` у `<BattleAudioProvider>`; після `<BattleToast />` — `{Desktop && <BattleAudioDock placement="corner" />}`.

`components/battle/scene/MobileBattleLayout.tsx` — імпорт `BattleAudioDock`; одразу перед блоком нижньої смуги (`{(hero || mapTab) && (` …) вставити:

```tsx
      <BattleAudioDock placement="strip" />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test:run components/battle lib/hooks/battle`
Expected: PASS (нові тести плеєра й наявні тести сцени — `fakeScene` з `audio: null` не рендерить док гравцю).

- [ ] **Step 5: Commit**

```bash
pnpm exec tsc --noEmit && pnpm lint
git add components/battle/audio components/battle/scene/BattleScreen.tsx components/battle/scene/MobileBattleLayout.tsx lib/hooks/battle/__tests__/fake-scene.tsx
git commit -m "feat(music): battle music player — sound unlock, local volume/mute, DM track controls, phone placement

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Фінальна перевірка в браузері (виконує контролер)

**Files:** — (лише перевірка; знайдені дефекти — окремими задачами-фіксами з тестом)

**Interfaces:**
- Consumes: усе з Tasks 1–11; локальна Docker-БД з міграцією Task 4; `pnpm dev`; Pusher і Supabase Storage (хмара, як у dev); акаунт ДМ.
- Produces: звіт у відповіді контролера (що перевірено, що ні).

- [ ] **Step 1: Повний прогін**

Run: `pnpm exec tsc --noEmit && pnpm lint && pnpm test:run`
Expected: PASS без нових попереджень.

- [ ] **Step 2: Бойова перевірка на копії prod (без запису в prod)**

Run: `./scripts/db/prodcopy-db.sh && DATABASE_URL=postgresql://postgres:postgres@localhost:54322/prodcopy pnpm battle-sweep`
Expected: exit 0 — мутації бою не зламались (поле `weather` і колонка `audio` не заважають `saveBattle`/дельтам). Якщо `prodcopy` не має міграції Task 4, спершу `DATABASE_URL=… DIRECT_URL=… pnpm exec prisma migrate deploy` саме для `prodcopy`.

- [ ] **Step 3: Браузер — дві вкладки (ДМ і друга вкладка того самого ДМ як «спостерігач»)**

`pnpm dev`, бій з картою, дві вкладки на `/campaigns/<id>/battles/<battleId>`:
1. ДМ: «Погода» → «Гроза» — у другій вкладці за ≤ 1 с з'являються дощ і спалахи; «Ясно» — шар зникає в обох. Відкат (`rollback`) повертає погоду до стану перед дією — очікувано.
2. Бій без карти й вигляд «Колонки» — ні кнопки «Погода», ні шару.
3. Сторінка «Музика»: завантажити MP3 ~8 МБ (у Network — `PUT` прямо на `*.supabase.co/storage/v1/object/upload/sign/…`, а не на `/api`), додати YouTube-посилання без назви (назва з oEmbed), перейменувати, ↑/↓, видалити з підтвердженням; файл > 10 МБ і `.ogg` — помилка без запиту на `/tracks`.
4. Бій: в обох вкладках «Увімкнути звук»; ДМ вмикає MP3 — звучить в обох, розбіжність на слух ≤ ~1,5 с; пауза/продовжити/наступний/стоп — синхронно; заголовок `battle-audio` у Pusher-дебаг-консолі, а `GET /battles/:id?versionOnly=1` після зміни музики повертає ту саму версію.
5. Сховати вкладку > 15 с, змінити трек у другій, повернутись — плеєр підхоплює новий стан.
6. Гучність і «Вимкнути звук у мене» зберігаються після перезавантаження (а «Увімкнути звук» — знову потрібен).

- [ ] **Step 4: Телефон і YouTube**

У DevTools — пристрій 390×844 (iPhone 12/13), той самий бій:
1. Карта поворотна/прокручувана: дощ і сніг падають вниз екрана (не вздовж повернутої осі), HP під токенами читається; `prefers-reduced-motion: reduce` (Rendering → Emulate) — статичний відтінок.
2. Плеєр стоїть над смугою ходу, не перекриває кнопки ходу; згортається в кнопку з назвою.
3. YouTube-трек: після «Увімкнути звук» видно плеєр 200×200 з `youtube-nocookie.com` (Elements → iframe src), петля після кінця відео (короткий ролик), згортання прибирає iframe і звук.
4. Embed-заборонене відео — напис «Відео недоступне для вбудовування».

- [ ] **Step 5: Що не перевіряється в цьому середовищі — зазначити у звіті**

- Другий справжній акаунт гравця (інший userId): видимість лише гучності/mute без керування — покрито компонентними тестами, у браузері — лише якщо є тестовий гравець.
- Реальний iOS Safari (автоплей у жесті, YouTube `playVideo` без дотику, заблокований екран) — лише емуляція в DevTools.
- Prod-деплой і міграція на prod — поза планом (робиться злиттям у `main` за рішенням користувача).

---

## Self-review (виконано під час написання плану)

- **Покриття специфікації:** дані погоди й Zod (T1), маршрут `map-weather` з відмовою без карти й дельтою (T1), кнопка «Погода» з 6 ефектами + «Ясно» (T3), canvas у `[data-fx-clip]` поза поворотом, модулі ефектів, масштаб частинок і ліміт для телефонів, зупинка rAF, reduced-motion, спалах грози 6–15 с (T2); таблиця й колонка з RLS (T4); бакет, MP3/M4A ≤ 10 МБ, `cacheControl` 1 рік, ліміт 40, YouTube-посилання й oEmbed (T5–T6); сторінка `dm/music` з усіма діями (T7); маршрут `audio` з шістьма діями без `version`, Pusher `battle-audio`, `audio` у `GET /` (T8); окремий query key, годинник із `Date`, дрейф > 1,5 с (T5, T9, T10); `<audio loop>`, YouTube nocookie 200×200 `loop=1&playlist=<id>` + `seekTo`, «Увімкнути звук», гучність і mute у localStorage (T9–T11); плеєр справа внизу на desktop і над смугою на телефоні, згортання (T11); тести й браузер (усі задачі, T12).
- **Узгодженість типів:** `BattleAudioState`/`BattleAudioSnapshot`/`BattleAudioEvent`/`BattleAudioCommand` визначені в T4 і вживаються однаково в T5–T11; `battleKeys.audio` — T9; `TrackFormat` — T5, використовується в T6; `MapWeatherTool.choose` — T3 (хук, пікер і тест); `BATTLE_AUDIO_EVENT` — T8, вживається в T9.
- **Відхилення від тексту специфікації (свідомі, задокументовані вище):** стан аудіо несе ще й знімок `track`, а `trackId` може бути `null` після «Стоп»; сторінка `dm/music` змінює порядок кнопками ↑/↓.

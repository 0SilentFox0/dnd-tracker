### Task 4: Прибрати гекси

**Files:** усі, що згадують `GridShape` / `grid` (знайти: `grep -rln "GridShape" lib app components types`), зокрема `lib/constants/battle.ts`, `types/battle.ts`, `lib/schemas/battles.ts`, `lib/utils/battle/grid/{geometry,occupancy,layout,path,placement,attack-reach,map-view}.ts`, їхні тести, `components/battle/map/**`, `lib/hooks/battle/useBattleMapPlayground.ts`, `app/api/__tests__/battles/move-mutation.test.ts`, `lib/utils/battle/pipeline/__tests__/run-battle-mutation.test.ts`, `docs/superpowers/specs/2026-10-18-battle-map.md`.

- Видалити `GridShape` і поле `grid` з `BattleMapConfig`, `DEFAULT_BATTLE_MAP`, `battleMapSchema` (старі тіла з `grid` просто ігноруються Zod — схема не `strict`).
- Функції геометрії/відмальовки втрачають параметр `grid`: `neighbors(p)`, `cellDistance(a, b)`, `footprint(anchor, size)`, `footprintDistance(a, b)`, `cellsOf(p)`, `cellCenter(p)`, `cellPolygon(p)`, `tokenBox(p)`, `mapSize(map)`; гекс-гілки, `toCube`, `HEX_*` — видалити. Оновити всі виклики.
- Тести: видалити гекс-кейси; квадратні лишаються без змін за змістом.
- Пісочниця: прибрати перемикач «Квадрати/Гекси».
- Spec: розділ «Рішення» — лише квадратна сітка (Чебишев), прибрати згадки гексів.
- Перевірка: `pnpm test:run`, `pnpm exec tsc --noEmit`, `pnpm lint`; `grep -rn "hex\|Hex\|HEX\|GridShape" lib app components types` — порожньо (крім випадкових слів не про сітку).
- Commit: `refactor(battle-map): drop hex grid — square only`


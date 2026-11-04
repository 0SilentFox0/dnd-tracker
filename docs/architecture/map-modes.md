# Map modes

`lib/utils/battle/modes`: one mode per battle, `activeMapMode(map)` from `MAP_MODE_REGISTRY` (server/engine/client hooks, `NORMAL_MODE` neutral) + `MAP_MODE_UI` (`components/battle/modes`, UI slots) + mode hooks in `lib/hooks/battle/modes/<key>`. Core never imports a mode directly (ESLint).

**New mode** = a folder in the three places + a row in both registries (+ `satisfies Record<MapModeKey, …>` objects in `lib/hooks/battle/modes/tools.ts`).

Engine hooks include `lineBlocked({ config, map, line })` — a mode wall on a ranged line of fire (see [battle.md](battle.md)); optional, default `false`.

## Maze

The first mode: pure geometry/vision/generator, server wake-up in `afterMutation`, hiding client-side in `modes/maze/view.ts`; the server sends the full scene.

## Spell terrain (P4)

Difficult terrain, `obscured` cells, spell walls and `spellZones` are core: they live in `map.terrain` / `map.spellZones` and are read by `grid/*` and `spell/zone-*`. Map modes neither import nor change them; the maze never fires zone triggers.

## Map motion («Рух»)

`BattleMapConfig.motion?: { axis: "x" | "y"; speed } | null` — окреме поле конфігу карти за зразком `weather`, **не** запис у `MAP_MODE_REGISTRY` (реєстр — для режимів, що змінюють правила; рух суто візуальний і сумісний із лабіринтом). `speed` — клітинки/с зі знаком, `|speed| ≤ 6`, `0` = зупинено, відсутнє = вимкнено.

- Операція `map-motion` (`mutations/map-motion`, лише ДМ, активний бій); по мережі лише `axis` і `speed`, фаза **не** синхронізується — кожен клієнт крутить власну в `requestAnimationFrame` через `lib/utils/canvas/ticker`. Жодного полінгу.
- `MapBackground` при `map.motion` віддає рендер `components/battle/map/motion/MotionBackground`: доріжка з парної кількості тайлів (непарні віддзеркалені вздовж осі), період = 2 тайли; `backgroundCols` і `gridOffset` у цьому режимі ігноруються. Фон лишається статичним, доки не відома пропорція картинки; `prefers-reduced-motion` і прихована вкладка анімацію не запускають.
- Мобільний поворот карти (`rotated`): вісь і знак перераховує `motionInMapSpace`, тож напрям лишається екранним.
- Чиста математика (clamp, розгін, обгортання фази, кількість тайлів) — `lib/utils/battle/map-motion/`; панель ДМ — `MapMotionPanel`, хук `useMapMotionTool` (палітра взаємовиключна з режимом/місцевістю/погодою).

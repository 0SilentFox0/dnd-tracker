# WFRP 5e W6 — створення, просування, простій

Гілка `feat/wfrp5-w6-creation` (worktree `../dnd-tracker-w6`). Аудит: M15–M18, M39, B/M-02…M-07, B/M-09, B/C-01, B/C-02. Не чіпаємо: стани/рани/крити (W3), Disengage/друга атака (W4), магія/Sin (W7), контентну хвилю кар'єр (B/M-10, M-11).

## Рішення

- **Одиниця просування.** Зберігаємо очки (`advances`/`skillAdvances` у пунктах, `derive.ts` не змінюється). `edition.advanceStep` (5 у canon5e) = скільки пунктів дає покупка; ціна береться за номером покупки `floor(points/step)+1` (1-based) за брекетами `upTo` = номер покупки. Легасі (`step 1`) працює байт-у-байт як зараз.
- **Таблиці.** `xpTables: 'canon5e'` → у `rules.json` пакетів `grim-d100*` і `WFRP_RULES_PRESET` лежать канонічні брекети (char 125…11250, skill 50…8500, 15 покупок, `max` 75 пунктів), талант = плоска ціна `xpCost` без множення на `rank+1`, `feats.json` xpCost = 100.
- **Кар'єра.** Тіки 10/12/14 у шаблоні. Під canon5e: Advance Career списує 100 XP; зміна кар'єри 100 XP в межах класу / 200 в інший (`class` кар'єри), перевірка `careerTable` виду для не-ДМ. Тік за trapping наступного рівня — поза обсягом (нотатка у STATUS).
- **Створення (`creationMode: 'canon5e'`).** Без стартових XP. Характеристики: rolled → +6 очок у кар'єрні, rearranged → +3, free (4–16 кожна, сума 100) → 0. Fate +1 за прийняті перші результати (вид/кар'єра/характеристики… без перекиду), Fortune +1 за те саме правило p40. Види: `skillPicks` (5 навичок по +1 покупці), `languages`; кар'єра: 8 покупок кар'єрних навичок (≤3 на навичку), 1 талант кар'єри рівня 1, спорядження кар'єри рівня 1 (trappings).
- **Простій (canon5e).** Income: тест навички Average (+2 SL ≈ +20), прибуток кубиками за Status tier (d/ss/g), провал ×½. Ендеворів ≤3 за період. Одужання: щодня Endurance, Heal = IB + SL, простій відновлює всі Wounds. Легасі без змін.
- **Міграція.** Скрипт `scripts/wfrp/…` dry-run → `--apply` (лише на `prodcopy_w6`): перерахунок існуючих героїв кампаній під canon5e; `rulesHashes` baseline.

## Пакети (Sonnet, агенти тестів не запускають)

| | Обсяг | Файли |
|---|---|---|
| A | Просування: step, таблиці, талант, кар'єра 100/200, тіки | `rules/advancement/*`, `server/career-handler.ts`, pack `rules.json`/`feats.json`, `rules-preset.ts`, `ui/advancement/*` |
| C | Простій | `rules/downtime/*`, `ui/downtime/*`, server downtime handlers |
| B | Створення 5e | `rules/creation/*`, `race-profiles.json`, `server/draft/*`, `ui/creation/*` |
| D | Міграція, i18n, whatsNew, docs | `scripts/`, `messages/*`, `meta.ts`, docs |

A ∥ C → B → D → перевірки → Opus-рев'ю → sweep `prodcopy_w6`.

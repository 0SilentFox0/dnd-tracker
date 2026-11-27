# Промпти для штампів карти

Штамп — декоративний об'єкт редактора мап (стіл, дерево, колона…). Реєстр штампів генерується з `stamps.csv`; сам файл ассета лежить у репозиторії (`public/assets/map-stamps/<biome>/<id>.webp`), у хмару нічого не вантажимо.

## Вміст

| Файл | Що |
| --- | --- |
| `stamps.csv` | колонки `file,name,biome,category,layer,cols,rows,shadow,blocks,sight,prompt,priority`; 35 legacy-рядків (`tiles_*.png`) + 160 нових (`<id>.webp`, 4 біоми × 40) |
| `stamps.md` | згенеровано (`pnpm assets:stamps prompts`): аркуші 3×3 по ≤ 9 штампів із готовим промптом на аркуш |

**P1** — ядро (≈ 16 на біом, 2 аркуші), **P2** — решта. Нові рядки потрапляють у `lib/constants/map-art/stamps-data.ts` лише коли існує їхній файл у `public/`; до того фіча працює на 35 legacy.

## Процес

1. Візьміть промпт аркуша зі `stamps.md`, згенеруйте квадратний аркуш (рівний фон `#FF00FF`, 9 окремих об'єктів у порядку зліва направо, згори вниз). Один чат на біом, найкращий аркуш далі як style reference.
2. `pnpm assets:stamps slice sheet.png --biome dungeon --priority 1 --sheet 1` — сухий прогін (ключ магенти, нарізка, нормалізація, перевірка). Якщо компонент злились, скрипт скаже `merged` — перегенеруйте аркуш із більшими проміжками. Якщо порядок об'єктів інший — `--map 2,0,1,…` (компонент i → рядок mapping[i] аркуша).
3. Додайте `--write`, щоб зберегти `public/assets/map-stamps/<biome>/<id>.webp`. Перегляньте результат на шаховому фоні.
4. `pnpm assets:stamps validate` — усі файли; `pnpm assets:stamps build` — оновити `stamps-data.ts`; коміт.

## Вимоги до файлу (перевіряє `validate`)

- WebP з альфою, ≤ 200 КБ, сторони `cols·256 × rows·256` (±2 px);
- без пурпурової кайми (частка пікселів R>200, B>200, G<80 ≤ 0,2 %);
- рядок у CSV існує, дублікатів вмісту немає.

## Пілот

По одному аркушу на біом, на першому — пілотний штамп: `column-carved` (dungeon), `table-tavern-set` і `carpet-ornate` (building), `tree-willow` і `rock-mossy` (nature), `lantern-post` (settlement). Оцініть ключ і єдність стилю до масової генерації.

## Назви

Кожен новий рядок має `name.<id>` у `messages/{uk,en}/mapStamps.json`, нова категорія — `category.<cat>` там само (окремий неймспейс `mapStamps`, лише для маршруту редактора мап).

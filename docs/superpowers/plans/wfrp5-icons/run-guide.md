# Grim d100: запуск генерації іконок (740 нових) — команди для власника

Стан: 740 рядків без іконок (feats 178, careers 54, races 1, spells 222, artifacts 235, units 50), 186 старих не змінюються. Субʼєкти — `scripts/assets/icon-subjects/grim-*.json`. Файли в `~/Downloads/fantasy-tokens` агент НЕ змінював; усе нижче виконуєш ти.

## 0. Підготовка (один раз)

```bash
cd ~/Work/dnd-tracker                      # гілка feat/grim-icons-gen (або після merge — main)
pnpm assets:grim-icons prompts             # docs/assets/icon-prompts/grim-d100/*.csv (926 промптів)

cd ~/Downloads/fantasy-tokens
cp generate_grim.py generate_grim.py.bak
patch -p0 generate_grim.py < ~/Work/dnd-tracker/docs/superpowers/plans/wfrp5-icons/generate_grim-negatives.patch
python3 build_grim_manifest.py --repo ~/Work/dnd-tracker    # дефолтний --repo застарів (dnd-tracker-wfrp)
python3 generate_grim.py --validate-only                    # очікується: 186 already generated (kept), 740 new
```

Патч додає: негатив за kind (`ICON_NEGATIVE_BY_KIND`, узгоджено з `scripts/assets/grim-icons/negatives.ts`, тест звіряє рядки), спільні доповнення до `NEGATIVE` і прапорець `--legacy-negative` (варіант A = поточна поведінка з порожнім ICON_NEGATIVE). Перевірено на копії: застосовується чисто, `--validate-only` дає 186/740 і старі 186 id/промпти не змінились.

## 1. Пробна пачка: 3 кар'єри (A/B)

```bash
python3 - <<'PY'
import csv
rows = list(csv.DictReader(open('input/grim.csv', encoding='utf-8-sig')))
sel = [r for r in rows if r['generation_group'] == 'careers' and r['name'] in ('Gatekeeper', 'Channel Pilot', 'Hex Caster')]
w = csv.DictWriter(open('input/grim-trial.csv', 'w', encoding='utf-8-sig', newline=''), fieldnames=list(rows[0]), quoting=csv.QUOTE_ALL)
w.writeheader(); w.writerows(sel)
PY
python3 generate_grim.py --csv input/grim-trial.csv --output output-grim-trial-a --legacy-negative --limit 3   # A
python3 generate_grim.py --csv input/grim-trial.csv --output output-grim-trial-b --limit 3                     # B (негатив за kind)
```

Дивитись поруч A, B і наявні `output-grim/icons/careers/{archivist,ferry-keeper,lockbreaker}.png`.

Критерії прийняття (усі мають виконуватись, на кожну з 3):
1. 768×768; жодних літер/цифр/рун/вивісок (мініатюри + збільшення).
2. Постать по пояс/повний зріст, обличчя не крупним планом, один явний інструмент ремесла.
3. Читається на 64 px.
4. Колір класу очевидний: Gatekeeper — steel grey + blood red; Channel Pilot — teal; Hex Caster — charcoal + dull crimson; рівень деталізації як у наявних 16.
5. Немає зайвих осіб, дублювання предметів, рамки.

Рішення: 2 з 3 не пройшли → правити колір/субʼєкт у `grim-identity.json` (+ prompts → manifest) і/або негатив, перегенерація `--redo <Name>`. B кращий за A у ≥2 з 3 → лишаємо патч як є (інакше запускати всі пачки з `--legacy-negative`). Прийняті файли скопіювати у `output-grim/icons/careers/` (тоді вони зараховуються як готові):
`cp output-grim-trial-b/icons/careers/{gatekeeper,channel-pilot,hex-caster}.png output-grim/icons/careers/`

## 2. Пачки

Генератор не має фільтра за kind, тому спершу розріж CSV (порядок генерації = порядок таблиці):

```bash
python3 - <<'PY'
import csv
rows = list(csv.DictReader(open('input/grim.csv', encoding='utf-8-sig')))
def dump(name, kinds):
    sel = [r for r in rows if r['generation_group'] in kinds]
    w = csv.DictWriter(open(f'input/grim-{name}.csv', 'w', encoding='utf-8-sig', newline=''), fieldnames=list(rows[0]), quoting=csv.QUOTE_ALL)
    w.writeheader(); w.writerows(sel)
for n, k in [('careers-races', ('careers', 'races')), ('feats', ('feats',)), ('spells', ('spells',)), ('artifacts', ('artifacts',)), ('units', ('units',))]:
    dump(n, k)
PY
```

Генерація пачки (вихід у спільний `output-grim`; готове пропускається, тож повторний запуск продовжує):

```bash
python3 generate_grim.py --csv input/grim-<name>.csv --limit <N> --size 768 --steps 8 --delay 0.5
```

Після кожної пачки — технічна перевірка і контактний лист (з репо; `--batch` рахується серед рядків без іконки в `icons.json`, тому не зсувається, доки не зробиш upload):

```bash
cd ~/Work/dnd-tracker
pnpm assets:grim-icons check --dir ~/Downloads/fantasy-tokens/output-grim/icons --kind <kinds> --batch <n> --size <S>
pnpm assets:grim-icons sheet --dir ~/Downloads/fantasy-tokens/output-grim/icons --kind <kinds> --batch <n> --size <S>
# лист: ~/Downloads/fantasy-tokens/output-grim/sheets/<kinds>-<n>.png — його й кидай мені на перегляд
```

`check` перевіряє: усі файли пачки є; 768×768; юніти — круглі (кут прозорий, центр непрозорий), решта без прозорих кутів; пари з майже однаковим середнім хешем (дубль/неподібність варіантів; поріг `--min-distance`, за замовч. 6). Літери/руни, колір і палітру перевіряє лише огляд листа.

| № | kinds | `--limit` (генерація) | `--size`/`--batch` (check, sheet) | Що саме дивитись |
|---|---|---|---|---|
| 1 | careers+races (CSV `careers-races`, 52 після пробної) | 52 | `--size 55 --batch 1` | колір класу (8 класів), узгодженість із наявними 16, Thornkin окремо від людей |
| 2–5 | feats (178) | 50,50,50,28 | `--size 50 --batch 1..4` | метафора, не персонаж; колір виду для origin; специфікації (Keen Sense (…)) різні між собою |
| 6–10 | spells (222) | 50,50,50,50,22 | `--size 50 --batch 1..5` | ефект без людини, палітра за списком (Embers теплі, Gloam холодні, Fenlore зелені, Thornwitchery багряно-чорні, Hearth золото); «рунне коло» без письма |
| 11–15 | artifacts (235) | 50,50,50,50,35 | `--size 50 --batch 1..5` | один предмет без рук, різність схожих (мечі/сокири/шоломи — форма, не колір), книги без читабельного тексту, послуги (12) як предмет |
| 16 | units (50) | 50 | `--size 50 --batch 1` | кругла рамка, голова, великі істоти лише голова, 64 px |

Для нещільних кадрів: точково `python3 generate_grim.py --csv input/grim-<name>.csv --redo "<Name>" [--steps 20]` (для artifacts/feats), потім знову `check`.

Загальний контроль-список пачки (відмітити перед наступною):
- [ ] `check` без зауважень (файли є, 768×768, круглість юнітів, дублі)
- [ ] жодних літер/цифр/рун/вивісок (огляд листа + збільшення підозрілих)
- [ ] для careers: колір класу, обличчя не крупно, один інструмент
- [ ] для spells: палітра списку, немає людини
- [ ] для artifacts: різність схожих, немає рук/стола/рамки
- [ ] для units: круг, істота впізнавана на 64 px

## 3. Після всіх пачок

```bash
pnpm template icons grim-d100 --dir ~/Downloads/fantasy-tokens/output-grim/icons --dry-run
# реальний upload — тільки після твого «так»; потім оновити і закомітити data/templates/grim-d100/icons.json
pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/assets/grim-icons/inventory.ts --missing   # 0 missing, 0 orphans
pnpm test:run                                                                                   # один раз
```

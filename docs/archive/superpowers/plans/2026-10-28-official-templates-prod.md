# Офіційні шаблони на prod — план виконання

> **Для виконавців:** superpowers:subagent-driven-development (Sonnet-виконавці, без ревю по задачах, один фінальний Opus-ревю). Кроки з `- [ ]`.

**Мета:** створити на prod офіційні шаблони «5e SRD 5.2», «Heroes» (HOMM5) і «Порожня».

**Архітектура:** наявні скрипти `constructor:srd-template` і `constructor:official-templates` без змін; репетиція на prodcopy → бекап → запис у prod → перевірка. Єдина зміна коду — запис у `whats-new.ts`.

**Spec:** `docs/superpowers/specs/2026-10-28-official-templates-prod-design.md`

## Global Constraints

- Гілка `feat/official-templates-prod`; після кожного dispatch — `git branch --show-current`.
- Власник шаблонів: `876ac574-8d80-41c1-9afa-ff7b1aec377b` (`aspizhav@gmail.com`). HOMM5 на prod: `cmuylhk0c0001ia06lg5eommv`.
- **Усе, що пише в prod-БД чи Vercel env, спершу показується користувачеві як точна команда; виконується лише після явного «так».** Прод-читання може блокуватись класифікатором — тоді команда з `!` для користувача; обходити блок не можна.
- `pnpm assets:tokens-5e` на проді НЕ запускати.
- Комміти: українська/англійська як у репо, у кінці `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Мердж/пуш — лише після запиту користувачу.
- Мова спілкування — українська; коментарі в коді мінімальні.

## Review Focus

- Повторний запуск обох скриптів на prod створює дублікати (Heroes чи Порожня удруге) → перевірка кількості шаблонів після 2-го запуску (Task 2 і Task 5).
- Heroes втягує персонажів/бої/сховище HOMM5 → перевірка в репетиції, що клон шаблону має лише контент (Task 2).
- Кеш довідника ≤ 300 с: шаблони «не видно» одразу після запису — очікувано, не помилка (Task 5).

---

### Task 1: whats-new запис

**Files:** Modify `lib/onboarding/whats-new.ts` (новий запис першим у масиві). Тести: `lib/onboarding/__tests__/registry.test.ts` (наявні).

- [ ] **Step 1:** Додати першим елементом `WHATS_NEW`, за форматом сусідніх записів:
  `{ id: "2026-10-28-official-templates", date: "2026-10-28", audience: "dm", title: "Шаблони кампаній", body: "У майстрі нової кампанії можна почати з офіційного шаблону: 5e SRD 5.2 з правилами й контентом 5e, Heroes з фракціями, юнітами й заклинаннями або порожньої кампанії. Оновлення шаблонів підтягуються через «Оновлення з шаблону»." },`
  (перед тим глянути, чи сусідні записи мають додаткові поля — повторити їх).
- [ ] **Step 2:** `pnpm test:related lib/onboarding/whats-new.ts` і `pnpm lint lib/onboarding/whats-new.ts` — зелено.
- [ ] **Step 3:** Commit `feat(onboarding): whats-new for official templates`.

### Task 2: репетиція на prodcopy

**Потребує читання prod** (`prodcopy-db.sh` робить `pg_dump` з prod) — команду запускає користувач: `! cd /Users/silentfox/Work/dnd-tracker && docker compose up -d --wait db && ./scripts/db/prodcopy-db.sh`. Далі все локально.

- [ ] **Step 1:** Після «✅ prodcopy готова» перевірити, що в копії немає шаблонів і є HOMM5:
  `psql postgresql://postgres:postgres@localhost:54322/prodcopy -At -c "select kind, visibility, name from campaigns"` — очікується лише `campaign | private | …`, жодного `template`.
- [ ] **Step 2:** `DB=postgresql://postgres:postgres@localhost:54322/prodcopy; DATABASE_URL=$DB pnpm constructor:srd-template --owner 876ac574-8d80-41c1-9afa-ff7b1aec377b` — «(створено)», exit 0, 0 помилок рядків.
  (`.env.local` скрипти завантажують через `--env-file`, тож `DATABASE_URL` у середовищі НЕ перекриває його: якщо `assertSeedTarget` повідомляє інший хост — запускати як `pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/load-template.ts …` з `DATABASE_URL` у середовищі й без `--env-file`.)
- [ ] **Step 2b:** `DATABASE_URL=$DB pnpm constructor:official-templates cmuylhk0c0001ia06lg5eommv --owner 876ac574-8d80-41c1-9afa-ff7b1aec377b` (той самий нюанс з env).
- [ ] **Step 3: лічильники.** Для кожного шаблону:
  `select c.name, (select count(*) from units where "campaignId"=c.id) u, (select count(*) from spells where "campaignId"=c.id) s, (select count(*) from artifacts where "campaignId"=c.id) a, (select count(*) from characters where "campaignId"=c.id) ch, (select count(*) from battles where "campaignId"=c.id) b from campaigns c where kind='template' order by name`.
  Очікування: SRD 331/488/316; Heroes = числа HOMM5 у prodcopy (153/54/24 на 2026-10-28; звірити з `select … from campaigns where id='cmuylhk0c0001ia06lg5eommv'`), `ch=0`, `b=0`; Порожня 0/0/0. Розбіжність — зупинитися й доповісти.
- [ ] **Step 4: ідемпотентність.** Повторити Step 2 і 2b: у виводі «вже існує», кількість шаблонів `select count(*) from campaigns where kind='template'` лишається 3; лічильники з Step 3 незмінні.
- [ ] **Step 5: source-sync.** `DATABASE_URL=$DB pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/constructor/source-sync-check.ts <heroesTemplateId> 876ac574-8d80-41c1-9afa-ff7b1aec377b` (повна перевірка: клон → зміни → diff → apply → порожній diff; усе прибирає). Якщо скрипт вимагає іншої форми аргументів — прочитати його шапку.
- [ ] **Step 6:** Звіт користувачу: таблиця лічильників, висновок. Репетицію не комітимо (нічого не змінюється в репо).

### Task 3: бекап prod

- [ ] **Step 1:** Прочитати `scripts/db/backup-database.sh` повністю (куди пише, як бере URL) і показати користувачу точну команду (читання prod, запис лише локального файлу). Очікувана форма: `! cd /Users/silentfox/Work/dnd-tracker && set -a && . ./.env.production-db.local && set +a && BACKUP_DATABASE_URL="$DIRECT_URL" ./scripts/db/backup-database.sh`.
- [ ] **Step 2:** Користувач запускає; перевірити, що файл створено й розмір розумний (`ls -lh`), `head -c 200` не порожній. Записати шлях у звіт.

### Task 4: запис у prod — SRD

Гейт: Task 2 пройдено без розбіжностей і Task 3 виконано; показати користувачу команду й чекати «так».

- [ ] **Step 1:** Команда (з прод-env, `--allow-remote`):
  `! cd /Users/silentfox/Work/dnd-tracker && set -a && . ./.env.production-db.local && set +a && pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/srd/load-template.ts --owner 876ac574-8d80-41c1-9afa-ff7b1aec377b --allow-remote`
  (форма без `--env-file`, щоб `.env.local` не перекрив прод-URL; на prodcopy у Task 2 довести, що саме така форма працює.)
- [ ] **Step 2:** Користувач вставляє вивід: «(створено)», 0 помилок; інакше зупинка.

### Task 5: запис у prod — Heroes і Порожня + перевірка

Гейт: Task 4 успішно; команда й явне «так».

- [ ] **Step 1:** `! cd /Users/silentfox/Work/dnd-tracker && set -a && . ./.env.production-db.local && set +a && pnpm exec tsx --tsconfig tsconfig.scripts.json scripts/constructor/create-official-templates.ts cmuylhk0c0001ia06lg5eommv --owner 876ac574-8d80-41c1-9afa-ff7b1aec377b --allow-remote`
- [ ] **Step 2: перевірка (читання, команда з `!`)** — запит лічильників з Task 2 Step 3 на prod; очікування ті самі (Heroes = поточний склад HOMM5).
- [ ] **Step 3: ідемпотентність на prod** — повторити Step 1 (за «так»): «вже існує» ×2, `count(*) where kind='template'` = 3.
- [ ] **Step 4:** Через ≤ 300 с (кеш) — відкрити майстер «Нова кампанія» на prod і переконатись, що в `TemplatePicker` три офіційні шаблони (можна за допомогою користувача або `GET /api/templates` з сесією користувача).

### Task 6: PLATFORM_ADMIN_USER_IDS

- [ ] **Step 1:** Перевірити, чи змінна вже є: `vercel env ls production` (читання метаданих; назви без значень). Якщо немає — показати `vercel env add PLATFORM_ADMIN_USER_IDS production` зі значенням `876ac574-8d80-41c1-9afa-ff7b1aec377b` і чекати «так». Набуде чинності з наступним деплоєм — нагадати користувачу.

### Task 7: документація, simplify, фінал

**Files:** Modify `docs/architecture/content-api.md` (розділ «Офіційні шаблони на prod»: ids, порядок команд, ризик іконок Heroes на префіксі HOMM5, кеш 300 с), `docs/STATUS.md` (рядок tokens-5e: «імпорт на прод» → зроблено, + новий рядок етапу). Після merge — `git mv` спеки й плану в `docs/archive/superpowers/`.

- [ ] **Step 1:** Оновити документи; зафіксувати реальні id створених шаблонів (з виводу Task 4–5).
- [ ] **Step 2:** `/simplify` на diff гілки (1 агент; diff малий — можна пропустити, якщо лише whats-new + docs).
- [ ] **Step 3:** `pnpm test:run` (повний, один раз) і `pnpm lint` — зелено.
- [ ] **Step 4:** Один фінальний Opus-ревю гілки (subagent).
- [ ] **Step 5:** Commit; **мердж/пуш — спершу спитати користувача.**

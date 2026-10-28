# i18n: частина 3 — малі CRUD-домени

Гілка `feat/i18n-part3` (worktree `../dnd-tracker-i18n3`) від main `4b78f3c7`. Базові правила — `docs/architecture/i18n.md` («Межі коду», «Як перенести домен»), порядок частин — `docs/superpowers/specs/2026-10-28-i18n-core-design.md`.

## Мета і межі

**Входить:** races, skills + main-skills, classes, feats, backgrounds, artifacts + artifact-sets, music + audio, choices. Для кожного домену: `components/<домен>`, сторінки `app/campaigns/[id]/dm/<домен>/**` (+ `dm/print/skills`), хуки `lib/hooks/<домен>`, кастомні Zod-повідомлення в `lib/schemas/<домен>.ts`, `lib/utils/{audio,backgrounds}`, `lib/api/tracks.ts`, `lib/supabase/battle-music-storage.ts`, `lib/server/artifacts/sync-artifact-set-members.ts`, валідатори колонок класу (`lib/utils/characters/{classes,choices}/columns.ts`).

**Успіх:** з cookie `NEXT_LOCALE=en` DM-сторінки цих доменів, їхні форми й діалоги, плеєр музики та редактор/вибір «виборів» — англійською без сирих ключів; з `uk` — тексти слово в слово як зараз; храповик тримає всі каталоги скоупу.

**Не входить** (інші частини): `skill-tree/*` і хуки дерева (`useSkillTreeEditor`, `useSkillTreeTransfer`, `useProgressionActions`, `useLevelUpCelebration`, `useCharacterProgression`), `character-profile`, `characters`, `campaigns/info`, `abilities` (у т. ч. `lib/utils/abilities/class-columns.ts` — його `CLASS_REF_OUTSIDE` рендерить редактор здібностей), рушій персонажа `lib/utils/characters/**` (крім двох `columns.ts`), spells, units, battle, content-import (`lib/utils/content/import`, `lib/server/content/resources`, `compendium-import`). Імпортований контент і дані з БД не перекладаються. `types/races.ts` має кирилицю лише в коментарях — нічого не робимо.

## Namespace-и

Вісім нових: `races`, `skills` (піддерево `mainSkills.*`, `print.*`), `classes` (`progression.*`, `columns.*`), `feats`, `backgrounds`, `artifacts` (піддерево `sets.*`), `music` (`library.*` — DM-бібліотека, `player.*` — плеєр/док/плейлист), `choices`. Окремі файли за доменом — бо задачі йдуть паралельно й кожна править лише свій JSON; дрібні домени (feats, backgrounds) окремо, щоб ключі шукались за назвою домену.

**Завантаження:** усі вісім — у `app/campaigns/layout.tsx` поруч з `onboarding`. Сегментні layout-и не підходять: `audio` грає в бою і показі, `choices`/`races`/`skills` рендерить `character-profile`, `music` — `ScenarioShowDock`; усі споживачі під `app/campaigns`. Обсяг ≈ 650 рядків (~30 KB на мову без стиснення) у RSC-пейлоаді першого запиту сегмента; при soft-навігації layout не перерендерюється. Якщо після частини 4 сумарно стане > ~100 KB — розщепити на сегментні layout-и (відкрите питання, не зараз).

**Серверні компоненти** (`page.tsx`) — `getTranslator(await getRequestLocale(), "<ns>")`, як `app/help`: `getTranslations` бере request-config, що вантажить лише `common`+`validation`.

## Reuse

| Існує | Використання |
|---|---|
| `common.confirm.*`, `common.search.*`, `common.states.*`, `common.deleteAll.*`, `common.ui.hasErrors`, `common.color.*`, `common.renameGroup.*` | кнопки діалогів, пошук, стани, «Видалити всі» — не дублювати в доменних ns |
| `validation.youtubeUrlInvalid`, `validation.track*` | `AddYoutubeTrackDialog`, `EditTrackDialog` (вже через `translateIssue`) |
| `useTranslator`, `translateIssue`, `getTranslator`, `getRequestLocale` (`lib/i18n`) | динамічні ключі, Zod-issue на клієнті, серверні сторінки |
| `makeT`/глобальний мок, `renderWithIntl`, `parity.test.ts` | тести на ключі; по одному `en`-тесту на задачу; паритет автоматично |
| `pnpm i18n:extract <dir>` | чернетки JSON для кожного домену |
| `useLibraryList`/`useCrudMutation`/`useConfirm`/`useNotify` (`lib/hooks/common`) | приймають уже перекладені `texts` — хуки домену передають `t(...)` |
| `API_ERRORS` + `errors.json` + `apiErrorJson` | три нові серверні помилки (нижче), переклад на межі як є |

**Нове в `common`** (бо повторюється в ≥ 3 доменах): `common.actions.{save,saving,create,creating,edit,delete,cancel,add,remove,back}`, `common.form.{nameRequired,createFailed,updateFailed,saveFailed}` (тексти слово в слово: «Вкажіть назву», «Помилка створення», …), `common.dndSkills.<id>` (18 навичок 5e — їх показують choices/backgrounds/classes, а згодом аркуш і бій; прецедент — `common.creatureTypes`).

## Рішення

1. **Константи-підписи з споживачами поза скоупом не змінюються.** `FEAT_TYPE_LABELS`, `MAIN_SKILL_ROLE_LABELS`, `CLASS_CASTER_LABELS`, `ARTIFACT_RARITY_OPTIONS`/`artifactRarityLabel`, `ARTIFACT_SLOT_OPTIONS`/`artifactSlotLabel`, `ARTIFACT_GRID_9`, `DND_SKILL_META.label` читають імпорт контенту (`enumLabels` — розбір українських CSV, частина 5), `character-profile`, `campaigns/info`, `lib/cache/artifact-reference.ts`, бойовий рушій. Вони лишаються українськими і поза храповиком (`lib/constants/*` у `i18n-migrated.json` не йде). Компоненти скоупу перестають їх читати й рендерять ключі: `feats.types.<type>`, `skills.mainSkills.roles.<role>`, `classes.casters.<caster>`, `artifacts.rarity.<value>`, `artifacts.slots.<value>`, `common.dndSkills.<id>`. Видаляється лише `CHOICE_KIND_LABELS` (єдиний споживач — `ChoiceHeaderRow`) → `choices.kinds.<kind>`. Тест реєстру: для кожного значення `FEAT_TYPES`, `MAIN_SKILL_ROLES`, `CLASS_CASTERS`, `ArtifactRarity`, `ArtifactSlot`, `CHOICE_KINDS`, `DND_SKILLS` ключ є в `uk` і `en`. Частини 4–5 переводять своїх споживачів на ті самі ключі й тоді прибирають підписи.
2. **Модульні масиви з підписами в компонентах** (`SPELL_NUMBER_FIELDS`, поля зброї, `KIND_LABELS`, `DELETE_NOTE`) → `labelKey`/ключ, переклад у рендері. Значення, що стають даними (назва нового вибору «Новий вибір», «Колонка N», назва треку «Трек» з порожнього імені файлу), беруться з `t()` у момент створення — у БД потрапляє текст мови автора.
3. **Дані-маркери музики не перекладаються.** `BATTLE_TRACK_GROUP` («Битва»), regex `/^Битва/` і `OTHER_TRACK_GROUP` («Інше») — конвенція назв треків у БД (HoMM-бібліотека) і ідентифікатор групи у фільтрі: значення лишаються, рядок — з `// eslint-disable-next-line no-restricted-syntax -- track-title convention stored in DB`. Показ — через чистий `trackGroupLabelKey(name): "music.groups.other" | "music.groups.battle" | null` у `playlist-groups.ts`; `null` → показати назву як є. `TRACK_FORMATS_LABEL` склеюється через `" / "` замість `" або "` (параметр і в `uk`, і в `en` повідомленнях).
4. **Кастомні Zod-повідомлення** доменних схем → ключі в namespace домену (`races.validation.iconUrl`, `choices.validation.optionsRequired`, …; `uk` слово в слово). Схеми скоупу імпортує лише сервер (перевірено: `components/`, `lib/hooks/` їх не імпортують), тож переклад — на межі відповіді (`translateErrorBody` → `translateIssue`; `getTranslator` без ns вантажить усі `NAMESPACES`). Шаблонні повідомлення з `${…}` (`columns.ts`: «Немає колонки «{key}»…», «Пул «{label}»: рівень {level} — не число») → ключ + `params`; `lib/schemas/classes.ts` пересилає `params` у `ctx.addIssue({ code: "custom", path, message, params })` (Zod 4 зберігає `params` у custom-issue — перевірити тестом). Клієнтські форми скоупу власної Zod-валідації не мають; єдина клієнтська валідація (`EditTrackDialog`, `useMusicLibrary`) уже йде через `translateIssue`. Якщо імплементер знайде схему скоупу в клієнтському графі — показ через `translateIssue(useTranslator(), issue)`. Ключі `validation.*` не додаються (кореневий бандл).
5. **`.describe(...)`** у `lib/schemas/{races,skills,artifacts,artifact-sets,feats}.ts` — опис полів для JSON-схем MCP/AI-інструментів (`lib/server/content/json-schema.ts`), не UI. Переписати **англійською** (одна мова для LLM, MCP і так за замовчуванням `en`); без `eslint-disable`, без перекладу. Тестів на ці тексти немає.
6. **Серверні рядки, що доходять до користувача** → нові `API_ERRORS` (серверний ns `errors`): `BACKGROUND_ORIGIN_FEAT_INVALID`, `BACKGROUND_SPELL_UNKNOWN` (`backgroundReferenceError` повертає ключ — споживачі `lib/server/templates/*` уже кидають його в `BundleInvalidError`/`ContentError`), `ARTIFACT_SET_MEMBERS_INVALID` (`SyncArtifactSetError`), `TRACK_FILE_DELETE_FAILED` (`removeTrackFile` strict → `ContentError(…, 502)`). Повідомлення для розробника (`usePlayerAudio: немає AudioPlayerContext`, «YouTube API не завантажився») → англійською без перекладу. `lib/api/tracks.ts` (клієнтське завантаження в Storage) кидає `Error("music.library.uploadFailed")`, деталь Storage — у `console.warn`; показ — наявний `translateIssue` у `useMusicLibrary`.
7. **Плюралі** `pluralUk(n, [...])` у скоупі → ICU `{count, plural, one {...} few {...} many {...} other {...}}` (`en` — `one/other`). Дат немає; тривалості `mm:ss` мовно-нейтральні — `useFormatter` не потрібен.
8. **Межі з поза-скоупними файлами.** `ProgressionRowView` для `pick.kind === "subclass"` бере `classes.progression.subclass` замість `pick.label` (`progression.ts` з «Підклас» лишається — його читає аркуш, частина 4). `PlayerErrorBoundary` (клас) рендерить fallback через маленький функціональний компонент з `useTranslations`. `abilitySaveError`/`withAbilityErrors` (abilities) приймають уже перекладений рядок. `useUpdateSkillAppearance` (використовує `campaigns/info`) переходить на `skills` — ns завантажено для всього `app/campaigns`.
9. **Храповик.** Задача-каркас дописує всі globs скоупу одразу (кожна наступна задача перевіряє свої файли `pnpm exec eslint <свої шляхи>`; повний `pnpm lint` зелений лише після всіх задач). У globs замість `[id]` — `*` (`[id]` у minimatch — клас символів): `app/campaigns/*/dm/races/**` тощо. Хуки `lib/hooks/skills` — поштучно (дерево скілів поза скоупом).

## Тести

- Компонентні й хук-тести скоупу — на ключі мока (`"races.form.title"`); `pnpm test:related` на змінених файлах.
- По одному тесту `renderWithIntl({ locale: "en", namespaces: [...] })` на задачу: ключовий компонент домену без кирилиці й сирих ключів.
- Реєстр підписів (рішення 1); `trackGroupLabelKey`; `backgroundReferenceError` повертає `API_ERRORS.*`; custom-issue класу несе `params` і перекладається `translateErrorBody` з реальним `uk`-JSON (`vi.unmock` перекладача).
- Наявні `api-errors-coverage` і `parity` покривають нові `errors.*` і всі ns.

## Ризики

- **Сирий ключ у поза-скоупному споживачі** — компонент скоупу рендериться в `character-profile`/бою з провайдером без нового ns. Страховка: усі ns у `app/campaigns/layout.tsx`, а всі споживачі під `app/campaigns`.
- **Паралельні задачі в одному worktree:** `tsc` бачить чужі незавершені правки — кожна задача фільтрує вивід за своїми шляхами; повний `tsc` — у кінці.
- **Якість `en`** (~650 рядків) — пише модель; стиль ловить лише рев'ю.
- **Змішана мова** на сторінках, що показують константи з рішення 1 (картки інвентаря, довідник) — до частин 4–5, прийнято.

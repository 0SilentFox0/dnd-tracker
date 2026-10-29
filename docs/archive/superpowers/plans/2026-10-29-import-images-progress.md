# Import images: звіт живого прогону T12 (2026-10-29)

Середовище: worktree `dnd-tracker-images`, `next dev -p 3100`, локальна БД `obojima`, хмарний бакет `compendium-media`, файл Obojima (2295 KB). Кампанія: нова «ТЕСТ Імпорт картинок» з шаблону «5e SRD 5.2» (видалена наприкінці). Вхід: у браузері вже була сесія DM (silentfox), логін не знадобився.

## Підготовка (обхідні шляхи)
- Категорія «All» не проходить: `book[0].data[4]` дає 330 KiB > ліміт 64 KB (A record's notes are too large). Імпортовано Recommended + Adventure manifests/pages (книгу не брали).
- Навіть на SRD-кампанії лишаються блокери залежностей: Feats (Fog Cloud), Subclasses (потрібні класи druid/bard/ranger…), 2 юніти (Flora Spirit, Thorn Whip). Прогін: Subclasses зняті, Thorn Whip скопійовано в кампанію SQL-ом (id `tw_test_copy`). Тому в прогоні немає підкласів, а `MEDIA_NESTED` (11 на повному файлі) видно лише в першому preview.

## 1. Preview
- «Images: 497 will be saved after confirmation», «Skipped images 15»: `MEDIA_EXTRA` 4, `MEDIA_NESTED` 11 (розгортається списком причин). З підкласами/без блокерів — 497 у черзі. OK.

## 2. Confirm
- Фаза «Applying changes…» видна; «Verifying…» не побачено (ймовірно надто коротка). Далі «Saving images: 0 of 497 → 30 → 60 …» росте кроками по 30 приблизно кожні 3–4 с (~2.5 хв до кінця).
- Імпорт записів: 588 Created, 0 Errors.
- Підсумок: 495 збережено, 2 не вдалося (`File is larger than 1 MB` ×2, MEDIA_TOO_LARGE), 4 пропущено (MEDIA_EXTRA), 0 очікують.
- БД: units з `compendium-media` 70 з 77, spells 50/50 (`icon`), artifacts 369, сторінки сценарію: у «The Curious World Within» 16 вузлів image / 16 src, «Below the Shallows» 11 / 9 (2 без `src` = ті 2 failed), «Lost Within…» 1/1.

## 3. Перезавантаження посеред процесу
- Перезавантажив на ~90 із 497. Запуск лишився в «Saved reports» як «Report cvihxw…»; після відкриття: «Saving images is paused. The rest is waiting to continue.» + кнопка «Continue», лічильники 180 saved / 0 failed / 4 skipped / 317 waiting. «Continue» довів до кінця (495/2/4/0), прогрес 30 за ~3 с. Кнопка при pending>0 доречна, автопродовження після reload немає (це очікувано за специфікацією, але ДМ має сам дізнатися про паузу, див. UX).

## 4. Повторний імпорт того ж файла
- Preview: 7 Created, 50 Updated, 538 Unchanged. Не «всі unchanged»: 50 заклинань (`update`, частина з «manual actions: 1») і 7 SPELLSCHOOL (`create`). Причину не з'ясовано: можливо, не пов'язано з картинками (перевірити на main: чи spell/spellschool reimport теж не unchanged). Зображення в preview знову «497 will be saved» (known-URL не відсіяні на preview, тільки на виконанні).
- Виконання: фаза зображень пройшла швидко (кроки 150 за 2 с, без мережевих завантажень), підсумок 495 saved / 2 failed / 5 skipped / 0 waiting. Нових завантажень фактично немає (бакет не лічив, судячи з швидкості та відсутності fetch). 2 «too large» знову спробувались (відмова не запам'ятовується між запусками).

## 5. DOM (після імпорту)
- Юніт «Giant Bora Bug» (`/dm/units/<id>`): `<img>` через `/_next/image?url=…mpvcaxsukbwzgrbvzmjj.supabase.co/storage/v1/object/public/compendium-media/…`, naturalWidth 64, завантажено.
- Заклинання «Conjure Ocean» (`/dm/spells/<id>`): те саме, завантажено.
- Глава «Below the Shallows» (`/dm/scenario/<id>`): 9 `<figure>` з `<img>` через `/_next/image` (supabase.co), після eager-loading 9/9 натуральні. Предмети/артефакти окремо в DOM не перевірялись (369 рядків із `compendium-media` у БД).
- Плейсхолдер «Image not downloaded» (`scenario.image.missing`) на DM-перегляді глави не з'являється для 2 вузлів без `src`: `ScenarioPageView.tsx:96,98` не передає `showMissingMedia`, його передає лише `ScenarioCell.tsx:37`. Гравцю null — як задумано (гравцем не входив, перевірено за кодом `ScenarioRichText.tsx:53`).

## 6. Кастомна іконка
- У Giant Bora Bug замінено `avatar` на іншу URL (через SQL, не UI). Повторний імпорт: значення збережено (avatar не перетерто), у звіті skipped +1 (4 → 5 = MEDIA_TARGET_CUSTOMIZED). 69 юнітів з `compendium-media` (70 − 1).

## UX / знахідки
1. Failure-рядки без target: «File is larger than 1 MB 2» — без назв записів/URL/стадії, ДМ не знає, які саме картинки не збереглись.
2. Loading-стан: після кліку Import кілька секунд «Applying changes…» без прогресу; потім блок Images, але заголовок звіту залишається «Ready to import» (мало б «Imported»/«Saved»).
3. Після reload автопродовження немає: паузу видно лише у відкритому звіті («paused»), без числа очікуваних у кнопці; pending-лічильник є.
4. Підказка «Skipped: 8 technical categories (images/Foundry are not loaded)» на кроці категорій і «Technical categories (10): skipped, images/Foundry are not loaded» у звіті застаріла: тепер зображення вантажаться (`MEDIA_OR_FOUNDRY_SKIPPED`-текст у i18n).
5. Повторне `update` 50 заклинань і `create` 7 SPELLSCHOOL на reimport (див. п.4) — перевірити на main.
6. Назви сторінок сценарію містять сирі теги `{@color {@font {@style …}}}` (adapter title, ймовірно не з цієї гілки).
7. Консоль dev: `MISSING_MESSAGE gameTerms.stats/abilities/abbreviations` для `uk` (в UI видно ключ `gameTerms.abbreviations.srOnly`) — не пов'язано з гілкою, але видно на кожній сторінці.
8. Книга (`book[0].data[4]` 330 KiB) блокує категорію «All» через ліміт 64 KB — глава не імпортується разом з картинками.
9. Сховище: фактично завантажено в хмарний бакет `compendium-media` ≈495 файлів (URL вигляду `<sha[0..2]>/<sha>-512.webp` / `-1600.webp`, тобто є ресайз/webp). Залишено в бакеті (дедуп, видаляти не став).

Прибирання: кампанія «ТЕСТ Імпорт картинок» видалена; dev-сервер :3100 зупинено. Залишилась кампанія «T12 import-images test» з попереднього зупиненого прогону (не чіпав).

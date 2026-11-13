# Architecture notes per subsystem

Details that used to live in `CLAUDE.md`. Read the file of the subsystem you are changing; `CLAUDE.md` keeps only rules, layering and gotchas.

| File | Subsystem |
|---|---|
| [battle.md](battle.md) | Battle page → mutation pipeline, delta, client cache, turn advance, player view |
| [balance.md](balance.md) | Fair battles: enemy scaling, unit power, summons |
| [map-modes.md](map-modes.md) | Map mode registry, maze |
| [abilities.md](abilities.md) | Unified ability model (skills, races, artifacts, sets, units) |
| [show.md](show.md) | Slide show «Показ» and the host-agnostic music player |
| [content-api.md](content-api.md) | Content API: resource/operation registry, service with access checks, REST factory, tokens, OpenAPI, MCP content tools |
| [characters.md](characters.md) | Підсумок героя (stash, журнал), чернетки гравця, аватари, AI на ключі DM для гравців |
| [ai.md](ai.md) | AI assistant: BYOK keys, tool registry (chat + MCP), proposals, context |
| [world-map.md](world-map.md) | Карта світу: вкладені карти, туман у кожного гравця, подорожі, показ гравцям, прив'язки сценарію |
| [landing-auth.md](landing-auth.md) | Static landing (`/`), SEO, Google + email/password auth flows |
| [onboarding.md](onboarding.md) | First-steps checklists, hints, what's new, /help; progress derived from facts |
| [notifications.md](notifications.md) | Сповіщення «нове»: таблиця, `notify*`, канал `private-notify-*`, тости й піли, retention |
| [acquaintances.md](acquaintances.md) | Знайомства: NPC зі сценарію, видимість за «зіграно», журнал, нотатки, розкриття → сповіщення |
| [rule-systems.md](rule-systems.md) | Рульові системи: база/модуль/пресет (`systems/<id>/`), маніфест і порядок композиції, корені й генератор, слоти (у т. ч. стан учасника `{ key, data, ext }`), таблиця хуків (`RuleSystemDefinition`, `SystemUi`, `SystemServer`, `PackHooks`), ESLint-зона й ratchet, як додати модуль/базу; історія — `docs/archive/architecture/rule-systems-history-2026-11.md` |
| [participant-privacy-scope.md](participant-privacy-scope.md) | Оцінка серверної приватності учасників бою (шляхи, поля, рекомендація; без реалізації) |
| [platform.md](platform.md) | Auth session (`getClaims`), self-hosted fonts, Pusher, prefetched first HTML, egress, account color palettes, prodcopy battle-sweep |
| [i18n.md](i18n.md) | Мультимовність uk/en: next-intl, потік мови, лендинг `/` і `/en`, ESLint-храповик, перенесення доменів |

The folder-by-folder overview (in Ukrainian) is `ARCHITECTURE.md` in the repo root. When a subsystem changes, update its file here in the same branch.

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

The folder-by-folder overview (in Ukrainian) is `ARCHITECTURE.md` in the repo root. When a subsystem changes, update its file here in the same branch.

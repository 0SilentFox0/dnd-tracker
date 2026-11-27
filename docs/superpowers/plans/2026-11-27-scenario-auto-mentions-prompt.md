# Prompt: auto-mentions in the scenario editor

Feature for a fresh session (spec → plan → implementation).

## Goal

In the DM scenario editor, text that matches a library entity is turned into a mention automatically, without typing `@`.

## Owner decisions (2026-11-27)

- **When:** both — live while typing (a just-finished word/phrase that matches becomes a mention; Ctrl+Z restores plain text) **and** a toolbar button «Тегнути збіги» that scans the whole page/rows, including already written pages.
- **Matching:** exact name **plus** a short Ukrainian case ending (1–3 letters after the name: Зехір → Зехіра/Зехіру/Зехіром). Multi-word names match as a phrase. Case-insensitive on the first letter only.
- **Conflicts:** do not tag a name that matches more than one entity (e.g. «Привид» unit and NPC) or a name shorter than 3 letters; those stay manual via `@`.
- **Sources:** units, artifacts, characters (heroes), acquaintances/NPC (existing `MENTION_TYPES` minus spell/battle/marker unless trivial to include).
- Never re-tag text already inside a mention; never tag inside code/links.

## Where things are

- Editor: `components/scenario/editor/rich-text/{extensions.ts,mention-suggestion.ts,RichTextEditor.tsx}` (TipTap `@tiptap/extension-mention`, node attrs `{ type, id, label }`).
- Search: `lib/hooks/scenario/useMentionSearch.ts` → `lib/api/scenario` `searchMentions` (server route under `app/api/campaigns/[id]/scenario/...`).
- Types: `MentionOption`, `MENTION_TYPES` (`types/scenario.ts`, `lib/constants/scenario.ts`).
- Needs a campaign-wide name index (one request, cached with TanStack Query, key factory in `lib/hooks/scenario/keys.ts`) — watch egress: fetch once per editor session, not per keystroke.
- Matching logic = pure function in `lib/utils/scenario/` with tests (ending rule, ambiguity, min length, phrase matching).

## Done when

Unit tests for the matcher, component test for the live rule, button works on an existing page; live check in the browser on the HOMM5 campaign scenario.

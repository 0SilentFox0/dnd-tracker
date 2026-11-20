# Manifests of WFRP 5e content (Grim d100)

One file per category: `skills.md`, `talents.md`, `careers.md`, `races.md`, `spells.md` (spells, blessings, miracles), `equipment.md`, `bestiary.md`. These are the single data source for the content generator. Order of production: skills, talents, careers, races, spells, equipment, bestiary (leaves first; later files reference names from earlier ones).

## IP rules (hard)

- Never quote or closely paraphrase book text. Record only numbers, structure and mechanical meaning in your own words (structured fields, short mechanical notes).
- Column `original name` = an ORIGINAL English name proposed for the template (not the book name); `book name` is NOT stored in the repo. Instead store only `page` so the owner can look it up. Names must pass `scripts/templates/grim-d100/forbidden-terms.ts` (check the file) and must not be thinly-disguised book names.
- The owner reviews and approves the `original name` column; mark every proposal `proposed`.

## Row format

A markdown table per section with columns: `#`, `page`, structured mechanical fields (see per-category below), `original name`, `in template` (`yes:<slug>` if the entity already exists in `data/templates/grim-d100/` by mechanical equivalence, else `no`), `notes` (what the validator/schema cannot express, ambiguity, page-extract quality problems).

Per-category fields:
- skills: characteristic, grouped (y/n), basic (y/n).
- talents: max rank formula (as characteristic bonus or number), tests-for skill (if any), kind (`general`|`origin`), origin species, mechanical effect class (`passive-stat` | `situational` | `rule-hook`), stat touched.
- careers: class, 4 tier names count, per tier: status tier, 3+1+1+1 characteristics, skills (key[:spec]), talents (by talent `#`), trappings count, Income skill.
- races: all `PROFILE_KEYS` (see validate.ts), move, fate, fortune, extra wounds, talents, random talents count, career table ranges, skill picks.
- spells: kind (petty|arcane|hedge|witchcraft|blessing|miracle), list/lore, CN, range, target, duration, overcast type, damage/effect class, ingredient present.
- equipment: category (section), group/type, price (pence), encumbrance, availability, damage/reach/qualities/flaws for weapons, AP/locations for armour.
- bestiary: size, creature type, characteristics, wounds, move, traits (by mechanical id), spells, template-applies.

## Verification

Each agent verifies its own page numbers and numbers against `~/Work/wfrp-extract/out/wfrp5/sections/*.md` and `tables.json`; where the extract lost text (careers' advancement schemes), say so in `notes` and list the pages the owner must scan. Do not invent numbers.

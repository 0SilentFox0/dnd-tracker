#!/usr/bin/env python3
"""Generate Grim d100 icons (units, spells, artifacts, feats, careers, races) through the Draw Things txt2img API — only NEW ones.

Reuses generate.py (same API, seeds, metadata, validation) with the `feature` record type, its own
manifest (input/identity.csv) and its own output folder, so the already generated and uploaded
tokens/spells/artifacts are never read or touched.

A feature counts as done as soon as its final icon exists in the output folder: it is skipped even if
its description was edited later, and --limit counts only icons that still have to be generated.
Delete an icon file (or pass --redo NAME_OR_ID) to generate it again.

  python3 generate_grim.py --validate-only
  python3 generate_grim.py --limit 5
  python3 generate_grim.py
"""
import argparse
import sys
import time
from collections import Counter
from pathlib import Path

import generate

generate.TYPES = {'unit', 'spell', 'artefact', 'skill'}
generate.ICON_NEGATIVE = ''
generate.NEGATIVE += ', words, numbers, runes, captions, signs'
BASE_NEGATIVE = generate.NEGATIVE
SHARED_EXTRA_NEGATIVE = ', book, scroll text, banner, tavern sign, coin inscription, engraved lettering, stamped marks, shop sign, label, price tag, poster, handwriting, calligraphy, signature, artist name, watermark, copyright mark, caption, title, logo, text overlay, monogram'

_orig_build_prompt = generate.build_prompt
def _build_prompt(row, styles):
    if row.get('generation_group') == 'artifacts':
        return f"{styles[row['record_type']]}, {row['description']}"
    return _orig_build_prompt(row, styles)
generate.build_prompt = _build_prompt

# Per-kind negative (mirrors scripts/assets/grim-icons/negatives.ts); units keep generate.UNIT_NEGATIVE.
ICON_NEGATIVE_BY_KIND = {
    'careers': ', text, letters, close-up face, extreme close-up, portrait crop, crowd, text on clothing, heraldry, coat of arms',
    'races': ', text, letters, close-up face, extreme close-up, portrait crop',
    'feats': ', full human portrait, standing person, character, book, scroll text, banner, label',
    'spells': ', person, character, portrait, rune circle with writing, glyphs, sigil text',
    'artifacts': ', person, human figure, face, hands, fingers, holding, multiple items, hand holding, table setting, duplicate object, cropped item, wooden frame, book, scroll text, tavern sign, coin inscription, engraved lettering, stamped marks, shop sign, label, price tag, poster, handwriting, calligraphy',
    'units': '',
}

# Layout expected by `pnpm assets:grim-icons upload`: <output>/icons/<kind>/<file>.png (units too, circular token).


def _grim_output_paths(output_root, row):
    root = Path(output_root).resolve()
    kind_dir = Path(*Path(row['generation_folder']).parts[1:]) / row['output_filename']
    raw, final, stamp = root / 'raw' / kind_dir, root / 'icons' / kind_dir, (root / 'metadata' / kind_dir).with_suffix('.json')
    for target in (raw, final, stamp):
        if not target.resolve().is_relative_to(root):
            raise ValueError(f'Output escapes root: {target}')
    return raw, final, stamp


generate.output_paths = _grim_output_paths

ROOT = Path(__file__).resolve().parent


def pending(rows, output, redo):
    todo = []
    for row in rows:
        _, final, _ = generate.output_paths(output, row)
        if row['id'] in redo or row['name'] in redo:
            for target in generate.output_paths(output, row):
                target.unlink(missing_ok=True)
            todo.append(row)
        elif not final.exists():
            todo.append(row)
    return todo


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--csv', type=Path, default=ROOT / 'input' / 'grim.csv')
    parser.add_argument('--styles', type=Path, default=ROOT / 'input' / 'grim-styles.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'output-grim')
    parser.add_argument('--api-url', default=generate.API_URL)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--size', type=int, default=768)
    parser.add_argument('--steps', type=int, default=8)
    parser.add_argument('--delay', type=float, default=0.5)
    parser.add_argument('--redo', action='append', default=[], metavar='NAME_OR_ID')
    parser.add_argument('--validate-only', action='store_true')
    parser.add_argument('--legacy-negative', action='store_true', help='variant A: empty ICON_NEGATIVE for all kinds')
    args = parser.parse_args(argv)
    try:
        if args.size < 32 or args.size % 8 or args.steps < 1 or args.delay < 0 or (args.limit is not None and args.limit < 1):
            raise ValueError('Use size >=32 divisible by 8, steps >=1, delay >=0 and limit >=1')
        styles = generate.json.loads(args.styles.read_text(encoding='utf-8-sig'))
        rows = generate.load_rows(args.csv, styles)
        for row in rows:
            generate.output_paths(args.output, row)
        todo = pending(rows, args.output, set(args.redo)) if not args.validate_only else [
            r for r in rows if not generate.output_paths(args.output, r)[1].exists()]
        print(f'Validated {len(rows)} icons: {len(rows) - len(todo)} already generated (kept), {len(todo)} new')
        if args.validate_only:
            return 0
        generate.write_catalog(args.output, rows)
        if args.limit:
            todo = todo[:args.limit]
        results, session = Counter(), generate.HttpSession()
        for index, row in enumerate(todo, 1):
            legacy = args.legacy_negative
            generate.ICON_NEGATIVE = '' if legacy else ICON_NEGATIVE_BY_KIND[row['generation_group']]
            generate.NEGATIVE = BASE_NEGATIVE if legacy else BASE_NEGATIVE + SHARED_EXTRA_NEGATIVE
            status = generate.generate_one(session, row, styles, args.output, args.api_url, args.size, args.steps)
            results[status] += 1
            print(f"[{index}/{len(todo)}] {status}: {row['generation_group']} / {row['name']}", flush=True)
            if status == 'generated' and index < len(todo):
                time.sleep(args.delay)
        print(f'Finished: {dict(results)}')
        return 0
    except Exception as error:
        print(f'ERROR: {error}. Fix the problem and rerun to resume.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())

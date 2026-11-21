import csv, sys, hashlib, json
from pathlib import Path
import generate, generate_grim as g
csvf, salt, *names = sys.argv[1:]
generate.seed_for = lambda row: int(hashlib.sha256((row['id'] + salt).encode()).hexdigest()[:8], 16) % 2_000_000_000 + 1
styles = json.loads(Path('input/grim-styles.json').read_text(encoding='utf-8-sig'))
rows = [r for r in generate.load_rows(Path(csvf), styles) if r['name'] in names]
ORIG={r['id']:r['name'] for r in rows}
generate.NEGATIVE = g.BASE_NEGATIVE + g.SHARED_EXTRA_NEGATIVE
s = generate.HttpSession()
import os
ALIAS=json.loads(os.environ.get('ALIAS','{}'))
for r in rows:
    r['name']=ALIAS.get(r['name'],r['name'])
    for t in generate.output_paths('output-grim', r): t.unlink(missing_ok=True)
    generate.ICON_NEGATIVE = g.ICON_NEGATIVE_BY_KIND[r['generation_group']] if r['generation_group'] != 'units' else ''
    print(generate.generate_one(s, r, styles, 'output-grim', generate.API_URL, 768, 8), r['name'], flush=True)

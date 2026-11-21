#!/bin/bash
# usage: fix_text.sh <kind> ; trims flagged images (bottom 8%) then reports what still has text
cd "${FANTASY_TOKENS:-$HOME/Downloads/fantasy-tokens}"
k=$1
flag=$(tools/ocr output-grim/icons/$k/*.png | cut -d: -f1 | sed 's/\.png$//')
[ -z "$flag" ] && { echo "$k clean"; exit 0; }
[ "$k" = units ] || python3 trim.py $k $flag >/dev/null
echo "$k trimmed: $(echo $flag | wc -w)"
for n in $flag; do echo output-grim/icons/$k/$n.png; done | xargs tools/ocr | sed "s/^/STILL $k /"

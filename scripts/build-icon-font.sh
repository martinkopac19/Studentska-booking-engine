#!/usr/bin/env bash
#
# Rebuilds src/assets/material-symbols-booking.woff2.
#
# Beer CSS ships the whole Material Symbols Outlined face — 453 KB for the
# eleven icons the booking flow uses. This cuts it to about 3 KB.
#
# Run it after adding an icon to the booking pages, otherwise the new one has no
# glyph and renders as its own name in plain text.
#
# Needs fonttools, which is not a dependency of this project — the output is
# committed, so the script only runs when the icon list changes:
#
#   python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
#   PYTHON=/tmp/fontenv/bin/python ./scripts/build-icon-font.sh

set -euo pipefail
cd "$(dirname "$0")/.."

PYTHON="${PYTHON:-python3}"
SOURCE="node_modules/beercss/dist/cdn/material-symbols-outlined.woff2"
OUTPUT="src/assets/material-symbols-booking.woff2"

# Glyph names, which are not always the ligature you type: `smartphone` is an
# alias and its glyph is called `mobile`. To find the glyph behind a ligature,
# read the GSUB ligature whose components spell the name.
#
# The icons written into the pages:
PAGE_GLYPHS="arrow_back,arrow_forward,arrow_drop_down,bolt,handshake,sell,lock,menu_book,account_balance,check_circle,mobile"

# ...and the ones Beer CSS draws its own controls with, through CSS `content`.
# Leaving these out costs you the checkbox: it renders as the letter U.
#   grep -o 'content:"[a-z_]\{3,\}"' beer.scoped.min.css | sort -u
CONTROL_GLYPHS="check,check_box,check_box_outline_blank,indeterminate_check_box,radio_button_checked,radio_button_unchecked"

GLYPHS="$PAGE_GLYPHS,$CONTROL_GLYPHS"

# The letters are needed as glyphs of their own, or there is nothing for the
# ligature rules to match on. `--no-layout-closure` stops the closure from
# pulling in every other icon reachable from those same letters.
#
# `rlig`, not `liga`: Material Symbols files its icon ligatures under required
# ligatures. Asking for `liga` silently produces a font that loads, weighs
# almost nothing and renders every icon as its own name in text.
"$PYTHON" -m fontTools.subset "$SOURCE" \
  --output-file="$OUTPUT" \
  --flavor=woff2 \
  --glyphs="$GLYPHS" \
  --text="abcdefghijklmnopqrstuvwxyz_" \
  --layout-features=rlig,rclt,ccmp \
  --no-layout-closure

ls -l "$OUTPUT"

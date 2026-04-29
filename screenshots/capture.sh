#!/usr/bin/env bash
# Screenshot the cgtimer window at exactly 1920×1080.
# Usage: ./screenshots/capture.sh [output.png]
# Requires: hyprctl, jq, grim.
# Matches the window by title (default "CG Timer") or class — Electron's class
# is just "electron" so title is what disambiguates.
# Override with CGTIMER_TITLE=... or CGTIMER_CLASS=...
set -euo pipefail

OUT="${1:-screenshots/main.png}"
TITLE="${CGTIMER_TITLE:-CG Timer}"
CLASS="${CGTIMER_CLASS:-}"

window=$(hyprctl clients -j | jq -ec --arg title "$TITLE" --arg cls "$CLASS" '
  [ .[] | select(
      ((.title // "") | ascii_downcase | contains($title | ascii_downcase))
      or ($cls != "" and ((.class // "") | ascii_downcase | contains($cls | ascii_downcase)))
  ) ]
  | .[0] // empty
') || true

if [ -z "${window:-}" ] || [ "$window" = "null" ]; then
  echo "cgtimer window not found (title match: \"$TITLE\"). Is the app running?" >&2
  echo "Hint: focus it and run \`hyprctl activewindow\` to find its title/class, then" >&2
  echo "      re-run with CGTIMER_TITLE=<title> (or CGTIMER_CLASS=<class>) ./screenshots/capture.sh" >&2
  exit 1
fi

addr=$(jq -r .address <<<"$window")
floating=$(jq -r .floating <<<"$window")

hyprctl dispatch focuswindow "address:$addr" >/dev/null
[ "$floating" = "true" ] || hyprctl dispatch togglefloating active >/dev/null
hyprctl dispatch resizeactive exact 1920 1080 >/dev/null
hyprctl dispatch centerwindow >/dev/null

# Give the renderer a beat to redraw at the new size before capturing.
sleep 0.5

geom=$(hyprctl clients -j | jq -r --arg a "$addr" '
  .[] | select(.address == $a) | "\(.at[0]),\(.at[1]) \(.size[0])x\(.size[1])"
')

mkdir -p "$(dirname "$OUT")"
grim -g "$geom" "$OUT"
echo "Saved $OUT ($geom)"

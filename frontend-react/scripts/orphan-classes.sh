#!/usr/bin/env bash
# Lists class names still written as strings in the markup that no stylesheet defines.
#
#   npm run css:orphans
#
# During the vanilla-extract migration this is the cheapest guard there is. Removing a rule
# from styles/vanilla is safe only if nothing still names that class in a string, and a
# component that quietly loses its styling does not fail a single test: the unit suite asserts
# on text, and a screenshot only covers the branches it happens to render. This check found
# three such regressions in one run — a 404 page missing its top padding, an admin result
# count, and the home page's empty states.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

used=$(mktemp)
defined=$(mktemp)
trap 'rm -f "$used" "$defined"' EXIT

# Literal className="..." values only. Anything built from a template is out of scope here.
grep -rhoE 'className="[^"{]+"' src --include=*.tsx \
  | sed 's/className="//; s/"$//' | tr ' ' '\n' | sort -u | grep -v '^$' > "$used"

# Classes the legacy sheets still carry, plus the few that vanilla-extract declares by name.
grep -rhoE '\.[a-zA-Z][a-zA-Z0-9_-]*' src/styles/vanilla/*.css 2>/dev/null \
  | sed 's/^\.//' | sort -u > "$defined"
grep -rhoE 'globalStyle\("\.[a-zA-Z0-9_-]+' \
  src/styles/*.css.ts src/components/*.css.ts src/components/*/*.css.ts src/pages/*.css.ts 2>/dev/null \
  | sed 's/globalStyle("\.//' >> "$defined"
sort -u "$defined" -o "$defined"

orphans=$(comm -23 "$used" "$defined")
if [ -z "$orphans" ]; then
  echo "No orphaned class names."
  exit 0
fi

echo "Class names used in markup with no rule anywhere:"
echo "$orphans" | sed 's/^/  /'
exit 1

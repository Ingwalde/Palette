#!/usr/bin/env bash
# Lists class names still written as strings in the markup that no stylesheet defines.
#
#   npm run css:orphans
#
# This was the cheapest guard during the vanilla-extract migration and it stays useful after
# it. A component that quietly loses its styling does not fail a single test: the unit suite
# asserts on text, and a screenshot only covers the branches it happens to render. This check
# found four such regressions — a 404 page missing its top padding, an admin result count, the
# home page's empty states, and the form-actions row across seven files.
#
# It only means anything once the rules are actually gone, so run it after deleting, not
# before.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

used=$(mktemp)
defined=$(mktemp)
trap 'rm -f "$used" "$defined"' EXIT

# Literal className="..." values only. Anything built from a template is out of scope.
#
# `|| true` matters: with every class scoped there are no literals left, and a grep that
# matches nothing exits 1. Under `set -euo pipefail` that killed the script before it printed
# anything — a silent pass that looked exactly like a clean run, and it hid a real missed
# replacement until the check was pointed at it deliberately.
grep -rhoE 'className="[^"{]+"' src --include=*.tsx 2>/dev/null \
  | sed 's/className="//; s/"$//' | tr ' ' '\n' | sort -u | grep -v '^$' > "$used" || true

: > "$defined"

# Any plain stylesheet that still exists.
while IFS= read -r sheet; do
  grep -rhoE '\.[a-zA-Z][a-zA-Z0-9_-]*' "$sheet" | sed 's/^\.//' >> "$defined"
done < <(find src -name '*.css' -not -name '*.module.css' 2>/dev/null)

# Classes vanilla-extract still declares by name, in either quoting style:
# globalStyle(".x", …) and globalStyle(`${scoped} .x`, …). The backtick below is part of the
# pattern, not a command substitution.
# shellcheck disable=SC2016
grep -rhoE '"\.[a-zA-Z][a-zA-Z0-9_-]*|`[^`]*\.[a-zA-Z][a-zA-Z0-9_-]*' src --include=*.css.ts \
  | grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]*' | sed 's/^\.//' >> "$defined"

sort -u "$defined" -o "$defined"

orphans=$(comm -23 "$used" "$defined" || true)
if [ -z "$orphans" ]; then
  echo "No orphaned class names."
  exit 0
fi

echo "Class names used in markup with no rule anywhere:"
echo "$orphans" | awk '{ print "  " $0 }'
exit 1

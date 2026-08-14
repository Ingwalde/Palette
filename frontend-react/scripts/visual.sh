#!/usr/bin/env bash
# Run the screenshot baselines inside the pinned Playwright image.
#
#   ./scripts/visual.sh            # compare against the committed baselines
#   ./scripts/visual.sh --update   # re-record after an intended visual change
#
# Why a container: font hinting and antialiasing are host-specific, so a baseline recorded on
# Windows or macOS will never match CI. The image tag must stay in step with the @playwright/test
# version in package.json.
#
# node_modules is deliberately NOT the host's. Native binaries (rolldown, oxlint, the Playwright
# browsers) are platform-specific, and mounting a Windows or macOS install into Linux fails at
# import time. A named volume holds a Linux-side install instead, populated on first run.
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"
VOLUME="palette-visual-node-modules"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

script="test:visual"
if [ "${1:-}" = "--update" ]; then
  script="test:visual:update"
fi

# MSYS/Git Bash rewrites container-side paths that look like absolute POSIX paths.
export MSYS_NO_PATHCONV=1

# Reinstall whenever package-lock.json changes. Keying off the presence of node_modules alone
# silently runs the suite against stale dependencies, which surfaces as an unexplained
# webServer crash rather than anything that names the real cause.
docker run --rm --ipc=host \
  -v "${HERE}:/work" \
  -v "${VOLUME}:/work/node_modules" \
  -w /work \
  "$IMAGE" \
  sh -c '
    set -e
    want=$(md5sum package-lock.json | cut -d" " -f1)
    have=$(cat node_modules/.lock-hash 2>/dev/null || echo none)
    if [ "$want" != "$have" ]; then
      echo "Dependencies changed ($have -> $want); installing."
      npm ci --no-audit --no-fund
      echo "$want" > node_modules/.lock-hash
    fi
    npm run '"${script}"'
  '

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

docker run --rm --ipc=host \
  -v "${HERE}:/work" \
  -v "${VOLUME}:/work/node_modules" \
  -w /work \
  "$IMAGE" \
  sh -c "[ -x node_modules/.bin/playwright ] || npm ci --no-audit --no-fund; npm run ${script}"

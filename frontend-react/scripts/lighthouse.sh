#!/usr/bin/env bash
# Run Lighthouse CI against the built app, inside the same pinned image the screenshots use.
#
#   ./scripts/lighthouse.sh          # collect + assert against lighthouserc.json
#
# Why a container, twice over. Timings depend on the machine, so a number measured on Windows
# says nothing about whether CI will pass. And chrome-launcher cannot delete its own temp
# directory on Windows — the audit completes and then the process dies with EPERM, which looks
# like a failure and is not one.
#
# The image ships Chromium; Lighthouse finds it through CHROME_PATH.
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.62.1-noble"
VOLUME="palette-visual-node-modules"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export MSYS_NO_PATHCONV=1

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
    # Located by search, not by a hard-coded path: the directory carries a build number and the
    # platform suffix has changed between image versions (chrome-linux -> chrome-linux64).
    CHROME_PATH=$(find /ms-playwright -type f -name chrome -perm -u+x 2>/dev/null | head -1)
    [ -n "$CHROME_PATH" ] || { echo "No Chromium in the image" >&2; exit 1; }
    export CHROME_PATH
    npm run build
    # --no-sandbox because the image runs as root, and Chrome refuses to start its sandbox
    # there; --disable-dev-shm-usage because the default /dev/shm in a container is 64 MB and
    # Chrome crashes part-way through an audit when it fills. Both belong to running in a
    # container, not to the project, so they live here rather than in lighthouserc.json.
    npx lhci autorun --config=lighthouserc.json \
      --collect.settings.chromeFlags="--no-sandbox --disable-dev-shm-usage" "$@"
  ' sh "$@"

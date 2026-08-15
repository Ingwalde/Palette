# Screenshot & demo assets

The images the root `README.md` embeds. Three of the four are generated — do not replace them
by hand.

| File | What it shows | How it is made |
| --- | --- | --- |
| `home.png` | Home — hero, search, tag filters | `npm run screenshots` |
| `admin.png` | Admin — the HEX-row colour editor with tag chips | `npm run screenshots` |
| `export.png` | Export — a selected palette with its PNG preview | `npm run screenshots` |
| `demo.gif` | Live search filtering the palette grid | hand-recorded |

## Regenerating

From `frontend-react/`:

```bash
npm run screenshots        # or: bash scripts/screenshots.sh
```

It brings the whole Compose stack up, captures against the real backend and seeded database —
the palette names and the counts in these images are real — writes the three PNGs here, and
tears the stack down. Ports 5500 and 8000 must be free.

**Run it as part of a release**, once the version string in the hero and footer has changed.
The previous set was captured by hand and then went eight releases untouched: `home.png` was
still advertising v4.7.1 in the hero and describing that release's features, which is what
anyone opening the README saw.

## Why they look the way they do

2040x1500, from a 1360x1000 viewport at 1.5x. The width is not arbitrary: at 1020 CSS pixels
the layout hits a narrower breakpoint, the type scales up and the tag filters fall below the
fold, so the capture no longer shows what its caption claims.

Two of the three need more than a page load, and the spec says why in each case — the admin
capture scrolls the colour rows into frame, and the export capture switches the format to PNG,
because otherwise both show a page that does not match its caption.

`demo.gif` stays hand-recorded. It demonstrates typing, which is worth far more as a real
recording than as a scripted one, and the interaction it shows has not changed.

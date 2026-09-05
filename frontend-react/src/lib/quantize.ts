// Median-cut colour quantisation — the engine under the image→palette extractor.
//
// Median cut treats the pixels as points in the RGB cube. It starts with one box holding every
// pixel and repeatedly splits the box with the widest colour spread, cutting it at the median
// along its longest axis, until there are as many boxes as colours wanted. Each box's average is
// one palette colour. It is cheap, deterministic, and gives evenly spread swatches rather than the
// near-duplicates a naive "most frequent colours" count returns on a photo.

export type RGB = [number, number, number];

interface Spread {
  channel: 0 | 1 | 2;
  range: number;
}

// The channel a box is widest on, and by how much — the axis and priority for the next cut.
function widestChannel(box: RGB[]): Spread {
  const min: RGB = [255, 255, 255];
  const max: RGB = [0, 0, 0];
  for (const px of box) {
    for (let c = 0 as 0 | 1 | 2; c < 3; c++) {
      if (px[c] < min[c]) min[c] = px[c];
      if (px[c] > max[c]) max[c] = px[c];
    }
  }
  let channel: 0 | 1 | 2 = 0;
  let range = -1;
  for (let c = 0 as 0 | 1 | 2; c < 3; c++) {
    const r = max[c] - min[c];
    if (r > range) {
      range = r;
      channel = c;
    }
  }
  return { channel, range };
}

function average(box: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const px of box) {
    r += px[0];
    g += px[1];
    b += px[2];
  }
  const n = box.length;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

// Perceived brightness (Rec. 601 luma), used only to order the output so the palette reads light
// to dark rather than in the arbitrary order the boxes were produced.
function luma([r, g, b]: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function rgbToHex([r, g, b]: RGB): string {
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

/** Reduce a set of pixels to at most `count` representative colours via median cut. */
export function medianCut(pixels: RGB[], count: number): RGB[] {
  if (pixels.length === 0) return [];
  const target = Math.max(1, Math.min(count, pixels.length));

  // Copy the pixels so the caller's array is not sorted out from under it.
  let boxes: RGB[][] = [pixels.slice()];

  while (boxes.length < target) {
    // Split the box with the widest colour spread; a box of one pixel cannot be split.
    let pick = -1;
    let widest = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { range } = widestChannel(boxes[i]);
      if (range > widest) {
        widest = range;
        pick = i;
      }
    }
    if (pick === -1) break; // every remaining box is a single pixel

    const box = boxes[pick];
    const { channel } = widestChannel(box);
    box.sort((a, b) => a[channel] - b[channel]);
    const mid = box.length >> 1;
    boxes.splice(pick, 1, box.slice(0, mid), box.slice(mid));
  }

  return boxes.map(average).sort((a, b) => luma(a) - luma(b));
}

/** Median-cut a pixel set straight to sorted, de-duplicated hex strings. */
export function quantizeToHex(pixels: RGB[], count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rgb of medianCut(pixels, count)) {
    const hex = rgbToHex(rgb);
    if (!seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
    }
  }
  return out;
}

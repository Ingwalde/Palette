// Colour quantisation for the image→palette extractor.
//
// `quantizeToHex` runs the popularity pass (`dominantColors`): it returns the image's actually
// prominent colours, which is what "pull the palette out of this graphic" should mean. `medianCut`
// is the earlier approach, kept as a utility — it treats pixels as points in the RGB cube and
// repeatedly splits the widest box at its median, giving an evenly spread set of averages. That
// even spread is its weakness for a graphic: with few colours it lumps a vivid region in with
// unrelated pixels and averages the result to mud, which is why the extractor uses popularity.

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

// Squared RGB distance — cheap "are these two colours the same swatch" test (no sqrt needed).
function distanceSq(a: RGB, b: RGB): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

// Two candidate colours closer than this (Euclidean ~35/channel) are treated as the same swatch,
// so the output never lists two near-identical creams while a distinct accent is left out.
const MERGE_DISTANCE_SQ = 1200;

// Colour grid resolution for the popularity pass: 5 bits per channel (32 levels) buckets the
// anti-aliased fringe of a region onto its core colour while keeping genuinely different hues apart.
const BUCKET_BITS = 5;

/**
 * The `count` most prominent colours in a pixel set, most-dominant first among the kept swatches
 * but returned darkest-to-lightest for display.
 *
 * Popularity, not median cut: median cut splits at the population median, so every box ends up the
 * same size and its *average* blends a vivid region with whatever it was lumped against — a bright
 * orange block averaged with dark text and light edges comes back a muddy tan. Here each pixel
 * votes into a coarse colour bucket; a bucket's representative is the mean of *its own* pixels, so
 * a solid region keeps its true, saturated colour. The largest buckets win, skipping any that sit
 * on top of an already-chosen swatch.
 */
export function dominantColors(pixels: RGB[], count: number): RGB[] {
  if (pixels.length === 0) return [];
  const target = Math.max(1, count);
  const shift = 8 - BUCKET_BITS;

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  for (const [r, g, b] of pixels) {
    const key =
      ((r >> shift) << (BUCKET_BITS * 2)) | ((g >> shift) << BUCKET_BITS) | (b >> shift);
    let entry = buckets.get(key);
    if (!entry) {
      entry = { r: 0, g: 0, b: 0, n: 0 };
      buckets.set(key, entry);
    }
    entry.r += r;
    entry.g += g;
    entry.b += b;
    entry.n += 1;
  }

  const candidates = Array.from(buckets.values())
    .map((e) => ({
      color: [Math.round(e.r / e.n), Math.round(e.g / e.n), Math.round(e.b / e.n)] as RGB,
      weight: e.n,
    }))
    .sort((a, b) => b.weight - a.weight);

  // Take the most popular colours that aren't already represented by a near-identical swatch.
  const chosen: RGB[] = [];
  for (const { color } of candidates) {
    if (chosen.length >= target) break;
    if (chosen.every((c) => distanceSq(c, color) >= MERGE_DISTANCE_SQ))
      chosen.push(color);
  }
  // If the merge filter left us short of what was asked for (a low-contrast image), top up with the
  // next most popular buckets even though they are close, rather than returning too few swatches.
  if (chosen.length < target) {
    for (const { color } of candidates) {
      if (chosen.length >= target) break;
      if (!chosen.some((c) => distanceSq(c, color) === 0)) chosen.push(color);
    }
  }

  return chosen.sort((a, b) => luma(a) - luma(b));
}

/** Reduce a pixel set to sorted, de-duplicated hex strings of its most prominent colours. */
export function quantizeToHex(pixels: RGB[], count: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rgb of dominantColors(pixels, count)) {
    const hex = rgbToHex(rgb);
    if (!seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
    }
  }
  return out;
}

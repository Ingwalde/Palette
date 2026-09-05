// Decode an image to a palette in the browser: draw it (downsampled) to a canvas, read the
// pixels, and run them through median-cut quantisation. Kept separate from the pure `quantize`
// module because everything here touches the DOM (Image, canvas) and cannot run in a plain unit
// test — the quantiser is where the logic worth testing lives.

import { quantizeToHex, type RGB } from "./quantize";

// Longest edge the image is scaled to before sampling. A palette does not need full resolution,
// and a few hundred pixels a side keeps quantisation instant even on a large photo.
const SAMPLE_EDGE = 200;
// Skip near-transparent pixels: a PNG's transparent margin is not part of its colours.
const ALPHA_FLOOR = 125;

function drawToImageData(image: HTMLImageElement): ImageData {
  const scale = Math.min(1, SAMPLE_EDGE / Math.max(image.width, image.height));
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(image, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function toPixels(data: ImageData): RGB[] {
  const { data: buf } = data;
  const pixels: RGB[] = [];
  for (let i = 0; i < buf.length; i += 4) {
    if (buf[i + 3] < ALPHA_FLOOR) continue;
    pixels.push([buf[i], buf[i + 1], buf[i + 2]]);
  }
  return pixels;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // The object URL is same-origin, but set this so a future same-origin-with-CORS source still
    // yields a readable (untainted) canvas.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be decoded"));
    image.src = src;
  });
}

/** Decode a Blob (an upload, or the proxy's bytes) and extract up to `count` palette colours. */
export async function extractColorsFromBlob(
  blob: Blob,
  count: number,
): Promise<string[]> {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadImage(objectUrl);
    const pixels = toPixels(drawToImageData(image));
    if (pixels.length === 0) throw new Error("That image has no visible colours");
    return quantizeToHex(pixels, count);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

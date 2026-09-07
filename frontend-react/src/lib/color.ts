// Colour helpers: clipboard, contrast and format conversion.

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

function normalizeHex(hex: string): string {
  return hex.trim().replace("#", "").toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHex(hex);
  if (!/^[0-9A-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid HEX color: ${hex}`);
  }
  const value = Number.parseInt(normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

// RGB / HSL string forms, shown under each colour on the palette page. Step 1.7 adds OKLCH and a
// format dispatcher on top of these; the rounding here is what it standardises on (RGB integers,
// HSL whole degrees and percentages).
export function toRgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

export function toHslString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rn) h = (gn - bn) / delta + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
  }
  return `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

function srgbToLinear(channel: number): number {
  const n = channel / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

// OKLCH, written by hand (sRGB → linear → OKLab → polar) rather than adding a colour library.
// Coefficients are Björn Ottosson's OKLab matrices. Rounding: L and C to three decimals, H to
// one — the CSS oklch() form, e.g. oklch(0.628 0.226 29.2).
export function toOklchString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const okL = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const okA = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const chroma = Math.sqrt(okA * okA + okB * okB);
  let hue = (Math.atan2(okB, okA) * 180) / Math.PI;
  if (hue < 0) hue += 360;

  return `oklch(${okL.toFixed(3)} ${chroma.toFixed(3)} ${hue.toFixed(1)})`;
}

export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";

// One colour in whichever format is selected. HEX is normalised to #RRGGBB uppercase.
export function formatColor(hex: string, format: ColorFormat): string {
  switch (format) {
    case "rgb":
      return toRgbString(hex);
    case "hsl":
      return toHslString(hex);
    case "oklch":
      return toOklchString(hex);
    default:
      return `#${normalizeHex(hex)}`;
  }
}

// Black or white text that meets WCAG AA (>= 4.5:1) on `hex` as a background. The threshold is
// the luminance where black and white give equal contrast (~0.179), not 0.5: at 0.5 a mid-tone
// swatch gets white text at ~3:1 and fails. Pure #000/#fff (not the near-black/white tokens) keep
// the guaranteed minimum above 4.5, which is what lets the palette page's swatch labels pass axe.
export function readableTextOn(hex: string): "#000000" | "#ffffff" {
  return getRelativeLuminance(hex) > 0.179 ? "#000000" : "#ffffff";
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const n = channel / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(first: string, second: string): number {
  const a = getRelativeLuminance(first);
  const b = getRelativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(1));
}

// WCAG level for normal-size text: AAA at 7:1, AA at 4.5:1, otherwise a dash. The label a
// palette needs when it shows the contrast of one colour pair against another.
export type ContrastLevel = "AAA" | "AA" | "—";

export function getContrastLevel(ratio: number): ContrastLevel {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "—";
}

export interface ContrastCell {
  ratio: number;
  level: ContrastLevel;
}

// The N×N contrast table for a palette page: every ordered pair's ratio and level. The diagonal
// (a colour against itself) is null — a 1:1 cell is noise, and the caller renders it blank.
export function getContrastMatrix(colors: string[]): (ContrastCell | null)[][] {
  return colors.map((row, i) =>
    colors.map((col, j) => {
      if (i === j) return null;
      const ratio = getContrastRatio(row, col);
      return { ratio, level: getContrastLevel(ratio) };
    }),
  );
}

export interface ContrastStatus {
  label: string;
  ratio: number;
  // The pair the ratio compares — the darkest and lightest colours by luminance. The badge shows
  // which two colours it is talking about instead of an unexplained number.
  darkest: string;
  lightest: string;
}

export function getPaletteContrastStatus(colors: string[]): ContrastStatus {
  const sorted = [...colors].sort(
    (a, b) => getRelativeLuminance(a) - getRelativeLuminance(b),
  );
  const darkest = sorted[0];
  const lightest = sorted[sorted.length - 1];
  const ratio = getContrastRatio(darkest, lightest);
  const label =
    ratio >= 7
      ? "Excellent contrast"
      : ratio >= 4.5
        ? "Good contrast"
        : ratio >= 3
          ? "Medium contrast"
          : "Low contrast";
  return { label, ratio, darkest, lightest };
}

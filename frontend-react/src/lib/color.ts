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

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const n = channel / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function getContrastRatio(first: string, second: string): number {
  const a = getRelativeLuminance(first);
  const b = getRelativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(1));
}

export interface ContrastStatus {
  label: string;
  ratio: number;
}

export function getPaletteContrastStatus(colors: string[]): ContrastStatus {
  const sorted = [...colors].sort(
    (a, b) => getRelativeLuminance(a) - getRelativeLuminance(b),
  );
  const ratio = getContrastRatio(sorted[0], sorted[sorted.length - 1]);
  if (ratio >= 7) return { label: "Excellent contrast", ratio };
  if (ratio >= 4.5) return { label: "Good contrast", ratio };
  if (ratio >= 3) return { label: "Medium contrast", ratio };
  return { label: "Low contrast", ratio };
}

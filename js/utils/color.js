export function normalizeHex(hex) {
  return hex.trim().replace("#", "").toUpperCase();
}

export function copyToClipboard(text) {
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

export function hexToRgb(hex) {
  const normalizedHex = normalizeHex(hex);

  if (!/^[0-9A-F]{6}$/.test(normalizedHex)) {
    throw new Error(`Invalid HEX color: ${hex}`);
  }

  const value = Number.parseInt(normalizedHex, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

export function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastRatio(firstHex, secondHex) {
  const firstLuminance = getRelativeLuminance(firstHex);
  const secondLuminance = getRelativeLuminance(secondHex);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function getPaletteContrastStatus(colors) {
  const darkest = [...colors].sort((a, b) => getRelativeLuminance(a) - getRelativeLuminance(b))[0];
  const lightest = [...colors].sort((a, b) => getRelativeLuminance(b) - getRelativeLuminance(a))[0];
  const ratio = getContrastRatio(darkest, lightest);

  if (ratio >= 7) {
    return { label: "Excellent contrast", ratio };
  }

  if (ratio >= 4.5) {
    return { label: "Good contrast", ratio };
  }

  if (ratio >= 3) {
    return { label: "Medium contrast", ratio };
  }

  return { label: "Low contrast", ratio };
}

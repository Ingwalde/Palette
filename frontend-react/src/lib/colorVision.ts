// Colour-vision-deficiency simulation matrices for the palette swatches.
//
// These are the widely-used sRGB feColorMatrix approximations derived from the Brettel–Viénot
// dichromat model (Viénot, Brettel & Mollon, 1999, "Digital video colourmaps for checking the
// legibility of displays by dichromats"). They are an approximation for inspection, not a clinical
// model — enough to answer "do these two swatches collapse together for a red-green viewer?".
//
// The simulation is purely visual: it is applied as a CSS `filter: url(#…)` over the swatch
// container, so the colour values shown and copied are always the originals. It is an inspection
// mode, never persisted.

export interface CvdType {
  id: string;
  label: string;
  // Short description of who this affects, for the control's title.
  note: string;
  // A 4x5 feColorMatrix `values` string (row-major, alpha row identity).
  matrix: string;
}

export const CVD_TYPES: CvdType[] = [
  {
    id: "protanopia",
    label: "Protanopia",
    note: "Red-blind",
    matrix: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  },
  {
    id: "deuteranopia",
    label: "Deuteranopia",
    note: "Green-blind",
    matrix: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  },
  {
    id: "tritanopia",
    label: "Tritanopia",
    note: "Blue-blind",
    matrix: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
  },
];

export function cvdLabel(id: string): string | undefined {
  return CVD_TYPES.find((t) => t.id === id)?.label;
}

export function cvdNote(id: string): string | undefined {
  return CVD_TYPES.find((t) => t.id === id)?.note;
}

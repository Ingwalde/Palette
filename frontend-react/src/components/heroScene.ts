// The editorial hero shows one random "colour study": a random colour count, a random palette of
// that size, and one of two approved artworks for that count. Everything the hero renders is
// derived from a single `HeroScene`, produced once per visit by `createHeroScene`.
//
// The ten artworks and their geometry come verbatim from the approved `compositions.json`
// (colour studies 01–10). A shape is `[colorIndex, x%, y%, w%, h%, borderRadius]`; colour index 0
// is the artwork's own background. Coordinates may fall outside the field on purpose — the art
// field clips them, the paper card does not.

export type ColorCount = 2 | 3 | 4 | 5 | 6;
export type ArtworkVariant = "A" | "B";

/** `[colorIndex, xPercent, yPercent, widthPercent, heightPercent, borderRadius]`. */
export type Shape = readonly [number, number, number, number, number, string];

export interface Template {
  /** Template name — for code and tests only; the printed title is the palette name. */
  readonly name: string;
  readonly shapes: readonly Shape[];
}

export interface HeroScene {
  readonly count: ColorCount;
  readonly variant: ArtworkVariant;
  readonly templateName: string;
  readonly paletteName: string;
  readonly colors: readonly string[];
}

// Two approved artworks per colour count, A then B, exactly as authored in compositions.json.
export const TEMPLATES: Record<ColorCount, readonly [Template, Template]> = {
  2: [
    { name: "Sol", shapes: [[1, 19, 14, 62, 73, "50%"]] },
    {
      name: "Orbit",
      shapes: [
        [1, -18, 9, 94, 111, "50%"],
        [0, 0, 22, 68, 80, "50%"],
      ],
    },
  ],
  3: [
    {
      name: "First light",
      shapes: [
        [1, 42, 12, 38, 45, "50%"],
        [2, -15, 48, 111, 92, "50% 50% 0 0"],
      ],
    },
    {
      name: "Still noon",
      shapes: [
        [1, 12, 12, 32, 38, "50%"],
        [2, 46, 35, 45, 77, "100px 100px 0 0"],
      ],
    },
  ],
  4: [
    {
      name: "Far away",
      shapes: [
        [1, 55, 10, 30, 35.4, "50%"],
        [2, -22, 40, 100, 90, "50% 50% 0 0"],
        [3, 30, 61, 91, 78, "50% 50% 0 0"],
      ],
    },
    {
      name: "Quiet valley",
      shapes: [
        [1, 34, 12, 32, 37.8, "50%"],
        [2, -30, 38, 84, 102, "50% 50% 0 0"],
        [3, 48, 51, 85, 97, "50% 50% 0 0"],
      ],
    },
  ],
  5: [
    {
      name: "Earth & air",
      shapes: [
        [1, 24, 10, 55, 64.9, "50%"],
        [2, -10, 37, 68, 63, "100px 100px 0 0"],
        [3, 51, 54, 49, 46, "100px 0 0 0"],
        [4, 66, 76, 21, 24, "100px 100px 0 0"],
      ],
    },
    {
      name: "Secret garden",
      shapes: [
        [1, 13, 9, 28, 33, "50%"],
        [2, 37, 20, 51, 80, "100px 100px 0 0"],
        [4, 53, 44, 19, 56, "100px 100px 0 0"],
        [3, -10, 72, 56, 45, "100px 100px 0 0"],
      ],
    },
  ],
  6: [
    {
      name: "Collected",
      shapes: [
        [1, 8, 8, 37, 43.7, "50%"],
        [2, 53, 8, 39, 44, "100px 100px 0 0"],
        [3, 8, 59, 37, 33, "0 70px 0 0"],
        [4, 53, 60, 18, 32, "0"],
        [5, 74, 60, 18, 32, "0 0 40px 40px"],
      ],
    },
    {
      name: "Little city",
      shapes: [
        [5, 67, 8, 24, 28.3, "50%"],
        [4, 8, 23, 25, 69, "100px 100px 0 0"],
        [1, 33, 44, 24, 48, "0"],
        [2, 57, 48, 35, 44, "100px 100px 0 0"],
        [3, 43, 69, 15, 23, "100px 100px 0 0"],
      ],
    },
  ],
};

// Three curated hero colour families. These are illustrative surfaces for the hero artwork — not
// real catalogue entries — so they are never written to the backend or given fake IDs. Indices are
// roles (paper, accent, olive, ink, sage, gold); the HEX values are what matters.
interface Family {
  readonly name: string;
  readonly paper: string;
  readonly accent: string;
  readonly olive: string;
  readonly ink: string;
  readonly sage: string;
  readonly gold: string;
}

export const FAMILIES: readonly Family[] = [
  { name: "Earth & air", paper: "#ECD9B9", accent: "#D56F51", olive: "#697657", ink: "#30372F", sage: "#BFC8AE", gold: "#C49B64" },
  { name: "Sea & sky", paper: "#EADAD4", accent: "#C7D9EB", olive: "#607F97", ink: "#304349", sage: "#ADC5BD", gold: "#B68D68" },
  { name: "Wine & roses", paper: "#F1DFCA", accent: "#A95D70", olive: "#7C6B89", ink: "#3E2D37", sage: "#C8B7C7", gold: "#B89461" },
];

export const COLOR_COUNTS: readonly ColorCount[] = [2, 3, 4, 5, 6];

/**
 * Build a palette of exactly `count` distinct colours from a family, in the stable order the
 * artwork geometry expects (colour index 0 is always the artwork background).
 */
export function buildPalette(family: Family, count: ColorCount): string[] {
  switch (count) {
    case 2:
      return [family.paper, family.accent];
    case 3:
      return [family.paper, family.accent, family.olive];
    case 4:
      return [family.paper, family.accent, family.sage, family.olive];
    case 5:
      return [family.paper, family.accent, family.olive, family.ink, family.sage];
    case 6:
      return [family.paper, family.accent, family.olive, family.ink, family.sage, family.gold];
  }
}

/**
 * Produce one complete scene. `rng` returns a number in [0, 1); production passes `Math.random`,
 * tests pass a controlled sequence. The three choices — count, palette, artwork — are independent,
 * and the artwork is chosen without regard to which palette was picked.
 */
export function createHeroScene(rng: () => number): HeroScene {
  const count = COLOR_COUNTS[Math.min(COLOR_COUNTS.length - 1, Math.floor(rng() * COLOR_COUNTS.length))];
  const family = FAMILIES[Math.min(FAMILIES.length - 1, Math.floor(rng() * FAMILIES.length))];
  const variantIndex = Math.min(1, Math.floor(rng() * 2));

  const template = TEMPLATES[count][variantIndex];
  return {
    count,
    variant: variantIndex === 0 ? "A" : "B",
    templateName: template.name,
    paletteName: family.name,
    colors: buildPalette(family, count),
  };
}

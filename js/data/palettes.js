export const palettes = [
  {
    id: "navy-orange",
    name: "Navy Orange",
    colors: ["#0d1846", "#406eb7", "#e95623", "#e3e3e3"],
    tags: ["contrast", "dark", "modern"],
    description: "Deep navy colors with a bright orange accent for strong visual hierarchy."
  },
  {
    id: "pink-sunflower",
    name: "Pink Sunflower",
    colors: ["#191919", "#F6D883", "#F3F3EE", "#FCD5D3"],
    tags: ["pastel", "warm", "soft"],
    description: "Soft pastel palette with a dark base and warm yellow accent."
  },
  {
    id: "green-strawberry",
    name: "Green Strawberry",
    colors: ["#ED402F", "#6B7F64", "#D59A7A", "#9C0D0F"],
    tags: ["nature", "warm", "bold"],
    description: "Natural green tones mixed with strawberry red shades."
  },
  {
    id: "sea-breeze",
    name: "Sea Breeze",
    colors: ["#005f73", "#0a9396", "#94d2bd", "#e9d8a6"],
    tags: ["cold", "sea", "calm"],
    description: "Fresh blue and green colors inspired by the sea."
  },
  {
    id: "eco",
    name: "Eco",
    colors: ["#6b705c", "#a5a58d", "#b7b7a4", "#cb997e"],
    tags: ["eco", "nature", "minimal"],
    description: "Muted earth colors for calm eco-oriented designs."
  },
  {
    id: "minimalism",
    name: "Minimalism",
    colors: ["#2c3639", "#3f4e4f", "#a27b5b", "#dcd7c9"],
    tags: ["minimal", "dark", "neutral"],
    description: "Neutral dark palette with a soft beige color for balance."
  },
  {
    id: "christmas-nostalgia",
    name: "Christmas Nostalgia",
    colors: ["#f1e5d1", "#c75d4d", "#325c46", "#7a3e3e"],
    tags: ["holiday", "warm", "retro"],
    description: "Warm festive colors with a nostalgic winter feeling."
  },
  {
    id: "lavender-night",
    name: "Lavender Night",
    colors: ["#1f1b2e", "#4a3f73", "#9f86c0", "#e0b1cb"],
    tags: ["dark", "purple", "creative"],
    description: "Purple night palette for creative and atmospheric interfaces."
  },
  {
    id: "desert-clay",
    name: "Desert Clay",
    colors: ["#6f4e37", "#a47551", "#d0a98f", "#f4e1d2"],
    tags: ["warm", "earth", "neutral"],
    description: "Warm clay and sand colors for cozy visual design."
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    colors: ["#233142", "#455d7a", "#f7f7f7", "#e3e3e3"],
    tags: ["cold", "nordic", "clean"],
    description: "Clean Nordic palette with cold blue and light gray tones."
  },
  {
    id: "matcha-cream",
    name: "Matcha Cream",
    colors: ["#3a5a40", "#588157", "#a3b18a", "#dad7cd"],
    tags: ["nature", "green", "soft"],
    description: "Green matcha-inspired palette with a creamy background tone."
  },
  {
    id: "retro-pop",
    name: "Retro Pop",
    colors: ["#2d1e2f", "#f9c80e", "#f86624", "#43bccd"],
    tags: ["retro", "bold", "contrast"],
    description: "Bright retro colors for expressive and energetic designs."
  }
];

export function getPaletteById(id) {
  return palettes.find((palette) => palette.id === id) || null;
}

export function getAllTags() {
  const tags = palettes.flatMap((palette) => palette.tags);
  return ["all", ...new Set(tags)].sort((a, b) => {
    if (a === "all") return -1;
    if (b === "all") return 1;
    return a.localeCompare(b);
  });
}

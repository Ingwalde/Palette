# Palette

Palette is a small frontend web app for browsing, searching, saving and exporting color palettes.

## Features

- Palette cards with HEX colors
- Search by palette name, description or tag
- Tag filters
- Sorting by name
- Favorites stored in localStorage
- Copy one color or the full palette
- Contrast status for each palette
- Export as CSS variables, SCSS variables, JSON or TXT
- Responsive layout

## Project structure

```text
palette_refactor/
├── index.html
├── favorites.html
├── export.html
├── css/
│   ├── base.css
│   ├── components.css
│   └── pages.css
├── js/
│   ├── data/
│   │   └── palettes.js
│   ├── utils/
│   │   ├── color.js
│   │   ├── dom.js
│   │   ├── storage.js
│   │   └── toast.js
│   ├── components/
│   │   ├── emptyState.js
│   │   └── paletteCard.js
│   └── pages/
│       ├── export.js
│       ├── favorites.js
│       └── home.js
└── assets/
    └── screenshots/
```

## How to run

Use VS Code Live Server or any local static server.

Example with Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

This project uses native ES modules, so opening the HTML files directly with `file://` may not work in every browser. A local server is recommended.

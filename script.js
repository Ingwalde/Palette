const palettes = [
  { name: "Navy Orange", colors: ["#0d1846", "#406eb7", "#e95623", "#e3e3e3"], tag: "#контраст" },
  { name: "Pink Sunflower", colors: ["#191919", "#F6D883", "#F3F3EE", "#FCD5D3"], tag: "#пастель" },
  { name: "Green Strawberry", colors: ["#ED402F", "#6B7F64", "#D59A7A", "#9C0D0F"], tag: "#натуральні" },
  { name: "Sea Breeze", colors: ["#005f73", "#0a9396", "#94d2bd", "#e9d8a6"], tag: "#морські" },
  { name: "Eco", colors: ["#6b705c", "#a5a58d", "#b7b7a4", "#cb997e"], tag: "#еко" },
  { name: "Minimalism", colors: ["#2c3639", "#3f4e4f", "#a27b5b", "#dcd7c9"], tag: "#мінімалізм" },
  { name: "Christmas Nostalgia", colors: ["#f1e5b1", "#d19d56", "#262a2e", "#6e3d34"], tag: "#святкові" },
  { name: "Timeless Passion", colors: ["#edebdd", "#810100", "#630000", "#1b1717"], tag: "#драма" },
  { name: "Suburban Comfort", colors: ["#eeeeee", "#ea9216", "#3a4750", "#313841"], tag: "#затишок" },
  { name: "Sunbaked Cactus", colors: ["#f4c9ac", "#ef9e70", "#ae6355", "#756c4f"], tag: "#теплі" },
  { name: "Elusion", colors: ["#2d2d2d", "#d7c9ae", "#a68763", "#eae0d2"], tag: "#вінтаж" },
  { name: "Rose Ebony", colors: ["#483434", "#6b4f4f", "#eed6c4", "#fff3e4"], tag: "#романтика" },
  { name: "Rustic Roast", colors: ["#f9f7f0", "#d8d2c2", "#b17457", "#4a4947"], tag: "#рустик" },
  { name: "Relaxed Meadows", colors: ["#607161", "#6d8b74", "#efead8", "#d0c9c0"], tag: "#природа" },
  { name: "Lush Canopy", colors: ["#a4a175", "#585635", "#3b4021", "#2c2e2a"], tag: "#зелень" },
  { name: "Beach Vacation", colors: ["#84572f", "#f1a805", "#f2d6a1", "#92ada4"], tag: "#літо" },
  { name: "Gulf Stream", colors: ["#a7a155", "#345463", "#79b4ae", "#d9ece9"], tag: "#океан" },
  { name: "Jenny Plum", colors: ["#1f7387", "#efb79e", "#755565", "#ceb0ab"], tag: "#жіночі" },
  { name: "Vintage Market", colors: ["#b53324", "#e5a657", "#dfbc94", "#f5e2ce"], tag: "#вінтаж" },
  { name: "Verdigris Kitchen", colors: ["#576238", "#8d844d", "#ffd95e", "#f0eadc"], tag: "#ретро" },
  { name: "Pantone", colors: ["#b0a763", "#d4c296", "#514835", "#c07047"], tag: "#модерн" },
  { name: "Onahau Beach", colors: ["#162351", "#f1a805", "#f2e7d3", "#a36e51"], tag: "#пляж" },
  { name: "Eggplant Cinnabar", colors: ["#4F364B", "#CABAD7", "#DB3E1D", "#F7E9DE"], tag: "#виразні" },
  { name: "Paper Ink", colors: ["#282828", "#f9f6ef", "#193497", "#eda398"], tag: "#контраст" },
  { name: "Charcoal Slate", colors: ["#1c1c1c", "#eae6e0", "#535366", "#ffffff"], tag: "#монохром" },
  { name: "Cream Cherry", colors: ["#efdbbf", "#ac3030", "#68181f", "#121211"], tag: "#вишукані" }
];
const paletteList = document.getElementById("paletteList");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearSearch");
let activePreview = null;
let activePalette = null;
document.body.classList.add('visible');
function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites")) || [];
}
function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
}
function addPaletteToFavorites(palette) {
  const favs = getFavorites();
  if (!favs.find(p => p.name === palette.name)) {
    favs.push(palette);
    saveFavorites(favs);
  }
}
function isPaletteFavorite(name) {
  const favs = getFavorites();
  return favs.some(p => p.name === name);
}
function removePaletteFromFavorites(name) {
  const favs = getFavorites().filter(p => p.name !== name);
  saveFavorites(favs);
}
// Генерація карток
function renderPalettes(list = palettes) {
  paletteList.innerHTML = "";
  list.forEach(palette => {
    const div = document.createElement("div");
    div.className = "palette";
    div.title = palette.name;
    const colorsContainer = document.createElement("div");
    colorsContainer.className = "colors-container";
    palette.colors.forEach(color => {
      const colorDiv = document.createElement("div");
      colorDiv.className = "color";
      colorDiv.style.backgroundColor = color;
      colorsContainer.appendChild(colorDiv);
    });
    div.appendChild(colorsContainer);
    const titleDiv = document.createElement("div");
    titleDiv.className = "palette-title";
    titleDiv.textContent = palette.name;
    div.appendChild(titleDiv);
    div.addEventListener("click", () => {
      if (activePalette && activePalette !== div) {
        resetPalette(activePalette);
        activePalette.classList.remove("selected");
      }
      if (div.classList.contains("selected")) {
        const colorRow = div.querySelector('.colors-container');
        if (colorRow) colorRow.style.display = 'flex';
        const title = div.querySelector('.palette-title');
        if (title) title.style.display = 'block';
        const preview = div.querySelector('.preview');
        if (preview) {
          preview.classList.remove("active");
          setTimeout(() => {
            preview.remove();
            activePalette = null;
          }, 300);
          div.classList.remove("selected");
        } else {
          activePalette = null;
        }
      } else {
        const colorRow = div.querySelector('.colors-container');
        if (colorRow) colorRow.style.display = 'none';
        const title = div.querySelector('.palette-title');
        if (title) title.style.display = 'none';
        div.classList.add("selected");
        const preview = document.createElement("div");
        preview.className = "preview";
        preview.innerHTML = `
          <h2>${palette.name}</h2>
          <div class="room">
            ${palette.colors.map(color => `<div style="background-color: ${color};"></div>`).join('')}
          </div>
          <div class="palette-tag">${palette.tag}</div>
        `;
        const favoriteButton = document.createElement("button");
        favoriteButton.className = "favorite-button";
        const alreadyFavorite = isPaletteFavorite(palette.name);
        favoriteButton.textContent = alreadyFavorite ? "Додано до обраного" : "Додати до обраного";
        if (alreadyFavorite) favoriteButton.classList.add("added");
        favoriteButton.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isPaletteFavorite(palette.name)) {
            addPaletteToFavorites(palette);
            favoriteButton.textContent = "Додано до обраного";
            favoriteButton.classList.add("added");
          } else {
            removePaletteFromFavorites(palette.name);
            favoriteButton.textContent = "Додати до обраного";
            favoriteButton.classList.remove("added");
          }
        });
        preview.appendChild(favoriteButton);
        div.appendChild(preview);
        requestAnimationFrame(() => {
          preview.classList.add("active");
        });
        activePalette = div;
      }
    });
    paletteList.appendChild(div);
  });
}
renderPalettes(); // ініціалізація
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = palettes.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.tag.toLowerCase().includes(query)
  );
  renderPalettes(filtered);
});
clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchInput.dispatchEvent(new Event("input")); // запуск фільтрації
});
function resetPalette(div) {
  const paletteIndex = Array.from(paletteList.children).indexOf(div);
  const palette = palettes[paletteIndex];
  // Очистити картку
  div.innerHTML = '';
  div.classList.remove("selected");
  // Відновити кольори
  const colorsContainer = document.createElement("div");
  colorsContainer.className = "colors-container";
  palette.colors.forEach(color => {
    const colorDiv = document.createElement("div");
    colorDiv.className = "color";
    colorDiv.style.backgroundColor = color;
    colorsContainer.appendChild(colorDiv);
  });
  div.appendChild(colorsContainer);
  // Відновити назву
  const titleDiv = document.createElement("div");
  titleDiv.className = "palette-title";
  titleDiv.textContent = palette.name;
  div.appendChild(titleDiv);
}
function updateFavoritesText() {
  const favLink = document.querySelector(".favorites-link");
  if (window.innerWidth <= 700) {
    favLink.textContent = "Обрані";
  } else {
    favLink.textContent = "Обрані палітри";
  }
}
window.addEventListener("load", updateFavoritesText);
window.addEventListener("resize", updateFavoritesText);
const originalPalettes = [...palettes]; // для відновлення
let sortState = 0; // 0 - за замовчуванням, 1 - A-Z, 2 - Z-A
const sortButton = document.getElementById("sortButton");
sortButton.addEventListener("click", () => {
  sortState = (sortState + 1) % 3;

  switch (sortState) {
    case 1:
      palettes.sort((a, b) => a.name.localeCompare(b.name));
      sortButton.textContent = "А-Я";
      break;
    case 2:
      palettes.sort((a, b) => b.name.localeCompare(a.name));
      sortButton.textContent = "Я-А";
      break;
    case 0:
    default:
      palettes.splice(0, palettes.length, ...originalPalettes);
      sortButton.textContent = "За замовчуванням";
      break;
  }
  renderPalettes();
});
const themeToggle = document.getElementById('themeToggle');

// Відновлення теми з localStorage
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeToggle.textContent = '☀️';
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
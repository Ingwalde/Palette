function getFavorites() {
  return JSON.parse(localStorage.getItem("favorites")) || [];
}
function saveFavorites(favs) {
  localStorage.setItem("favorites", JSON.stringify(favs));
}
function removeFavorite(name) {
  const favs = getFavorites().filter(p => p.name !== name);
  saveFavorites(favs);
  renderFavorites();
}
let selectedPaletteName = null; // Зберігаємо вибрану палітру
function renderFavorites() {
  const container = document.getElementById("favoritesContainer");
  container.innerHTML = "";
  const favs = getFavorites();
  if (favs.length === 0) {
    container.innerHTML = "<p class='no-favorites-message'>Нажаль у Вас немає обраних палітр</p>";
    return;
  }
  favs.forEach(palette => {
    const div = document.createElement("div");
    div.className = "favorite-palette";
    // Додаємо клас вибраної палітри, якщо вона вибрана
    if (palette.name === selectedPaletteName) {
      div.classList.add("selected-palette");
    }
    // Обробник кліку по палітрі — вибираємо/знімаємо вибір
    div.addEventListener("click", () => {
      if (selectedPaletteName === palette.name) {
        // Якщо вже вибрана — зняти вибір
        selectedPaletteName = null;
        div.classList.remove("selected-palette");
      } else {
        // Зняти вибір з попередньої, якщо була
        const prevSelected = document.querySelector(".favorite-palette.selected-palette");
        if (prevSelected) prevSelected.classList.remove("selected-palette");
        // Встановити нову вибрану
        selectedPaletteName = palette.name;
        div.classList.add("selected-palette");
      }
    });
    const title = document.createElement("h2");
    title.textContent = palette.name;
    div.appendChild(title);
    const colors = document.createElement("div");
    colors.className = "palette-colors";
    palette.colors.forEach(color => {
      const colorDiv = document.createElement("div");
      colorDiv.style.backgroundColor = color;
      colors.appendChild(colorDiv);
    });
    div.appendChild(colors);
    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "Видалити з обраного";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // щоб клік не вибирав палітру при видаленні
      removeFavorite(palette.name);
      // Якщо видалили вибрану палітру, скидаємо вибір
      if (selectedPaletteName === palette.name) {
        selectedPaletteName = null;
      }
    });
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
}
const exportBtn = document.querySelector(".export-button");
exportBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!selectedPaletteName) {
    alert("Будь ласка, оберіть палітру для експорту.");
    return;
  }
  const palette = getFavorites().find(p => p.name === selectedPaletteName);
  if (!palette) {
    alert("Вибрана палітра не знайдена.");
    return;
  }
  localStorage.setItem("paletteToExport", JSON.stringify(palette));
  window.location.href = "export.html";
});
document.addEventListener("DOMContentLoaded", renderFavorites);
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
  renderFavorites();
});
const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  if (themeToggle) themeToggle.textContent = '☀️';
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}
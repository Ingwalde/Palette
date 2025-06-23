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
    removeBtn.addEventListener("click", () => removeFavorite(palette.name));
    div.appendChild(removeBtn);

    container.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", renderFavorites);
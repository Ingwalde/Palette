document.addEventListener("DOMContentLoaded", () => {
  const paletteData = localStorage.getItem("paletteToExport");
  const container = document.getElementById("exportPaletteContainer");
  const downloadPNGBtn = document.getElementById("downloadPNG");
  const downloadJSONBtn = document.getElementById("downloadJSON");
   if (!paletteData) {
    container.innerHTML = "<p>Не обрано палітру для експорту.</p>";
    if (downloadPNGBtn) downloadPNGBtn.style.display = "none";
    if (downloadJSONBtn) downloadJSONBtn.style.display = "none";
    return;
  }
  const palette = JSON.parse(paletteData);
  container.innerHTML = `
    <h2>${palette.name}</h2>
    <div class="palette-colors">
      ${palette.colors.map(color => `<div style="background-color: ${color};"></div>`).join('')}
    </div>
    <div class="palette-tag">${palette.tag}</div>
  `;
  if (downloadPNGBtn) {
    downloadPNGBtn.addEventListener("click", () => {
      html2canvas(document.getElementById("exportPaletteContainer")).then(canvas => {
        const link = document.createElement("a");
        link.download = palette.name + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    });
  }
  if (downloadJSONBtn) {
    downloadJSONBtn.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(palette, null, 2));
      const dlAnchorElem = document.createElement("a");
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", palette.name + ".json");
      dlAnchorElem.click();
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "☀️";
  } else {
    if (themeToggle) themeToggle.textContent = "🌙";
  }
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }
});
import { palettes } from "../data/palettes.js";
import { qs } from "../utils/dom.js";
import { copyToClipboard } from "../utils/color.js";
import { getFavoriteIds } from "../utils/storage.js";
import { showToast } from "../utils/toast.js";

const elements = {
  sourceSelect: qs("#sourceSelect"),
  formatSelect: qs("#formatSelect"),
  output: qs("#exportOutput"),
  copyButton: qs("#copyExportBtn"),
  downloadButton: qs("#downloadExportBtn")
};

initExportPage();

function initExportPage() {
  renderExport();

  elements.sourceSelect.addEventListener("change", renderExport);
  elements.formatSelect.addEventListener("change", renderExport);

  elements.copyButton.addEventListener("click", async () => {
    await copyToClipboard(elements.output.textContent);
    showToast("Export result copied");
  });

  elements.downloadButton.addEventListener("click", () => {
    const format = elements.formatSelect.value;
    const content = elements.output.textContent;
    const extension = getFileExtension(format);
    downloadTextFile(content, `palette-export.${extension}`);
    showToast("Export file downloaded");
  });
}

function renderExport() {
  const selectedPalettes = getSelectedPalettes();
  const format = elements.formatSelect.value;
  elements.output.textContent = generateExport(selectedPalettes, format);
}

function getSelectedPalettes() {
  if (elements.sourceSelect.value === "favorites") {
    const favoriteIds = getFavoriteIds();
    return palettes.filter((palette) => favoriteIds.includes(palette.id));
  }

  return palettes;
}

function generateExport(selectedPalettes, format) {
  if (selectedPalettes.length === 0) {
    return "No palettes selected. Add palettes to favorites or choose All palettes.";
  }

  const generators = {
    css: generateCssVariables,
    scss: generateScssVariables,
    json: generateJson,
    txt: generateTxt
  };

  return generators[format](selectedPalettes);
}

function generateCssVariables(selectedPalettes) {
  return selectedPalettes
    .map((palette) => {
      const variables = palette.colors
        .map((color, index) => `  --${palette.id}-${index + 1}: ${color};`)
        .join("\n");

      return `/* ${palette.name} */\n:root {\n${variables}\n}`;
    })
    .join("\n\n");
}

function generateScssVariables(selectedPalettes) {
  return selectedPalettes
    .map((palette) => {
      const variables = palette.colors
        .map((color, index) => `$${palette.id}-${index + 1}: ${color};`)
        .join("\n");

      return `// ${palette.name}\n${variables}`;
    })
    .join("\n\n");
}

function generateJson(selectedPalettes) {
  return JSON.stringify(selectedPalettes, null, 2);
}

function generateTxt(selectedPalettes) {
  return selectedPalettes
    .map((palette) => `${palette.name}: ${palette.colors.join(", ")}`)
    .join("\n");
}

function getFileExtension(format) {
  const extensions = {
    css: "css",
    scss: "scss",
    json: "json",
    txt: "txt"
  };

  return extensions[format] || "txt";
}

function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

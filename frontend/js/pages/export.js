import { getPalettes } from "../api/palettesApi.js";
import { copyToClipboard } from "../utils/color.js";
import { getFavoritePalettes } from "../api/favoritesApi.js";
import { qs } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";
import { initCustomSelects } from "../utils/customSelect.js";

const elements = {
  sourceSelect: qs("#sourceSelect"),
  formatSelect: qs("#formatSelect"),
  palettePicker: qs("#palettePicker"),
  paletteSearchInput: qs("#paletteSearchInput"),
  paletteSearchResults: qs("#paletteSearchResults"),
  palettePickerStatus: qs("#palettePickerStatus"),
  output: qs("#exportOutput"),
  textPreview: qs("#textPreview"),
  imagePreview: qs("#imagePreview"),
  imageElement: qs("#exportPreviewImage"),
  imageCaption: qs("#imagePreviewCaption"),
  previewButton: qs("#previewExportBtn"),
  downloadButton: qs("#downloadExportBtn")
};

let currentSelectedPalettes = [];
let currentPreviewDataUrl = "";
let allPalettesCache = null;
let selectedPaletteSlug = "";

initExportPage();

function initExportPage() {
  initCustomSelects();
  bindEvents();
  renderExport();
}

function bindEvents() {
  elements.sourceSelect.addEventListener("change", async () => {
    if (elements.sourceSelect.value !== "single") {
      selectedPaletteSlug = "";
      elements.paletteSearchInput.value = "";
    }

    await renderExport();
  });

  elements.formatSelect.addEventListener("change", renderExport);

  elements.paletteSearchInput.addEventListener("input", debounce(async () => {
    selectedPaletteSlug = "";
    await renderPaletteSearchResults();
    await renderExport();
  }, 180));

  elements.previewButton.addEventListener("click", async () => {
    const format = elements.formatSelect.value;

    if (format === "png") {
      if (currentSelectedPalettes.length === 0) {
        showToast("Choose a palette to preview");
        return;
      }

      await renderPngPreview(currentSelectedPalettes, true);
      showToast("PNG preview updated");
      return;
    }

    await copyToClipboard(elements.output.textContent);
    showToast("Export result copied");
  });

  elements.downloadButton.addEventListener("click", async () => {
    const format = elements.formatSelect.value;

    if (format === "png") {
      if (currentSelectedPalettes.length === 0) {
        showToast("No palettes to export");
        return;
      }

      if (!currentPreviewDataUrl) {
        await renderPngPreview(currentSelectedPalettes, false);
      }

      downloadDataUrl(currentPreviewDataUrl, getExportFilename("png"));
      showToast("PNG image downloaded");
      return;
    }

    const content = elements.output.textContent;
    const extension = getFileExtension(format);
    downloadTextFile(content, getExportFilename(extension));
    showToast("Export file downloaded");
  });
}

async function renderExport() {
  setTextMode();
  togglePalettePicker();
  elements.output.textContent = "Loading palettes from backend API...";

  try {
    if (isSinglePaletteMode()) {
      await renderPaletteSearchResults();
    }

    const selectedPalettes = await getSelectedPalettes();
    const format = elements.formatSelect.value;
    currentSelectedPalettes = selectedPalettes;
    currentPreviewDataUrl = "";

    updateActionButton(format);

    if (isSinglePaletteMode() && selectedPalettes.length === 0) {
      setTextMode();
      elements.output.textContent = "Choose one palette to generate export.";
      return;
    }

    if (format === "png") {
      await renderPngPreview(selectedPalettes, false);
      return;
    }

    elements.output.textContent = generateExport(selectedPalettes, format);
  } catch (error) {
    currentSelectedPalettes = [];
    currentPreviewDataUrl = "";
    setTextMode();
    elements.output.textContent = `Export is not available.\n\nStart FastAPI or log in if you selected Favorites only.\n\nDetails: ${error.message}`;
    showToast(error.message, "error");
  }
}

async function getSelectedPalettes() {
  if (elements.sourceSelect.value === "favorites") {
    return getFavoritePalettes();
  }

  if (isSinglePaletteMode()) {
    const palettes = await loadAllPalettes();
    const selectedPalette = palettes.find((palette) => palette.slug === selectedPaletteSlug);
    return selectedPalette ? [selectedPalette] : [];
  }

  return getPalettes();
}

function isSinglePaletteMode() {
  return elements.sourceSelect.value === "single";
}

function togglePalettePicker() {
  elements.palettePicker.classList.toggle("hidden", !isSinglePaletteMode());
}

async function loadAllPalettes() {
  if (!allPalettesCache) {
    allPalettesCache = await getPalettes();
  }

  return allPalettesCache;
}

async function renderPaletteSearchResults() {
  if (!isSinglePaletteMode()) {
    elements.paletteSearchResults.innerHTML = "";
    return;
  }

  const palettes = await loadAllPalettes();
  const query = elements.paletteSearchInput.value.trim().toLowerCase();
  const visiblePalettes = filterPalettes(palettes, query).slice(0, 8);

  elements.paletteSearchResults.innerHTML = "";

  if (visiblePalettes.length === 0) {
    elements.palettePickerStatus.textContent = "No palettes found.";
    return;
  }

  visiblePalettes.forEach((palette) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-picker__option";
    button.classList.toggle("palette-picker__option--selected", palette.slug === selectedPaletteSlug);

    const swatches = palette.colors
      .map((color) => `<span style="--swatch-color: ${color}"></span>`)
      .join("");

    button.innerHTML = `
      <span class="palette-picker__option-info">
        <strong>${escapeHtml(palette.name)}</strong>
        <small>${escapeHtml(palette.slug)}</small>
      </span>
      <span class="palette-picker__swatches" aria-hidden="true">${swatches}</span>
    `;

    button.addEventListener("click", async () => {
      selectedPaletteSlug = palette.slug;
      elements.paletteSearchInput.value = palette.name;
      await renderPaletteSearchResults();
      await renderExport();
    });

    elements.paletteSearchResults.append(button);
  });

  if (selectedPaletteSlug) {
    const selectedPalette = palettes.find((palette) => palette.slug === selectedPaletteSlug);
    elements.palettePickerStatus.textContent = selectedPalette
      ? `Selected: ${selectedPalette.name}`
      : "Choose one palette to export.";
  } else {
    elements.palettePickerStatus.textContent = "Choose one palette to export.";
  }
}

function filterPalettes(palettes, query) {
  if (!query) {
    return palettes;
  }

  return palettes.filter((palette) => {
    const haystack = [
      palette.name,
      palette.slug,
      palette.description,
      ...(palette.tags || [])
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

function updateActionButton(format) {
  elements.previewButton.textContent = format === "png" ? "Refresh preview" : "Copy result";
}

function setTextMode() {
  elements.textPreview.classList.remove("hidden");
  elements.imagePreview.classList.add("hidden");
}

function setImageMode() {
  elements.textPreview.classList.add("hidden");
  elements.imagePreview.classList.remove("hidden");
}

async function renderPngPreview(selectedPalettes, forceRefresh = false) {
  if (selectedPalettes.length === 0) {
    setTextMode();
    elements.output.textContent = isSinglePaletteMode()
      ? "Choose one palette to generate PNG preview."
      : "No palettes selected. Add palettes to favorites or choose All palettes.";
    return;
  }

  if (!currentPreviewDataUrl || forceRefresh) {
    currentPreviewDataUrl = await generatePngDataUrl(selectedPalettes);
  }

  setImageMode();
  elements.imageElement.src = currentPreviewDataUrl;
  elements.imageCaption.textContent = isSinglePaletteMode() && selectedPalettes.length === 1
    ? `Previewing selected palette card: ${selectedPalettes[0].name}. Click Download file to save the PNG image.`
    : `Previewing ${selectedPalettes.length} palette${selectedPalettes.length === 1 ? "" : "s"}. Click Download file to save the PNG image.`;
}

function generateExport(selectedPalettes, format) {
  if (selectedPalettes.length === 0) {
    return isSinglePaletteMode()
      ? "Choose one palette to generate export."
      : "No palettes selected. Add palettes to favorites or choose All palettes.";
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
        .map((color, index) => `  --${palette.slug}-${index + 1}: ${color};`)
        .join("\n");

      return `/* ${palette.name} */\n:root {\n${variables}\n}`;
    })
    .join("\n\n");
}

function generateScssVariables(selectedPalettes) {
  return selectedPalettes
    .map((palette) => {
      const variables = palette.colors
        .map((color, index) => `$${palette.slug}-${index + 1}: ${color};`)
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

function getExportFilename(extension) {
  if (currentSelectedPalettes.length === 1) {
    return `${currentSelectedPalettes[0].slug}-palette.${extension}`;
  }

  return `palette-export.${extension}`;
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

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

function debounce(callback, delay = 200) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function generatePngDataUrl(selectedPalettes) {
  if (isSinglePaletteMode() && selectedPalettes.length === 1) {
    return generateSinglePaletteCardPngDataUrl(selectedPalettes[0]);
  }

  const cardWidth = 1180;
  const outerPadding = 44;
  const headerHeight = 168;
  const cardHeight = 250;
  const gap = 34;
  const footerHeight = 40;
  const canvasWidth = 1268;
  const canvasHeight = outerPadding * 2 + headerHeight + footerHeight + selectedPalettes.length * cardHeight + Math.max(0, selectedPalettes.length - 1) * gap;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = canvasWidth * deviceScale;
  canvas.height = canvasHeight * deviceScale;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.scale(deviceScale, deviceScale);

  drawBackground(ctx, canvasWidth, canvasHeight);
  drawHeader(ctx, selectedPalettes, outerPadding, outerPadding, cardWidth, headerHeight);

  selectedPalettes.forEach((palette, index) => {
    const y = outerPadding + headerHeight + 24 + index * (cardHeight + gap);
    drawPaletteCard(ctx, palette, outerPadding, y, cardWidth, cardHeight, index);
  });

  drawFooter(ctx, outerPadding, canvasHeight - outerPadding + 2, cardWidth);

  return canvas.toDataURL("image/png");
}


function generateSinglePaletteCardPngDataUrl(palette) {
  const outerPadding = 44;
  const cardWidth = 1180;
  const cardHeight = 250;
  const canvasWidth = cardWidth + outerPadding * 2;
  const canvasHeight = cardHeight + outerPadding * 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = canvasWidth * deviceScale;
  canvas.height = canvasHeight * deviceScale;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  ctx.scale(deviceScale, deviceScale);

  drawBackground(ctx, canvasWidth, canvasHeight);
  drawPaletteCard(ctx, palette, outerPadding, outerPadding, cardWidth, cardHeight, 0);

  return canvas.toDataURL("image/png");
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f8efe6");
  gradient.addColorStop(0.5, "#f6f1ea");
  gradient.addColorStop(1, "#eee5da");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.arc(width - 130, 120, 170, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(231, 216, 201, 0.55)";
  ctx.beginPath();
  ctx.arc(120, height - 120, 160, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeader(ctx, palettes, x, y, width, height) {
  drawSoftShadow(ctx, x, y, width, height, 34);
  ctx.fillStyle = "rgba(255, 250, 242, 0.92)";
  roundRect(ctx, x, y, width, height, 34);
  ctx.fill();

  ctx.strokeStyle = "rgba(47,45,42,0.08)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 34);
  ctx.stroke();

  drawPill(ctx, x + 30, y + 26, "Palette export", "#302f2c", "#ffffff", 13, 700);

  ctx.save();
  ctx.textBaseline = "top";
  ctx.fillStyle = "#302f2c";
  ctx.font = "700 40px Poppins, Arial, sans-serif";
  ctx.fillText("Palette Collection", x + 30, y + 72);

  ctx.fillStyle = "#746c63";
  ctx.font = "500 18px Poppins, Arial, sans-serif";
  ctx.fillText(`Generated preview • ${palettes.length} palette${palettes.length === 1 ? "" : "s"}`, x + 30, y + 122);
  ctx.restore();
}

function drawPaletteCard(ctx, palette, x, y, width, height, index) {
  drawSoftShadow(ctx, x, y, width, height, 30);

  const cardGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  cardGradient.addColorStop(0, "rgba(255, 250, 242, 0.96)");
  cardGradient.addColorStop(1, "rgba(255, 245, 236, 0.92)");
  ctx.fillStyle = cardGradient;
  roundRect(ctx, x, y, width, height, 30);
  ctx.fill();

  ctx.strokeStyle = "rgba(47,45,42,0.09)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 30);
  ctx.stroke();

  drawPill(ctx, x + 28, y + 26, `Palette ${index + 1}`, "#efe7dc", "#4d463f", 12, 700);

  ctx.save();
  ctx.textBaseline = "top";
  ctx.fillStyle = "#302f2c";
  ctx.font = "700 30px Poppins, Arial, sans-serif";
  ctx.fillText(palette.name, x + 28, y + 66);

  const description = palette.description || "Color palette ready for UI, branding and visual concepts.";
  ctx.fillStyle = "#746c63";
  ctx.font = "500 16px Poppins, Arial, sans-serif";
  wrapText(ctx, description, x + 28, y + 108, 520, 24, 2);
  ctx.restore();

  const tags = Array.isArray(palette.tags) ? palette.tags : [];
  drawTagRow(ctx, tags, x + 28, y + 170, 14);

  const swatchAreaX = x + 620;
  const swatchAreaY = y + 36;
  const swatchAreaWidth = width - 646;
  const swatchGap = 14;
  const swatchWidth = (swatchAreaWidth - swatchGap * (palette.colors.length - 1)) / palette.colors.length;
  const swatchHeight = 112;

  palette.colors.forEach((color, colorIndex) => {
    const currentX = swatchAreaX + colorIndex * (swatchWidth + swatchGap);

    drawSoftShadow(ctx, currentX, swatchAreaY, swatchWidth, swatchHeight, 22, 0.12);
    ctx.fillStyle = color;
    roundRect(ctx, currentX, swatchAreaY, swatchWidth, swatchHeight, 22);
    ctx.fill();

    ctx.strokeStyle = "rgba(47,45,42,0.1)";
    ctx.lineWidth = 1;
    roundRect(ctx, currentX, swatchAreaY, swatchWidth, swatchHeight, 22);
    ctx.stroke();

    drawPill(
      ctx,
      currentX + 10,
      swatchAreaY + swatchHeight + 18,
      color.toUpperCase(),
      "#ffffff",
      "#302f2c",
      12,
      700,
      swatchWidth - 20,
      34
    );
  });
}

function drawFooter(ctx, x, y, width) {
  ctx.fillStyle = "rgba(116,108,99,0.92)";
  ctx.font = "500 15px Poppins, Arial, sans-serif";
  ctx.fillText("Generated in Palette • export preview", x + 2, y);

  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString(), x + width - 2, y);
  ctx.textAlign = "left";
}

function drawTagRow(ctx, tags, startX, y, gap) {
  let currentX = startX;
  const visibleTags = tags.slice(0, 4);

  visibleTags.forEach((tag) => {
    const label = `#${tag}`;
    const width = getPillWidth(ctx, label, 12, 700, 24);
    drawPill(ctx, currentX, y, label, "#f0e3d7", "#655d55", 12, 700, width, 30);
    currentX += width + gap;
  });
}

function drawPill(ctx, x, y, text, background, color, fontSize = 12, fontWeight = 700, forcedWidth = null, forcedHeight = null) {
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px Poppins, Arial, sans-serif`;
  const width = forcedWidth ?? getPillWidth(ctx, text, fontSize, fontWeight, 24);
  const height = forcedHeight ?? 30;

  ctx.fillStyle = background;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  ctx.restore();
}

function getPillWidth(ctx, text, fontSize, fontWeight, horizontalPadding) {
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px Poppins, Arial, sans-serif`;
  const width = ctx.measureText(text).width + horizontalPadding;
  ctx.restore();
  return Math.max(width, 60);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const originalBaseline = ctx.textBaseline;
  ctx.textBaseline = "top";
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, y + lineCount * lineHeight);
      line = `${words[i]} `;
      lineCount += 1;

      if (lineCount === maxLines - 1) {
        const remaining = words.slice(i).join(" ");
        const trimmed = trimTextToWidth(ctx, remaining, maxWidth);
        ctx.fillText(trimmed, x, y + lineCount * lineHeight);
        ctx.textBaseline = originalBaseline;
        return;
      }
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line.trim(), x, y + lineCount * lineHeight);
  ctx.textBaseline = originalBaseline;
}

function trimTextToWidth(ctx, text, maxWidth) {
  let trimmed = text.trim();

  while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }

  trimmed = trimmed.replace(/[.,;:!\-\s]+$/g, "");
  return `${trimmed}…`;
}

function drawSoftShadow(ctx, x, y, width, height, radius, opacity = 0.08) {
  ctx.save();
  ctx.fillStyle = `rgba(47,45,42,${opacity})`;
  roundRect(ctx, x, y + 8, width, height, radius);
  ctx.filter = "blur(18px)";
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

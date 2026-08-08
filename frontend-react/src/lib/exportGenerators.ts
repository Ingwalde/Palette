import type { Palette } from "../types/api";

export type ExportFormat = "css" | "scss" | "json" | "png";

// ---- text generators ----------------------------------------------------------------

function generateCssVariables(palettes: Palette[]): string {
  return palettes
    .map((palette) => {
      const variables = palette.colors
        .map((color, index) => `  --${palette.slug}-${index + 1}: ${color};`)
        .join("\n");
      return `/* ${palette.name} */\n:root {\n${variables}\n}`;
    })
    .join("\n\n");
}

function generateScssVariables(palettes: Palette[]): string {
  return palettes
    .map((palette) => {
      const variables = palette.colors
        .map((color, index) => `$${palette.slug}-${index + 1}: ${color};`)
        .join("\n");
      return `// ${palette.name}\n${variables}`;
    })
    .join("\n\n");
}

export function generateExportText(
  palettes: Palette[],
  format: Exclude<ExportFormat, "png">,
): string {
  if (format === "json") return JSON.stringify(palettes, null, 2);
  if (format === "scss") return generateScssVariables(palettes);
  return generateCssVariables(palettes);
}

// ---- download helpers ---------------------------------------------------------------

export function getExportFilename(palettes: Palette[], extension: string): string {
  if (palettes.length === 1) return `${palettes[0].slug}-palette.${extension}`;
  return `palette-export.${extension}`;
}

export function downloadTextFile(content: string, filename: string): void {
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

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
}

// ---- PNG canvas rendering (ported from the vanilla export.js) ------------------------

type Ctx = CanvasRenderingContext2D;

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
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

function drawSoftShadow(
  ctx: Ctx,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  opacity = 0.08,
): void {
  ctx.save();
  ctx.fillStyle = `rgba(47,45,42,${opacity})`;
  roundRect(ctx, x, y + 8, width, height, radius);
  ctx.filter = "blur(18px)";
  ctx.fill();
  ctx.restore();
}

function getPillWidth(
  ctx: Ctx,
  text: string,
  fontSize: number,
  fontWeight: number,
  horizontalPadding: number,
): number {
  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px Poppins, Arial, sans-serif`;
  const width = ctx.measureText(text).width + horizontalPadding;
  ctx.restore();
  return Math.max(width, 60);
}

function drawPill(
  ctx: Ctx,
  x: number,
  y: number,
  text: string,
  background: string,
  color: string,
  fontSize = 12,
  fontWeight = 700,
  forcedWidth: number | null = null,
  forcedHeight: number | null = null,
): void {
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

function trimTextToWidth(ctx: Ctx, text: string, maxWidth: number): string {
  let trimmed = text.trim();
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1).trimEnd();
  }
  trimmed = trimmed.replace(/[.,;:!\-\s]+$/g, "");
  return `${trimmed}…`;
}

function wrapText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): void {
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
        ctx.fillText(
          trimTextToWidth(ctx, remaining, maxWidth),
          x,
          y + lineCount * lineHeight,
        );
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

function drawBackground(ctx: Ctx, width: number, height: number): void {
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

function drawTagRow(
  ctx: Ctx,
  tags: string[],
  startX: number,
  y: number,
  gap: number,
): void {
  let currentX = startX;
  tags.slice(0, 4).forEach((tag) => {
    const label = `#${tag}`;
    const width = getPillWidth(ctx, label, 12, 700, 24);
    drawPill(ctx, currentX, y, label, "#f0e3d7", "#655d55", 12, 700, width, 30);
    currentX += width + gap;
  });
}

function drawHeader(
  ctx: Ctx,
  palettes: Palette[],
  x: number,
  y: number,
  width: number,
  height: number,
): void {
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
  ctx.fillText(
    `Generated preview • ${palettes.length} palette${palettes.length === 1 ? "" : "s"}`,
    x + 30,
    y + 122,
  );
  ctx.restore();
}

function drawPaletteCard(
  ctx: Ctx,
  palette: Palette,
  x: number,
  y: number,
  width: number,
  height: number,
  index: number,
): void {
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
  const description =
    palette.description || "Color palette ready for UI, branding and visual concepts.";
  ctx.fillStyle = "#746c63";
  ctx.font = "500 16px Poppins, Arial, sans-serif";
  wrapText(ctx, description, x + 28, y + 108, 520, 24, 2);
  ctx.restore();
  drawTagRow(ctx, palette.tags ?? [], x + 28, y + 170, 14);

  const swatchAreaX = x + 620;
  const swatchAreaY = y + 36;
  const swatchAreaWidth = width - 646;
  const swatchGap = 14;
  const swatchWidth =
    (swatchAreaWidth - swatchGap * (palette.colors.length - 1)) / palette.colors.length;
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
      34,
    );
  });
}

function drawFooter(ctx: Ctx, x: number, y: number, width: number): void {
  ctx.fillStyle = "rgba(116,108,99,0.92)";
  ctx.font = "500 15px Poppins, Arial, sans-serif";
  ctx.fillText("Generated in Palette • export preview", x + 2, y);
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString(), x + width - 2, y);
  ctx.textAlign = "left";
}

function makeCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  canvas.width = width * deviceScale;
  canvas.height = height * deviceScale;
  ctx.scale(deviceScale, deviceScale);
  return { canvas, ctx };
}

export function generatePngDataUrl(palettes: Palette[], singleMode: boolean): string {
  const outerPadding = 44;
  const cardWidth = 1180;
  const cardHeight = 250;

  if (singleMode && palettes.length === 1) {
    const canvasWidth = cardWidth + outerPadding * 2;
    const canvasHeight = cardHeight + outerPadding * 2;
    const { canvas, ctx } = makeCanvas(canvasWidth, canvasHeight);
    drawBackground(ctx, canvasWidth, canvasHeight);
    drawPaletteCard(
      ctx,
      palettes[0],
      outerPadding,
      outerPadding,
      cardWidth,
      cardHeight,
      0,
    );
    return canvas.toDataURL("image/png");
  }

  const headerHeight = 168;
  const gap = 34;
  const footerHeight = 40;
  const canvasWidth = 1268;
  const canvasHeight =
    outerPadding * 2 +
    headerHeight +
    footerHeight +
    palettes.length * cardHeight +
    Math.max(0, palettes.length - 1) * gap;

  const { canvas, ctx } = makeCanvas(canvasWidth, canvasHeight);
  drawBackground(ctx, canvasWidth, canvasHeight);
  drawHeader(ctx, palettes, outerPadding, outerPadding, cardWidth, headerHeight);
  palettes.forEach((palette, index) => {
    const y = outerPadding + headerHeight + 24 + index * (cardHeight + gap);
    drawPaletteCard(ctx, palette, outerPadding, y, cardWidth, cardHeight, index);
  });
  drawFooter(ctx, outerPadding, canvasHeight - outerPadding + 2, cardWidth);
  return canvas.toDataURL("image/png");
}

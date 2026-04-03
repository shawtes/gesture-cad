/**
 * PDF Export — generates technical drawings as downloadable PDF files.
 * Uses canvas-based rendering converted to data URL.
 */

import type { ProjectedView } from "./projection-engine";
import type { Dimension } from "./dimension-engine";

export interface DrawingSheet {
  title: string;
  views: ProjectedView[];
  dimensions: Dimension[];
  paperWidth: number;  // mm
  paperHeight: number; // mm
  scale: string;       // e.g., "1:1"
  author: string;
  date: string;
}

/**
 * Render a drawing sheet to a canvas and export as PNG data URL.
 * (PDF generation would use jsPDF — this is the rendering core)
 */
export function renderDrawingToCanvas(
  sheet: DrawingSheet,
  canvas: HTMLCanvasElement
): void {
  const DPI = 3; // pixels per mm
  canvas.width = sheet.paperWidth * DPI;
  canvas.height = sheet.paperHeight * DPI;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(10 * DPI, 10 * DPI, (sheet.paperWidth - 20) * DPI, (sheet.paperHeight - 20) * DPI);

  // Title block (bottom-right)
  const tbX = (sheet.paperWidth - 90) * DPI;
  const tbY = (sheet.paperHeight - 30) * DPI;
  ctx.strokeRect(tbX, tbY, 80 * DPI, 20 * DPI);

  ctx.fillStyle = "#000000";
  ctx.font = `${4 * DPI}px monospace`;
  ctx.fillText(sheet.title, tbX + 3 * DPI, tbY + 6 * DPI);
  ctx.font = `${3 * DPI}px monospace`;
  ctx.fillText(`Scale: ${sheet.scale}`, tbX + 3 * DPI, tbY + 11 * DPI);
  ctx.fillText(`Author: ${sheet.author}`, tbX + 3 * DPI, tbY + 15 * DPI);
  ctx.fillText(`Date: ${sheet.date}`, tbX + 3 * DPI, tbY + 19 * DPI);

  // Render views
  for (const view of sheet.views) {
    ctx.save();
    ctx.translate(view.sheetX * DPI, view.sheetY * DPI);

    // View label
    ctx.fillStyle = "#666666";
    ctx.font = `${3 * DPI}px sans-serif`;
    ctx.fillText(view.direction.toUpperCase(), 0, -5 * DPI);

    // Draw edges
    for (const edge of view.edges) {
      ctx.beginPath();
      ctx.moveTo(edge.x1 * DPI, -edge.y1 * DPI); // Flip Y for screen coords
      ctx.lineTo(edge.x2 * DPI, -edge.y2 * DPI);
      ctx.strokeStyle = edge.visible ? "#000000" : "#cccccc";
      ctx.lineWidth = edge.visible ? 1.5 : 0.5;
      if (!edge.visible) ctx.setLineDash([3, 3]);
      else ctx.setLineDash([]);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Render dimensions
  ctx.setLineDash([]);
  ctx.strokeStyle = "#0066cc";
  ctx.fillStyle = "#0066cc";
  ctx.lineWidth = 0.8;
  ctx.font = `${2.5 * DPI}px sans-serif`;

  for (const dim of sheet.dimensions) {
    // Dimension line
    ctx.beginPath();
    ctx.moveTo(dim.x1 * DPI, -dim.y1 * DPI + sheet.views[0]?.sheetY * DPI || 0);
    ctx.lineTo(dim.x2 * DPI, -dim.y2 * DPI + sheet.views[0]?.sheetY * DPI || 0);
    ctx.stroke();

    // Label
    ctx.fillText(dim.text, dim.labelX * DPI, -dim.labelY * DPI + (sheet.views[0]?.sheetY || 0) * DPI);
  }
}

/**
 * Export drawing as PNG download.
 */
export function exportDrawingPNG(sheet: DrawingSheet): void {
  const canvas = document.createElement("canvas");
  renderDrawingToCanvas(sheet, canvas);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sheet.title.replace(/\s+/g, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

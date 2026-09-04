/**
 * SVG-based chart generators for the Evaluación de Facilitadores PDF.
 *
 * Generates bar charts and doughnut charts as SVG strings, converts them to
 * PNG via sharp, and returns base64 data URLs for embedding in jsPDF.
 *
 * No external charting library — pure SVG string templating.
 */

import sharp from "sharp";

export interface ChartImage {
  base64: string;
  format: string;
  width: number;
  height: number;
}

const _cache = new Map<string, ChartImage>();

async function svgToPngDataUrl(
  svg: string,
  cacheKey: string,
  nativeW: number,
  nativeH: number,
): Promise<ChartImage> {
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const base64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  const result: ChartImage = { base64, format: "PNG", width: nativeW, height: nativeH };
  _cache.set(cacheKey, result);
  return result;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLORS = {
  violet: "#7c3aed",
  violetLight: "#c4b5fd",
  violetDark: "#5b21b6",
  green: "#10b981",
  greenLight: "#a7f3d0",
  amber: "#f59e0b",
  amberLight: "#fde68a",
  red: "#ef4444",
  redLight: "#fecaca",
  gray: "#9ca3af",
  grayLight: "#e5e7eb",
  darkBlue: "#0c3f69",
  white: "#ffffff",
  text: "#374151",
  textLight: "#6b7280",
};

// ─── Bar Chart (horizontal) ──────────────────────────────────────────────────

export interface BarChartDataItem {
  label: string;
  value: number;
  max: number;
  color?: string;
}

export interface BarChartOptions {
  width?: number;
  height?: number;
  title?: string;
  /** Max value for the scale (defaults to max of all items' max) */
  scaleMax?: number;
  /** Show value labels at the end of each bar */
  showValues?: boolean;
}

export async function generateBarChartPng(
  data: BarChartDataItem[],
  options: BarChartOptions = {},
  cacheKey: string,
): Promise<ChartImage> {
  const width = options.width || 600;
  const height = options.height || 400;
  const padding = { top: options.title ? 50 : 20, right: 60, bottom: 20, left: 180 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scaleMax = options.scaleMax || Math.max(...data.map((d) => d.max), 1);
  const barHeight = Math.min(30, chartH / data.length - 8);
  const barGap = (chartH - barHeight * data.length) / Math.max(data.length - 1, 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="${COLORS.white}"/>`;

  // Title
  if (options.title) {
    svg += `<text x="${width / 2}" y="28" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.darkBlue}">${escapeXml(options.title)}</text>`;
  }

  // Gridlines (25%, 50%, 75%, 100%)
  for (const pct of [0.25, 0.5, 0.75, 1.0]) {
    const x = padding.left + chartW * pct;
    svg += `<line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + chartH}" stroke="${COLORS.grayLight}" stroke-width="1" stroke-dasharray="3,3"/>`;
    svg += `<text x="${x}" y="${padding.top + chartH + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.textLight}">${(scaleMax * pct).toFixed(1)}</text>`;
  }

  // Bars
  data.forEach((item, i) => {
    const y = padding.top + i * (barHeight + barGap);
    const barW = Math.max(0, (item.value / scaleMax) * chartW);
    const color = item.color || COLORS.violet;

    // Label (left of bar)
    const labelLines = wrapText(item.label, 28);
    labelLines.forEach((line, li) => {
      svg += `<text x="${padding.left - 8}" y="${y + barHeight / 2 + (li - (labelLines.length - 1) / 2) * 12 + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.text}">${escapeXml(line)}</text>`;
    });

    // Bar background (track)
    svg += `<rect x="${padding.left}" y="${y}" width="${chartW}" height="${barHeight}" rx="3" fill="${COLORS.grayLight}"/>`;

    // Bar fill
    if (barW > 0) {
      svg += `<rect x="${padding.left}" y="${y}" width="${barW}" height="${barHeight}" rx="3" fill="${color}"/>`;
    }

    // Value label
    if (options.showValues !== false) {
      const valText = `${item.value.toFixed(1)}/${item.max.toFixed(0)}`;
      svg += `<text x="${padding.left + barW + 4}" y="${y + barHeight / 2 + 4}" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${COLORS.text}">${valText}</text>`;
    }
  });

  svg += `</svg>`;
  return svgToPngDataUrl(svg, cacheKey, width, height);
}

// ─── Doughnut Chart ──────────────────────────────────────────────────────────

export interface DoughnutChartDataItem {
  label: string;
  value: number;
  max: number;
  color: string;
}

export interface DoughnutChartOptions {
  width?: number;
  height?: number;
  title?: string;
  /** Text to show in the center (e.g., "85%") */
  centerText?: string;
  /** Subtitle below center text */
  centerSubtext?: string;
  /** Show legend below the chart */
  showLegend?: boolean;
}

export async function generateDoughnutPng(
  data: DoughnutChartDataItem[],
  options: DoughnutChartOptions = {},
  cacheKey: string,
): Promise<ChartImage> {
  const width = options.width || 400;
  const height = options.height || 400;
  const cx = width / 2;
  const cy = options.title ? height / 2 + 15 : height / 2;
  const radius = Math.min(width, height) * 0.35;
  const innerRadius = radius * 0.62;

  // Calculate total for proportion
  const totalMax = data.reduce((s, d) => s + d.max, 0) || 1;
  const totalValue = data.reduce((s, d) => s + d.value, 0);
  const overallPct = totalValue / totalMax;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="${width}" height="${height}" fill="${COLORS.white}"/>`;

  // Title
  if (options.title) {
    svg += `<text x="${cx}" y="24" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${COLORS.darkBlue}">${escapeXml(options.title)}</text>`;
  }

  // Background ring (gray)
  svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${COLORS.grayLight}" stroke-width="${radius - innerRadius}"/>`;

  // Draw segments
  if (totalValue > 0) {
    let startAngle = -Math.PI / 2; // start at top
    for (const item of data) {
      if (item.value <= 0) continue;
      const fraction = item.value / totalMax;
      const endAngle = startAngle + fraction * 2 * Math.PI;
      const path = arcPath(cx, cy, radius, innerRadius, startAngle, endAngle);
      svg += `<path d="${path}" fill="${item.color}"/>`;
      startAngle = endAngle;
    }
  }

  // Center text
  const centerText = options.centerText || `${(overallPct * 100).toFixed(1)}%`;
  svg += `<text x="${cx}" y="${cy + 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${COLORS.darkBlue}">${escapeXml(centerText)}</text>`;

  if (options.centerSubtext) {
    svg += `<text x="${cx}" y="${cy + 20}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="${COLORS.textLight}">${escapeXml(options.centerSubtext)}</text>`;
  }

  // Legend
  if (options.showLegend) {
    const legendY = height - 20;
    let legendX = 20;
    for (const item of data) {
      svg += `<rect x="${legendX}" y="${legendY - 8}" width="10" height="10" rx="2" fill="${item.color}"/>`;
      svg += `<text x="${legendX + 14}" y="${legendY}" font-family="Arial, sans-serif" font-size="10" fill="${COLORS.text}">${escapeXml(item.label)}</text>`;
      legendX += escapeXml(item.label).length * 6 + 30;
    }
  }

  svg += `</svg>`;
  return svgToPngDataUrl(svg, cacheKey, width, height);
}

// ─── Single-value doughnut (compliance %) ────────────────────────────────────

export async function generateComplianceDoughnutPng(
  pct: number,
  options: {
    width?: number;
    height?: number;
    title?: string;
    centerSubtext?: string;
    color?: string;
  },
  cacheKey: string,
): Promise<ChartImage> {
  const color = options.color || (pct >= 0.8 ? COLORS.green : pct >= 0.6 ? COLORS.amber : COLORS.red);
  return generateDoughnutPng(
    [
      { label: "Cumplimiento", value: pct, max: 1, color },
      { label: "Restante", value: 1 - pct, max: 1, color: COLORS.grayLight },
    ],
    {
      width: options.width || 300,
      height: options.height || 300,
      title: options.title,
      centerText: `${(pct * 100).toFixed(1)}%`,
      centerSubtext: options.centerSubtext,
    },
    cacheKey,
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines.slice(0, 2); // max 2 lines
}

/**
 * Generate an SVG arc path (ring segment) for a doughnut chart.
 */
function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1Outer = cx + outerR * Math.cos(startAngle);
  const y1Outer = cy + outerR * Math.sin(startAngle);
  const x2Outer = cx + outerR * Math.cos(endAngle);
  const y2Outer = cy + outerR * Math.sin(endAngle);
  const x1Inner = cx + innerR * Math.cos(endAngle);
  const y1Inner = cy + innerR * Math.sin(endAngle);
  const x2Inner = cx + innerR * Math.cos(startAngle);
  const y2Inner = cy + innerR * Math.sin(startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${x1Outer} ${y1Outer}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
    `L ${x1Inner} ${y1Inner}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
    "Z",
  ].join(" ");
}

/**
 * Canvas overlay that renders a Grad-CAM 14×14 heatmap on top of a chest X-ray.
 *
 * The heatmap payload (stored in roi_heatmap_path) is base64-encoded JSON:
 *   { type: "gradcam", grid: number[][], shape: [14, 14], version: string }
 *
 * Rendering pipeline:
 *   1. Decode the 14×14 float grid
 *   2. Bicubic-approximate upsample via an offscreen canvas → full display size
 *   3. Apply a clinical colour ramp: 0→transparent, 0.3→teal, 0.6→amber, 1→red
 *   4. Composite with alpha ≈ 0.55 over the image
 */

import { useEffect, useRef, useCallback } from "react";

interface GradCamPayload {
  type:    string;
  grid:    number[][];
  shape:   [number, number];
  version: string;
}

interface HeatmapOverlayProps {
  /** The raw roi_heatmap value from the DB (base64 JSON). */
  roiHeatmap:  string | null;
  /** Width of the parent image element (px). */
  width:       number;
  /** Height of the parent image element (px). */
  height:      number;
  /** 0–1 opacity of the overlay. Default: 0.55 */
  opacity?:    number;
  className?:  string;
}

// Clinical colour ramp: transparent → teal → amber → red
// Each stop: [activation_value, r, g, b, a]  (a is 0-255)
const COLOR_STOPS: [number, number, number, number, number][] = [
  [0.00,   0,   0,   0,   0],
  [0.20,  47, 142, 126,  60],   // teal  #2F8E7E
  [0.50,  47, 142, 126, 160],
  [0.65, 230, 160,  30, 200],   // amber
  [0.85, 210,  60,  30, 230],   // orange-red
  [1.00, 180,  20,  10, 255],   // deep red
];

function lerpColor(t: number): [number, number, number, number] {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const [v0, r0, g0, b0, a0] = COLOR_STOPS[i - 1];
    const [v1, r1, g1, b1, a1] = COLOR_STOPS[i];
    if (t <= v1) {
      const f = (t - v0) / (v1 - v0);
      return [
        Math.round(r0 + f * (r1 - r0)),
        Math.round(g0 + f * (g1 - g0)),
        Math.round(b0 + f * (b1 - b0)),
        Math.round(a0 + f * (a1 - a0)),
      ];
    }
  }
  return [180, 20, 10, 255];
}

function decodePayload(raw: string): GradCamPayload | null {
  try {
    const json = atob(raw);
    const obj  = JSON.parse(json);
    if (obj.type === "gradcam" && Array.isArray(obj.grid)) return obj as GradCamPayload;
    return null;
  } catch {
    return null;
  }
}

/** Bilinear interpolation into the 14×14 grid. */
function sampleGrid(grid: number[][], u: number, v: number): number {
  const rows = grid.length;
  const cols = grid[0].length;
  const gx   = u * (cols - 1);
  const gy   = v * (rows - 1);
  const x0   = Math.floor(gx), x1 = Math.min(x0 + 1, cols - 1);
  const y0   = Math.floor(gy), y1 = Math.min(y0 + 1, rows - 1);
  const fx   = gx - x0, fy = gy - y0;
  return (
    grid[y0][x0] * (1 - fx) * (1 - fy) +
    grid[y0][x1] *      fx  * (1 - fy) +
    grid[y1][x0] * (1 - fx) *      fy  +
    grid[y1][x1] *      fx  *      fy
  );
}

export function HeatmapOverlay({ roiHeatmap, width, height, opacity = 0.55, className }: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !roiHeatmap || width <= 0 || height <= 0) return;

    const payload = decodePayload(roiHeatmap);
    if (!payload) return;

    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    const data      = imageData.data;

    for (let py = 0; py < height; py++) {
      const v = py / (height - 1);
      for (let px = 0; px < width; px++) {
        const u   = px / (width - 1);
        const val = sampleGrid(payload.grid, u, v);
        const [r, g, b, a] = lerpColor(val);
        const idx = (py * width + px) * 4;
        data[idx]     = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [roiHeatmap, width, height]);

  useEffect(() => { draw(); }, [draw]);

  if (!roiHeatmap) return null;

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset:    0,
        width,
        height,
        opacity,
        mixBlendMode: "multiply",
        pointerEvents: "none",
        borderRadius: "inherit",
      }}
    />
  );
}

/** Hook: returns { isGradCam, heatmapData } from a raw roi_heatmap string. */
export function useHeatmapType(roiHeatmap: string | null) {
  if (!roiHeatmap) return { isGradCam: false, heatmapData: null };
  const payload = decodePayload(roiHeatmap);
  return {
    isGradCam:   payload !== null,
    heatmapData: payload,
  };
}

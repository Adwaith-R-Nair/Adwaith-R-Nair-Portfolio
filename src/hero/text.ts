export interface TextRaster {
  rgba: Uint8ClampedArray;
  w: number;
  h: number;
  /** Rendered text width in canvas pixels, for scaling to the viewport. */
  textWidth: number;
}

/** One fillText on a 2048x512 canvas. Cheap, and it can use the page's loaded fonts. */
export function rasteriseText(text: string, font: string, w = 2048, h = 512): TextRaster {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return { rgba: new Uint8ClampedArray(w * h * 4), w, h, textWidth: 1 };
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = font;
  g.fillText(text, w / 2, h / 2);
  return { rgba: g.getImageData(0, 0, w, h).data, w, h, textWidth: Math.max(1, g.measureText(text).width) };
}

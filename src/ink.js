// ---- The ink of a text ----------------------------------------------------------------
// Where the visible ink of a piece of text really is, read from the pixels
// of its own rasterized glyphs: what a text is aligned by when its box is not
// enough (the hero's and Contact's headlines against the logo and the clock,
// main.js; the titles of the Works page from margin to margin, works.js).
// Neither a Range's box (advance widths and the font's generic ascent and
// descent) nor canvas measureText()'s actualBoundingBox* (measured: off by
// several px at these sizes) is the ink.
const inkCanvas = document.createElement("canvas");
const inkCtx = inkCanvas.getContext("2d", { willReadFrequently: true });
const rasterInkCache = new Map();
// Anything rasterized before a webfont arrived used a fallback font: forget it.
export function clearInkCache() {
  rasterInkCache.clear();
}

// 50%-coverage edges from per-column / per-row max alpha (0..1), sub-pixel.
export function coverageEdges(cov) {
  let first = -1;
  let last = -1;
  for (let i = 0; i < cov.length; i++) {
    if (cov[i] >= 0.5) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return null;
  const at = (i) => cov[i] || 0;
  return { start: first + 1 - at(first) - at(first - 1), end: last + at(last) + at(last + 1) };
}

// Ink box of `text` relative to its origin/baseline, in px, plus its
// advance width. Cached per font + text (fonts/sizes only change on resize).
export function rasterInk(font, text, fontSizePx) {
  const key = `${font}|${text}`;
  const cached = rasterInkCache.get(key);
  if (cached) return cached;
  inkCtx.font = font;
  const advance = inkCtx.measureText(text).width;
  const pad = Math.ceil(fontSizePx);
  inkCanvas.width = Math.ceil(advance + pad * 2);
  inkCanvas.height = Math.ceil(fontSizePx * 3);
  const originX = pad;
  const originY = Math.ceil(fontSizePx * 2);
  inkCtx.font = font; // resizing the canvas resets its state
  inkCtx.textBaseline = "alphabetic";
  inkCtx.fillStyle = "#fff";
  inkCtx.fillText(text, originX, originY);
  const { data, width, height } = inkCtx.getImageData(0, 0, inkCanvas.width, inkCanvas.height);
  const colCov = new Float32Array(width);
  const rowCov = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3] / 255;
      if (alpha > colCov[x]) colCov[x] = alpha;
      if (alpha > rowCov[y]) rowCov[y] = alpha;
    }
  }
  const h = coverageEdges(colCov);
  const v = coverageEdges(rowCov);
  const ink = h && v
    ? { left: h.start - originX, right: h.end - originX, top: v.start - originY, bottom: v.end - originY, advance }
    : { left: 0, right: advance, top: 0, bottom: 0, advance };
  rasterInkCache.set(key, ink);
  return ink;
}

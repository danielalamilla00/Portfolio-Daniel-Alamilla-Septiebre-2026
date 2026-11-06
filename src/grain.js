// ---- The web's grain --------------------------------------------------------------
// One grain for every dark background of the site, the one of the "Still
// thirsty for more?" panel: fine static noise, one value per device pixel,
// the same for the three channels, as much lighter as darker than the color
// under it. A flat background has it by having the class .grain
// (applyGrain() below fills it in); the auras' shader adds the same to every
// pixel it paints (GRAIN is its uGrain), so a canvas with an aura on black
// and a .grain background next to it are the same to the eye.
//
// How strong every grain of the web is, all here: GRAIN_STRENGTH turns them
// all up or down together (1: as they were until 2026-11-06), each one keeping
// its own amount against the others.
//   GRAIN          the dark and cream backgrounds (.grain) and the auras'
//                  shader (aura.js: the home's hero and Contact, the
//                  projects' end): amplitude, peak-to-peak, 0..1 of the range
//   GRAIN_TITLES   over the gradient of the titles and the pill buttons
//                  (--more-grain, set on :root here): how opaque a pixel of
//                  it gets at the most
//   GRAIN_PLANE    over Experience's paper plane (experience.js), the same
//   GRAIN_PICTURE  over About me's picture (about.js), the same
// (Its size is type.css's: --grain-size, the side of the tile, in device px;
// --grain-blend, how that tile is laid on its background.)
export const GRAIN_STRENGTH = 0.5;
export const GRAIN = 0.06 * GRAIN_STRENGTH;
export const GRAIN_TITLES = 0.28 * GRAIN_STRENGTH;
export const GRAIN_PLANE = 0.28 * GRAIN_STRENGTH;
export const GRAIN_PICTURE = 0.1 * GRAIN_STRENGTH;
const sheet = getComputedStyle(document.documentElement);
const GRAIN_TILE = parseFloat(sheet.getPropertyValue("--grain-size")) || 256;

// The titles' grain: an SVG of noise, each pixel white or black, up to
// GRAIN_TITLES opaque.
document.documentElement.style.setProperty(
  "--more-grain",
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g' x='0' y='0' width='100%25' height='100%25' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='discrete' tableValues='0 1'/%3E%3CfeFuncG type='discrete' tableValues='0 1'/%3E%3CfeFuncB type='discrete' tableValues='0 1'/%3E%3CfeFuncA type='table' tableValues='${GRAIN_TITLES} 0 ${GRAIN_TITLES}'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`
);

// A square tile of `rgb` ([r, g, b], 0..255) with the grain in it, as a data
// URL: what a flat background of that color is covered with.
function grainTile(rgb) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = GRAIN_TILE;
  const context = canvas.getContext("2d");
  const image = context.createImageData(GRAIN_TILE, GRAIN_TILE);
  for (let i = 0; i < image.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * GRAIN * 255;
    image.data[i] = rgb[0] + noise;
    image.data[i + 1] = rgb[1] + noise;
    image.data[i + 2] = rgb[2] + noise;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

// Every .grain element gets the tile of its own background color (one tile
// per color, made once), a device pixel of it to a device pixel of screen.
const tiles = new Map();
export function applyGrain() {
  document.documentElement.style.setProperty("--grain-tile-size", `${GRAIN_TILE / Math.min(window.devicePixelRatio, 2)}px`);
  document.querySelectorAll(".grain").forEach((el) => {
    const color = getComputedStyle(el).backgroundColor;
    const [r, g, b, alpha = 1] = color.match(/[\d.]+/g).map(Number);
    if (!alpha) return; // nothing of its own to put it on
    if (!tiles.has(color)) tiles.set(color, grainTile([r, g, b]));
    el.style.backgroundImage = `url(${tiles.get(color)})`;
  });
}

// The grain for over a picture, where there is no one color to make it of: a
// tile of white and black pixels, each `amount` opaque at the most, as a data
// URL (About me's picture, which has more of it than the backgrounds).
export function grainOverlay(amount, size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  const image = context.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.random() * 2 - 1;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value > 0 ? 255 : 0;
    image.data[i + 3] = Math.abs(value) * amount * 255;
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

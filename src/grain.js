// ---- The web's grain --------------------------------------------------------------
// One grain for every dark background of the site, the one of the "Still
// thirsty for more?" panel: fine static noise, one value per device pixel,
// the same for the three channels, as much lighter as darker than the color
// under it. Its numbers are type.css's (on :root):
//   --grain-opacity   its amplitude, peak-to-peak (0..1 of the whole range)
//   --grain-size      the side of the tile it is made as, in device px
//   --grain-blend     how that tile is laid on its background
// A flat background has it by having the class .grain (applyGrain() below
// fills it in); the auras' shader adds the same to every pixel it paints
// (GRAIN is its uGrain), so a canvas with an aura on black and a .grain
// background next to it are the same to the eye.
const sheet = getComputedStyle(document.documentElement);
export const GRAIN = parseFloat(sheet.getPropertyValue("--grain-opacity")) || 0.06;
const GRAIN_TILE = parseFloat(sheet.getPropertyValue("--grain-size")) || 256;

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

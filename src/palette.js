// The site's oranges, in one place. The aura (main.js, "Aura") and the
// bars of #more-projects both read their colors from here, and main.js
// also writes them out as CSS variables on :root (applyPalette): change
// one and it changes everywhere.
//
//   key                 CSS variable               where the aura uses it
//   cream               --c-cream                  (not in the aura any more: it was the
//                                                  off-white page behind it; the bars start on it)
//   peach               --c-peach                  halo between the rim and the page
//   yellowOrangeLight   --c-yellow-orange-light    very center
//   yellowOrange        --c-yellow-orange          center, a little further out
//   orange              --c-orange                 vivid orange ring
//   orangeWarm          --c-orange-warm            outer part of that ring
//   orangeDeep          --c-orange-deep            the flat tone of the orange itself, where the morph starts
//   coral               --c-coral                  rim
//   dark                --c-dark                   the page behind the aura
export const ORANGE_PALETTE = {
  cream: "#f6ecdd",
  peach: "#f4b79a",
  yellowOrangeLight: "#ffc46b",
  yellowOrange: "#ffb347",
  orange: "#ff8a2a",
  orangeWarm: "#fc7c4a",
  orangeDeep: "#ff5212",
  coral: "#e8552a",
  dark: "#141414",
};

// "#rrggbb" -> [r, g, b], 0..255
export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// yellowOrangeLight -> --c-yellow-orange-light
export function applyPalette(root = document.documentElement) {
  Object.entries(ORANGE_PALETTE).forEach(([name, color]) => {
    root.style.setProperty(`--c-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, color);
  });
}

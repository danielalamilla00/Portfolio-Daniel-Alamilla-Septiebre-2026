// ---- The window's size, for every page --------------------------------------------
// What depends on it is worked out again when it changes — once it has
// settled, not at every step of a window being dragged (VIEWPORT_SETTLE_MS
// after the last "resize" or "orientationchange"), in the order it was asked
// for. On a phone the browser's own bar coming and going changes the height
// and nothing else: only what asked for `always` runs then (a canvas has to
// cover the screen whatever happens); the rest stays where it was, so
// nothing jumps as the bar hides.
const VIEWPORT_SETTLE_MS = 150;
const touch = window.matchMedia("(hover: none) and (pointer: coarse)");
const listeners = [];
let width = window.innerWidth;
let timer = 0;
function settle() {
  const barOnly = touch.matches && window.innerWidth === width;
  width = window.innerWidth;
  listeners.forEach((listener) => {
    if (listener.always || !barOnly) listener.run();
  });
}
function changed() {
  clearTimeout(timer);
  timer = setTimeout(settle, VIEWPORT_SETTLE_MS);
}
window.addEventListener("resize", changed);
window.addEventListener("orientationchange", changed);
export function onViewportChange(run, always = false) {
  listeners.push({ run, always });
}

// The breakpoints, the stylesheets' own: a phone under 768px wide, a tablet
// from there to 1024px, a desktop over that.
export const MOBILE_MAX_PX = 767;
export const TABLET_MAX_PX = 1024;
// How many device pixels a canvas draws per CSS pixel: fewer on a touch
// screen, whose pixels are small and whose GPU is not a desktop's.
export const canvasPixelRatio = () => Math.min(window.devicePixelRatio, touch.matches ? 1.5 : 2);

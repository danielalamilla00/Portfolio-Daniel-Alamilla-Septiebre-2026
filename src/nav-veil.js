import { onViewportChange } from "./viewport.js";

// ---- Behind the nav: the veil ------------------------------------------------------------
// So that nothing that goes under the nav — a text, a picture — is ever seen
// through its logo, links and clock: a layer fixed behind it, the page's
// black at the top, as tall as the nav, and fading to nothing
// NAV_VEIL_FADE_PX under it, with the web's grain over it (.grain: so its
// foot does not show). What goes under it is hidden under it.
// Over an aura or another colour (the home's hero, its showreel, the head of
// a project's page) it would cover what should be seen: there the page says
// it is clear (`isClear(navFoot)`, asked as the page scrolls), and it is
// off, fading.
// Made before the page's grain is (applyGrain), which gives it its own.
export const NAV_VEIL_FADE_PX = 60;
export const NAV_SAFE_PX = 32; // under the nav's foot, where a page's words and pictures may start

export function setupNavVeil(isClear) {
  const nav = document.querySelector("#site-nav");
  const veil = document.createElement("div");
  veil.className = "nav-veil grain";
  veil.setAttribute("aria-hidden", "true");
  nav.before(veil);
  const size = () => veil.style.setProperty("--nav-veil-nav", `${nav.getBoundingClientRect().height}px`);
  const update = () => veil.classList.toggle("is-off", isClear(nav.getBoundingClientRect().bottom));
  size();
  update();
  window.addEventListener("scroll", update, { passive: true });
  onViewportChange(() => {
    size();
    update();
  });
  return update;
}

// Whether any of `elements` is seen in the band from the top of the screen
// down to `bottom` (not hidden, nor faded out: it or what it is in).
const seen = (el) => {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const style = getComputedStyle(e);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.05) return false;
  }
  return true;
};
export const anyUnder = (elements, bottom) => elements.some((el) => {
  const box = el.getBoundingClientRect();
  return box.height > 0 && box.top < bottom && box.bottom > 0 && seen(el);
});

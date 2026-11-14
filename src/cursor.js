// ---- The web's cursor ----------------------------------------------------------------
// With a mouse, on every page, the pointer's own is hidden (style.css) and
// this one is drawn in its place: a small full circle in cream with a black
// dot in its middle, and behind it a soft orange halo that follows it later,
// like a trail. Each follows the pointer by a share of the way left every
// frame (CURSOR_LERP, the halo HALO_LERP: at 60fps; the same feel at any
// frame rate).
// What is under it may ask for another (data-cursor on it or on what it is
// in):
//   "video"  a video that plays when pressed (a project's cover): the circle
//            grows (style.css), a small play in it, "Play" up at its right,
//            the halo gone;
//   "grow"   a card that opens a project (Works, the end's carousel): the
//            circle only grows, a little.
// Its colours go with the ground under it: cream with black in it on a dark
// one (and on a picture or a video), black with cream in it on a light one —
// read from the first thing under the pointer with a background colour of
// its own (groundIsLight). Never on a screen that is only touched.
const CURSOR_LERP = 0.18;
const HALO_LERP = 0.08;
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.8 5.2v13.6a.8.8 0 0 0 1.2.7l10.9-6.8a.8.8 0 0 0 0-1.4L7 4.5A.8.8 0 0 0 5.8 5.2Z" fill="currentColor"/></svg>';
const MEDIA = /^(IMG|VIDEO|CANVAS|PICTURE|IFRAME)$/;
const LIGHT_FROM = 0.5; // relative luminance from which a ground is light

// (what is under it, without the cursor itself: it takes no pointer events)
function groundIsLight(el) {
  for (let at = el; at && at !== document.documentElement; at = at.parentElement) {
    if (MEDIA.test(at.tagName)) return false;
    const [r, g, b, a = 1] = (getComputedStyle(at).backgroundColor.match(/[\d.]+/g) || []).map(Number);
    if (a >= 0.5) return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 >= LIGHT_FROM;
  }
  return false;
}

export function setupCursor() {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!fine.matches) return;
  const piece = (className) => {
    const el = document.createElement("div");
    el.className = className;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  };
  const halo = piece("cursor-halo");
  const cursor = piece("cursor");
  cursor.innerHTML = `<span class="cursor-ball"><span class="cursor-dot"></span><span class="cursor-play">${ICON_PLAY}</span></span><span class="cursor-label">Play</span>`;
  document.documentElement.classList.add("has-cursor");

  let x = 0; // the pointer
  let y = 0;
  const at = { x: 0, y: 0 }; // the circle
  const trail = { x: 0, y: 0 }; // the halo
  let shown = false;
  let frame = 0;
  let then = 0;
  let looked = true; // what is under it, to be looked at again
  const place = (el, p) => (el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`);
  // what is under it: its mode and its ground
  function look() {
    looked = false;
    const under = document.elementFromPoint(x, y);
    const mode = under && under.closest("[data-cursor]");
    cursor.dataset.mode = mode ? mode.dataset.cursor : "";
    halo.classList.toggle("is-gone", Boolean(mode && mode.dataset.cursor === "video"));
    cursor.classList.toggle("is-light", Boolean(under) && groundIsLight(under));
  }
  function tick(now) {
    const frames = then ? Math.min((now - then) / (1000 / 60), 30) : 1;
    then = now;
    if (looked) look();
    const ease = (lerp) => 1 - (1 - lerp) ** frames;
    at.x += (x - at.x) * ease(CURSOR_LERP);
    at.y += (y - at.y) * ease(CURSOR_LERP);
    trail.x += (x - trail.x) * ease(HALO_LERP);
    trail.y += (y - trail.y) * ease(HALO_LERP);
    const still = Math.hypot(x - trail.x, y - trail.y) < 0.1 && Math.hypot(x - at.x, y - at.y) < 0.1;
    if (still) Object.assign(at, { x, y }), Object.assign(trail, { x, y });
    place(cursor, at);
    place(halo, trail);
    frame = still ? 0 : requestAnimationFrame(tick);
  }
  const go = () => {
    if (!frame) {
      then = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  const show = (on) => {
    shown = on;
    cursor.classList.toggle("is-on", on);
    halo.classList.toggle("is-on", on);
  };
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return show(false);
    x = event.clientX;
    y = event.clientY;
    looked = true;
    if (!shown) {
      // (where it is at once, not coming from where it was left)
      Object.assign(at, { x, y });
      Object.assign(trail, { x, y });
      show(true);
    }
    go();
  });
  document.documentElement.addEventListener("pointerleave", () => show(false));
  // (the page moved under a still pointer, or changed under it: looked at again)
  const again = () => {
    if (!shown) return;
    looked = true;
    go();
  };
  window.addEventListener("scroll", again, { passive: true });
  window.addEventListener("click", () => setTimeout(again), true);
  window.addEventListener("keyup", again);
}

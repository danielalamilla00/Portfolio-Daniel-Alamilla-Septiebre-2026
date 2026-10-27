import * as THREE from "three";
import { applyPalette } from "./palette.js";
import { createAura } from "./aura.js";
import { startNavClock } from "./clock.js";
import { PROJECTS, projectUrl } from "./data/projects.js";
import { plainTitle, titleParts } from "./title.js";
import { rasterInk, clearInkCache, whenFontsLoad } from "./ink.js";
import { onViewportChange, canvasPixelRatio, MOBILE_MAX_PX } from "./viewport.js";
import { setupMenu } from "./menu.js";

// ---- Works: every project, a row each --------------------------------------------------
// The rows of works.html, one per project (src/data/projects.js), from the
// first to the last. Nothing scrolls: one number, the list's position, says
// which row is at the middle of the screen, and every frame each row is put
// where that number says — its top edge, how big its picture, how bright its
// title. Transforms and opacity only; the sizes that depend on the screen are
// worked out once (and on resize), never while it moves.
//
// A row goes from its line to the next row's, its picture (16:9, always) in
// the middle of the two — at least WORKS_THUMB_MARGIN_PX from each, at every
// size it takes — its title hanging from its line at the left margin, as
// wide as the room there is beside the picture at its biggest, less
// WORKS_TITLE_GAP_PX, on two lines if one is not enough; and its description
// at the right margin, as far from the picture as the title is (the two
// mirror each other across the middle of the page: so they stay at the same
// distance from it at every size it takes), on three lines at most — wider
// if three lines are not enough for it there (the row is taller if they
// need it). Where two lines are not enough for a title — a
// phone, a narrow screen — both go over the picture, the description under
// the title, as wide as the page. At rest the picture is
// WORKS_THUMB_VW wide; in the row at the middle, WORKS_THUMB_ACTIVE_VW
// (WORKS_MOBILE_* up to MOBILE_MAX_PX wide): the one box, scaled. The
// height it gains belongs to the middle of the screen, not to a row: a row
// has as much of it as it is over that middle, so as one row opens the one
// leaving closes by the same and the rows around only move to make room. The
// same share (0..1) takes its title and description from WORKS_TITLE_DIM to
// all there.
const WORKS_THUMB_VW = 18;
const WORKS_THUMB_ACTIVE_VW = 40;
const WORKS_MOBILE_THUMB_VW = 40;
const WORKS_MOBILE_THUMB_ACTIVE_VW = 84;
const WORKS_THUMB_RATIO = 16 / 9;
const WORKS_THUMB_MARGIN_PX = 16;
const WORKS_TITLE_GAP_PX = 32;
const WORKS_TITLE_LINES = 2;
const WORKS_DESC_GAP_PX = 12; // (over the picture: between the title and its description)
// The titles (style.css sizes them): each starts with the INK of its first
// letter on the page's left margin, the logo's left edge — measured from its
// own pixels (ink.js, as the hero's headline; drawn WORKS_TITLE_PROBE_PX
// big) — WORKS_TITLE_TOP_PX under its row's line (works.css: .wk-name).
// Where it breaks into two lines is worked out for the picture at its
// biggest, so that a title does not jump from one line to two as its row
// opens.
const WORKS_TITLE_PROBE_PX = 200;
const WORKS_TITLE_TOP_PX = 9;
const WORKS_TITLE_DIM = 0.5;
// How it moves: the position follows where the wheel, a finger or the keys
// have sent it with the web's damping (1 - exp(-WORKS_DAMPING * delta) per
// frame, as the home's AURA_DAMPING), never past the first row or the last;
// WORKS_SNAP_AFTER_MS after the last of them, it is sent to the nearest row,
// which that same damping centers.
//   WORKS_FLING_S     a finger that lets go while moving sends it this many
//                     seconds further at the speed it had
//   WORKS_ACTIVE_FROM how open a row has to be to be the active one: its
//                     video plays, its link works
//   WORKS_NEAR_ROWS   rows either side of the screen whose pictures are
//                     already loaded
const WORKS_DAMPING = 5;
const WORKS_SNAP_AFTER_MS = 140;
const WORKS_FLING_S = 0.25;
const WORKS_ACTIVE_FROM = 0.6;
const WORKS_NEAR_ROWS = 3;
// The background: the aura of the home's creativity phase — the same shader,
// colors, rim and grain (aura.js) — as a whole circle in the middle of the
// screen, still behind the list, bigger than the screen is tall: its rim
// goes to the page's black towards the sides, and the corners of the screen
// are black.
//   WORKS_AURA_CENTER        its center, as fractions of the width and height
//   WORKS_AURA_DIAMETER_VH   its diameter (WORKS_MOBILE_AURA_DIAMETER_VW of
//                            the width up to MOBILE_MAX_PX wide)
//   WORKS_AURA_INTENSITY     how opaque it is over the black (1 = as the
//                            home's). Lower, so darker, here: as much as it
//                            takes for the cream title of the row at the
//                            middle to read on it wherever it is (measured:
//                            3:1 at least; WORKS_MOBILE_AURA_INTENSITY where
//                            the titles are over its middle)
const WORKS_AURA_CENTER = [0.5, 0.5];
const WORKS_AURA_DIAMETER_VH = 170;
const WORKS_MOBILE_AURA_DIAMETER_VW = 180;
const WORKS_AURA_INTENSITY = 0.82;
const WORKS_MOBILE_AURA_INTENSITY = 0.72;
const WORKS_BLACK = [10, 10, 10]; // the page's (works.css)

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

applyPalette();
startNavClock();
setupMenu();
const stage = document.querySelector(".wk");
// The aura: its own small renderer, drawn once per size of the screen.
const auraCanvas = stage.querySelector(".wk-aura");
const auraRenderer = new THREE.WebGLRenderer({ canvas: auraCanvas, antialias: false });
auraRenderer.setPixelRatio(canvasPixelRatio());
const aura = createAura(WORKS_BLACK);
const auraScene = new THREE.Scene();
auraScene.add(aura.mesh);
const auraCamera = new THREE.Camera(); // the quad places itself (aura.vert.glsl)
function drawAura(width, height) {
  auraRenderer.setSize(width, height, false);
  const { uniforms } = aura;
  uniforms.uViewport.value.set(width, height);
  uniforms.uPixelRatio.value = auraRenderer.getPixelRatio();
  uniforms.uCenter.value.set(WORKS_AURA_CENTER[0] * width, WORKS_AURA_CENTER[1] * height);
  uniforms.uRadius.value = (width <= MOBILE_MAX_PX ? (WORKS_MOBILE_AURA_DIAMETER_VW / 100) * width : (WORKS_AURA_DIAMETER_VH / 100) * height) / 2;
  uniforms.uAlpha.value = width <= MOBILE_MAX_PX ? WORKS_MOBILE_AURA_INTENSITY : WORKS_AURA_INTENSITY;
  auraRenderer.render(auraScene, auraCamera);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// -- the rows ------------------------------------------------------------------------
const element = (tag, className, text) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
};
const rowsEl = stage.querySelector(".wk-rows");
const rows = PROJECTS.map((project, index) => {
  // A link to its page, or — with none yet — just a row.
  const url = projectUrl(project);
  const el = element(url ? "a" : "div", url ? "wk-row is-off" : "wk-row is-soon is-off");
  if (url) el.href = url;
  else {
    el.tabIndex = 0;
    el.setAttribute("aria-label", `${plainTitle(project.title)} (coming soon)`);
  }
  // (its title in the web's two letters, and what it is)
  const text = element("span", "wk-text");
  const name = element("span", "wk-name");
  name.append(...titleParts(project.title));
  text.appendChild(name);
  const desc = project.description ? element("span", "wk-desc", project.description) : null;
  const thumb = element("span", "wk-thumb");
  const zoom = element("span", "wk-zoom");
  const image = element("img", "");
  image.alt = "";
  image.decoding = "async";
  zoom.appendChild(image);
  let video = null;
  if (project.preview) {
    video = element("video", "");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "none";
    video.addEventListener("playing", () => el.classList.toggle("is-playing", row.active));
    zoom.appendChild(video);
  }
  // Over the picture under the cursor: darker (and, a project with no page
  // yet, that it is on its way). Where there is no cursor, what a tap on the
  // row at the middle does shows on it instead (.wk-view).
  zoom.appendChild(element("span", "wk-shade"));
  zoom.appendChild(url ? element("span", "wk-view", "View project →") : element("span", "wk-soon", "Coming soon"));
  thumb.appendChild(zoom);
  el.append(element("span", "wk-line"), text, ...(desc ? [desc] : []), thumb);
  rowsEl.appendChild(el);
  const row = { el, index, project, text, name, desc, thumb, image, video, top: 0, bottom: 0, open: -1, off: true, loaded: false, active: false };
  return row;
});

// -- sizes: worked out here, never while it moves ----------------------------------------
let height = 0;
let pitch = 1; // a row at rest, px
let extra = 0; // what the row at the middle has over that, px
let thumbRest = 1; // the picture's size at rest, as a share of what it is in the row at the middle
let thumbTall = 0; // the picture's height in the row at the middle, px
let head = 0; // what the title takes over the picture (when it is over it), px
let middle = 0; // where the middle of the active row is: the picture's at the middle of the screen
function measure() {
  const at = position / pitch; // which row is at the middle: kept through a resize
  const width = stage.clientWidth;
  height = stage.clientHeight;
  drawAura(width, height);
  const mobile = width <= MOBILE_MAX_PX;
  const thumbWide = ((mobile ? WORKS_MOBILE_THUMB_ACTIVE_VW : WORKS_THUMB_ACTIVE_VW) / 100) * width;
  thumbTall = thumbWide / WORKS_THUMB_RATIO;
  thumbRest = (mobile ? WORKS_MOBILE_THUMB_VW : WORKS_THUMB_VW) / (mobile ? WORKS_MOBILE_THUMB_ACTIVE_VW : WORKS_THUMB_ACTIVE_VW);
  stage.style.setProperty("--wk-thumb-width", `${thumbWide}px`);

  // The titles: each one's ink on the margin (what its first letter leaves
  // before it, from its pixels: those of its first part, in that part's
  // letters).
  const margin = parseFloat(getComputedStyle(rows[0].el.querySelector(".wk-line")).left);
  const lefts = rows.map((row) => {
    const first = row.name.firstElementChild || row.name;
    const style = getComputedStyle(first);
    const font = `${style.fontStyle} ${style.fontWeight} ${WORKS_TITLE_PROBE_PX}px ${style.fontFamily}`;
    return (rasterInk(font, first.textContent, WORKS_TITLE_PROBE_PX).left * parseFloat(style.fontSize)) / WORKS_TITLE_PROBE_PX;
  });
  rows.forEach((row, index) => row.name.style.setProperty("--wk-name-ink", `${(-lefts[index]).toFixed(2)}px`));
  // How wide a title and its description can be: beside the picture at its
  // biggest (on either side of it), less the gap — if every title fits in two
  // lines there; if not (or on a phone), over the picture, as wide as the
  // page, the description under its title. How far down the words of the
  // row that has the most go, then.
  const room = (width - thumbWide) / 2 - margin - WORKS_TITLE_GAP_PX;
  const fit = (wide) => {
    rows.forEach((row) => (row.text.style.maxWidth = wide));
    return Math.max(...rows.map((row) => row.name.offsetHeight));
  };
  const lineTall = fit("none"); // (one line of the two letters: measured, they do not share their heights)
  const beside = !mobile && fit(`${room}px`) <= lineTall * WORKS_TITLE_LINES + 1;
  if (!beside) fit(`${width - 2 * margin}px`);
  stage.classList.toggle("is-stacked", !beside);
  stage.style.setProperty("--wk-desc-width", `${beside ? room : width - 2 * margin}px`);
  rows.forEach((row) => row.desc && (row.desc.style.top = beside ? "" : `${WORKS_TITLE_TOP_PX + row.name.offsetHeight + WORKS_DESC_GAP_PX}px`));
  // (beside the picture, each description as wide as its title's ink reaches
  // from the margin — its mirror — or as much wider as its three lines need)
  rows.forEach((row) => {
    if (!row.desc) return;
    if (!beside) {
      row.desc.style.width = "";
      return;
    }
    const ink = document.createRange();
    ink.selectNodeContents(row.name);
    let wide = Math.min(ink.getBoundingClientRect().right - margin, room);
    row.desc.style.width = `${wide}px`;
    while (row.desc.scrollHeight > row.desc.clientHeight + 1 && wide < room) {
      wide = Math.min(wide + 8, room);
      row.desc.style.width = `${wide}px`;
    }
  });
  const deepest = Math.max(...rows.map((row) => Math.max(WORKS_TITLE_TOP_PX + row.text.offsetHeight, row.desc ? row.desc.offsetTop + row.desc.offsetHeight : 0)));
  head = beside ? 0 : deepest;

  // A row at rest: its picture with the margin above and under it — or, if
  // its title needs more, as tall as that; the row at the middle has the
  // picture's growth over that.
  extra = thumbTall * (1 - thumbRest);
  pitch = Math.max(head + thumbTall * thumbRest + 2 * WORKS_THUMB_MARGIN_PX, deepest + WORKS_THUMB_MARGIN_PX);
  // (the active row's picture at the middle of the screen)
  middle = height / 2 - head / 2;
  position = target = at * pitch;
  rows.forEach((row) => (row.open = -1));
}

// -- the list's position -----------------------------------------------------------------
// In px of rows at rest: 0 has the first project at the middle, `pitch` the
// second, and so on to the last.
let position = 0; // where it is
let target = 0; // where it is going
let lastInput = -Infinity; // time of the last wheel, finger or key
let touching = false;
let running = false;
let lastFrame = 0;
const last = () => (rows.length - 1) * pitch;

// How far down the screen (from `middle`) a point `x` rows from the row at
// the middle is: the rows at rest, plus the share of the extra height that is
// above it. That extra is spread, as a smooth bump, over the one row's worth
// of list that is at the middle.
const TAU = Math.PI * 2;
const place = (x) => {
  const inside = clamp(x, -0.5, 0.5);
  return pitch * x + extra * (inside + Math.sin(TAU * inside) / TAU);
};

function draw() {
  const at = position / pitch;
  for (const row of rows) {
    const x = row.index - at;
    const top = middle + place(x - 0.5);
    const bottom = middle + place(x + 0.5);
    row.top = top;
    row.bottom = bottom;
    if (!row.loaded && Math.abs(x) < height / pitch / 2 + WORKS_NEAR_ROWS) {
      row.loaded = true;
      row.image.src = encodeURI(row.project.cover);
    }
    const off = bottom < 0 || top > height;
    if (off !== row.off) {
      row.off = off;
      row.el.classList.toggle("is-off", off);
      if (off) {
        row.open = -1;
        activate(row, false);
      }
    }
    if (off) continue;
    row.el.style.transform = `translate3d(0, ${top.toFixed(2)}px, 0)`;
    const open = clamp((bottom - top - pitch) / extra, 0, 1); // how much of the extra height it has
    if (open === row.open) continue;
    row.open = open;
    // (the picture in the middle of what the row has under its title, from
    // the row's height as it is now)
    const scale = thumbRest + (1 - thumbRest) * open;
    const down = head + (bottom - top - head - thumbTall * scale) / 2;
    row.thumb.style.transform = `translate3d(-50%, ${down.toFixed(2)}px, 0) scale(${scale.toFixed(5)})`;
    const dim = (WORKS_TITLE_DIM + (1 - WORKS_TITLE_DIM) * open).toFixed(3);
    row.text.style.opacity = dim;
    if (row.desc) row.desc.style.opacity = dim;
    activate(row, open >= WORKS_ACTIVE_FROM);
  }
}
// The row at the middle: its link works, its video plays; the cover otherwise.
function activate(row, on) {
  if (on === row.active) return;
  row.active = on;
  row.el.classList.toggle("is-active", on);
  if (!row.video) return;
  if (on) {
    if (!row.video.src) row.video.src = encodeURI(row.project.preview);
    row.video.play().catch(() => {}); // (not allowed to, or already gone: the cover stays)
  } else {
    row.video.pause();
    row.el.classList.remove("is-playing");
  }
}

function frame(now) {
  const delta = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  // The magnet: left alone, it goes to the nearest row.
  const resting = !touching && now - lastInput > WORKS_SNAP_AFTER_MS;
  if (resting) target = Math.round(target / pitch) * pitch;
  position += (target - position) * (reducedMotion ? 1 : 1 - Math.exp(-WORKS_DAMPING * delta));
  if (Math.abs(target - position) < 0.05) position = target;
  draw();
  running = !(resting && position === target);
  if (running) requestAnimationFrame(frame);
}
function wake() {
  if (running) return;
  running = true;
  lastFrame = performance.now();
  requestAnimationFrame(frame);
}
// Moved by the wheel or a finger: no further than the first row and the last.
function nudge(by) {
  target = clamp(target + by, 0, last());
  lastInput = performance.now();
  wake();
}
// To a row, by its number.
function goTo(index) {
  target = clamp(index, 0, rows.length - 1) * pitch;
  lastInput = -Infinity; // already where it should rest
  wake();
}

// -- what moves it -----------------------------------------------------------------------
stage.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    nudge(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1));
  },
  { passive: false }
);
let fingerY = 0;
let fingerAt = 0;
let fingerSpeed = 0; // px per second
let fingerMoved = 0;
stage.addEventListener(
  "touchstart",
  (event) => {
    touching = true;
    fingerY = event.touches[0].clientY;
    fingerAt = performance.now();
    fingerSpeed = 0;
    fingerMoved = 0;
    wake();
  },
  { passive: true }
);
stage.addEventListener(
  "touchmove",
  (event) => {
    const y = event.touches[0].clientY;
    const now = performance.now();
    const moved = fingerY - y;
    fingerSpeed = moved / Math.max((now - fingerAt) / 1000, 0.001);
    fingerMoved += Math.abs(moved);
    fingerY = y;
    fingerAt = now;
    nudge(moved);
  },
  { passive: true }
);
stage.addEventListener("touchend", () => {
  touching = false;
  nudge(performance.now() - fingerAt < 80 ? fingerSpeed * WORKS_FLING_S : 0); // let go while moving: on it goes
});
window.addEventListener("keydown", (event) => {
  const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 3, PageUp: -3, Home: -rows.length, End: rows.length }[event.key];
  if (!step) return;
  event.preventDefault();
  goTo(Math.round(target / pitch) + step);
});
// A click on a row: at the middle, its link is followed (it has none: nothing
// happens); anywhere else, the row comes to the middle.
rows.forEach((row) => {
  row.el.addEventListener("click", (event) => {
    if (fingerMoved > 8) event.preventDefault(); // the end of a drag, not a tap
    else if (!row.active) {
      event.preventDefault();
      goTo(row.index);
    }
    fingerMoved = 0;
  });
  // (reached with the keyboard, it comes to the middle too)
  row.el.addEventListener("focus", () => {
    if (row.index !== Math.round(target / pitch)) goTo(row.index);
  });
});

// -- where it was ------------------------------------------------------------------------
// Back from a project (closed there, or with the browser's Back), the list is
// where it was left, not at its start: the row at the middle is kept for the
// tab when the page is left, and taken up again only on coming back from one.
const WORKS_ROW_KEY = "works-row";
function rowLeftAt() {
  const navigation = performance.getEntriesByType("navigation")[0];
  const back = (navigation && navigation.type === "back_forward") || /\/work\.html/.test(document.referrer);
  if (!back) return 0;
  try {
    return clamp(Number(sessionStorage.getItem(WORKS_ROW_KEY)) || 0, 0, rows.length - 1);
  } catch {
    return 0; // (no storage to read)
  }
}
window.addEventListener("pagehide", () => {
  try {
    sessionStorage.setItem(WORKS_ROW_KEY, String(Math.round(target / pitch)));
  } catch {
    // (no storage to write: it starts at the top next time)
  }
});

measure();
position = target = rowLeftAt() * pitch;
draw();
onViewportChange(() => {
  measure();
  draw();
});
whenFontsLoad(() => {
  clearInkCache(); // (what was drawn before the font was there)
  measure();
  draw();
});

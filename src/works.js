import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyPalette } from "./palette.js";
import { createAuraCanvas, auraFinalShape } from "./aura.js";
import { startNavClock } from "./clock.js";
import { setupMenu } from "./menu.js";
import { PROJECTS, projectUrl } from "./data/projects.js";
import { plainTitle } from "./title.js";
import { createHeadlines, alignHeadlines, whenHeadlineInkChanges } from "./headline.js";
import { onViewportChange } from "./viewport.js";
import { setupTransition } from "./transition.js";

gsap.registerPlugin(ScrollTrigger);

// ---- Works: every project, a card each ------------------------------------------------
// Its head, a screen: Contact's composition (works.html, with Contact's own
// classes) — the label, the words under it, which come in as the page opens
// (style.css), and the headline "Featured / works" (headline.js: aligned to
// the logo and the clock, its focus going over it by itself and following
// the cursor, every frame while it is on the screen) — on Contact's aura the
// other way up. Then every project (src/data/projects.js), in its order,
// on a grid of two equal columns inside the page's margins (works.css; one,
// up to MOBILE_MAX_PX wide). A card: its poster (16:9), its name, what it is
// (two lines at most) and its kind (type). With a mouse, the pointer over a
// card plays its video over the poster — its -hover.mp4 (projects.js: its
// first 8 s, 720, no sound), muted, in a loop, its file asked for the first
// time only —, fading in (works.css); the pointer
// gone, it stops, goes back to its start and the poster is there again. A
// finger: the poster only.
// How the cards come in: each, once its top is WK_ENTER_START down the
// screen, fading in from WK_ENTER_Y px lower in WK_ENTER_S (power3.out), the
// two of a row one after the other by WK_ENTER_STAGGER s.
const WK_ENTER_Y = 30;
const WK_ENTER_S = 0.8;
const WK_ENTER_STAGGER = 0.12;
const WK_ENTER_START = "top 92%";
// The head's background: Contact's aura (contact.js) the other way up — the
// same shader, colours, rim and grain (aura.js), at the same intensity —,
// which is the circle of the home's creativity phase as it is
// (auraFinalShape): its center just over the top of the head, its glow
// coming down from there; its rim gone to the page's black by the bottom of
// the head (at 16:9, 95% of the way down). Where the window is so wide that
// its circle would go further, it is made only as big as reaches the head's
// bottom edge: the black after it is always flat. On a canvas as big as the
// head, fixed to the screen, that goes up as the page is scrolled down — as
// far as the head has gone, but softly: it follows the scroll with
// 1 - exp(-WK_AURA_DAMPING * step) of what is left each frame (the home's
// aura's AURA_DAMPING, main.js), so it glides up and settles a moment after
// the scroll stops, behind the head, where it then is. With
// prefers-reduced-motion it goes with the scroll as it is.
const WORKS_BLACK = [10, 10, 10]; // the page's (works.css)
const WK_AURA_DAMPING = 5;
// (the longest step the headline's focus and the aura take in a frame, s:
// after a stall they go on from where they were instead of jumping)
const WK_MAX_STEP_S = 0.5;

const element = (tag, className, text) => {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const fineMouse = window.matchMedia("(hover: hover) and (pointer: fine)");

applyPalette();
setupMenu(); // (and the page's grain: body.grain)
setupTransition();

// -- the head's headline --------------------------------------------------------------
const head = document.querySelector(".wk-hero");
const headlines = createHeadlines();
const align = () => alignHeadlines(headlines);
startNavClock(align); // (its ink: the headline's right edge)
whenHeadlineInkChanges(align);
onViewportChange(align);
// Its focus, every frame while the head is on the screen (one more once it
// has gone: the blurred copies stop being drawn).
let headOn = true;
let frame = 0;
let then = 0;
function moveFocus(now) {
  const step = then ? Math.min((now - then) / 1000, WK_MAX_STEP_S) : 0;
  then = now;
  headlines.forEach(({ focus }) => focus.update(step, headOn));
  frame = headOn ? requestAnimationFrame(moveFocus) : 0;
}
new IntersectionObserver(([entry]) => {
  headOn = entry.isIntersecting;
  if (headOn && !frame) {
    then = 0;
    frame = requestAnimationFrame(moveFocus);
  }
}).observe(head);
frame = requestAnimationFrame(moveFocus);

// -- the aura: drawn once per size of the head ---------------------------------------
const auraCanvas = document.querySelector(".wk-aura");
const aura = createAuraCanvas(auraCanvas, WORKS_BLACK);
function drawAura() {
  const width = head.clientWidth;
  const height = head.clientHeight;
  auraCanvas.style.height = `${height}px`;
  aura.size(width, height);
  const shape = auraFinalShape(width, height);
  aura.uniforms.uCenter.value.set(shape.cx, shape.cy);
  aura.uniforms.uRadius.value = Math.min(shape.r, height - shape.cy);
  aura.draw();
}
drawAura();
onViewportChange(drawAura);
// Going up: `risen` (px) eases towards the scroll, every frame until it is
// there (to a whole device pixel: its grain stays sharp as it moves); off
// the top of the screen, not drawn.
let risen = window.scrollY;
let rising = 0;
let riseThen = 0;
function placeAura() {
  const y = Math.round(Math.min(risen, auraCanvas.offsetHeight) * window.devicePixelRatio) / window.devicePixelRatio;
  auraCanvas.style.transform = `translate3d(0, ${-y}px, 0)`;
  auraCanvas.style.visibility = risen >= auraCanvas.offsetHeight ? "hidden" : "";
}
function rise(now) {
  const step = riseThen ? Math.min((now - riseThen) / 1000, WK_MAX_STEP_S) : 0;
  riseThen = now;
  const target = window.scrollY;
  risen += (target - risen) * (1 - Math.exp(-WK_AURA_DAMPING * step));
  if (Math.abs(target - risen) < 0.5) risen = target;
  placeAura();
  rising = risen === target ? 0 : requestAnimationFrame(rise);
}
placeAura();
window.addEventListener(
  "scroll",
  () => {
    if (reducedMotion) {
      risen = window.scrollY;
      placeAura();
    } else if (!rising) {
      riseThen = 0;
      rising = requestAnimationFrame(rise);
    }
  },
  { passive: true }
);

// -- the cards ------------------------------------------------------------------------
const grid = document.querySelector(".wk-grid");
const cards = PROJECTS.map((project, index) => {
  const card = element("a", "wk-card");
  card.href = projectUrl(project);
  const media = element("span", "wk-media");
  const image = element("img", "wk-poster");
  image.alt = "";
  image.decoding = "async";
  image.loading = index < 4 ? "eager" : "lazy";
  image.src = encodeURI(project.poster);
  media.appendChild(image);
  card.append(media, element("span", "wk-title", plainTitle(project.title)), element("span", "wk-desc", project.description), element("span", "wk-type", project.type));
  grid.appendChild(card);
  playOnHover(card, media, project);
  return card;
});

// Its video, over its poster, while the pointer (a mouse's) is over the card.
function playOnHover(card, media, project) {
  let video = null;
  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse" || !fineMouse.matches) return;
    if (!video) {
      video = element("video", "wk-video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "none";
      video.setAttribute("aria-hidden", "true");
      video.addEventListener("playing", () => card.classList.toggle("is-playing", card.matches(":hover")));
      video.src = encodeURI(`${project.video}-hover.mp4`);
      media.appendChild(video);
    }
    video.play().catch(() => {}); // (not allowed to: the poster stays)
  });
  card.addEventListener("pointerleave", () => {
    if (!video) return;
    card.classList.remove("is-playing");
    video.pause();
    video.currentTime = 0;
  });
}

// -- how they come in -----------------------------------------------------------------
if (!reducedMotion) {
  gsap.set(cards, { autoAlpha: 0, y: WK_ENTER_Y });
  ScrollTrigger.batch(cards, {
    start: WK_ENTER_START,
    once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: WK_ENTER_S, ease: "power3.out", stagger: WK_ENTER_STAGGER, overwrite: true }),
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  onViewportChange(() => ScrollTrigger.refresh());
}

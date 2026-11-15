import gsap from "gsap";

// ---- Between the web's pages -------------------------------------------------------
// One transition for the whole web, on the veil every page starts under
// (transition.css: the page's black and grain over the content, blurring
// it, under the nav). The content never moves for it, only the veil does.
//   - A page coming in: the veil goes, the content going from PT_BLUR_PX
//     and transparent to sharp — PT_FIRST_S (power2.out) the first time the
//     web is opened (or a page reloaded), PT_IN_S (power2.inOut) arriving
//     from another of its pages. It waits for the page to be there and
//     settled (settled()), so it comes in whole and without a jolt; a page
//     that has an intro of its own (the home's) plays it under it, at the
//     same time.
//   - A link to another of the web's pages (from any page: the nav, its
//     menu, the logo, a card, a cover…): the page's videos stop, the veil
//     comes back (PT_OUT_S, power2.inOut) and then the next page is opened,
//     which comes in. A link to a place on the same page
//     (the home's #about, #contact…): no transition, a smooth scroll there.
//     Links out of the web (mail, phone, LinkedIn…), to a new tab, to a
//     file, or with a key held: as they are.
//   - The browser's back and forward: where it has transitions of its own
//     between pages (transition.css; window.ptArrival, which each page's
//     head keeps from its "pagereveal" — it can come before this script),
//     the page left blurs out over the next one's veil and then the next
//     one comes in (PT_IN_S); where it has not, the next one comes in. A page the browser had kept as it was
//     left (under its veil, its videos stopped) comes in again the same way,
//     its videos going on.
//   - transitionWithin(): another thing in the same page's place (a
//     project after another, work.html): out, `update`, in.
//   - whenShown(): what a page leaves for when it is idle (heavy setting up:
//     the home's paper plane and Contact's aura) waits for it to have come
//     in — the browser is idle between the transition's frames, and that
//     would take them.
// Where motion is to be reduced: the black only, PT_REDUCED_S each way.
const PT_BLUR_PX = 12;
const PT_OUT_S = 0.6;
const PT_IN_S = 0.7;
const PT_FIRST_S = 0.9;
const PT_REDUCED_S = 0.3;
// Settled: the page loaded and its fonts there (PT_LOAD_WAIT_MS at the
// most), then PT_SMOOTH_FRAMES frames in a row drawn within PT_SMOOTH_MS
// each — its own setting up done, which would eat the transition's frames —
// (PT_SMOOTH_WAIT_MS at the most).
const PT_LOAD_WAIT_MS = 1500;
const PT_SMOOTH_FRAMES = 6;
const PT_SMOOTH_MS = 34;
const PT_SMOOTH_WAIT_MS = 1000;
const PT_KEY = "pt-arriving"; // (sessionStorage: the next page is come to by a link)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const veil = document.querySelector(".pt-veil");
// (all over the page; with no blur where motion is to be reduced)
const COVERED = { blur: reducedMotion ? 0 : PT_BLUR_PX, ink: 1 };
const state = { ...COVERED };
const draw = () => {
  veil.style.setProperty("--pt-blur", `${state.blur.toFixed(2)}px`);
  veil.style.setProperty("--pt-ink", state.ink.toFixed(4));
};
// (the veil from what it is to `to`: 1 all over the page, 0 gone)
function cover(to, duration, ease) {
  veil.classList.remove("is-gone");
  gsap.killTweensOf(state);
  return new Promise((done) =>
    gsap.to(state, {
      blur: reducedMotion ? 0 : to * PT_BLUR_PX,
      ink: to,
      duration: reducedMotion ? PT_REDUCED_S : duration,
      ease: reducedMotion ? "none" : ease,
      onStart: () => (veil.style.willChange = "backdrop-filter"),
      onUpdate: draw,
      onComplete: () => {
        veil.style.willChange = "";
        if (!to) veil.classList.add("is-gone");
        done();
      },
    })
  );
}
const show = (duration, ease) => cover(0, duration, ease);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const loaded = () => (document.readyState === "complete" ? Promise.resolve() : new Promise((done) => window.addEventListener("load", done, { once: true })));
function smoothFrames() {
  return new Promise((done) => {
    const from = performance.now();
    let last = from;
    let run = 0;
    const frame = (now) => {
      run = now - last <= PT_SMOOTH_MS ? run + 1 : 0;
      last = now;
      if (run >= PT_SMOOTH_FRAMES || now - from > PT_SMOOTH_WAIT_MS) done();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
const settled = () => Promise.race([Promise.all([loaded(), document.fonts.ready]), wait(PT_LOAD_WAIT_MS)]).then(smoothFrames);
const hide = () => cover(1, PT_OUT_S, "power2.inOut");

// The page's videos that were playing, stopped while it goes (and going on
// if it comes back from the browser's memory).
let stopped = [];
function stopVideos() {
  stopped = Array.from(document.querySelectorAll("video")).filter((video) => !video.paused);
  stopped.forEach((video) => video.pause());
}
function resumeVideos() {
  stopped.forEach((video) => video.isConnected && video.play().catch(() => {}));
  stopped = [];
}

// (the same page whatever its address says of it: "/" and "/index.html")
const pageOf = (url) => url.origin + url.pathname.replace(/\/index\.html$/, "/") + url.search;
// A link of the web's to another of its pages, to be followed by the
// transition (not to a file, nor out of it).
function pageLink(link, event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin || !/(\/|\.html)$/.test(url.pathname)) return null;
  return url;
}

let leaving = false;
let shown = false;
const waiting = [];
export function whenShown(run) {
  if (shown) run();
  else waiting.push(run);
}
function hasShown() {
  shown = true;
  waiting.splice(0).forEach((run) => run());
}
// (the browser's own, the page left blurring out: done before coming in)
const after = (transition) => (transition ? transition.finished.catch(() => {}) : Promise.resolve());

export function setupTransition() {
  veil.classList.add("is-driven");
  draw();
  const entry = performance.getEntriesByType("navigation")[0];
  let byLink = false;
  try {
    byLink = sessionStorage.getItem(PT_KEY) === "1";
    sessionStorage.removeItem(PT_KEY);
  } catch {
    // (no storage: as if opened)
  }
  const traversed = entry && entry.type === "back_forward";
  const first = !byLink && !traversed;
  // (after the browser's own, if any: settled once it is over)
  after(window.ptArrival)
    .then(settled)
    .then(() => (first ? show(PT_FIRST_S, "power2.out") : show(PT_IN_S, "power2.inOut")))
    .then(hasShown);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const url = pageLink(link, event);
    if (!url) return;
    const here = new URL(window.location.href);
    if (pageOf(url) === pageOf(here)) {
      // (a place on this page: there, smoothly; anything else on it, its own)
      const place = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!place) return;
      event.preventDefault();
      window.scrollTo({ top: place.getBoundingClientRect().top + window.scrollY, behavior: reducedMotion ? "auto" : "smooth" });
      return;
    }
    event.preventDefault();
    if (leaving) return;
    leaving = true;
    stopVideos();
    hide().then(() => {
      try {
        sessionStorage.setItem(PT_KEY, "1");
      } catch {
        // (no storage: the next page comes in as if opened)
      }
      window.location.assign(url.href);
    });
  });

  // (going by a link, the veil has already done it: not the browser's own too)
  window.addEventListener("pageswap", (event) => {
    if (!event.viewTransition) return;
    event.viewTransition.ready.catch(() => {}); // (let go, by this or by the browser: not a fault)
    if (event.activation && event.activation.navigationType !== "traverse") event.viewTransition.skipTransition();
  });
  // Back to it from the browser's memory, as it was left (under its veil, if
  // by a link): it comes in again.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    leaving = false;
    let arrival = null;
    window.addEventListener(
      "pagereveal",
      (reveal) => {
        arrival = reveal.viewTransition;
        if (arrival) arrival.ready.catch(() => {});
      },
      { once: true }
    );
    gsap.killTweensOf(state);
    Object.assign(state, COVERED);
    veil.classList.remove("is-gone");
    draw();
    requestAnimationFrame(() =>
      after(arrival)
        .then(smoothFrames)
        .then(() => show(PT_IN_S, "power2.inOut"))
        .then(resumeVideos)
    );
  });
}

// Another thing in the page's place, without leaving it: the veil comes,
// `update` puts it up (at the page's top), and once it has settled it comes
// in.
export function transitionWithin(update) {
  return hide()
    .then(() => {
      update();
      return settled();
    })
    .then(() => show(PT_IN_S, "power2.inOut"));
}

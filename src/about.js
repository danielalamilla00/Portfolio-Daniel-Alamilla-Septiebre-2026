import { grainOverlay } from "./grain.js";
import { onViewportChange } from "./viewport.js";

// ---- About me -----------------------------------------------------------------
// What the paper plane opens the screen onto (experience.js clips this
// section, .ab, to the wedge behind the plane): a full-bleed picture, a giant
// title running across it and texts that come in over it. It is
// part of the same black panel as the sections before it, which stays put;
// its own scroll is a number that main.js hands to update() (vh since the
// plane finished, already damped) and everything follows from that number,
// so it runs backwards as is:
//   - to begin with nothing goes up: its first frame, the title over the
//     wall, stays for a stretch of scroll (the title keeps drifting);
//   - then its content (.ab-content: the title and the texts) goes up at the
//     speed of the scroll, which it gets up to gently;
//   - the picture (.ab-photo) goes up ABOUT_PARALLAX times as fast. It is
//     exactly as tall as it takes to end on its bottom edge: at 16:9 that is
//     its own shape at the full width of the screen; on anything else it is
//     cropped to fill (style.css);
//   - each text fades in and rises as it comes up from the bottom;
//   - when the content has gone all the way up, with the last texts whole on
//     screen and the picture at its end, the section is let go: all of it
//     goes up with the scroll and off the top of the screen, like a page. The
//     end of the picture goes to the panel's black (.ab-fade in style.css,
//     which moves with the picture), so nothing shows under it but black.
//   ABOUT_PHOTO        the picture, a file in public/
//   ABOUT_INTRO_HOLD_VH   scroll at the start in which nothing goes up
//   ABOUT_INTRO_EASE_VH   scroll, after that, in which the content gets from
//                      still to the speed of the scroll (in a straight line:
//                      it is half of this behind the scroll from then on)
//   ABOUT_TRAVEL_VH    how far the content goes up
// ABOUT_SCROLL_VH is all of that: the scroll after which the section goes
// away (one more screen of it, in which the next section is already coming:
// contact.js).
//   ABOUT_PARALLAX     speed of the picture, as a share of the content's
// Where the texts are is style.css's (.ab-grid: one grid at the end of the
// content); here they are only measured.
//   ABOUT_REVEAL_FROM_VH / _SPAN_VH   a text starts to come in when its top is
//                      this far down the screen, and is all there this much
//                      further up
//   ABOUT_REVEAL_RISE_PX   how far below its place it starts
//   ABOUT_REVEAL_LATE_VH   how much later (in scroll) the ones marked .ab-late
//                      come in: the second of two side by side
const ABOUT_INTRO_HOLD_VH = 100;
const ABOUT_INTRO_EASE_VH = 15;
const ABOUT_TRAVEL_VH = 276;
export const ABOUT_SCROLL_VH = ABOUT_INTRO_HOLD_VH + ABOUT_INTRO_EASE_VH / 2 + ABOUT_TRAVEL_VH;
const ABOUT_PHOTO = "Foto yo.jpg";
const ABOUT_PARALLAX = 0.5;
const ABOUT_REVEAL_FROM_VH = 96;
const ABOUT_REVEAL_SPAN_VH = 18;
const ABOUT_REVEAL_RISE_PX = 40;
const ABOUT_REVEAL_LATE_VH = 6;

// The title: "About me" over and over across the picture, drifting left for
// ever and a little faster while the page is being scrolled.
//   ABOUT_MARQUEE_COPIES    times it is repeated (enough to fill any screen twice)
//   ABOUT_MARQUEE_SECONDS   time one of them takes to go by, at rest
//   ABOUT_MARQUEE_BOOST     how much faster it goes for every 100vh per
//                           second of scroll (1 = twice as fast)
//   ABOUT_MARQUEE_MAX       the fastest it gets, in times its speed at rest
//   ABOUT_MARQUEE_EASE      how quickly its speed follows (per second)
const ABOUT_MARQUEE_COPIES = 4;
const ABOUT_MARQUEE_SECONDS = 34;
const ABOUT_MARQUEE_BOOST = 1.2;
const ABOUT_MARQUEE_MAX = 4;
const ABOUT_MARQUEE_EASE = 3;

// Grain over the picture (grain.js's, in the form that goes over a picture):
// a small tile of pixels a touch lighter or darker than what is under them,
// made once. More of it than the dark backgrounds have.
const ABOUT_GRAIN = 0.1; // the strongest a pixel gets, 0..1
const ABOUT_GRAIN_TILE = 160; // px

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
// To a whole device pixel: what moves with grain on it stays sharp, and the
// edges of two things that move together stay on each other.
const snap = (px) => Math.round(px * window.devicePixelRatio) / window.devicePixelRatio;

// `reducedMotion`: experience.js has taken the section out of the panel and
// made it a plain block of the page; here it is only filled in, all shown and
// still.
export function createAbout(reducedMotion) {
  const section = document.querySelector(".ab");
  const photo = section.querySelector(".ab-photo");
  const fade = section.querySelector(".ab-fade");
  const content = section.querySelector(".ab-content");
  const marquee = section.querySelector(".ab-marquee");
  const blocks = Array.from(section.querySelectorAll(".ab-block"));

  section.querySelector(".ab-photo img").src = encodeURI(`/${ABOUT_PHOTO}`);
  section.style.setProperty("--ab-photo-height", `${100 + ABOUT_PARALLAX * ABOUT_TRAVEL_VH}vh`);
  section.style.setProperty("--ab-content-height", `${100 + ABOUT_TRAVEL_VH}vh`);
  section.style.setProperty("--ab-grain", `url(${grainOverlay(ABOUT_GRAIN, ABOUT_GRAIN_TILE)})`);
  const late = blocks.map((block) => (block.classList.contains("ab-late") ? ABOUT_REVEAL_LATE_VH : 0));

  // The big texts' lines with their INK on the margin, not their box: the
  // first letter of a line starts a little inside its box, and the last one
  // of a line set to the right (tracked in) ends a little outside it. What
  // that is for each line's first or last word is measured with the font
  // itself, and handed to style.css (--ab-ink-left / -right on .ab-line).
  const pen = document.createElement("canvas").getContext("2d");
  function alignInk() {
    section.querySelectorAll(".ab-line").forEach((line) => {
      const right = getComputedStyle(line).textAlign === "right";
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      const runs = [];
      while (walker.nextNode()) if (walker.currentNode.data.trim()) runs.push(walker.currentNode);
      const run = right ? runs[runs.length - 1] : runs[0];
      const words = run.data.trim().split(/\s+/);
      const style = getComputedStyle(run.parentElement);
      pen.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const ink = pen.measureText(right ? words[words.length - 1] : words[0]);
      // right: the box ends one letter-spacing after the last letter's advance
      const past = right ? ink.actualBoundingBoxRight - ink.width - (parseFloat(style.letterSpacing) || 0) : ink.actualBoundingBoxLeft;
      line.style.setProperty("--ab-ink-left", right ? "0px" : `${past.toFixed(2)}px`);
      line.style.setProperty("--ab-ink-right", right ? `${past.toFixed(2)}px` : "0px");
    });
  }
  alignInk();
  const item = marquee.firstElementChild;
  for (let copy = 1; copy < ABOUT_MARQUEE_COPIES; copy++) marquee.appendChild(item.cloneNode(true));

  if (reducedMotion) {
    blocks.forEach((block) => (block.style.opacity = 1));
    onViewportChange(alignInk);
    document.fonts.ready.then(alignInk);
    return { update() {} };
  }

  // The title's drift: one repetition's width, for ever, on the compositor.
  // Only its speed is touched from here.
  const drift = marquee.animate([{ transform: "translate3d(0, 0, 0)" }, { transform: `translate3d(${-100 / ABOUT_MARQUEE_COPIES}%, 0, 0)` }], {
    duration: ABOUT_MARQUEE_SECONDS * 1000,
    iterations: Infinity,
  });
  let rate = 1;
  let pace = 0; // vh per second the section is being scrolled at
  let paceAt = 0; // time of the last scroll
  let easing = false;
  let easedAt = 0;
  function easeRate(now) {
    const delta = Math.min((now - easedAt) / 1000, 0.05);
    easedAt = now;
    if (now - paceAt > 120) pace = 0; // the scroll has stopped
    const target = Math.min(1 + (ABOUT_MARQUEE_BOOST * pace) / 100, ABOUT_MARQUEE_MAX);
    rate += (target - rate) * (1 - Math.exp(-ABOUT_MARQUEE_EASE * delta));
    if (Math.abs(target - rate) < 1e-3) rate = target;
    drift.updatePlaybackRate(rate);
    easing = rate !== 1 || pace !== 0;
    if (easing) requestAnimationFrame(easeRate);
  }

  let height = 0;
  let tops = []; // of each text, vh down the content
  let scrolled = -1; // vh, what update() was last given
  let left = 0; // vh the section has gone up since it was let go, 0..100
  // `vh`: the section's own scroll: 0..ABOUT_SCROLL_VH, and on while it goes away.
  function update(vh, force) {
    if (vh === scrolled && !force) return;
    const now = performance.now();
    if (scrolled >= 0 && !force) {
      pace = (Math.abs(vh - scrolled) / Math.max(now - paceAt, 8)) * 1000;
      if (!easing) {
        easing = true;
        easedAt = now;
        requestAnimationFrame(easeRate);
      }
    }
    paceAt = now;
    scrolled = vh;
    // How far up the content is, in vh: nothing through the first hold, then
    // picking up speed, then with the scroll, and no further than its travel.
    const past = Math.max(vh - ABOUT_INTRO_HOLD_VH, 0);
    const gone = Math.min(past < ABOUT_INTRO_EASE_VH ? past ** 2 / (2 * ABOUT_INTRO_EASE_VH) : past - ABOUT_INTRO_EASE_VH / 2, ABOUT_TRAVEL_VH);
    const moved = (gone / 100) * height;
    content.style.transform = `translate3d(0, ${(-moved).toFixed(2)}px, 0)`;
    photo.style.transform = fade.style.transform = `translate3d(0, ${snap(-moved * ABOUT_PARALLAX)}px, 0)`;
    const away = clamp(vh - ABOUT_SCROLL_VH, 0, 100); // vh the whole section has gone up since it was let go
    if (away !== left || force) {
      left = away;
      section.style.transform = left ? `translate3d(0, ${snap((-left / 100) * height)}px, 0)` : "none";
      section.classList.toggle("is-gone", left === 100);
    }
    blocks.forEach((block, index) => {
      // by where its top is on the screen (the last ones are still coming in as the section starts to go)
      const shown = clamp((ABOUT_REVEAL_FROM_VH - late[index] - (tops[index] - gone - away)) / ABOUT_REVEAL_SPAN_VH, 0, 1);
      if (shown === block.shown) return;
      block.shown = shown;
      block.style.opacity = shown.toFixed(3);
      block.style.transform = `translate3d(0, ${((1 - shown) * ABOUT_REVEAL_RISE_PX).toFixed(2)}px, 0)`;
    });
  }
  function layout() {
    alignInk();
    height = section.clientHeight;
    tops = blocks.map((block) => ((block.getBoundingClientRect().top - content.getBoundingClientRect().top - new DOMMatrix(getComputedStyle(block).transform).f) / height) * 100);
    update(Math.max(scrolled, 0), true);
  }
  layout();
  onViewportChange(layout);
  document.fonts.ready.then(layout); // the texts' own heights place the last two
  return { update };
}

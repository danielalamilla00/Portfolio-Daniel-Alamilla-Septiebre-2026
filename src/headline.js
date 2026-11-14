import { rasterInk, coverageEdges, clearInkCache, whenFontsLoad } from "./ink.js";
import { onViewportChange } from "./viewport.js";

// ---- The two-line headlines ------------------------------------------------------------
// "Motion AI / Designer" (the hero), "Let's create / together" (Contact) —
// index.html, main.js — and "Featured / works" (Works' head: works.html,
// works.js): one same headline (.headline-word, style.css) at the bottom of
// its section, its first line in Inter Tight, its second in Catavalo, from
// the logo's ink to the clock's; out of focus but where its sharp bands go
// by, and fattening letter by letter under the cursor. A page makes its own
// (createHeadlines), aligns them (alignHeadlines) when its fonts, the logo
// or the clock change them (whenHeadlineInkChanges) and when the window
// does, and calls each one's focus.update() every frame.
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const smoothstep = (e0, e1, v) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// Pixel-exact headline alignment against the nav (client ask: "Motion
// AI"'s visible ink flush with the logo's left edge, "Designer"'s visible
// ink flush with the clock's right edge, "Designer"'s lowest ink point —
// the "g" descender — HEADLINE_BOTTOM_GAP_VH above the hero's bottom edge).
//
// Range.getBoundingClientRect() is NOT the ink box — it's the text run's
// layout box (advance widths x font ascent/descent), which includes side
// bearings and the font's generic descent instead of the real "g".
// canvas measureText()'s actualBoundingBox* is NOT reliable either
// (measured): for the variable Inter Tight from Google Fonts it reports
// the bounds of a different weight instance (M left bearing 14.07px vs
// 17.95px actually painted at 300px), and canvas can't apply the clock's
// font-variant-numeric: tabular-nums at all.
// What IS faithful is the rasterized glyph itself (ink.js): each extreme
// glyph is drawn with fillText into an offscreen canvas and its ink edges
// are read from the pixels (50%-coverage edge, sub-pixel), then placed on screen
// with a Range on that single character (its origin) and the baseline
// from a zero-size inline-block marker (its bottom sits on the baseline).
export function measureTextInk(el) {
  // The text may be a single text node or split into per-letter spans
  // ("Motion AI"): walk every text node under el, one entry per character.
  const glyphs = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    for (let i = 0; i < node.textContent.length; i++) glyphs.push({ node, offset: i });
  }
  const text = glyphs.map((g) => g.node.textContent[g.offset]).join("");
  const cs = getComputedStyle(el);
  const fontSizePx = parseFloat(cs.fontSize);
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const letterSpacingPx = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing);
  const tabularNums = cs.fontVariantNumeric.includes("tabular-nums");

  const firstIndex = text.search(/\S/);
  const lastIndex = text.trimEnd().length - 1;
  const charRect = (i) => {
    const range = document.createRange();
    range.setStart(glyphs[i].node, glyphs[i].offset);
    range.setEnd(glyphs[i].node, glyphs[i].offset + 1);
    return range.getBoundingClientRect();
  };
  // Where the glyph's own ink sits relative to its Range-left origin.
  // Tabular digits are the proportional outline centered in a wider
  // advance (the DOM gives that advance; canvas only knows the
  // proportional one), so shift by half the difference.
  const placeGlyph = (i) => {
    const ch = text[i];
    const rect = charRect(i);
    const ink = rasterInk(font, ch, fontSizePx);
    const shift = tabularNums && /\d/.test(ch) ? (rect.width - letterSpacingPx - ink.advance) / 2 : 0;
    return { origin: rect.left + shift, ink };
  };
  const first = placeGlyph(firstIndex);
  const last = placeGlyph(lastIndex);

  const marker = document.createElement("span");
  marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;";
  el.appendChild(marker);
  const baselineY = marker.getBoundingClientRect().bottom;
  marker.remove();
  // Vertical extent doesn't depend on spacing/kerning: whole run at once.
  const run = rasterInk(font, text.trim(), fontSizePx);

  return {
    left: first.origin + first.ink.left,
    right: last.origin + last.ink.right,
    top: baselineY + run.top,
    bottom: baselineY + run.bottom,
    baseline: baselineY,
  };
}

// The logo is an <img> (its SVG <text> can't be measured from the DOM), so
// its ink's left edge is read the same way: drawn into a canvas at 4x its
// rendered size, scanned, and kept as a fraction of the image's width.
let logoInkLeftRatio = 0;
function measureLogoInk(img) {
  try {
    const rect = img.getBoundingClientRect();
    const SCALE = 4;
    const w = Math.max(1, Math.round(rect.width * SCALE));
    const h = Math.max(1, Math.round(rect.height * SCALE));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const colCov = new Float32Array(w);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) colCov[x] = Math.max(colCov[x], data[(y * w + x) * 4 + 3] / 255);
    }
    const edges = coverageEdges(colCov);
    logoInkLeftRatio = edges ? edges.start / w : 0;
  } catch {
    logoInkLeftRatio = 0; // fall back to the image box itself
  }
}

// ---- Headline focus -------------------------------------------------------
// Look of "Diseño/Vide de referencia Blur titulo.mp4": the headline never
// moves; what moves is the focus. Sharp vertical bands — the same for both
// lines, in screen coordinates — travel across a headline that is
// otherwise heavily out of focus:
//   - by itself, with no cursor on it: one band per screen width swinging
//     from edge to edge and back, so at times the center is sharp and the
//     ends blurred, at times the other way round (two half bands);
//   - under the cursor: a single band that follows it, leaving a trail.
// Built from HEADLINE_BLUR_LAYERS stacked copies of the headline's content
// (.hw-layer, same .hw-sans/.hw-display so alignHeadlines aligns
// them all): one sharp, the rest with increasing blur, each masked along
// x. At any x the masks are a partition of unity (the weights add up to 1)
// and the copies are composited additively (mix-blend-mode: plus-lighter
// in style.css), so the text is never doubled, dimmed or brightened where
// two blur levels cross-fade.
// The masks are not repainted per frame. Each .hw-layer is a wide strip
// carrying a fixed, repeating mask that is slid/stretched with a transform,
// and its .hw-layer-content applies the exact inverse so the text stays
// put. (Measured on this machine's GPU: moving or regenerating a mask-image
// every frame dropped the hero from 60 to ~47fps — which is also why the
// trail is one stretchable band and not a per-sample focus map.) The only
// repaint is the mask's period changing during the short hand-over between
// the automatic motion and the cursor.
// The blur lives on the copies — children of .headline-word — so GSAP's
// scroll exit (opacity/blur/scale on .headline-word itself) is untouched.
const HEADLINE_BLUR_MAX_VW = 0.75; // strongest blur: horizontal std-dev in vw (14.4px at 1920)
const HEADLINE_BLUR_Y_RATIO = 0.8; // vertical spread relative to horizontal (a bit less, as in the reference)
const HEADLINE_BLUR_TOUCH = 0.3; // share of that blur where there is no cursor: the focus moves by itself there, and the headline has to read all the time
// Copies in the stack: 1 sharp + (n - 1) blur steps. Compared side by side
// on this machine: 3 is all but indistinguishable from 4 and holds 60fps
// with the focus moving on its own (4 dropped as low as ~30 under load);
// 2 shows a "double exposure" halo where sharp cross-fades straight into
// the strongest blur.
const HEADLINE_BLUR_LAYERS = 3;
// A focus band, in vw: fully sharp over HEADLINE_FOCUS_CORE_VW, then easing
// into full blur over HEADLINE_FOCUS_EDGE_VW per side.
const HEADLINE_FOCUS_CORE_VW = 25;
const HEADLINE_FOCUS_EDGE_VW = 15;
// Following: the band eases to its target (cursor or automatic position)
// with 1 - exp(-HEADLINE_FOCUS_FOLLOW * delta) per frame — at 8, ~0.4s to
// get there, which is also how long the cursor takes to take over.
const HEADLINE_FOCUS_FOLLOW = 8;
// Trail (cursor only): a second point chases the cursor more slowly and
// the sharp zone spans from it to the leading edge, so where the cursor has
// just been takes about this long to fall out of focus again. The stretch
// is capped at HEADLINE_TRAIL_MAX_VW of extra width.
const HEADLINE_TRAIL_S = 0.8;
const HEADLINE_TRAIL_MAX_VW = 45;
const HEADLINE_HIT_PAD_PX = 40; // the headline's box is grown by this much for hit-testing
// Automatic motion: seconds per pass (edge to edge, sine.inOut, there and
// back) and the distance between bands. At 100vw there is one band per
// screen width, so one whole band or two halves are on screen.
const HEADLINE_AUTO_PASS_S = 4.5;
const HEADLINE_AUTO_PERIOD_VW = 100;
// Under the cursor the bands are spread this far apart instead, so only
// the cursor's own is ever on screen; the other slides out sideways (and
// back in when the automatic motion returns) over HEADLINE_HANDOVER_S.
const HEADLINE_CURSOR_PERIOD_VW = 160;
const HEADLINE_HANDOVER_S = 0.4;
// After the cursor leaves the headline, the band waits this long where it
// is before the automatic motion picks it up from that very spot.
const HEADLINE_AUTO_RESUME_S = 0.6;
// The strip (style.css: .hw-layer is 220vw wide) has a band centered here,
// in vw from its left edge — enough to keep the screen covered for any
// band position and any stretch.
const HEADLINE_STRIP_WINDOW_VW = 110;

// Thickening by cursor proximity, letter by letter, on both lines (port
// of the VariableFontCursorProximity component). The closer the cursor is
// to a letter's center, inside a radius, the heavier the letter:
//   - "Motion AI": Inter Tight is a variable font, so its 'wght' goes from
//     HEADLINE_VF_REST to HEADLINE_VF_MAX;
//   - "Designer": Catavalo is not variable, so the weight is simulated
//     with an outline in the text's own color (-webkit-text-stroke) from 0
//     to HEADLINE_STROKE_MAX_EM. Half the outline grows outward, so each
//     letter also gets that much extra room on both sides to keep
//     neighbours from running into each other.
// It answers only to the real cursor (never to the automatic focus),
// shares its hit-test and per-frame update with the focus, and applies to
// every stacked copy at once (CSS variables on .headline-word), so the
// copies stay superimposed to the pixel. No effect on touch devices or
// with prefers-reduced-motion.
const HEADLINE_VF_REST = 500; // resting weight (= .hw-sans's font-weight in style.css)
const HEADLINE_VF_MAX = 850; // weight right under the cursor
const HEADLINE_STROKE_MAX_EM = 0.035; // "Designer" outline right under the cursor, in its own em
const HEADLINE_PROXIMITY_RADIUS_EM = 1.1; // radius of influence, in font sizes of each line
const HEADLINE_PROXIMITY_FOLLOW = 10; // each letter eases with 1 - exp(-HEADLINE_PROXIMITY_FOLLOW * delta) per frame
// false: every headline plain and sharp — no moving focus, no thickening
// (the hero's and Contact's alike).
const HEADLINE_FOCUS = true;

// One headline's focus. `headlineWordEl`: its .headline-word; `sectionEl`:
// the section it is at the bottom of (the cursor is tested against where
// the headline is when that section fills the screen); `id`: tells its
// filters from another headline's. Returns what the rest calls: update()
// every frame, prepare() before the headline is measured at rest and
// measureHitbox() after.
function setupHeadlineFocus(headlineWordEl, sectionEl, id) {
  const focus = { update() {}, prepare() {}, measureHitbox() {} };
  // Switched off, or prefers-reduced-motion: one sharp, static headline — no
  // copies, no masks.
  if (!HEADLINE_FOCUS || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return focus;

  const autoOnly = window.matchMedia("(hover: none)").matches;
  const sharpLayer = headlineWordEl.querySelector(".hw-layer");

  // Both lines split into one inline-block per letter, done on the
  // original before it is cloned so every copy has the same structure.
  // Each letter reads its own variable from .headline-word: `prefix` + its
  // index, going from `rest` to `max`. `digits` is the precision written:
  // every new value repaints all the copies, so the steps are kept as
  // coarse as stays invisible (1 unit of weight; 0.001em ~ 0.25px of
  // outline at 1920).
  const lines = autoOnly
    ? []
    : [
        {
          selector: ".hw-sans",
          prefix: "--vf-",
          rest: HEADLINE_VF_REST,
          max: HEADLINE_VF_MAX,
          digits: 0,
          bind: (span, name) => span.style.setProperty("font-variation-settings", `"wght" var(${name}, ${HEADLINE_VF_REST})`),
        },
        {
          selector: ".hw-display",
          prefix: "--vs-",
          rest: 0,
          max: HEADLINE_STROKE_MAX_EM,
          digits: 3,
          bind: (span, name) => {
            span.style.setProperty("-webkit-text-stroke", `calc(var(${name}, 0) * 1em) currentColor`);
            span.style.setProperty("--grow", `calc(var(${name}, 0) * 0.5em)`);
          },
        },
      ];
  lines.forEach((line) => {
    const el = sharpLayer.querySelector(line.selector);
    line.text = el.textContent;
    el.setAttribute("aria-label", line.text);
    el.replaceChildren(
      ...Array.from(line.text).map((ch, i) => {
        const span = document.createElement("span");
        span.className = "vf-char";
        span.setAttribute("aria-hidden", "true");
        span.textContent = ch === " " ? " " : ch;
        line.bind(span, `${line.prefix}${i}`);
        return span;
      })
    );
  });

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  const blurNodes = [];
  const layers = [sharpLayer];
  for (let i = 1; i < HEADLINE_BLUR_LAYERS; i++) {
    // An SVG filter instead of CSS blur(): it can blur more along x than y.
    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", `hw-blur-${id}-${i}`);
    filter.setAttribute("x", "-10%");
    filter.setAttribute("y", "-30%");
    filter.setAttribute("width", "120%");
    filter.setAttribute("height", "160%");
    filter.setAttribute("color-interpolation-filters", "sRGB");
    const blur = document.createElementNS(svgNS, "feGaussianBlur");
    filter.appendChild(blur);
    svg.appendChild(filter);
    blurNodes.push(blur);
    // Only the original copy is readable; the blurred ones are decoration.
    // The filter goes on .hw-layer-inner on purpose: it is not a composited
    // layer of its own, so the blur is rasterized once into its parent's
    // texture and reused. On .hw-layer-content (composited: will-change)
    // the browser re-ran all three blurs every frame — measured here, the
    // automatic focus went from ~30 to ~54fps just by moving it.
    const copy = sharpLayer.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelector(".hw-layer-inner").style.filter = `url(#hw-blur-${id}-${i})`;
    headlineWordEl.appendChild(copy);
    layers.push(copy);
  }
  document.body.appendChild(svg);

  // Per line: its letters copy by copy (index 0 = the sharp one), their
  // live values, and their centers/radius (measured at rest, see below).
  lines.forEach((line) => {
    line.sets = Array.from(headlineWordEl.querySelectorAll(line.selector)).map((el) => Array.from(el.querySelectorAll(".vf-char")));
    line.values = line.sets[0].map(() => line.rest);
    line.centers = [];
    line.radius = 0;
  });

  // Inline-block letters lose the font's kerning (each is laid out on its
  // own), which would shift the resting headline off where plain text
  // sits. Each pair's kerning is measured from an unsplit, invisible copy
  // (Range rects per glyph) and put back on the letter as --kern (an em
  // margin, see .vf-char in style.css), in every copy. Measured, applied,
  // then re-measured: each box snaps to the layout grid (1/64px) and the
  // rounding adds up along the line.
  const KERNING_PASSES = 3;
  function applyKerning(line) {
    const source = line.sets[0][0].parentNode;
    const fontSize = parseFloat(getComputedStyle(source).fontSize);
    const reference = source.cloneNode(false);
    reference.removeAttribute("aria-label");
    reference.style.visibility = "hidden";
    reference.textContent = line.text;
    source.parentNode.appendChild(reference);
    const referenceLefts = Array.from(line.text, (_, i) => {
      const range = document.createRange();
      range.setStart(reference.firstChild, i);
      range.setEnd(reference.firstChild, i + 1);
      return range.getBoundingClientRect().left;
    });
    reference.remove();

    line.sets.forEach((set) => set.forEach((char) => char.style.removeProperty("--kern")));
    const margins = line.sets[0].map(() => 0);
    for (let pass = 0; pass < KERNING_PASSES; pass++) {
      const lefts = line.sets[0].map((char) => char.getBoundingClientRect().left);
      let previousDrift = 0;
      for (let i = 0; i < margins.length; i++) {
        const drift = referenceLefts[i] - referenceLefts[0] - (lefts[i] - lefts[0]);
        margins[i] += drift - previousDrift;
        previousDrift = drift;
        // Snapped to the layout grid, then nudged a hair past it: the
        // browser truncates em -> px toward zero, which would otherwise
        // swallow every single-step correction.
        const snapped = Math.round(margins[i] * 64) / 64;
        const value = `${((snapped + Math.sign(snapped) * 0.004) / fontSize).toFixed(6)}em`;
        line.sets.forEach((set) => (snapped !== 0 ? set[i].style.setProperty("--kern", value) : set[i].style.removeProperty("--kern")));
      }
    }
  }

  // Mask of layer i across one period of the strip, around the band's
  // center (50% of the tile; the offsets are in vw, so the band keeps its
  // width whatever the period). With b = blur amount (0 sharp .. 1 max) at
  // a point, layer i (blur level i / (N - 1)) weighs
  // max(0, 1 - |b * (N - 1) - i|): at most two neighbours are ever on, and
  // their weights add up to 1. Stops only where b changes (the two edges).
  const half = HEADLINE_FOCUS_CORE_VW / 2;
  const EDGE_STOPS = 16;
  const offsets = [];
  for (let k = 0; k <= EDGE_STOPS; k++) offsets.push(-(half + HEADLINE_FOCUS_EDGE_VW) + (k / EDGE_STOPS) * HEADLINE_FOCUS_EDGE_VW);
  for (let k = 0; k <= EDGE_STOPS; k++) offsets.push(half + (k / EDGE_STOPS) * HEADLINE_FOCUS_EDGE_VW);
  layers.forEach((layer, i) => {
    const stops = offsets.map((offset) => {
      const b = smoothstep(half, half + HEADLINE_FOCUS_EDGE_VW, Math.abs(offset));
      const weight = Math.max(0, 1 - Math.abs(b * (HEADLINE_BLUR_LAYERS - 1) - i));
      return `rgba(0, 0, 0, ${weight.toFixed(4)}) calc(50% + ${offset.toFixed(3)}vw)`;
    });
    layer.style.setProperty("--hw-mask", `linear-gradient(90deg, ${stops.join(", ")})`);
  });

  function sizeBlurs() {
    blurNodes.forEach((node, k) => {
      const sx = (((k + 1) / (HEADLINE_BLUR_LAYERS - 1)) * HEADLINE_BLUR_MAX_VW * (autoOnly ? HEADLINE_BLUR_TOUCH : 1) * window.innerWidth) / 100;
      node.setAttribute("stdDeviation", `${sx.toFixed(2)} ${(sx * HEADLINE_BLUR_Y_RATIO).toFixed(2)}`);
    });
  }
  sizeBlurs();
  onViewportChange(sizeBlurs);

  // Pointer: .headline-word is pointer-events:none, so the cursor is
  // hit-tested by hand against its box (measured in its resting state by
  // alignHeadlines, grown by HEADLINE_HIT_PAD_PX). Heights are
  // taken from the top of its section, wherever that is when it is measured:
  // the section fills the screen when the cursor can be on the headline.
  let hitbox = { left: 0, top: 0, right: 0, bottom: 0 };
  let stripLeft = 0; // the strips' own left edge on screen (= the headline's)
  focus.measureHitbox = () => {
    const rect = headlineWordEl.getBoundingClientRect();
    const sectionTop = sectionEl.getBoundingClientRect().top;
    hitbox = {
      left: rect.left - HEADLINE_HIT_PAD_PX,
      top: rect.top - sectionTop - HEADLINE_HIT_PAD_PX,
      right: rect.right + HEADLINE_HIT_PAD_PX,
      bottom: rect.bottom - sectionTop + HEADLINE_HIT_PAD_PX,
    };
    stripLeft = rect.left;
    // Letter centers and radii, once, at rest — never per pointermove.
    lines.forEach((line) => {
      line.centers = line.sets[0].map((char) => {
        const box = char.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top - sectionTop + box.height / 2 };
      });
      line.radius = HEADLINE_PROXIMITY_RADIUS_EM * parseFloat(getComputedStyle(line.sets[0][0]).fontSize);
    });
  };
  let pointerX = 0;
  let pointerY = 0;
  let pointerInside = false;
  if (!autoOnly) {
    window.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      pointerInside =
        event.clientX >= hitbox.left && event.clientX <= hitbox.right &&
        event.clientY >= hitbox.top && event.clientY <= hitbox.bottom;
    });
    document.documentElement.addEventListener("pointerleave", () => {
      pointerInside = false;
    });
  }

  // Focus state, eased every frame (frame-rate independent): the band's
  // leading point, its trailing point, the distance between bands, and the
  // automatic motion's own clock.
  let head = 0;
  let tail = 0;
  let periodVw = HEADLINE_AUTO_PERIOD_VW;
  let autoRunning = true;
  let autoTime = 0;
  let sinceCursorLeft = 0;
  let wasVisible = true;
  const written = {};
  const write = (name, value) => {
    if (written[name] === value) return;
    written[name] = value;
    headlineWordEl.style.setProperty(name, value);
  };

  // Alignment and the measurements above are taken with every letter at
  // rest: drop the per-letter variables (the letters fall back to their
  // resting value) and forget they were written, so the next frame puts
  // the live ones back. Then restore the kerning for the current font size.
  focus.prepare = () => {
    lines.forEach((line) => {
      line.values.forEach((_, i) => {
        headlineWordEl.style.removeProperty(`${line.prefix}${i}`);
        delete written[`${line.prefix}${i}`];
      });
      applyKerning(line);
    });
  };

  // Called from animate() every frame. `visible` is false once the scroll
  // exit has faded the headline out: the focus stops (automatic motion
  // included) and the blurred copies are not rendered until it comes back.
  focus.update = (delta, visible) => {
    if (visible !== wasVisible) {
      wasVisible = visible;
      headlineWordEl.classList.toggle("is-focus-paused", !visible);
    }
    const cursorOn = visible && pointerInside;

    // Thickening: every letter eases toward what its distance to the
    // cursor asks for — or back to rest when the cursor is off the
    // headline or the headline has scrolled away.
    const ease = 1 - Math.exp(-HEADLINE_PROXIMITY_FOLLOW * delta);
    lines.forEach((line) => {
      const span = line.max - line.rest;
      for (let i = 0; i < line.values.length; i++) {
        let target = line.rest;
        if (cursorOn) {
          const distance = Math.hypot(pointerX - line.centers[i].x, pointerY - line.centers[i].y);
          target += span * (1 - smoothstep(0, line.radius, distance));
        }
        line.values[i] += (target - line.values[i]) * ease;
        if (Math.abs(target - line.values[i]) < span * 0.0002) line.values[i] = target;
        write(`${line.prefix}${i}`, line.values[i].toFixed(line.digits));
      }
    });
    if (!visible) return;

    const W = window.innerWidth;
    let targetX = head; // waiting for the automatic motion to resume: stay put
    if (cursorOn) {
      targetX = pointerX;
      autoRunning = false;
      sinceCursorLeft = 0;
    } else {
      sinceCursorLeft += delta;
      if (!autoRunning && sinceCursorLeft >= HEADLINE_AUTO_RESUME_S) {
        // Pick the swing up where the band is now: no jump.
        autoTime = (HEADLINE_AUTO_PASS_S / Math.PI) * Math.acos(clamp(1 - (2 * head) / W, -1, 1));
        autoRunning = true;
      }
      if (autoRunning) {
        autoTime += delta;
        targetX = W * (0.5 - 0.5 * Math.cos((Math.PI * autoTime) / HEADLINE_AUTO_PASS_S));
      }
    }
    const follow = 1 - Math.exp(-HEADLINE_FOCUS_FOLLOW * delta);
    const trail = Math.exp((-3 / HEADLINE_TRAIL_S) * delta);
    if (cursorOn) {
      head += (targetX - head) * follow;
      tail = targetX + (tail - targetX) * trail; // chases the cursor, more slowly
    } else {
      // No trail of its own: whatever stretch is left closes around the band.
      const gap = (tail - head) * trail;
      head += (targetX - head) * follow;
      tail = head + (Math.abs(gap) < 0.05 ? 0 : gap);
    }
    if (Math.abs(targetX - head) < 0.05) head = targetX;
    if (cursorOn && Math.abs(targetX - tail) < 0.05) tail = targetX;

    // Bands spread apart under the cursor (and while waiting to resume),
    // one per screen width when the motion is automatic.
    const wantedPeriod = autoRunning ? HEADLINE_AUTO_PERIOD_VW : HEADLINE_CURSOR_PERIOD_VW;
    periodVw += (wantedPeriod - periodVw) * (1 - Math.exp((-3 / HEADLINE_HANDOVER_S) * delta));
    if (Math.abs(wantedPeriod - periodVw) < 0.02) periodVw = wantedPeriod;

    // The band spans tail..head: centered between them, stretched by their
    // distance. Stretching the strip by `scale` widens the band around
    // HEADLINE_STRIP_WINDOW_VW; sliding it puts that band on `center`; the
    // content gets the inverse transform.
    const stretch = Math.min(Math.abs(head - tail), (HEADLINE_TRAIL_MAX_VW / 100) * W);
    const center = head + (Math.sign(tail - head) * stretch) / 2;
    const scale = 1 + stretch / ((HEADLINE_FOCUS_CORE_VW / 100) * W);
    const shift = center - stripLeft - scale * (HEADLINE_STRIP_WINDOW_VW / 100) * W;
    write("--hw-strip-x", `${shift.toFixed(2)}px`);
    write("--hw-strip-scale", scale.toFixed(5));
    write("--hw-content-x", `${(-shift / scale).toFixed(3)}px`);
    write("--hw-content-scale", (1 / scale).toFixed(6));
    write("--hw-period", `${periodVw.toFixed(2)}vw`);
  };
  return focus;
}

// Every headline on the page (.headline-word), each at the bottom of its own
// section, with its focus.
export function createHeadlines() {
  return Array.from(document.querySelectorAll(".headline-word")).map((el, index) => {
    const section = el.closest("section");
    const focus = setupHeadlineFocus(el, section, index);
    // (once the focus has made its copies: the two lines of every copy)
    return { el, section, focus, sans: Array.from(el.querySelectorAll(".hw-sans")), display: Array.from(el.querySelectorAll(".hw-display")) };
  });
}

const HEADLINE_BOTTOM_GAP_VH = 1.5;

// Every headline to the logo, the clock and the bottom of its section (see
// measureTextInk above), and the two introductions over it laid out.
export function alignHeadlines(headlines) {
  const navLogoEl = document.querySelector(".nav-logo");
  const navClockTimeEl = document.querySelector("#nav-clock-time");
  const logoRect = navLogoEl.getBoundingClientRect();
  const logoInkLeft = logoRect.left + logoInkLeftRatio * logoRect.width;
  // (a phone has no clock: the page's right margin, where it would end)
  const inkRight = navClockTimeEl.offsetParent
    ? measureTextInk(navClockTimeEl).right
    : document.documentElement.clientWidth - parseFloat(getComputedStyle(document.querySelector("#site-nav")).paddingRight);
  headlines.forEach(({ el, section, focus, sans, display }) => {
    // The two introductions over it, which a phone stacks (style.css): how
    // tall the first is, for the second to go right under it.
    section.style.setProperty("--hero-intro-stack", `${section.querySelector(".hero-intro-left").offsetHeight}px`);
    // Measure in the resting state: GSAP's exit tween puts y/scale/blur on
    // .headline-word, which getBoundingClientRect would include. Clear it for
    // the measurement and put it back afterwards.
    const savedTransform = el.style.transform;
    el.style.transform = "none";
    el.style.translate = "none"; // (...nor what lifts it over a phone's browser bar: style.css)
    // ...and with the first line at its resting weight (the widening while
    // the letters fatten under the cursor is part of that effect, not
    // something to re-align against).
    focus.prepare();

    // Reset to the CSS starting point so repeated calls never compound.
    sans.forEach((line) => (line.style.left = "0px"));
    display.forEach((line) => (line.style.right = "0px"));
    el.style.bottom = "3vh";

    // Left: the first line's first letter's ink → logo left edge.
    const leftDelta = logoInkLeft - measureTextInk(sans[0]).left;
    sans.forEach((line) => (line.style.left = `${leftDelta}px`));

    // Right: the second line's last letter's ink → clock ink right edge.
    // (style.right grows leftward)
    const rightDelta = measureTextInk(display[0]).right - inkRight;
    display.forEach((line) => (line.style.right = `${rightDelta}px`));

    // Bottom: se ancla el punto MÁS BAJO de la tinta de la segunda línea (el
    // final del descendente de la g, measureTextInk().bottom) a
    // HEADLINE_BOTTOM_GAP_VH del borde inferior de su sección, así la g se
    // ve entera. Medido contra la propia sección (no contra la ventana) para
    // que siga siendo correcto esté donde esté en ese momento. Se mueve el
    // bloque .headline-word completo, así que la primera línea sube con la
    // segunda y conserva la misma separación.
    const sectionBottom = section.getBoundingClientRect().bottom;
    const targetBottomGap = (HEADLINE_BOTTOM_GAP_VH * window.innerHeight) / 100;
    const currentBottomGap = sectionBottom - measureTextInk(display[0]).bottom;
    const baseBottomPx = (3 * window.innerHeight) / 100;
    el.style.bottom = `${baseBottomPx + (targetBottomGap - currentBottomGap)}px`;

    focus.measureHitbox(); // still in the resting state: no exit transform on it
    el.style.transform = savedTransform;
    el.style.translate = "";

    if (window.__debugHeadline) {
      console.log(`[headline ${section.id || section.className}] first letter-logo dx:`, (measureTextInk(sans[0]).left - logoInkLeft).toFixed(2),
        "| last letter-clock dx:", (measureTextInk(display[0]).right - inkRight).toFixed(2),
        "| g-bottom gap:", (sectionBottom - measureTextInk(display[0]).bottom).toFixed(2));
    }
  });
}

// `run` (the page's alignment) again whenever what the headlines are aligned
// by changes: the webfonts once they are in (anything rasterized before used
// a fallback font: the cache is dropped first), and again if one loads later;
// the logo once it is decoded (its ink, measured).
export function whenHeadlineInkChanges(run) {
  const onFontsChanged = () => {
    clearInkCache();
    run();
  };
  whenFontsLoad(onFontsChanged);
  document.fonts.addEventListener("loadingdone", onFontsChanged);
  const logo = document.querySelector(".nav-logo");
  logo.decode().then(() => {
    measureLogoInk(logo);
    run();
  }).catch(() => {});
}

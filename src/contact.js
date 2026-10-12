import * as THREE from "three";
import { createAura, auraFinalShape } from "./aura.js";

// ---- Contact --------------------------------------------------------------------
// The last screen (.ct), in the same black panel as the sections before it.
// Its scroll is a number that main.js hands to update() (vh since About me
// was let go and started to go up, already damped) and everything follows
// from that number, so it runs backwards as is. It is all one move up, at
// the speed of the scroll, like a page: About me leaves by the top, a
// stretch of the panel's black follows it, and then this section comes up
// from under the screen — black at its top like what is before it, the aura
// at its bottom — until it fills the screen. There it stays.
// What is on it is the hero's composition (index.html: the same headline
// and the same two blocks over it, with the hero's own classes), which
// main.js aligns and brings to life as it does the hero's; here the two
// blocks are only told when to come in (.is-entered, style.css: as the
// hero's do on load), which is when the section gets to its place.
//   CONTACT_GAP_VH       the black between the end of About me and the top
//                        of this section
//   CONTACT_END_HOLD_VH  scroll left once it is in place
const CONTACT_GAP_VH = 50;
const CONTACT_END_HOLD_VH = 80;
const CONTACT_PINNED_VH = CONTACT_GAP_VH + 100; // scroll at which it fills the screen
export const CONTACT_SCROLL_VH = CONTACT_PINNED_VH + CONTACT_END_HOLD_VH;
// Where the nav's "contact" link goes: in place, a little into that hold.
export const CONTACT_SHOWN_VH = CONTACT_PINNED_VH + CONTACT_END_HOLD_VH / 4;

// The background: the aura of the creativity phase — the same shader, colors,
// rim and grain (aura.js) and the same circle (auraFinalShape) — upside down:
// its center as far under the bottom edge as that one's is over the top, so
// the glow comes from below and the top of the screen is the panel's black.
//   CONTACT_AURA_CENTER      where its center is moved to from there, in
//                            fractions of the width and of the height
//   CONTACT_AURA_RADIUS      its radius, in times the original's
//   CONTACT_AURA_INTENSITY   how opaque it is over the black (1 = as the
//                            original)
//   CONTACT_AURA_FROM_INTENSITY   ...and when the section starts to come up:
//                            it gets to the other as it does, quickly at first
// It is part of the section and comes up with it; nothing fades in.
// That circle is as wide as the screen asks (auraFinalShape), so on a window
// wider than 16:9 it is taller than the section: its canvas then starts
// above the section's top edge, by as much as it takes to hold all of the
// circle (and CONTACT_AURA_PAD_PX more), where the shader paints exactly the
// black around it — over the black that comes before the section, never
// further up than that black goes (on a window so wide that this is not
// enough, the top of the canvas fades out instead: .is-cut in style.css).
const CONTACT_AURA_CENTER = [0, 0];
const CONTACT_AURA_RADIUS = 1;
const CONTACT_AURA_INTENSITY = 1;
const CONTACT_AURA_FROM_INTENSITY = 0.75;
const CONTACT_AURA_PAD_PX = 2;
const CONTACT_BLACK = [10, 10, 10]; // the panel's (--more-black in style.css)

const CONTACT_COPIED_MS = 1500; // how long "copy" says "copied"

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const easeOut = (t) => 1 - (1 - t) ** 3;

// `reducedMotion`: the section is taken out of the panel and laid out as a
// plain screen of the page after About me (.ct.is-static), all shown.
export function createContact(reducedMotion) {
  const section = document.querySelector(".ct");
  const canvas = section.querySelector(".ct-aura");

  const copy = section.querySelector(".ct-copy");
  let copied = 0; // timer
  copy.addEventListener("click", () => {
    navigator.clipboard.writeText(section.querySelector(".ct-email").textContent).then(() => {
      clearTimeout(copied);
      copy.textContent = "copied";
      copied = setTimeout(() => (copy.textContent = "copy"), CONTACT_COPIED_MS);
    });
  });
  section.querySelector(".ct-top").addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

  // -- the aura ------------------------------------------------------------------
  // Its own small renderer, created (and its shader compiled) while the
  // browser has nothing to do, and drawn only when something about it changes.
  let renderer = null;
  let scene = null;
  let aura = null;
  const camera = new THREE.Camera(); // the quad places itself (aura.vert.glsl)
  let width = 0;
  let height = 0;
  let over = 0; // px of the canvas above the section's top edge
  let radius = 0; // the aura's circle, px in the section
  let center = [0, 0];
  let lit = -1; // the intensity it is drawn at
  function readyAura() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    aura = createAura(CONTACT_BLACK);
    scene = new THREE.Scene();
    scene.add(aura.mesh);
    renderer.setSize(width, height + over, false);
    renderer.compile(scene, camera);
  }
  function drawAura(intensity) {
    if (intensity === lit) return;
    lit = intensity;
    readyAura();
    const { uniforms } = aura;
    uniforms.uViewport.value.set(width, height + over);
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
    uniforms.uCenter.value.set(center[0], center[1] + over);
    uniforms.uRadius.value = radius;
    uniforms.uAlpha.value = intensity;
    renderer.render(scene, camera);
  }
  function size() {
    width = section.clientWidth;
    height = section.clientHeight;
    const shape = auraFinalShape(width, height);
    radius = shape.r * CONTACT_AURA_RADIUS;
    center = [shape.cx + CONTACT_AURA_CENTER[0] * width, height - shape.cy + CONTACT_AURA_CENTER[1] * height];
    const above = radius - center[1]; // how far over the section's top edge the circle goes
    over = reducedMotion ? 0 : clamp(Math.ceil(above) + CONTACT_AURA_PAD_PX, 0, Math.floor((CONTACT_GAP_VH / 100) * height));
    canvas.classList.toggle("is-cut", above > over);
    canvas.style.top = `${-over}px`;
    canvas.style.height = `${height + over}px`;
    if (renderer) renderer.setSize(width, height + over, false);
    lit = -1;
  }

  if (reducedMotion) {
    section.classList.add("is-static");
    document.querySelector("#contact").remove(); // the panel version's anchor
    section.id = "contact";
    document.querySelector(".ab").after(section);
    const draw = () => {
      size();
      drawAura(CONTACT_AURA_INTENSITY);
    };
    draw();
    window.addEventListener("resize", draw);
    return { update() {}, showing: () => false };
  }

  let scrolled = -1; // vh, what update() was last given
  let up = 0; // how far up it has come, 0..1
  // `vh`: the scroll since About me started to go up, 0..CONTACT_SCROLL_VH.
  function update(vh, force) {
    if (vh === scrolled && !force) return;
    scrolled = vh;
    // Its top edge from the bottom of the screen (0) to the top of it (1), a
    // screen of scroll.
    up = clamp((vh - CONTACT_GAP_VH) / 100, 0, 1);
    section.classList.toggle("is-on", up > 0);
    // The two blocks come in when it gets to its place, and are there until
    // it has gone back down out of sight.
    if (up === 1) section.classList.add("is-entered");
    else if (!up) section.classList.remove("is-entered");
    if (!up) return;
    // (to a whole device pixel: the grain on its canvas stays sharp as it moves)
    section.style.transform = `translate3d(0, ${Math.round((1 - up) * height * window.devicePixelRatio) / window.devicePixelRatio}px, 0)`;
    drawAura(CONTACT_AURA_FROM_INTENSITY + (CONTACT_AURA_INTENSITY - CONTACT_AURA_FROM_INTENSITY) * easeOut(up));
  }
  function layout() {
    size();
    update(Math.max(scrolled, 0), true);
  }
  layout();
  window.addEventListener("resize", layout);
  if (window.requestIdleCallback) window.requestIdleCallback(readyAura, { timeout: 4000 });
  else setTimeout(readyAura, 2000); // Safari
  // showing(): some of it is on screen (main.js keeps its headline's focus going).
  return { update, showing: () => up > 0 };
}

import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createAura, auraFinalShape } from "./aura.js";
import { onViewportChange, canvasPixelRatio } from "./viewport.js";
import { titleParts } from "./title.js";
import { nextProjects, projectUrl } from "./data/projects.js";

// ---- The end of every project's page ------------------------------------------------
// A title ("Next project" on the usual page, "Explore more" on a showcase's:
// its last word in Catavalo, in the palette's gradient), the next three
// projects of the Works page, the way back to all of them and the page's
// foot — over the home's Contact background, which comes in as it does there
// after About me: what is before it ends in the page's black (--pj-end-gap of
// it, project.css), and from that black the aura comes up from under the
// screen. It is Contact's (aura.js:
// the same shader, palette, grain and soft rim, and its circle,
// auraFinalShape), its yellow middle just under the bottom edge, fading to
// black upwards; its canvas begins where the circle is all black, so there is
// no line at its top. As the section comes up the screen, the aura grows and
// brightens with the scroll (from END_AURA_FROM of its size and light to all
// of them, when the section's foot gets to the screen's), with the web's
// damping. Everything over it is in cream.
// A page can ask for (options): the aura bigger (auraScale: its circle that
// many times Contact's) and dimmer (auraIntensity, for the words over more of
// it); and its block on a screen of its own (screen): the title, the cards
// and the way back in the middle of the last screen of the page, the foot at
// its bottom, and before them as much of the aura's fade as its circle needs
// (--pj-end-lead).
//   END_AURA_INTENSITY       how much of the aura there is over the black (1 =
//                            Contact's): lower here, so that the cream words
//                            over its brightest part read — measured, WCAG
//                            AA, the foot's small words over its very middle
//                            the lowest: at 0.58, 3.3:1; at this, 5.1:1 and
//                            more (1920x1080 to 1280x720, a phone, a tablet)
//   END_AURA_FROM            its share of its size and light as it starts to
//                            come up (Contact's light: 0.75)
//   END_AURA_DAMPING         how fast it follows the scroll: 1 -
//                            exp(-END_AURA_DAMPING * seconds) of the way a frame
//   END_AURA_PAD_PX          black left above the circle, in the canvas
const END_AURA_INTENSITY = 0.42;
const END_AURA_FROM = 0.75;
const END_AURA_DAMPING = 5;
const END_AURA_PAD_PX = 2;
const END_BLACK = [10, 10, 10]; // the page's (project.css)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

// The section, at the end of `page`, for `project`'s page, titled `title`
// (its last word *between asterisks*). What it gives back: its title, its
// cards and its way back (for a page that brings them in its own way).
export function projectEnd(project, page, title, { auraScale = 1, auraIntensity = END_AURA_INTENSITY, screen = false } = {}) {
  const end = element("section", "pj-end");
  const canvas = element("canvas", "pj-end-aura");
  canvas.setAttribute("aria-hidden", "true");
  const heading = element("h2", "pj-next-heading");
  heading.append(...titleParts(title, "title-gradient"));
  const row = element("div", "pj-next-row");
  nextProjects(project, 3).forEach((next, index) => row.appendChild(nextCard(next, index)));
  const back = element("a", "pj-back", "← Back to all");
  back.href = "works.html";
  const foot = document.querySelector(".pj-foot");
  if (screen) {
    end.classList.add("is-screen");
    const last = element("div", "pj-end-screen");
    const block = element("div", "pj-end-block");
    block.append(heading, row, back);
    last.append(block, foot);
    end.append(canvas, last);
  } else end.append(canvas, heading, row, back, foot);
  page.appendChild(end);
  aura(end, canvas, { scale: auraScale, intensity: auraIntensity, screen });
  return { heading, cards: Array.from(row.children), back };
}

// A card of the projects after it: its poster, its number and name, and a
// way to it.
function nextCard(project, index) {
  const card = element("a", "pj-card");
  card.href = projectUrl(project);
  const thumb = element("span", "pj-card-thumb");
  const image = element("img");
  image.src = encodeURI(project.poster);
  image.alt = "";
  image.loading = "lazy";
  thumb.appendChild(image);
  const line = element("span", "pj-card-line");
  const name = element("span", "pj-card-name", `${String(index + 1).padStart(2, "0")} `);
  name.append(...titleParts(project.title));
  line.append(name, element("span", "pj-card-more", "Full project ↗"));
  card.append(thumb, line);
  return card;
}

// The aura: its own renderer, drawn when the section's size changes and while
// it follows the scroll.
function aura(section, canvas, { scale, intensity, screen }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  const shader = createAura(END_BLACK);
  const scene = new THREE.Scene();
  scene.add(shader.mesh);
  const camera = new THREE.Camera(); // the quad places itself (aura.vert.glsl)
  let shape = { cx: 0, cy: 0, r: 1 };
  let tall = 0;
  let target = 0; // how far up the section has come, 0..1
  let up = 0; // ...damped
  const draw = () => {
    const grown = END_AURA_FROM + (1 - END_AURA_FROM) * (1 - (1 - up) ** 3);
    const { uniforms } = shader;
    uniforms.uCenter.value.set(shape.cx, tall - shape.cy);
    uniforms.uRadius.value = shape.r * scale * grown;
    uniforms.uAlpha.value = intensity * grown;
    renderer.render(scene, camera);
  };
  const size = () => {
    const width = document.documentElement.clientWidth;
    // (the circle of a screen's Contact, at the section's foot: the canvas as
    // tall as it needs to be all black at its top — the section at least
    // that — and as wide as the screen, wherever the section's own edges are)
    shape = auraFinalShape(width, window.innerHeight);
    tall = Math.ceil(shape.r * scale + shape.cy) + END_AURA_PAD_PX;
    if (screen) section.style.setProperty("--pj-end-lead", `${Math.max(tall - window.innerHeight, 0)}px`);
    else section.style.minHeight = `max(100vh, ${tall}px)`;
    canvas.style.height = `${tall}px`;
    canvas.style.width = `${width}px`;
    canvas.style.left = `${-section.getBoundingClientRect().left}px`;
    renderer.setPixelRatio(canvasPixelRatio());
    renderer.setSize(width, tall, false);
    shader.uniforms.uViewport.value.set(width, tall);
    shader.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    draw();
  };
  size();
  onViewportChange(size);
  let last = 0;
  let running = false;
  const tick = (now) => {
    const seconds = Math.min((now - last) / 1000, 0.1);
    last = now;
    up = reducedMotion ? target : up + (target - up) * (1 - Math.exp(-END_AURA_DAMPING * seconds));
    if (Math.abs(target - up) < 0.0005) up = target;
    draw();
    running = up !== target;
    if (running) requestAnimationFrame(tick);
  };
  const follow = (self) => {
    target = self.progress;
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  };
  ScrollTrigger.create({ trigger: section, start: "top bottom", end: "bottom bottom", onUpdate: follow, onRefresh: follow });
}

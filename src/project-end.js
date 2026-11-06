import * as THREE from "three";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createAura, auraFinalShape } from "./aura.js";
import { onViewportChange, canvasPixelRatio } from "./viewport.js";

// ---- The end of every project's page ------------------------------------------------
// The page's foot over the home's Contact background, which comes in as it
// does there after About me: from the page's black the aura comes up from
// under the screen. It is Contact's (aura.js: the same shader, palette, grain
// and soft rim, and its circle, auraFinalShape), its yellow middle just under
// the bottom edge, fading to black upwards; its canvas begins where the
// circle is all black, so there is no line at its top. As the section comes
// up the screen, the aura grows and brightens with the scroll (from
// END_AURA_FROM of its size and light to all of them, when the section's foot
// gets to the screen's), with the web's damping. What the page puts over it
// (case.js: the related projects) is in cream.
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

// The section, at the end of `page`, with the page's foot (work.html's
// .pj-foot) in it. What it gives back: the section, and what stops its aura
// and gives the foot back to the page (the page left: project.js).
export function projectEnd(page) {
  const end = document.createElement("section");
  end.className = "pj-end";
  const canvas = document.createElement("canvas");
  canvas.className = "pj-end-aura";
  canvas.setAttribute("aria-hidden", "true");
  const foot = document.querySelector(".pj-foot");
  const home = foot.parentNode;
  const after = foot.nextSibling;
  end.append(canvas, foot);
  page.appendChild(end);
  const stop = aura(end, canvas);
  return {
    end,
    destroy() {
      stop();
      home.insertBefore(foot, after);
    },
  };
}

// The aura: its own renderer, drawn when the section's size changes and while
// it follows the scroll. What it gives back: what stops it and lets its GPU
// context go.
function aura(section, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  const shader = createAura(END_BLACK);
  const scene = new THREE.Scene();
  scene.add(shader.mesh);
  const camera = new THREE.Camera(); // the quad places itself (aura.vert.glsl)
  let shape = { cx: 0, cy: 0, r: 1 };
  let tall = 0;
  let target = 0; // how far up the section has come, 0..1
  let up = 0; // ...damped
  let alive = true;
  const draw = () => {
    if (!alive) return;
    const grown = END_AURA_FROM + (1 - END_AURA_FROM) * (1 - (1 - up) ** 3);
    const { uniforms } = shader;
    uniforms.uCenter.value.set(shape.cx, tall - shape.cy);
    uniforms.uRadius.value = shape.r * grown;
    uniforms.uAlpha.value = END_AURA_INTENSITY * grown;
    renderer.render(scene, camera);
  };
  const size = () => {
    const width = document.documentElement.clientWidth;
    // (the circle of a screen's Contact, at the section's foot: the canvas as
    // tall as it needs to be all black at its top — the section at least
    // that — and as wide as the screen, wherever the section's own edges are)
    shape = auraFinalShape(width, window.innerHeight);
    tall = Math.ceil(shape.r + shape.cy) + END_AURA_PAD_PX;
    section.style.minHeight = `max(100vh, ${tall}px)`;
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
  const unsize = onViewportChange(size);
  let last = 0;
  let running = false;
  const tick = (now) => {
    if (!alive) return;
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
  const trigger = ScrollTrigger.create({ trigger: section, start: "top bottom", end: "bottom bottom", onUpdate: follow, onRefresh: follow });
  return () => {
    alive = false;
    unsize();
    trigger.kill();
    shader.mesh.geometry.dispose();
    shader.mesh.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
}

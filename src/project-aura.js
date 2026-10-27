import * as THREE from "three";
import { createAura, auraFinalShape } from "./aura.js";
import { onViewportChange, canvasPixelRatio } from "./viewport.js";

// ---- A project's page: the aura behind its head ----------------------------------------
// The aura of the home's Contact (aura.js: the same shader, palette, grain,
// rim and order of colors, and the same circle, auraFinalShape) turned the
// other way up: its yellow center at the top of the page, in the middle,
// just over the top edge, the orange, the coral and the peach halo round it,
// and the page's black under it and towards the lower corners. It is part of
// the page, at its top, and goes up with it (not fixed); the canvas is
// PJ_AURA_VH of the screen tall — or as tall as the circle needs, so that it
// is all black before the canvas ends (and PJ_AURA_PAD_PX more): under it,
// the page's black and grain, the same, with no line between them.
//   PJ_AURA_INTENSITY  how much of it there is over the black (1 = Contact's):
//                      lower here, so that the cream texts over its
//                      brightest part read (measured, WCAG AA: 4.5:1 for the
//                      category's small letters at its very middle). The nav
//                      stays cream over it: on it this dim, the home's dark
//                      nav would not read.
const PJ_AURA_VH = 110;
const PJ_AURA_PAD_PX = 2;
const PJ_AURA_INTENSITY = 0.47;
const PJ_BLACK = [10, 10, 10]; // the page's (project.css)

export function setupProjectAura(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  const aura = createAura(PJ_BLACK);
  const scene = new THREE.Scene();
  scene.add(aura.mesh);
  const camera = new THREE.Camera(); // the quad places itself (aura.vert.glsl)

  const draw = () => {
    const width = document.documentElement.clientWidth;
    const screen = window.innerHeight;
    const { cx, cy, r } = auraFinalShape(width, screen);
    const tall = Math.max(Math.round((PJ_AURA_VH / 100) * screen), Math.ceil(cy + r) + PJ_AURA_PAD_PX);
    canvas.style.height = `${tall}px`;
    renderer.setPixelRatio(canvasPixelRatio());
    renderer.setSize(width, tall, false);
    const { uniforms } = aura;
    uniforms.uViewport.value.set(width, tall);
    uniforms.uPixelRatio.value = renderer.getPixelRatio();
    uniforms.uCenter.value.set(cx, cy);
    uniforms.uRadius.value = r;
    uniforms.uAlpha.value = PJ_AURA_INTENSITY;
    renderer.render(scene, camera);
  };
  draw();
  onViewportChange(draw);
}

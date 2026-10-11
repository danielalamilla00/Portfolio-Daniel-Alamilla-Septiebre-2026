import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import vertexShader from "./shaders/sphere.vert.glsl?raw";
import fragmentShader from "./shaders/sphere.frag.glsl?raw";
import auraVertexShader from "./shaders/aura.vert.glsl?raw";
import auraFragmentShader from "./shaders/aura.frag.glsl?raw";
import Player from "@vimeo/player";
import { ORANGE_PALETTE, applyPalette, hexToRgb } from "./palette.js";

gsap.registerPlugin(ScrollTrigger);
applyPalette(); // the palette as --c-* variables, for style.css

// Webfonts and video metadata can still change layout after the first
// ScrollTrigger measurement; re-measure once everything has loaded so the
// hero pin and the projects section start/end where they should.
window.addEventListener("load", () => ScrollTrigger.refresh());

const canvas = document.querySelector("#sphere-canvas");
const heroSectionEl = document.querySelector("#hero-section");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Render loop (animate() at the bottom): runs while anything in the canvas
// can change, and stops once the hero has been scrolled past and everything
// has settled, so the GPU idles while the videos zoom. The ScrollTriggers'
// onUpdate and resize wake it back up.
let frameRequested = false;
function requestFrame() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(animate);
}

const scene = new THREE.Scene();

// Width of the visible viewport, in CSS px: without the vertical scrollbar,
// unlike window.innerWidth and the vw unit. The canvas (position: fixed,
// 100% wide) and everything drawn in it are this wide, so the orange and
// the aura are centered on what is actually seen. Cached (onResize keeps it
// up to date): reading it mid-frame would force a layout.
let viewportWidth = document.documentElement.clientWidth;

// Narrow "telephoto" camera: a sphere viewed through a small FOV from far
// away is nearly an orthographic projection, so even the huge, off-center
// hero orange reads as a true circle instead of a perspective-distorted
// dome. The whole hero + creativity phase uses this one camera.
const HERO_FOV = 4;
const HERO_CAM_Z = 30;

const camera = new THREE.PerspectiveCamera(HERO_FOV, viewportWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, HERO_CAM_Z);
camera.lookAt(0, 0, 0);

// The hero's orange is measured against a 1920x1080 reference composition
// (Diseño/mockup-hero-v4.png) and scaled by one shared factor s,
// "cover"-style: anchored at the top, centered horizontally, scaled up just
// enough to cover whichever axis needs it most. On a narrow/tall viewport
// that would blow the composition out past the edges, so s is additionally
// capped so a 750px-wide block (x=585 to 1335 in composition space) never
// exceeds 90% of the real viewport width.
const COMPOSITION_WIDTH = 1920;
const COMPOSITION_HEIGHT = 1080;
const COMPOSITION_TEXT_WIDTH = 750;
function computeCompositionScale() {
  const coverScale = Math.max(viewportWidth / COMPOSITION_WIDTH, window.innerHeight / COMPOSITION_HEIGHT);
  const maxTextScale = (viewportWidth * 0.9) / COMPOSITION_TEXT_WIDTH;
  return Math.min(coverScale, maxTextScale);
}

// The hero orange's silhouette (composition px): a circle centered at
// (960, HERO_CENTER_Y) with radius HERO_RADIUS, fitted from
// reference/layout-titular.png — top edge at y=140, sides leaving the
// screen at y≈567.5 (1432 - sqrt(1292² - 960²)), so "Motion AI / Designer"
// both sit on it.
const HERO_RADIUS = 1292;
const HERO_CENTER_Y = 1432;

// Closed-form, valid because the hero camera is near-orthographic: on
// screen, a sphere's radius/position is linear in world units
// (r_px = f_px * R / HERO_CAM_Z). s folds in the composition scale so the
// reference circle always lands on the same screen pixels; called every
// frame, so it's always up to date on resize.
function computeHeroSphereParams(s) {
  const f = window.innerHeight / 2 / Math.tan((HERO_FOV * Math.PI) / 360);
  const scale = (HERO_CAM_Z * HERO_RADIUS * s) / f;
  const y = (HERO_CAM_Z * (window.innerHeight / 2 - HERO_CENTER_Y * s)) / f;
  return { scale, y };
}

// alpha:true + a fully transparent clear color so the canvas only paints
// what's rendered — everywhere else the page's own background shows through.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(viewportWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

// ---- Sphere surface constants ---------------------------------------------
// Single source of truth for sphere.vert.glsl, passed down as uniforms.
// Three low-frequency noise layers, each traveling across the sphere in its
// own direction/speed: they drive the large, slowly drifting color patches
// of the peel (vNoise in the shaders).
const FLOW_SPEED = 0.14;
const FREQ_1 = 0.6;
const FREQ_2 = 1.1;
const FREQ_3 = 1.7;
const FLOW_DIR_1 = new THREE.Vector3(1.0, 0.25, -0.1);
const FLOW_DIR_2 = new THREE.Vector3(-0.2, 1.0, 0.35);
const FLOW_DIR_3 = new THREE.Vector3(0.7, -0.6, 0.55);
const WEIGHT_1 = 0.5;
const WEIGHT_2 = 0.3;
const WEIGHT_3 = 0.2;
// Cursor dent: radius/depth in object-space units (sphere radius is 1).
// Lowered (from 1.3/0.5/0.35) per client feedback ("el hundimiento con el
// cursor es demasiado fuerte").
const CURSOR_RADIUS = 0.9;
const CURSOR_DEPTH = 0.15;
const DENT_EDGE_FREQUENCY = 1.8;
const DENT_EDGE_SPEED = 0.4;
const DENT_EDGE_VARIATION = 0.2;
const DENT_DEPTH_FREQUENCY = 1.5;
const DENT_DEPTH_SPEED = 0.3;

const uniforms = {
  uTime: { value: 0 },
  uCursorInfluence: { value: 0 },
  uCursorPoint: { value: new THREE.Vector3(0, 0, 0) },
  // The sphere rotates continuously (see ROTATION_SPEED below), so the
  // fragment shader's peel bump (computed in local space) needs the
  // sphere's own normal matrix. Updated every frame after rotation.
  uNormalMatrix: { value: new THREE.Matrix3() },
  // Peel pore density (sphere.frag.glsl), set every frame from
  // computeGrainScale() so the pores keep their hero size during the rise.
  uGrainScale: { value: 60 },
  // Fades to 0 while the orange dissolves into the aura (updateAura).
  uOpacity: { value: 1 },
  uFreq1: { value: FREQ_1 },
  uFreq2: { value: FREQ_2 },
  uFreq3: { value: FREQ_3 },
  uFlowDir1: { value: FLOW_DIR_1 },
  uFlowDir2: { value: FLOW_DIR_2 },
  uFlowDir3: { value: FLOW_DIR_3 },
  uWeight1: { value: WEIGHT_1 },
  uWeight2: { value: WEIGHT_2 },
  uWeight3: { value: WEIGHT_3 },
  uFlowSpeed: { value: FLOW_SPEED },
  uCursorRadius: { value: CURSOR_RADIUS },
  uCursorDepth: { value: CURSOR_DEPTH },
  uDentEdgeFrequency: { value: DENT_EDGE_FREQUENCY },
  uDentEdgeSpeed: { value: DENT_EDGE_SPEED },
  uDentEdgeVariation: { value: DENT_EDGE_VARIATION },
  uDentDepthFrequency: { value: DENT_DEPTH_FREQUENCY },
  uDentDepthSpeed: { value: DENT_DEPTH_SPEED },
};

const orangeGroup = new THREE.Group();
// The hero sphere is always horizontally centered.
const HERO_X = 0;
scene.add(orangeGroup);

const geometry = new THREE.SphereGeometry(1, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  // Only so it can fade out into the aura (uOpacity); at opacity 1 the
  // output is identical to an opaque material.
  transparent: true,
});
const sphere = new THREE.Mesh(geometry, material);
orangeGroup.add(sphere);

// ---- Aura ---------------------------------------------------------------
// Creativity-phase background (Diseño/reference-aura-fondo.png): the orange
// rises and dissolves into a blurred half-circle of light hanging from the
// top edge, over the same dark page as the hero. A full-screen quad in this
// same scene with its own shader (src/shaders/aura.frag.glsl), drawn FIRST
// (renderOrder -1, no depth) so the sphere always renders on top of it.
// Outside the circle it paints the page's background color (PAGE_COLOR),
// so there's never a seam between canvas and page.
// Colors are sRGB 0..1 (ShaderMaterial output is not color-managed here,
// same as the sphere's shader).
const hexToVec3 = (hex) => new THREE.Vector3(...hexToRgb(hex).map((channel) => channel / 255));
// Aura palette, inside -> out. The colors themselves live in palette.js.
const AURA_COLOR_CENTER_A = ORANGE_PALETTE.yellowOrangeLight; // warm, very bright yellow-orange at the top center
const AURA_COLOR_CENTER_B = ORANGE_PALETTE.yellowOrange;
const AURA_COLOR_MID_A = ORANGE_PALETTE.orange; // vivid orange ring
const AURA_COLOR_MID_B = ORANGE_PALETTE.orangeWarm;
const AURA_COLOR_EDGE = ORANGE_PALETTE.coral; // rim
const AURA_COLOR_HALO = ORANGE_PALETTE.peach; // soft halo between the rim and the page
const AURA_COLOR_SPHERE = ORANGE_PALETTE.orangeDeep; // flat stand-in for the orange's own tone, where the morph starts
// Page background, the same all the way down (the hero and #projects have
// none of their own). Also the nav's ink while it sits over the aura.
const PAGE_COLOR = ORANGE_PALETTE.dark; // = html/body background in style.css
// Rim softness: from the orange's crisp silhouette to the final blur
// (fraction of the radius over which the rim fades into the page).
const AURA_FEATHER_START = 0.004;
const AURA_FEATHER = 0.25;
const AURA_GRAIN = 0.06; // static grain amplitude over everything (peak-to-peak, 0..1)
// Aura circle vs the orange's real silhouette at the start of the morph.
// 1 = exactly the silhouette: its soft edge fades INWARD from that circle
// (aura.frag.glsl), so it never peeks outside the orange. Measured: at
// 0.98 the 2% strip between the two circles showed as a faint second ring
// through the half-transparent sphere around m = 0.25.
const AURA_INSET = 1.0;
// Choreography, all as windows of the morph value m (0 = orange, 1 = aura):
const SPHERE_FADE = [0.08, 0.55]; // sphere opacity 1 -> 0
const AURA_ALPHA = [0.02, 0.45]; // aura opacity 0 -> 1
const AURA_BLUR = [0.1, 0.9]; // rim AURA_FEATHER_START -> AURA_FEATHER ("velocidad del difuminado")
const AURA_SHAPE = [0.35, 1.0]; // circle: real silhouette -> final shape
const AURA_PALETTE = [0.1, 0.7]; // flat orange tone -> palette
const NAV_DARK_T = [0.35, 0.65]; // nav white -> #141414 (logo through its filter)
// Projects: the aura does not leave with the phrase. It stays, and over
// the AURA_PROJECTS_T stretch of the projects section's scroll it slides
// down to the middle of the screen and grows into that section's
// background, behind the videos (see computeAuraProjects / updateAura).
//   AURA_PROJECTS_CENTER_X/Y   final center, as fractions of the viewport
//   AURA_PROJECTS_RADIUS_DIAG  final radius, as a fraction of the viewport's
//                              diagonal: the orange fills nearly everything
//                              and the page only darkens the corners
//   AURA_PROJECTS_FEATHER      final rim softness (vs AURA_FEATHER before)
const AURA_PROJECTS_T = [0, 0.4];
const AURA_PROJECTS_CENTER_X = 0.5;
const AURA_PROJECTS_CENTER_Y = 0.5;
const AURA_PROJECTS_RADIUS_DIAG = 0.75;
const AURA_PROJECTS_FEATHER = 0.55;

const auraUniforms = {
  uViewport: { value: new THREE.Vector2(viewportWidth, window.innerHeight) },
  uPixelRatio: { value: renderer.getPixelRatio() },
  uCenter: { value: new THREE.Vector2() },
  uRadius: { value: 1 },
  uFeather: { value: AURA_FEATHER },
  uBlur: { value: 1 },
  uAlpha: { value: 1 },
  uColorMix: { value: 1 },
  uGrain: { value: AURA_GRAIN },
  uColorSphere: { value: hexToVec3(AURA_COLOR_SPHERE) },
  uColorCenterA: { value: hexToVec3(AURA_COLOR_CENTER_A) },
  uColorCenterB: { value: hexToVec3(AURA_COLOR_CENTER_B) },
  uColorMidA: { value: hexToVec3(AURA_COLOR_MID_A) },
  uColorMidB: { value: hexToVec3(AURA_COLOR_MID_B) },
  uColorEdge: { value: hexToVec3(AURA_COLOR_EDGE) },
  uColorHalo: { value: hexToVec3(AURA_COLOR_HALO) },
  uColorPage: { value: hexToVec3(PAGE_COLOR) },
};
const auraMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  new THREE.ShaderMaterial({
    vertexShader: auraVertexShader,
    fragmentShader: auraFragmentShader,
    uniforms: auraUniforms,
    depthTest: false,
    depthWrite: false,
  })
);
auraMesh.renderOrder = -1;
auraMesh.frustumCulled = false; // positioned in clip space by its vertex shader
auraMesh.visible = false;
scene.add(auraMesh);

// Circle of the sphere's REAL on-screen silhouette, in CSS px. The visible
// contour is the circle of tangent points seen from the camera: center
// C + axis * R²/d, radius R·sqrt(1 - R²/d²), in the plane facing the
// camera. SILHOUETTE_SAMPLES points on it are projected with the current
// camera and a least-squares circle is fitted to them (Kåsa fit), so the
// result is right for any distance or offset — not "projected center ±
// scale". Valid as long as nothing deforms the silhouette, which is why
// the cursor dent is held at 0 during the morph.
const SILHOUETTE_SAMPLES = 12;
const _silC = new THREE.Vector3();
const _silAxis = new THREE.Vector3();
const _silU = new THREE.Vector3();
const _silV = new THREE.Vector3();
const _silP = new THREE.Vector3();
function sphereSilhouetteCircle() {
  const W = viewportWidth;
  const H = window.innerHeight;
  camera.updateMatrixWorld();
  orangeGroup.updateMatrixWorld(true);
  sphere.getWorldPosition(_silC);
  const R = orangeGroup.scale.x; // SphereGeometry radius is 1
  _silAxis.copy(camera.position).sub(_silC);
  const d = _silAxis.length();
  _silAxis.normalize();
  const ratio = Math.min(R / d, 0.999);
  const offset = R * ratio;
  const rho = R * Math.sqrt(1 - ratio * ratio);
  _silU.set(0, 1, 0).cross(_silAxis);
  if (_silU.lengthSq() < 1e-8) _silU.set(1, 0, 0).cross(_silAxis);
  _silU.normalize();
  _silV.crossVectors(_silAxis, _silU);
  // Kåsa fit: x² + y² + Dx + Ey + F = 0, least squares (3x3 normal equations).
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  for (let i = 0; i < SILHOUETTE_SAMPLES; i++) {
    const a = (i / SILHOUETTE_SAMPLES) * Math.PI * 2;
    _silP.copy(_silC)
      .addScaledVector(_silAxis, offset)
      .addScaledVector(_silU, rho * Math.cos(a))
      .addScaledVector(_silV, rho * Math.sin(a))
      .project(camera);
    const x = (_silP.x + 1) * 0.5 * W;
    const y = (1 - _silP.y) * 0.5 * H;
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  const n = SILHOUETTE_SAMPLES;
  // [sxx sxy sx; sxy syy sy; sx sy n] [D E F]^T = -[sxz syz sz]^T
  const m = [
    [sxx, sxy, sx, -sxz],
    [sxy, syy, sy, -syz],
    [sx, sy, n, -sz],
  ];
  for (let c = 0; c < 3; c++) {
    let piv = c;
    for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[piv][c])) piv = r;
    [m[c], m[piv]] = [m[piv], m[c]];
    for (let r = 0; r < 3; r++) {
      if (r === c) continue;
      const k = m[r][c] / m[c][c];
      for (let cc = c; cc < 4; cc++) m[r][cc] -= k * m[c][cc];
    }
  }
  const D = m[0][3] / m[0][0];
  const E = m[1][3] / m[1][1];
  const F = m[2][3] / m[2][2];
  const cx = -D / 2;
  const cy = -E / 2;
  return { cx, cy, r: Math.sqrt(Math.max(0, cx * cx + cy * cy - F)) };
}

const smoothstep = (e0, e1, v) => {
  const t = clamp((v - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const win = (range, m) => smoothstep(range[0], range[1], m);

// Nav ink, driven by the morph: white over the dark hero, #141414 once the
// aura is behind it. Only written when the value changes.
const siteNavEl = document.querySelector("#site-nav");
const NAV_CLOCK_COLOR = [255, 165, 105]; // #site-nav .nav-clock's own color in style.css
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
let lastNavT = -1;
function updateNavInk(m) {
  const navT = win(NAV_DARK_T, m);
  if (Math.abs(navT - lastNavT) > 0.002 || (navT === 0) !== (lastNavT === 0)) {
    lastNavT = navT;
    const dark = hexToRgb(PAGE_COLOR);
    if (navT === 0) {
      ["--nav-ink", "--nav-clock-ink", "--nav-logo-invert"].forEach((v) => siteNavEl.style.removeProperty(v));
    } else {
      siteNavEl.style.setProperty("--nav-ink", `rgb(${mixRgb([255, 255, 255], dark, navT).join(", ")})`);
      siteNavEl.style.setProperty("--nav-clock-ink", `rgb(${mixRgb(NAV_CLOCK_COLOR, dark, navT).join(", ")})`);
      // logo: brightness(0) invert(x) gives gray x*255 — 1 = white, 20/255 = #141414
      siteNavEl.style.setProperty("--nav-logo-invert", (1 + (dark[0] / 255 - 1) * navT).toFixed(4));
    }
  }
}

// m = computeAuraMorph(progress): 0 = plain sphere, 1 = aura fully formed.
// At m = 0+ the aura is transparent, crisp and AURA_INSET of the orange's
// real silhouette (so it never peeks out); then its opacity rises while the
// sphere's falls, its rim blurs, its palette replaces the orange's flat
// tone and its circle moves from the silhouette to the phrase-phase shape.
// The sphere itself is heading to that same shape (computeSpherePhase), so
// while both are visible they stay one shape.
// projects = computeAuraProjects(progress): 0 -> 1 as the projects section
// scrolls in; the circle then goes on from the phrase-phase shape to the
// projects one (centered, much bigger, softer rim). `onScreen` is false
// once the projects section has scrolled above the viewport altogether:
// nothing is drawn then. Called every frame AFTER orangeGroup and the
// camera are updated.
function updateAura(m, projects, onScreen) {
  updateNavInk(m);
  const sphereOpacity = 1 - win(SPHERE_FADE, m);
  uniforms.uOpacity.value = sphereOpacity;
  orangeGroup.visible = sphereOpacity > 0.001;
  auraMesh.visible = m > 0.0005 && onScreen;
  if (!auraMesh.visible) return;

  const W = viewportWidth;
  const H = window.innerHeight;
  const sil = sphereSilhouetteCircle();
  const phase = computeAuraFinalShape();
  const k = win(AURA_SHAPE, m);
  const cx = THREE.MathUtils.lerp(sil.cx, phase.cx, k);
  const cy = THREE.MathUtils.lerp(sil.cy, phase.cy, k);
  const r = THREE.MathUtils.lerp(sil.r * AURA_INSET, phase.r, k);
  auraUniforms.uCenter.value.set(
    THREE.MathUtils.lerp(cx, W * AURA_PROJECTS_CENTER_X, projects),
    THREE.MathUtils.lerp(cy, H * AURA_PROJECTS_CENTER_Y, projects)
  );
  auraUniforms.uRadius.value = THREE.MathUtils.lerp(r, Math.hypot(W, H) * AURA_PROJECTS_RADIUS_DIAG, projects);
  const blur = win(AURA_BLUR, m);
  auraUniforms.uBlur.value = blur;
  auraUniforms.uFeather.value = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(AURA_FEATHER_START, AURA_FEATHER, blur),
    AURA_PROJECTS_FEATHER,
    projects
  );
  const alpha = win(AURA_ALPHA, m);
  auraUniforms.uAlpha.value = alpha;
  auraUniforms.uColorMix.value = win(AURA_PALETTE, m);
  auraUniforms.uGrain.value = AURA_GRAIN * alpha;
  auraUniforms.uViewport.value.set(W, H);
  auraUniforms.uPixelRatio.value = renderer.getPixelRatio();
}

// Cursor influence: target snaps 0/1 on enter/leave of the sphere surface,
// current eases toward it every frame so the dent fades in/out instead of
// cutting.
let cursorInfluenceTarget = 0;
let cursorInfluenceCurrent = 0;
const CURSOR_LERP_SPEED_IN = 2.5; // fade-in: softened from 4 per client feedback ("suaviza la entrada") so the dent doesn't snap in so abruptly
const CURSOR_LERP_SPEED_OUT = 1.2; // fade-out: slower, gives the dent more inertia

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const localCursorPoint = new THREE.Vector3();

function updatePointer(event) {
  const x = (event.clientX / viewportWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1;
  pointerNDC.set(x, y);

  raycaster.setFromCamera(pointerNDC, camera);
  const intersects = raycaster.intersectObject(sphere);

  if (intersects.length > 0) {
    cursorInfluenceTarget = 1;
    localCursorPoint.copy(intersects[0].point);
    sphere.worldToLocal(localCursorPoint);
    uniforms.uCursorPoint.value.copy(localCursorPoint);
  } else {
    cursorInfluenceTarget = 0;
  }
}

window.addEventListener("pointermove", updatePointer);
window.addEventListener("pointerleave", () => {
  cursorInfluenceTarget = 0;
});

function onResize() {
  viewportWidth = document.documentElement.clientWidth;
  camera.aspect = viewportWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewportWidth, window.innerHeight);
  updateHeadlineAlignment();
  layoutCreativityPhrase();
  requestFrame();
}
window.addEventListener("resize", onResize);
// The vertical scrollbar can come or go without the window being resized.
new ResizeObserver(() => {
  if (document.documentElement.clientWidth !== viewportWidth) onResize();
}).observe(document.documentElement);

// ---- Pinned hero timeline -------------------------------------------------
// The hero is pinned for TIMELINE_UNITS units of scroll (50% of the
// viewport height each, see the ScrollTrigger below) and released right
// as the phrase finishes leaving; #projects follows in normal flow.
// One morph value m drives the background (0 = hero orange, 1 = aura fully
// formed; see computeAuraMorph). Timeline, in units:
//   0 -> 1                      "Motion AI / Designer" exits
//   0 -> AURA_RISE_END          orange rises toward the aura's final shape
//                               while fading out; the aura grows from its
//                               silhouette; page + nav go light/dark
//   PHRASE_ENTER_START (m = AURA_TEXT_AT) -> PHRASE_ENTER_END   phrase enters
//   PHRASE_ENTER_END -> PHRASE_HOLD_END      hold (phrase still)
//   PHRASE_HOLD_END -> PHRASE_PHASE_END      phrase exits; the aura stays
//                               and carries on into #projects
// Durations, in units — these are the knobs; everything below is derived.
const AURA_RISE_UNITS = 2; // rise + sphere->aura morph
const AURA_TEXT_AT = 0.82; // the phrase starts entering once the aura is this formed
const PHRASE_ENTER_UNITS = 1; // was 1.75: client feedback, the phrase has to come in faster
// Hold + exit were 1.3 + 1 units; shortened per client feedback ("que no
// tarde tantos scrolls en salir") — the softness of the exit comes from its
// easing/blur/damping (see the phrase block), not from scroll distance.
const PHRASE_HOLD_UNITS = 0.55;
const PHRASE_EXIT_UNITS = 0.75;
// Easing of the rise/morph progress (sine.inOut: gentle start and landing).
const riseEase = gsap.parseEase("sine.inOut");
function invertEase(ease, y) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < y) lo = mid;
    else hi = mid;
  }
  return hi;
}
const PHRASE_ENTER_START_UNITS = AURA_RISE_UNITS * invertEase(riseEase, AURA_TEXT_AT);
const TIMELINE_UNITS = PHRASE_ENTER_START_UNITS + PHRASE_ENTER_UNITS + PHRASE_HOLD_UNITS + PHRASE_EXIT_UNITS;
// The same points as fractions of the whole timeline (= scrollProgress).
const AURA_RISE_END = AURA_RISE_UNITS / TIMELINE_UNITS;
const PHRASE_ENTER_START = PHRASE_ENTER_START_UNITS / TIMELINE_UNITS;
const PHRASE_ENTER_END = PHRASE_ENTER_START + PHRASE_ENTER_UNITS / TIMELINE_UNITS;
const PHRASE_HOLD_END = PHRASE_ENTER_END + PHRASE_HOLD_UNITS / TIMELINE_UNITS;
const PHRASE_PHASE_END = 1;

// Final shape of the aura, in CSS px: a circle centered horizontally at
// AURA_CENTER_X (fraction of the width), its center AURA_CENTER_Y (fraction
// of the height; negative = just above the top edge). Its radius is the
// LARGER of two measures, so it reads the same size on any screen shape:
//   - AURA_RADIUS_W of the width (the size knob: raise it for a bigger
//     aura). On wide windows this is the one that applies, and the bottom
//     of the circle then runs past the bottom edge, softly cut by its rim;
//   - whatever makes its bottom reach AURA_BOTTOM_Y of the height, which
//     takes over on narrow/tall screens (where a % of the width alone
//     would leave a small disc at the top).
// At 16:9 both give about the same circle.
const AURA_CENTER_X = 0.5;
const AURA_CENTER_Y = -0.04;
const AURA_RADIUS_W = 0.55;
const AURA_BOTTOM_Y = 0.95;
function computeAuraFinalShape() {
  const W = viewportWidth;
  const H = window.innerHeight;
  const cy = H * AURA_CENTER_Y;
  return { cx: W * AURA_CENTER_X, cy, r: Math.max(W * AURA_RADIUS_W, H * AURA_BOTTOM_Y - cy) };
}

// Sphere params (hero camera) whose silhouette matches the aura's final
// shape — where the orange is heading as it rises and dissolves. The
// camera (z = HERO_CAM_Z) stays far outside it (scale is ~2 world units).
function computeAuraSphereParams() {
  const W = viewportWidth;
  const H = window.innerHeight;
  const f = H / 2 / Math.tan((HERO_FOV * Math.PI) / 360);
  const { cx, cy, r } = computeAuraFinalShape();
  return {
    scale: Math.min((HERO_CAM_Z * r) / f, HERO_CAM_Z * 0.5),
    x: (HERO_CAM_Z * (cx - W / 2)) / f,
    y: (HERO_CAM_Z * (H / 2 - cy)) / f,
  };
}

function computeAuraMorph(progress) {
  return riseEase(clamp(progress / AURA_RISE_END, 0, 1));
}
// 0 -> 1 over the AURA_PROJECTS_T stretch of the projects section's own
// scroll (which runs from the moment it starts coming in — exactly where
// the hero's pin lets go — to its end), eased like the rise.
function computeAuraProjects(progress) {
  return riseEase(clamp((progress - AURA_PROJECTS_T[0]) / (AURA_PROJECTS_T[1] - AURA_PROJECTS_T[0]), 0, 1));
}

// Peel grain size (sphere.frag.glsl's uGrainScale = pores per unit of the
// sphere's own surface). In the hero camera the on-screen sphere size is
// proportional to its scale, so multiplying by (current scale / hero scale)
// keeps the pores the size they have in the hero while the orange changes
// size during the rise.
const GRAIN_SCALE = 60;
function computeGrainScale(progress) {
  const heroScale = computeHeroSphereParams(computeCompositionScale()).scale;
  return (GRAIN_SCALE * computeSpherePhase(progress).scale) / heroScale;
}

// Hero arc -> rises toward the aura's final shape, driven by the same
// eased morph as the aura so the two stay locked (it fades out on the way,
// see updateAura). Recomputed every call (every frame), so it stays
// correct through any resize.
function computeSpherePhase(progress) {
  const hero = computeHeroSphereParams(computeCompositionScale());
  const aura = computeAuraSphereParams();
  const m = computeAuraMorph(progress);
  return {
    scale: THREE.MathUtils.lerp(hero.scale, aura.scale, m),
    x: THREE.MathUtils.lerp(HERO_X, aura.x, m),
    y: THREE.MathUtils.lerp(hero.y, aura.y, m),
  };
}

// Live clock next to "contact" in the nav, showing Valencia's current
// time regardless of the visitor's own timezone — Intl.DateTimeFormat
// with an explicit timeZone does that conversion natively, no manual UTC
// offset math (which would also miss DST transitions).
const navClockTime = document.querySelector("#nav-clock-time");
const navClockFormatter = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
// The headline's right edge is aligned to this text's ink (see
// updateHeadlineAlignment), and the last digit's ink moves a little with
// each minute — so it re-aligns whenever the text actually changes. Set
// once the alignment code below exists (null during the very first call).
let onNavClockChange = null;
function updateNavClock() {
  const text = navClockFormatter.format(new Date());
  if (text === navClockTime.textContent) return;
  navClockTime.textContent = text;
  if (onNavClockChange) onNavClockChange();
}
updateNavClock();
setInterval(updateNavClock, 1000);

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
// What IS faithful is the rasterized glyph itself: each extreme glyph is
// drawn with fillText into an offscreen canvas and its ink edges are read
// from the pixels (50%-coverage edge, sub-pixel), then placed on screen
// with a Range on that single character (its origin) and the baseline
// from a zero-size inline-block marker (its bottom sits on the baseline).
const inkCanvas = document.createElement("canvas");
const inkCtx = inkCanvas.getContext("2d", { willReadFrequently: true });
const rasterInkCache = new Map();

// 50%-coverage edges from per-column / per-row max alpha (0..1), sub-pixel.
function coverageEdges(cov) {
  let first = -1;
  let last = -1;
  for (let i = 0; i < cov.length; i++) {
    if (cov[i] >= 0.5) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return null;
  const at = (i) => cov[i] || 0;
  return { start: first + 1 - at(first) - at(first - 1), end: last + at(last) + at(last + 1) };
}

// Ink box of `text` relative to its origin/baseline, in px, plus its
// advance width. Cached per font + text (fonts/sizes only change on resize).
function rasterInk(font, text, fontSizePx) {
  const key = `${font}|${text}`;
  const cached = rasterInkCache.get(key);
  if (cached) return cached;
  inkCtx.font = font;
  const advance = inkCtx.measureText(text).width;
  const pad = Math.ceil(fontSizePx);
  inkCanvas.width = Math.ceil(advance + pad * 2);
  inkCanvas.height = Math.ceil(fontSizePx * 3);
  const originX = pad;
  const originY = Math.ceil(fontSizePx * 2);
  inkCtx.font = font; // resizing the canvas resets its state
  inkCtx.textBaseline = "alphabetic";
  inkCtx.fillStyle = "#fff";
  inkCtx.fillText(text, originX, originY);
  const { data, width, height } = inkCtx.getImageData(0, 0, inkCanvas.width, inkCanvas.height);
  const colCov = new Float32Array(width);
  const rowCov = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3] / 255;
      if (alpha > colCov[x]) colCov[x] = alpha;
      if (alpha > rowCov[y]) rowCov[y] = alpha;
    }
  }
  const h = coverageEdges(colCov);
  const v = coverageEdges(rowCov);
  const ink = h && v
    ? { left: h.start - originX, right: h.end - originX, top: v.start - originY, bottom: v.end - originY, advance }
    : { left: 0, right: advance, top: 0, bottom: 0, advance };
  rasterInkCache.set(key, ink);
  return ink;
}

function measureTextInk(el) {
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
// (.hw-layer, same .hw-sans/.hw-display so updateHeadlineAlignment aligns
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

const headlineWordEl = document.querySelector(".headline-word");
let updateHeadlineFocus = () => {};
let prepareHeadlineForMeasure = () => {};
let measureHeadlineHitbox = () => {};

function setupHeadlineFocus() {
  // prefers-reduced-motion: one sharp, static headline — no copies, no masks.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
    filter.setAttribute("id", `hw-blur-${i}`);
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
    copy.querySelector(".hw-layer-inner").style.filter = `url(#hw-blur-${i})`;
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
      const sx = (((k + 1) / (HEADLINE_BLUR_LAYERS - 1)) * HEADLINE_BLUR_MAX_VW * window.innerWidth) / 100;
      node.setAttribute("stdDeviation", `${sx.toFixed(2)} ${(sx * HEADLINE_BLUR_Y_RATIO).toFixed(2)}`);
    });
  }
  sizeBlurs();
  window.addEventListener("resize", sizeBlurs);

  // Pointer: .headline-word is pointer-events:none, so the cursor is
  // hit-tested by hand against its box (measured in its resting state by
  // updateHeadlineAlignment, grown by HEADLINE_HIT_PAD_PX).
  let hitbox = { left: 0, top: 0, right: 0, bottom: 0 };
  let stripLeft = 0; // the strips' own left edge on screen (= the headline's)
  measureHeadlineHitbox = () => {
    const rect = headlineWordEl.getBoundingClientRect();
    hitbox = {
      left: rect.left - HEADLINE_HIT_PAD_PX,
      top: rect.top - HEADLINE_HIT_PAD_PX,
      right: rect.right + HEADLINE_HIT_PAD_PX,
      bottom: rect.bottom + HEADLINE_HIT_PAD_PX,
    };
    stripLeft = rect.left;
    // Letter centers and radii, once, at rest — never per pointermove.
    lines.forEach((line) => {
      line.centers = line.sets[0].map((char) => {
        const box = char.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
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
  prepareHeadlineForMeasure = () => {
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
  updateHeadlineFocus = (delta, visible) => {
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
}
setupHeadlineFocus();

const headlineWords = Array.from(document.querySelectorAll(".headline-word"));
const hwSansEls = Array.from(document.querySelectorAll(".hw-sans"));
const hwDisplayEls = Array.from(document.querySelectorAll(".hw-display"));
const navLogoEl = document.querySelector(".nav-logo");
const navClockTimeEl = document.querySelector("#nav-clock-time");
const HEADLINE_BOTTOM_GAP_VH = 1.5;

function updateHeadlineAlignment() {
  // Measure in the resting state: GSAP's exit tween puts y/scale/blur on
  // .headline-word, which getBoundingClientRect would include. Clear it for
  // the measurement and put it back afterwards.
  const savedTransforms = headlineWords.map((el) => el.style.transform);
  headlineWords.forEach((el) => (el.style.transform = "none"));
  // ...and with "Motion AI" at its resting weight (the widening while the
  // letters fatten under the cursor is part of that effect, not something
  // to re-align against).
  prepareHeadlineForMeasure();

  // Reset to the CSS starting point so repeated calls never compound.
  hwSansEls.forEach((el) => (el.style.left = "0px"));
  hwDisplayEls.forEach((el) => (el.style.right = "0px"));
  headlineWords.forEach((el) => (el.style.bottom = "3vh"));

  const logoRect = navLogoEl.getBoundingClientRect();
  const clockInk = measureTextInk(navClockTimeEl);

  // Left: M ink → logo left edge.
  const sansInk = measureTextInk(hwSansEls[0]);
  const logoInkLeft = logoRect.left + logoInkLeftRatio * logoRect.width;
  const leftDelta = logoInkLeft - sansInk.left;
  hwSansEls.forEach((el) => (el.style.left = `${leftDelta}px`));

  // Right: final "r" ink → clock ink right edge. (style.right grows leftward)
  const displayInk = measureTextInk(hwDisplayEls[0]);
  const rightDelta = displayInk.right - clockInk.right;
  hwDisplayEls.forEach((el) => (el.style.right = `${rightDelta}px`));

  // Bottom: se ancla el punto MÁS BAJO de la tinta de "Designer" (el final
  // del descendente de la g, measureTextInk().bottom) a
  // HEADLINE_BOTTOM_GAP_VH del borde inferior del hero, así la g se ve
  // entera. Medido contra el propio #hero-section (no contra la ventana)
  // para que siga siendo correcto aunque el redimensionado ocurra con el
  // hero ya fuera de pantalla. Se mueve el bloque .headline-word completo,
  // así que "Motion AI" sube con "Designer" y conserva la misma separación.
  const heroBottom = heroSectionEl.getBoundingClientRect().bottom;
  const displayInkAfter = measureTextInk(hwDisplayEls[0]);
  const targetBottomGap = (HEADLINE_BOTTOM_GAP_VH * window.innerHeight) / 100;
  const currentBottomGap = heroBottom - displayInkAfter.bottom;
  const baseBottomPx = (3 * window.innerHeight) / 100;
  const bottomPx = baseBottomPx + (targetBottomGap - currentBottomGap);
  headlineWords.forEach((el) => (el.style.bottom = `${bottomPx}px`));

  measureHeadlineHitbox(); // still in the resting state: no exit transform on it
  headlineWords.forEach((el, i) => (el.style.transform = savedTransforms[i]));

  if (window.__debugHeadline) {
    const s = measureTextInk(hwSansEls[0]);
    const d = measureTextInk(hwDisplayEls[0]);
    console.log("[headline] M-logo dx:", (s.left - logoInkLeft).toFixed(2),
      "| r-clock dx:", (d.right - clockInk.right).toFixed(2),
      "| g-bottom gap:", (heroBottom - d.bottom).toFixed(2));
  }
}
updateHeadlineAlignment();
// Anything rasterized before a webfont arrived used a fallback font — drop
// the cache and re-align once they're in (and again if one loads later).
function onFontsChanged() {
  rasterInkCache.clear();
  updateHeadlineAlignment();
}
document.fonts.ready.then(onFontsChanged);
document.fonts.addEventListener("loadingdone", onFontsChanged);
navLogoEl.decode().then(() => {
  measureLogoInk(navLogoEl);
  updateHeadlineAlignment();
}).catch(() => {});
onNavClockChange = updateHeadlineAlignment;

// ---- "Where creativity meets technology" phrase ---------------------------
// Driven per frame from scrollProgress, additionally damped here
// (PHRASE_DAMPING, frame-rate independent) on top of the ScrollTrigger
// scrub, so an abrupt scroll never makes it jerk. The window itself is in
// timeline units (PHRASE_ENTER_START/END, PHRASE_HOLD_END, PHRASE_PHASE_END
// above).
// Entrance: every word (.word in index.html) fades in on its own with a
// small sideways slide, one after another. Line 1 comes from the left,
// line 2 mirrors it from the right. Within each line the word nearest the
// middle of the phrase leads (client ask): "creativity", then "Where";
// "meets", then "technology". Exit: the whole line fades, lifts and
// softens.
const PHRASE_WORD_SHIFT_EM = 0.6; // how far each word slides in from, in em
const PHRASE_WORD_BLUR_PX = 3; // each word also sharpens from this blur
// Delay between the two words of a line, as a fraction of the whole
// entrance window (PHRASE_ENTER_UNITS of scroll).
const PHRASE_WORD_STAGGER = 0.15;
const PHRASE_LINE2_AT = 0.5; // line 2 starts when line 1 is this far through
const PHRASE_EXIT_Y_PX = -30;
const PHRASE_EXIT_BLUR_PX = 6; // the lines also soften out of focus as they leave
// 1 - exp(-PHRASE_DAMPING * delta) per frame. Lower = more glide: at 4 the
// phrase keeps easing for ~half a second after the scroll stops, which is
// what keeps the (short) exit from ever feeling abrupt.
const PHRASE_DAMPING = 4;
const phraseWordEase = gsap.parseEase("power2.out");
const phraseExitEase = gsap.parseEase("sine.inOut");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let phraseProgress = 0;

const phraseLines = Array.from(document.querySelectorAll(".cp-line")).map((el, index) => {
  const words = Array.from(el.querySelectorAll(".word"));
  // prefers-reduced-motion: the words never animate, the line just fades.
  if (prefersReducedMotion) words.forEach((word) => (word.style.opacity = "1"));
  return {
    el,
    words,
    applied: words.map(() => -1), // last eased value written per word
    // Order the words appear in: line 1 last word first ("creativity",
    // "Where"), line 2 in reading order ("meets", "technology").
    rank: words.map((_, i) => (index === 0 ? words.length - 1 - i : i)),
    direction: index === 0 ? -1 : 1, // slides in from the left / from the right
  };
});
// Shares of the entrance window (0..1), derived from the two knobs above:
// a line lasts PHRASE_LINE_SPAN, line k starts at k * PHRASE_LINE2_AT of
// that, and inside a line each word lasts whatever the stagger leaves.
const PHRASE_LINE_SPAN = 1 / (1 + (phraseLines.length - 1) * PHRASE_LINE2_AT);
const PHRASE_WORD_SPAN = PHRASE_LINE_SPAN - (phraseLines[0].words.length - 1) * PHRASE_WORD_STAGGER;

// Puts each line's BASELINE on its CSS `top` (see #creativity-phrase in
// style.css). Transforms don't change the marker-to-top difference, so
// this is safe to run mid-animation.
function layoutCreativityPhrase() {
  phraseLines.forEach(({ el }) => {
    el.style.marginTop = "0px";
    const marker = document.createElement("span");
    marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;";
    el.appendChild(marker);
    const baselineOffset = marker.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
    marker.remove();
    el.style.marginTop = `${-baselineOffset}px`;
  });
}
layoutCreativityPhrase();
document.fonts.ready.then(layoutCreativityPhrase);

function updateCreativityPhrase(progress, delta) {
  phraseProgress += (progress - phraseProgress) * (1 - Math.exp(-PHRASE_DAMPING * delta));
  const p = phraseProgress;
  const enterT = clamp((p - PHRASE_ENTER_START) / (PHRASE_ENTER_END - PHRASE_ENTER_START), 0, 1);
  const exitT = phraseExitEase(clamp((p - PHRASE_HOLD_END) / (PHRASE_PHASE_END - PHRASE_HOLD_END), 0, 1));

  phraseLines.forEach((line, index) => {
    const { el, words, applied, rank, direction } = line;
    const lineStart = index * PHRASE_LINE2_AT * PHRASE_LINE_SPAN;

    if (prefersReducedMotion) {
      // Fade of the whole line only: no words, no travel, no blur.
      const lineT = clamp((enterT - lineStart) / PHRASE_LINE_SPAN, 0, 1);
      el.style.opacity = phraseWordEase(lineT) * (1 - exitT);
      return;
    }

    // Exit (and nothing before the entrance starts) is on the whole line.
    el.style.opacity = enterT > lineStart ? 1 - exitT : 0;
    el.style.transform = `translate3d(0, ${PHRASE_EXIT_Y_PX * exitT}px, 0)`;
    el.style.filter = exitT > 0.001 ? `blur(${PHRASE_EXIT_BLUR_PX * exitT}px)` : "none";

    words.forEach((word, i) => {
      const wordStart = lineStart + rank[i] * PHRASE_WORD_STAGGER;
      const t = clamp((enterT - wordStart) / PHRASE_WORD_SPAN, 0, 1);
      // >= 0.9999 counts as done: the last word's window ends exactly at 1
      // and float rounding would otherwise leave it a hair short forever,
      // keeping a (near-zero) transform and blur filter on it.
      const e = t >= 0.9999 ? 1 : phraseWordEase(t);
      if (e === applied[i]) return;
      applied[i] = e;
      word.style.opacity = e;
      word.style.transform = e < 1 ? `translateX(${direction * PHRASE_WORD_SHIFT_EM * (1 - e)}em)` : "none";
      word.style.filter = e < 1 ? `blur(${PHRASE_WORD_BLUR_PX * (1 - e)}px)` : "none";
    });
  });
}

// ---- Projects title: "Freshly Squeezed" --------------------------------------
// The projects section's title, between the aura and the videos
// (.featured-title in style.css; sizes and position are CSS variables
// there). Three things happen to it:
//   - Entrance, "liquid text": each line starts as a blur too wide to see
//     and sharpens into its letters, under an alpha threshold
//     (#liquid-threshold in index.html, on .ft-block while it lasts) that
//     turns that blur into solid blobs pulling together like drops. With
//     f going 0 -> 1 along the line's FEATURED_LIQUID_DURATION:
//       blur = min(FEATURED_LIQUID_BLUR / f - FEATURED_LIQUID_BLUR, FEATURED_LIQUID_BLUR_MAX) px
//       opacity = f ^ FEATURED_LIQUID_OPACITY_POWER
//     The second line starts FEATURED_LIQUID_LINE_DELAY later. Once both
//     are in, every filter is off: plain sharp text.
//     It is NOT scrubbed, and what sets it off depends on which way the
//     scroll is going (updateFeaturedGate), because the "Where creativity"
//     phrase shares the middle of the screen with it:
//       down  it plays in time as soon as the phrase, on its way out, has
//             faded down to FEATURED_START_PHRASE_OPACITY — still inside
//             the hero's pin; the title is fixed on screen by then. From
//             there until the phrase is gone the two are seen together.
//       up    the two are never seen together: the title plays back out
//             and is also faded by the scroll itself over the first
//             FEATURED_UP_GUARD of the projects section, so it is gone by
//             the section's start — and the phrase only returns above it.
//   - Then it stays put.
//   - With the zoom, it grows exactly like the center video: the zoom's
//     own timeline hands it that layer's scale on every update
//     (setupZoomParallax -> setFeaturedScale).
const FEATURED_LIQUID_DURATION = 1.5; // seconds, per line
const FEATURED_LIQUID_LINE_DELAY = 0.2; // "Squeezed" starts this long after "Freshly"
const FEATURED_LIQUID_BLUR = 8; // px: see the formula above
const FEATURED_LIQUID_BLUR_MAX = 100; // px
const FEATURED_LIQUID_OPACITY_POWER = 0.4;
// Where in f the entrance starts when the title comes in. From 0 the first
// 0.65s or so show nothing at all — measured: the first drops clear the
// threshold at f ~ 0.45 — so the title seemed to arrive late; starting
// just under that, it is there almost at once. (Going back out it still
// runs all the way down to 0.)
const FEATURED_LIQUID_START_F = 0.4;
// Scrolling down, the title starts when the leaving phrase is down to this
// opacity (1 = the moment it begins to leave, 0 = only once it is gone).
const FEATURED_START_PHRASE_OPACITY = 0.5;
// Scrolling up, the stretch of the projects section's progress, right
// after its start, over which the title fades away.
const FEATURED_UP_GUARD = 0.05;
// Scrolling up, the phrase opacity from which the title must be gone.
// Measured over the aura: at 0.03 the phrase changes no pixel by more
// than 7/255, under the aura's own grain (neighbouring pixels differ by
// up to 16/255) — nothing of it can be told apart yet.
const FEATURED_PHRASE_BACK = 0.03;
const FEATURED_FADE_RATE = 14; // title opacity: 1 - exp(-FEATURED_FADE_RATE * delta) per frame
// Same, when the phrase is already coming back with the title still up (a
// scroll up too fast for the guard, or one that turns around mid hand-over):
// out in 3-4 frames rather than in one.
const FEATURED_CUT_RATE = 40;
const FEATURED_DIRECTION_SLOP_PX = 6; // scroll this far the other way before it counts as a change of direction
const featuredTitleEl = document.querySelector(".featured-title");
const featuredScaleEl = featuredTitleEl.querySelector(".ft-scale");
const featuredRasterEl = featuredTitleEl.querySelector(".ft-raster");
const featuredBlockEl = featuredTitleEl.querySelector(".ft-block");
const featuredLines = Array.from(featuredBlockEl.querySelectorAll(".ft-line")).map((el) => ({ el, f: 0 }));
// SVG filters on HTML elements: without them (old Safari) the lines still
// blur and fade in, just not through the threshold.
const featuredThreshold = !prefersReducedMotion && CSS.supports("filter", "url(#liquid-threshold) blur(0.6px)");
function renderFeaturedLine(line) {
  const { el, f } = line;
  // prefers-reduced-motion: a plain fade, no filters at all.
  if (prefersReducedMotion) {
    el.style.opacity = f;
    return;
  }
  el.style.opacity = f ** FEATURED_LIQUID_OPACITY_POWER;
  el.style.filter = f < 1 ? `blur(${Math.min(FEATURED_LIQUID_BLUR / f - FEATURED_LIQUID_BLUR, FEATURED_LIQUID_BLUR_MAX)}px)` : "none";
}
const featuredLiquid = gsap.timeline({
  paused: true,
  // The threshold only while the title is forming (or un-forming): off at
  // both ends, where there is nothing to see or nothing left to blur.
  onUpdate: () => {
    const progress = featuredLiquid.progress();
    featuredTitleEl.classList.toggle("is-liquid", featuredThreshold && progress > 0 && progress < 1);
  },
});
featuredLines.forEach((line, index) => {
  featuredLiquid.fromTo(
    line,
    { f: 0 },
    { f: 1, duration: FEATURED_LIQUID_DURATION, ease: "none", onUpdate: () => renderFeaturedLine(line) },
    index * FEATURED_LIQUID_LINE_DELAY
  );
  renderFeaturedLine(line);
});

// Scale of the whole title (with the zoom). Redrawing text this big at a
// new size on every frame is slow (measured: the zoom ran at ~30fps with
// it, 60 without), so the scale is split in two: .ft-raster takes a
// coarse one — the next step up, FEATURED_RASTER_STEP apart, never past
// `maxScale` — which is the size the text is actually drawn at, and only
// changes a handful of times along the zoom; .ft-scale, a compositor
// layer, takes the rest (<= 1: always a reduction of that drawing, so
// the text stays sharp) and is free to change every frame.
const FEATURED_RASTER_STEP = 1.5;
let featuredRaster = 0;
function setFeaturedScale(scale, maxScale) {
  const step = FEATURED_RASTER_STEP ** Math.ceil(Math.log(Math.max(scale, 1)) / Math.log(FEATURED_RASTER_STEP) - 1e-6);
  const raster = Math.min(step, Math.max(maxScale, scale));
  if (raster !== featuredRaster) {
    featuredRaster = raster;
    featuredRasterEl.style.transform = raster === 1 ? "none" : `scale(${raster})`;
  }
  featuredScaleEl.style.transform = scale === raster ? "none" : `scale(${scale / raster})`;
}

let featuredWanted = false;
let featuredOpacity = 0;
let featuredFading = false; // its opacity has not reached its target yet
let featuredDirection = 1; // 1 = scrolling down, -1 = up
let featuredDirectionY = window.scrollY;
// Every frame, right after the phrase has been updated.
function updateFeaturedGate(delta) {
  const y = window.scrollY;
  if ((y - featuredDirectionY) * featuredDirection < -FEATURED_DIRECTION_SLOP_PX) {
    featuredDirection = -featuredDirection;
    featuredDirectionY = y;
  } else if ((y - featuredDirectionY) * featuredDirection > 0) {
    featuredDirectionY = y;
  }

  const phraseOpacity = Math.max(...phraseLines.map(({ el }) => parseFloat(el.style.opacity || "0")));
  // Past its hold (leaving, or gone): its opacity is also 0 before it ever comes in.
  const phraseLeft = phraseProgress > PHRASE_HOLD_END;
  let wanted;
  let target;
  let rate = FEATURED_FADE_RATE;
  if (featuredDirection > 0) {
    wanted = phraseLeft && phraseOpacity < FEATURED_START_PHRASE_OPACITY;
    target = wanted ? 1 : 0;
  } else {
    const clear = phraseLeft && phraseOpacity < FEATURED_PHRASE_BACK;
    wanted = clear && projectsProgress >= FEATURED_UP_GUARD;
    target = clear ? smoothstep(0, FEATURED_UP_GUARD, projectsProgress) : 0;
    if (!clear) rate = FEATURED_CUT_RATE;
  }
  if (wanted !== featuredWanted) {
    featuredWanted = wanted;
    // Only under the threshold: without it (plain fade) every f is visible.
    const startTime = featuredThreshold ? FEATURED_LIQUID_START_F * FEATURED_LIQUID_DURATION : 0;
    if (!wanted) featuredLiquid.reverse();
    else if (featuredLiquid.time() < startTime) featuredLiquid.play(startTime);
    else featuredLiquid.play();
  }

  const previous = featuredOpacity;
  featuredOpacity += (target - featuredOpacity) * (1 - Math.exp(-rate * delta));
  if (Math.abs(target - featuredOpacity) < 0.002) featuredOpacity = target;
  featuredFading = featuredOpacity !== target;
  if (featuredOpacity !== previous) featuredTitleEl.style.opacity = featuredOpacity;
}
// Makes the CSS variables of .featured-title mean what they say, by
// measuring the ink and setting the corrections (--ft-lead-fix: gap
// between the lines, --ft-dx-fix: each line's ink centered, --ft-dy-fix:
// the block's ink centered on --ft-center-y). Everything is measured on a
// hidden copy of the block with nothing on it (the real lines may be
// mid-entrance, the real block mid-zoom) and stored in em/vw: the title is
// sized in vw, so the corrections stay right on resize. Needs the webfonts.
function layoutFeaturedTitle() {
  ["--ft-lead-fix", "--ft-dy-fix"].forEach((name) => featuredTitleEl.style.removeProperty(name));
  const zoomTransforms = [featuredScaleEl.style.transform, featuredRasterEl.style.transform];
  featuredScaleEl.style.transform = "none";
  featuredRasterEl.style.transform = "none";
  const probe = featuredBlockEl.cloneNode(true);
  probe.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
  probe.style.visibility = "hidden";
  featuredRasterEl.appendChild(probe);
  const frame = featuredTitleEl.getBoundingClientRect();
  const vw = frame.width / 100;
  const probeLines = Array.from(probe.querySelectorAll(".ft-line"));

  const [display, sans] = probeLines;
  const gap = parseFloat(getComputedStyle(sans).marginTop); // = --ft-gap, no correction yet
  const leadFix = gap - (measureTextInk(sans).top - measureTextInk(display).baseline);
  featuredTitleEl.style.setProperty("--ft-lead-fix", `${(leadFix / vw).toFixed(4)}vw`);

  const inks = probeLines.map((line) => measureTextInk(line));
  probeLines.forEach((line, k) => {
    const dx = frame.left + frame.width / 2 - (inks[k].left + inks[k].right) / 2;
    featuredLines[k].el.style.setProperty("--ft-dx-fix", `${(dx / parseFloat(getComputedStyle(line).fontSize)).toFixed(5)}em`);
  });
  const inkMiddle = (Math.min(...inks.map((ink) => ink.top)) + Math.max(...inks.map((ink) => ink.bottom))) / 2;
  const dyFix = frame.top + parseFloat(getComputedStyle(probe).top) - inkMiddle;
  featuredTitleEl.style.setProperty("--ft-dy-fix", `${(dyFix / vw).toFixed(4)}vw`);

  probe.remove();
  [featuredScaleEl.style.transform, featuredRasterEl.style.transform] = zoomTransforms;
}
document.fonts.ready.then(layoutFeaturedTitle);

let scrollProgress = 0;
// The sphere/aura follow a damped copy of scrollProgress (frame-rate
// independent, on top of the scrub), so an abrupt scroll never makes the
// orange or the aura jerk.
const AURA_DAMPING = 5; // 1 - exp(-AURA_DAMPING * delta) per frame, see animate()
let sphereProgressDamped = 0;
// The projects section's own scroll progress (0 as it starts coming in, 1
// at its end) drives the aura's second move, with the same damping; and
// once the whole section has scrolled above the viewport the aura is no
// longer drawn. Both come from the ScrollTriggers created right after the
// zoom parallax.
let projectsProgress = 0;
let projectsProgressDamped = 0;
let projectsScrolledPast = false;

const heroScrollTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "#hero-section",
    start: "top top",
    end: `+=${TIMELINE_UNITS * 50}%`, // 50% of the viewport height of scroll per timeline unit
    pin: true,
    // A number instead of `true`: ScrollTrigger catches up to the real
    // scroll position over that many seconds, so motion keeps gliding for
    // a beat after the scroll input ends instead of stopping dead.
    scrub: 1,
    onUpdate: (self) => {
      scrollProgress = self.progress;
      requestFrame();
    },
  },
});

heroScrollTimeline
  // "Glow horizon" exit: the headline fades, lifts, blurs and scales out
  // slightly, as if dissolving into a glow.
  .fromTo(
    ".headline-word",
    { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    { opacity: 0, y: -60, scale: 1.15, filter: "blur(14px)", duration: 1, ease: "none" },
    0
  )
  // The two introductions leave with it, over the same stretch: a fade and
  // a small lift.
  .fromTo(".hero-intro", { opacity: 1, y: 0 }, { opacity: 0, y: -40, duration: 1, ease: "none" }, 0)
  // Sphere rise, aura and phrase are all per-frame (computeSpherePhase /
  // updateAura / updateCreativityPhrase); this only reserves the scroll.
  .to({}, { duration: TIMELINE_UNITS }, 0);

// ---- Projects: zoom parallax ------------------------------------------------
// GSAP port of the reference ZoomParallax component: 7 layers stacked in a
// sticky viewport, each scaled up from 1 over the first 100vh that .zp is stuck, so
// the media zoom out from the screen center and layer 0 ends up filling
// the screen. Layer sizes/offsets live in style.css
// (.zp-layer:nth-of-type).
// Layer 0's final scale is not a fixed number: it is whatever makes its
// media cover the visible viewport (zoomCoverScale), recomputed on every
// ScrollTrigger refresh (so on resize). The other layers keep their
// proportion to it (ZOOM_PARALLAX_SCALES[i] / ZOOM_PARALLAX_SCALES[0]).
// The zoom's own scroll is 100vh; it ends ZOOM_PARALLAX_HOLD before the
// end of that, at full scale. Then .zp goes on: REEL_HOLD_VH more with the
// showreel filling the screen, on its own ("Showreel" below), and
// MORE_PANEL_VH in which the black panel comes up over it ("Still
// thirsty" below). All of it is one timeline, 1 unit of time = 100vh of
// scroll.
//
// EDIT HERE to change the covers: one entry per layer, in layer order.
//   0 center (fills the screen at the end)   1 top (wide)
//   2 left (tall and narrow)                 3 right
//   4 bottom center                          5 bottom left
//   6 bottom right (the small one)
// `src` is the file exactly as it sits under public/ (spaces, "ñ" and
// all): it is URL-encoded where it is used. A .mp4/.webm becomes a
// <video>, anything else an <img>. Each cover links to work.html#<slug>,
// unless its entry says `href: null`: the center one is the showreel —
// its `src` is the short local loop it shows until it fills the screen,
// where the whole reel takes over (see "Showreel" below).
const ZOOM_PARALLAX_PROJECTS = [
  { slug: "showreel", title: "Showreel 2026", src: "/proyectos/Reel/Portada_Reel.mp4", alt: "Daniel Alamilla Showreel", href: null },
  { slug: "otono-tmm", title: "Otoño TMM", src: "/proyectos/Otoño TMM/Portada_Tardor TMM.mp4", alt: "Otoño TMM project cover" },
  { slug: "sitges", title: "Sitges Film Festival", src: "/proyectos/Sitges/Styleframes/Styleframes_SItges_1.2.mp4", alt: "Sitges Film Festival project cover" },
  { slug: "spotify", title: "Spotify Daylist", src: "/proyectos/Spotify/Portada_Spotify Daylist.mp4", alt: "Spotify Daylist project cover" },
  { slug: "hummel-betis", title: "Hummel Betis", src: "/proyectos/Hummel Betis/Hummel Betis_Tarjeta.mp4", alt: "Hummel Betis project cover" },
  { slug: "tmm-esferas", title: "TMM Esferas", src: "/proyectos/TMM Esferas/Portada_TMM Esferas.mp4", alt: "TMM Esferas project cover" },
  { slug: "estiu-tmm", title: "Estiu TMM", src: "/proyectos/Estiu TMM/Portada_Estiu TMM.mp4", alt: "Estiu TMM project cover" },
].map((project) => ({ href: `work.html#${project.slug}`, ...project }));
const ZOOM_PARALLAX_SCALES = [4, 5, 6, 5, 6, 8, 9]; // relative to one another (the reference's values)
const ZOOM_PARALLAX_COVER = 1.03; // layer 0 ends this much bigger than an exact cover of the viewport
const ZOOM_PARALLAX_HOLD = 0.2; // last share of the zoom's own scroll (20vh of its 100vh)

let zoomCenterCover = null; // the showreel's card, .zp-media of layer 0 (setupZoomParallax)
let zoomTimeline = null; // set by setupZoomParallax

// The nav inside the center project: its ink is the page's dark from the
// creativity phase on (updateNavInk); each item (logo, links, clock) turns
// white (.is-white in style.css) once the card that grows to fill the
// screen has reached behind it — and stays white from there on, over the
// showreel and over the black panel that comes up over it. Checked
// whenever that card moves.
const navItems = Array.from(siteNavEl.querySelectorAll(".nav-logo, .nav-links a, .nav-clock"));
function updateNavContrast() {
  const cover = zoomCenterCover.getBoundingClientRect();
  navItems.forEach((item) => {
    const box = item.getBoundingClientRect();
    const x = (box.left + box.right) / 2;
    const y = (box.top + box.bottom) / 2;
    item.classList.toggle("is-white", x >= cover.left && x <= cover.right && y >= cover.top && y <= cover.bottom);
  });
}

// ---- Showreel ---------------------------------------------------------------
// The center card has two states:
//   - small, and all through the zoom: the short local loop (Portada_Reel),
//     like every other card;
//   - once it has grown to fill the screen: the WHOLE showreel, from second
//     0 every time, in a Vimeo player (REEL_URL) laid over the loop and
//     filling the card like object-fit: cover (.zp-reel in style.css).
// The player is created ahead of time, when the card comes near the screen,
// and waits there, paused and invisible. When the card reaches full size it
// is sent back to 0 and played, and as soon as it reports "playing" it is
// faded in over the loop (which then stops). When the card shrinks back
// under full size it is faded out again — the loop takes over — stopped and
// left at 0. While the black panel covers it, it is only paused: it goes on
// from where it was. Always silent.
//   REEL_FULL_AT           share of its final size at which the card
//                          becomes the reel
//   REEL_FULL_HYSTERESIS   how far back under that it must shrink before it
//                          becomes the loop again, so a scroll wavering
//                          right at the threshold does not restart the reel
//   REEL_CROSSFADE_S       seconds of the fade between the two
//   REEL_HOLD_VH           scroll, in viewport heights, that the reel stays
//                          full screen for after the zoom's own hold and
//                          before the panel starts to come up
const REEL_FULL_AT = 1;
const REEL_FULL_HYSTERESIS = 0.03;
const REEL_CROSSFADE_S = 0.4;
const REEL_HOLD_VH = 200;
const REEL_URL = "https://player.vimeo.com/video/1006517705?muted=1&loop=1&controls=0&title=0&byline=0&portrait=0&dnt=1&autopause=0";
const REEL_NEAR_MARGIN = "100% 0px"; // how far from the screen the card still is when its player is created
const reel = {
  card: null, // .zp-media of layer 0 (setupReel)
  preview: null, // its <video>: the local loop
  player: null, // the Vimeo player, once created
  full: false, // the card is at full size: the reel's turn
  live: false, // ...and the reel is playing and shown
  onScreen: false,
  covered: false, // the black panel is all the way up
  timer: 0, // what is left to do once the running fade ends
};
const ignore = () => {}; // a player command that did not go through (not loaded yet, or blocked)
// Whichever of the two is on plays while the card can be seen.
function syncReel() {
  const visible = reel.onScreen && !reel.covered;
  if (reel.player) {
    if (visible && reel.full) reel.player.play().catch(ignore);
    else if (!visible) reel.player.pause().catch(ignore);
  }
  if (!visible) reel.preview.pause();
  else if (!reel.live) reel.preview.play().catch(ignore);
}
// The player's "playing": the reel is really moving, so it can be shown.
function showReel() {
  if (!reel.full || reel.live) return; // (it also fires when it resumes from under the panel)
  reel.live = true;
  reel.card.classList.add("is-live");
  clearTimeout(reel.timer);
  reel.timer = setTimeout(() => reel.preview.pause(), REEL_CROSSFADE_S * 1000);
}
function setReelFull(full) {
  if (full === reel.full) return;
  reel.full = full;
  clearTimeout(reel.timer);
  const rewind = () => {
    if (!reel.player) return;
    reel.player.pause().catch(ignore);
    reel.player.setCurrentTime(0).catch(ignore);
  };
  if (full) {
    rewind(); // always from the start
  } else {
    reel.live = false;
    reel.card.classList.remove("is-live");
    reel.timer = setTimeout(rewind, REEL_CROSSFADE_S * 1000); // once it has faded out
  }
  syncReel();
}
function createReelPlayer() {
  if (reel.player) return;
  const frame = document.createElement("iframe");
  frame.className = "zp-reel";
  frame.src = REEL_URL;
  frame.allow = "autoplay; fullscreen; picture-in-picture";
  frame.title = "Daniel Alamilla Showreel";
  frame.tabIndex = -1; // nothing to operate in it: no controls, no pointer events
  reel.card.appendChild(frame);
  reel.player = new Player(frame);
  reel.player.on("playing", showReel);
  syncReel();
}
// Called by setupZoomParallax with layer 0's card and its <video>.
function setupReel(card, preview) {
  reel.card = card;
  reel.preview = preview;
  card.classList.add("has-reel");
  card.style.setProperty("--reel-fade", `${REEL_CROSSFADE_S}s`);
  new IntersectionObserver(
    (entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      createReelPlayer();
    },
    { rootMargin: REEL_NEAR_MARGIN }
  ).observe(card);
  // The nav's "showreel" link jumps straight to the reel from anywhere:
  // the player starts loading as soon as the pointer (or the focus) is on
  // the link, so it is not created only on arrival.
  const reelLink = siteNavEl.querySelector('a[href="#showreel"]');
  ["pointerenter", "focus"].forEach((type) => reelLink.addEventListener(type, createReelPlayer, { once: true }));
  new IntersectionObserver((entries) => {
    reel.onScreen = entries[entries.length - 1].isIntersecting;
    syncReel();
  }).observe(card);
}

// ---- "Still thirsty for more?" panel ----------------------------------------
// After the showreel's hold, a black panel comes up from below over it, at
// the speed of the scroll, until it covers everything (.more in index.html
// / style.css); the reel stops once it does. Everything in it is its child
// and comes up with it. The block of text also moves inside the panel,
// always the same way — up on screen while the scroll goes down, never
// back:
//   - while the panel comes up, at MORE_TEXT_SPEED of the panel's speed: it
//     starts a little higher in the panel than where it ends the rise;
//   - once the panel is in place it goes on up for MORE_TEXT_SETTLE_VH of
//     scroll, slowing down, and stops in its place (style.css). How far below it
//     it is when that stretch begins (MORE_TEXT_SETTLE_DROP_VH) follows
//     from the other two, so its pace does not change where the panel
//     stops: with the ease used there (quadratic out) the stretch starts
//     at 2 * drop / length vh per vh of scroll.
// This function is the only thing that positions the panel and the block,
// from one number: the scroll since the panel started (syncZoom sets
// moreScroll from the zoom's own timeline), followed per frame by an
// exponential approach (animate()), which cannot overshoot.
//   MORE_PANEL_VH         scroll that this stretch adds to the zoom section
//                         (.zp), in viewport heights
//   MORE_PANEL_RISE_VH    how much of it the panel takes to come up; 100 =
//                         exactly the speed of the scroll
//   MORE_TEXT_SPEED       speed of the text on screen while the panel comes
//                         up, as a share of the panel's (1 = glued to it)
//   MORE_TEXT_SETTLE_VH   scroll, after the rise, in which the text goes on
//                         up to the middle of the screen
const MORE_PANEL_VH = 150;
const MORE_PANEL_RISE_VH = 100;
const MORE_TEXT_SPEED = 0.94;
const MORE_TEXT_SETTLE_VH = 30;
const MORE_TEXT_SETTLE_DROP_VH = (MORE_TEXT_SPEED * MORE_TEXT_SETTLE_VH) / 2;
const moreEl = document.querySelector(".more");
const moreBlockEl = moreEl.querySelector(".more-block");

let moreScroll = 0; // vh scrolled since the panel started to come up, 0..MORE_PANEL_VH
let moreScrollDamped = 0;
let moreApplied = -1;
function updateMorePanel() {
  if (moreScrollDamped === moreApplied) return;
  moreApplied = moreScrollDamped;
  const rise = clamp(moreScrollDamped / MORE_PANEL_RISE_VH, 0, 1);
  const settle = clamp((moreScrollDamped - MORE_PANEL_RISE_VH) / MORE_TEXT_SETTLE_VH, 0, 1);
  moreEl.classList.toggle("is-on", rise > 0);
  moreEl.style.transform = `translate3d(0, ${((1 - rise) * 100).toFixed(3)}%, 0)`;
  // The block, in vh from its place by CSS (the panel is 100vh tall).
  // Both terms only ever shrink as the scroll goes on: what is left of the
  // drop (positive, below the center) and of the head start it has on the
  // panel (negative). prefers-reduced-motion: it just rides the panel.
  const drop = MORE_TEXT_SETTLE_DROP_VH * (1 - settle) ** 2;
  const headStart = prefersReducedMotion ? 0 : (1 - rise) * (1 - MORE_TEXT_SPEED) * MORE_PANEL_RISE_VH;
  moreBlockEl.style.transform = `translate3d(0, ${(drop - headStart).toFixed(3)}vh, 0)`;
  // A reel nobody can see does not need to play.
  if (reel.covered !== (rise === 1)) {
    reel.covered = rise === 1;
    syncReel();
  }
}

function setupZoomParallax() {
  const sticky = document.querySelector(".zp-sticky");
  const videos = [];
  const layers = ZOOM_PARALLAX_PROJECTS.map((project, index) => {
    const layer = document.createElement("div");
    layer.className = "zp-layer";
    const link = document.createElement(project.href ? "a" : "div");
    link.className = "zp-media";
    if (project.href) {
      link.href = project.href;
      link.setAttribute("aria-label", project.title);
    }
    const url = encodeURI(project.src);
    if (/\.(mp4|webm)$/i.test(project.src)) {
      // No autoplay attribute on purpose: with it the browser starts loading
      // every video right away; preload="metadata" + the observer below only
      // fetch/play the ones actually on screen.
      const video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-label", project.alt);
      video.src = url;
      link.appendChild(video);
      // Layer 0's is the showreel's loop: the reel looks after it.
      if (index === 0) setupReel(link, video);
      else videos.push(video);
    } else {
      const image = document.createElement("img");
      image.loading = "lazy";
      image.alt = project.alt;
      image.src = url;
      link.appendChild(image);
    }
    layer.appendChild(link);
    sticky.appendChild(layer);
    return layer;
  });

  zoomCenterCover = layers[0].firstElementChild;
  document.querySelector(".zp").style.setProperty("--zp-after", `${REEL_HOLD_VH + MORE_PANEL_VH}vh`);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.play().catch(() => {});
      else entry.target.pause();
    });
  });
  videos.forEach((video) => observer.observe(video));

  // Final scale of layer 0: its media (measured at rest: computed size,
  // which transforms do not change) covering the visible viewport — the
  // one without scrollbars — on both axes, plus the margin.
  const centerMedia = layers[0].firstElementChild;
  const zoomCoverScale = () => {
    const box = getComputedStyle(centerMedia);
    const viewport = document.documentElement;
    return Math.max(viewport.clientWidth / parseFloat(box.width), viewport.clientHeight / parseFloat(box.height)) * ZOOM_PARALLAX_COVER;
  };
  // The title grows with the center video, glued to it: on every update
  // of this same timeline it is handed that layer's current scale.
  const syncZoom = () => {
    const scale = gsap.getProperty(layers[0], "scale");
    const coverScale = zoomCoverScale();
    setFeaturedScale(scale, coverScale);
    const time = zoomTimeline ? zoomTimeline.time() : 0; // 1 = 100vh of scroll
    // The center card turns into the whole reel at full size, and back.
    const size = scale / coverScale;
    if (size >= REEL_FULL_AT - 1e-3) setReelFull(true);
    else if (size < REEL_FULL_AT - REEL_FULL_HYSTERESIS) setReelFull(false);
    // The black panel: after the zoom's own 100vh and the showreel's hold.
    moreScroll = clamp((time - 1 - REEL_HOLD_VH / 100) * 100, 0, MORE_PANEL_VH);
    if (moreScroll !== moreScrollDamped) requestFrame();
    updateNavContrast();
    // The size the showreel's player is laid out for: the card's at the end.
    zoomCenterCover.style.setProperty("--reel-res", coverScale.toFixed(3));
  };
  const zoomUnits = 1 - ZOOM_PARALLAX_HOLD;
  zoomTimeline = gsap
    .timeline({
      scrollTrigger: { trigger: ".zp", start: "top top", end: "bottom bottom", scrub: 1, invalidateOnRefresh: true, onRefresh: syncZoom },
      onUpdate: syncZoom,
    })
    .fromTo(
      layers,
      { scale: 1 },
      { scale: (i) => (zoomCoverScale() * ZOOM_PARALLAX_SCALES[i]) / ZOOM_PARALLAX_SCALES[0], ease: "none", duration: zoomUnits },
      0
    )
    .to({}, { duration: ZOOM_PARALLAX_HOLD }, zoomUnits)
    .to({}, { duration: (REEL_HOLD_VH + MORE_PANEL_VH) / 100 }, 1);
  updateMorePanel();
}
setupZoomParallax();

// Created after the hero's pinning ScrollTrigger on purpose: triggers are
// measured in creation order, and these sit below the pin on the page.
// The section's progress runs from the moment it starts coming in to where
// the zoom ends — not to its very end, which the showreel's hold and the
// black panel's stretch come after — so everything that is a share of it
// (AURA_PROJECTS_T, FEATURED_UP_GUARD) keeps its length in scroll whatever
// REEL_HOLD_VH and MORE_PANEL_VH are.
ScrollTrigger.create({
  trigger: "#projects",
  start: "top bottom",
  end: () => `+=${document.querySelector("#projects").offsetHeight - ((REEL_HOLD_VH + MORE_PANEL_VH) / 100) * window.innerHeight}`,
  onUpdate: (self) => {
    projectsProgress = self.progress;
    requestFrame();
  },
});
// While the section is around, the nav's items change color with a
// transition (style.css) as the showreel's card reaches behind them; not
// before, where their color follows the scroll frame by frame
// (updateNavInk).
ScrollTrigger.create({
  trigger: "#projects",
  start: "top bottom",
  end: "max",
  onToggle: (self) => siteNavEl.classList.toggle("is-in-projects", self.isActive),
  onUpdate: updateNavContrast,
});
// From the moment .zp-sticky sticks, the title rides in it instead of
// being fixed (same place on screen while it is stuck), so it leaves with
// the section instead of staying over whatever comes after.
ScrollTrigger.create({
  trigger: ".zp",
  start: "top top",
  end: "max",
  onToggle: (self) => featuredTitleEl.classList.toggle("is-docked", self.isActive),
});
ScrollTrigger.create({
  trigger: "#projects",
  start: "bottom top",
  end: "max",
  onToggle: (self) => {
    projectsScrolledPast = self.isActive;
    requestFrame();
  },
});

const clock = new THREE.Clock();

// After Effects-style wiggle: a slow, non-periodic drift added on top of the
// scroll-driven position (position only, never rotation). Gradient noise with
// the quintic fade is used instead of value/smoothstep noise because the
// latter stops and starts at every lattice point.
const WIGGLE_FREQUENCY = 0.5; // rate of the noise field, in cycles per second
const WIGGLE_AMP_X = 0.03; // world units (~12px at 1080p)
const WIGGLE_AMP_Y = 0.04; // world units (~17px at 1080p)
const WIGGLE_SEED_Y = 37.1;

// Continuous slow spin around the sphere's own vertical axis — one full
// turn every ~40s. Respects prefersReducedMotion like the wiggle does.
const ROTATION_SPEED = (Math.PI * 2) / 40; // radians/second

function hash1(n) {
  const v = Math.sin(n * 127.1) * 43758.5453;
  return v - Math.floor(v);
}

function gradientNoise1D(x) {
  const i = Math.floor(x);
  const f = x - i;
  const g0 = hash1(i) * 2 - 1;
  const g1 = hash1(i + 1) * 2 - 1;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return THREE.MathUtils.lerp(g0 * f, g1 * (f - 1), u) * 2;
}

function animate() {
  frameRequested = false;
  // Clamped: THREE.Clock's first getDelta() call returns the time elapsed
  // since the clock was constructed (and, after an idle pause, since the
  // last frame) — without this clamp that shows up as one large, visible
  // jump in the rotation.
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  // The dampings must follow real elapsed time even when frames are slow
  // (the 1/30 clamp above would make them lag further behind the lower the
  // frame rate gets); only capped against a long pause.
  const dampDelta = Math.min(rawDelta, 0.5);
  const elapsed = clock.getElapsedTime();

  uniforms.uTime.value = elapsed;

  // Frame-rate independent easing toward the cursor influence target, with
  // a slower fade-out than fade-in so the dent lingers after the cursor
  // leaves instead of snapping back.
  const lerpSpeed = cursorInfluenceTarget > cursorInfluenceCurrent ? CURSOR_LERP_SPEED_IN : CURSOR_LERP_SPEED_OUT;
  cursorInfluenceCurrent += (cursorInfluenceTarget - cursorInfluenceCurrent) * (1 - Math.exp(-lerpSpeed * delta));

  sphereProgressDamped += (scrollProgress - sphereProgressDamped) * (1 - Math.exp(-AURA_DAMPING * dampDelta));
  const auraMorph = computeAuraMorph(sphereProgressDamped);
  // Cursor dent: off while the orange is morphing, so the silhouette the
  // aura tracks stays a clean circle.
  uniforms.uCursorInfluence.value = cursorInfluenceCurrent * (1 - smoothstep(0, 0.03, auraMorph));
  uniforms.uGrainScale.value = computeGrainScale(sphereProgressDamped);

  const spherePhase = computeSpherePhase(sphereProgressDamped);
  orangeGroup.scale.setScalar(spherePhase.scale);
  const wiggleWeight = prefersReducedMotion ? 0 : 1;
  const wiggleT = elapsed * WIGGLE_FREQUENCY;
  orangeGroup.position.x = spherePhase.x + gradientNoise1D(wiggleT) * WIGGLE_AMP_X * wiggleWeight;
  orangeGroup.position.y = spherePhase.y + gradientNoise1D(wiggleT + WIGGLE_SEED_Y) * WIGGLE_AMP_Y * wiggleWeight;
  if (!prefersReducedMotion) {
    orangeGroup.rotation.y += delta * ROTATION_SPEED;
  }
  // matrixWorld must reflect THIS frame's rotation before the normal
  // matrix is derived from it below — Three.js only refreshes it lazily
  // during renderer.render()'s own traversal, which would otherwise lag
  // the uniform by one frame.
  orangeGroup.updateMatrixWorld(true);
  uniforms.uNormalMatrix.value.getNormalMatrix(sphere.matrixWorld);
  // GSAP's exit tween leaves the headline's opacity inline on .headline-word.
  updateHeadlineFocus(dampDelta, parseFloat(headlineWordEl.style.opacity || "1") > 0.001);
  updateCreativityPhrase(scrollProgress, dampDelta);
  updateFeaturedGate(dampDelta);
  projectsProgressDamped += (projectsProgress - projectsProgressDamped) * (1 - Math.exp(-AURA_DAMPING * dampDelta));
  // Land exactly on the target, so a scroll position always shows the same
  // picture whichever side it was reached from.
  if (Math.abs(projectsProgress - projectsProgressDamped) < 1e-4) projectsProgressDamped = projectsProgress;
  updateAura(auraMorph, computeAuraProjects(projectsProgressDamped), !projectsScrolledPast);
  if (moreScrollDamped !== moreScroll) {
    moreScrollDamped += (moreScroll - moreScrollDamped) * (1 - Math.exp(-AURA_DAMPING * dampDelta));
    if (Math.abs(moreScroll - moreScrollDamped) < 1e-3) moreScrollDamped = moreScroll;
    updateMorePanel();
  }

  renderer.render(scene, camera);

  // Past the hero nothing in the canvas changes by itself: once the damped
  // values have caught up, the last frame (the aura where it is, or
  // nothing) just stays on screen until a scroll or a resize asks again.
  const settled =
    Math.abs(sphereProgressDamped - scrollProgress) < 1e-4 &&
    Math.abs(phraseProgress - scrollProgress) < 1e-4 &&
    Math.abs(projectsProgressDamped - projectsProgress) < 1e-4 &&
    moreScrollDamped === moreScroll;
  const idle = scrollProgress >= 1 && settled && !featuredFading;
  if (!idle) requestFrame();
}

requestFrame();

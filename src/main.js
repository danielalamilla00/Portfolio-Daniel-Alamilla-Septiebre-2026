import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import vertexShader from "./shaders/sphere.vert.glsl?raw";
import fragmentShader from "./shaders/sphere.frag.glsl?raw";
import auraVertexShader from "./shaders/aura.vert.glsl?raw";
import auraFragmentShader from "./shaders/aura.frag.glsl?raw";

gsap.registerPlugin(ScrollTrigger);

// The featured-work images load asynchronously (picsum.photos); if any
// finish loading after ScrollTrigger has already measured the pinned
// section's scroll distance, that measurement can go stale and cut the
// pin short. Refreshing once everything (including images) has finished
// loading re-measures against the final, settled layout.
window.addEventListener("load", () => ScrollTrigger.refresh());

const canvas = document.querySelector("#sphere-canvas");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const scene = new THREE.Scene();

// NORMAL_FOV/NORMAL_CAM_Z are the camera's resting values — exactly what
// this project has always used (fov 45, z 3.1) for every phase from P1
// onward. HERO_FOV/HERO_CAM_Z are a separate, much narrower "telephoto"
// pair used ONLY while progress <= P1 (see animate()): a sphere viewed
// through a small FOV from far away is nearly an orthographic projection,
// which (unlike the wide, close-up FOV the hero used before) makes an
// off-axis sphere's silhouette read as a true circle instead of a
// perspective-distorted dome/egg — this is what section 2 of the brief
// means by "aleja la esfera en z (o reduce el FOV)". camera.fov/position.z
// are interpolated between the two pairs over progress 0->P1 every frame,
// landing exactly on NORMAL_FOV/NORMAL_CAM_Z at P1 so every later phase is
// bit-for-bit what it always was.
const HERO_FOV = 4;
const HERO_CAM_Z = 30;
const NORMAL_FOV = 45;
const NORMAL_CAM_Z = 3.1;

const camera = new THREE.PerspectiveCamera(
  NORMAL_FOV,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, NORMAL_CAM_Z);
camera.lookAt(0, 0, 0);

// The hero's orange + headline are all measured against this same
// 1920x1080 reference composition (matches Diseño/mockup-hero-v4.png) and
// scaled by one shared factor s, "cover"-style: anchored at the top,
// centered horizontally, scaled up just enough to cover whichever axis
// needs it most. On a narrow/tall viewport that cover-style scale would
// blow the headline text out past the edges, so s is additionally capped
// so the text block (750px wide in composition space, x=585 to 1335)
// never exceeds 90% of the real viewport width.
const COMPOSITION_WIDTH = 1920;
const COMPOSITION_HEIGHT = 1080;
const COMPOSITION_TEXT_WIDTH = 750;
function computeCompositionScale() {
  const coverScale = Math.max(window.innerWidth / COMPOSITION_WIDTH, window.innerHeight / COMPOSITION_HEIGHT);
  const maxTextScale = (window.innerWidth * 0.9) / COMPOSITION_TEXT_WIDTH;
  return Math.min(coverScale, maxTextScale);
}

// The hero orange's target silhouette (composition px): a circle
// centered at (960, HERO_CENTER_Y) with radius HERO_RADIUS — restored to
// the two-line headline layout per client feedback ("restaura el layout
// anterior... los dos [Motion AI y Designer] SOBRE la naranja"), fitted
// from reference/layout-titular.png by sampling the sphere's own
// silhouette edge at several x columns and solving for the circle that
// passes through them (apex at x=960 → y=140, edge at x=0/1920 → y≈568),
// bigger and higher than the single-line pass's 1250/1550 so both words
// sit on top of it instead of just grazing "Designer"'s bottom edge. Top
// edge at HERO_CENTER_Y-HERO_RADIUS (140), sides exiting the screen
// toward y=567.5 (verified: at x=0, this circle crosses
// y = 1432 - sqrt(1292^2 - 960^2) = 567.5).
const HERO_RADIUS = 1292;
const HERO_CENTER_Y = 1432;

// Closed-form (no iterative solve needed): valid specifically because
// HERO_FOV is small enough that the hero camera is near-orthographic (see
// its comment above) — in that regime a sphere's apparent radius/position
// on screen is linear in world units (r_px = f_px * R / HERO_CAM_Z),
// unlike full perspective where off-axis position and apparent size are
// coupled through the sphere's true tangent-cone silhouette. f is the
// usual vertical-fov pinhole focal length in px (innerHeight + fov
// based); s folds in the current composition scale so the reference
// circle (center 960,HERO_CENTER_Y, radius HERO_RADIUS, all in
// composition px) always lands on the same screen pixels regardless of
// window size — called fresh every frame (see animate()), so it's
// inherently always up to date on resize too, no separate resize-handling
// needed.
function computeHeroSphereParams(s) {
  const fovRad = (HERO_FOV * Math.PI) / 180;
  const f = window.innerHeight / 2 / Math.tan(fovRad / 2);
  const scale = (HERO_CAM_Z * HERO_RADIUS * s) / f;
  const y = (HERO_CAM_Z * (window.innerHeight / 2 - HERO_CENTER_Y * s)) / f;
  return { scale, y };
}

// alpha:true + a fully transparent clear color so the canvas only paints
// the sphere/nub — everywhere else stays transparent and the page's own
// black body background (and now the headline text) shows through.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

// ---- Shared surface-displacement constants -------------------------------
// Single source of truth for sphere.vert.glsl's displace()/travelingWaves().
// These USED to be duplicated as GLSL `const`s inside the shader; they're
// defined here ONCE instead and passed down as uniforms (see `uniforms`
// below) so a tweak here can never drift out of sync with a forgotten
// second copy in the shader itself. (An earlier pass also mirrored this
// exact math in JS, to track a now-removed peduncle mesh against the
// sphere's own displacement — gone along with it; this file no longer has
// a CPU-side reader of these values, only the GPU/shader does.)
//
// AMBIENT_AMPLITUDE/EDGE_BOOST_STRENGTH: lowered (from 0.055/0.9) per
// client feedback ("la naranja ondula demasiado") to ~35-40% of their
// previous strength — the silhouette should still breathe, just much more
// subtly. Tune these two first for "more/less ondulación".
const AMBIENT_AMPLITUDE = 0.02;
const EDGE_BOOST_STRENGTH = 0.4;
const FLOW_SPEED = 0.14;
// Three low-frequency noise layers, each traveling across the sphere in
// its own direction/speed, so several wide lobes sweep the silhouette at
// once instead of one bump breathing in place.
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
// cursor es demasiado fuerte") — these three are the single source of
// truth (fed to the shader as uniforms just below, see uCursorRadius/
// uCursorDepth/uDentEdgeVariation), so nothing else needs touching to
// keep the dent's visuals and its hit-testing in sync.
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
  // The sphere now rotates continuously (see ROTATION_SPEED below), so the
  // fragment shader's orange-peel bump can no longer assume local space and
  // world space point the same way (see the comment on uNormalMatrix's
  // first use in sphere.frag.glsl). Updated every frame from the sphere's
  // own matrixWorld, right after rotation is applied.
  uNormalMatrix: { value: new THREE.Matrix3() },
  // Gates the vertex shader's ambient traveling-wave displacement (see
  // sphere.vert.glsl): 0 during the hero's resting state so the silhouette
  // reads as a clean, undistorted circle, interpolated to 1 over progress
  // 0->P1 in animate() so every later phase keeps its always-on breathing
  // exactly as before.
  uAmbientAmount: { value: 1 },
  // Peel pore density (sphere.frag.glsl) — set every frame from
  // computeGrainScale(); 60 everywhere except the creativity phase, where
  // it compensates the sphere's growth so pores keep their hero size.
  uGrainScale: { value: 60 },
  // 1 everywhere except while the orange dissolves into the creativity
  // phase's aura (updateAura).
  uOpacity: { value: 1 },
  // All of these just mirror the JS constants above into the shader (see
  // their own comment) — values are set once, right after this object
  // literal, and never change afterward.
  uFreq1: { value: FREQ_1 },
  uFreq2: { value: FREQ_2 },
  uFreq3: { value: FREQ_3 },
  uFlowDir1: { value: FLOW_DIR_1 },
  uFlowDir2: { value: FLOW_DIR_2 },
  uFlowDir3: { value: FLOW_DIR_3 },
  uWeight1: { value: WEIGHT_1 },
  uWeight2: { value: WEIGHT_2 },
  uWeight3: { value: WEIGHT_3 },
  uAmbientAmplitude: { value: AMBIENT_AMPLITUDE },
  uFlowSpeed: { value: FLOW_SPEED },
  uEdgeBoostStrength: { value: EDGE_BOOST_STRENGTH },
  uCursorRadius: { value: CURSOR_RADIUS },
  uCursorDepth: { value: CURSOR_DEPTH },
  uDentEdgeFrequency: { value: DENT_EDGE_FREQUENCY },
  uDentEdgeSpeed: { value: DENT_EDGE_SPEED },
  uDentEdgeVariation: { value: DENT_EDGE_VARIATION },
  uDentDepthFrequency: { value: DENT_DEPTH_FREQUENCY },
  uDentDepthSpeed: { value: DENT_DEPTH_SPEED },
};


const orangeGroup = new THREE.Group();
// Slightly smaller than a "full" 1.0 fit so the ambient wave's outward
// excursions (see sphere.vert.glsl) don't push the silhouette past the
// viewport edges and get clipped. Named so the scroll storytelling below
// can animate away from this resting value. Lowered from 0.92 per client
// feedback ("haz la naranja un poco mas pequeña") — the leaf/stem are
// deliberately unaffected: they're children of orangeGroup (see below),
// so they scale in exact lockstep with whatever this value is, and every
// other phase scale below is defined as a multiple of this constant too,
// so their ratio to it (and therefore the leaf/stem size at those phases)
// doesn't drift either.
const BASE_SPHERE_SCALE = 0.83;
// Shifts the rendered sphere down within the (untouched, full-viewport)
// canvas, freeing up headroom at the top for the leaves — moving the
// canvas element itself via CSS would desync the pointer/raycast math in
// updatePointer(), which assumes the canvas exactly matches the viewport.
// -0.15 (raised from -0.25 per client feedback) still leaves the sphere's
// top comfortably below #site-nav and the leaves well clear of it.
const BASE_SPHERE_Y = -0.15;

// Hero (scroll = 0) resting state is a SEPARATE pair of numbers from
// BASE_SPHERE_SCALE/BASE_SPHERE_Y above — huge and mostly off-screen, per
// the reference (Diseño/referencia-header.png). BASE_SPHERE_SCALE itself
// is left untouched since EXPERIENCE_SPHERE_SCALE/FINAL_SPHERE_SCALE
// further down are still defined as multiples of it.
//
// Unlike before, the hero scale/Y are no longer fixed constants — they're
// a function of the current composition scale (see computeHeroSphereParams
// above), recomputed every frame in animate() so they always match
// whatever the current window size/aspect ratio is. HERO_X stays a plain
// constant (0): the sphere is always horizontally centered in the hero.
const HERO_X = 0;
scene.add(orangeGroup);

const geometry = new THREE.SphereGeometry(1, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
  // Only so it can fade out into the aura (uOpacity, see updateAura); at
  // opacity 1 — every other phase — the output is identical to opaque.
  transparent: true,
});
const sphere = new THREE.Mesh(geometry, material);
orangeGroup.add(sphere);

// ---- Aura ---------------------------------------------------------------
// Creativity-phase background (Diseño/reference-aura-fondo.png): the orange
// rises and dissolves into a blurred half-circle of light hanging from the
// top edge, over a warm off-white page. A full-screen quad in this same
// scene with its own shader (src/shaders/aura.frag.glsl), drawn FIRST
// (renderOrder -1, no depth) so the sphere always renders on top of it.
// Outside the circle it paints the page's CURRENT background color (the
// same value applied to html/body/#hero-section, see updatePageColors), so
// there's never a seam between canvas and page.
// Colors are sRGB 0..1 (ShaderMaterial output is not color-managed here,
// same as the sphere's shader).
const hexToVec3 = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
// Aura palette, inside -> out.
const AURA_COLOR_CENTER_A = 0xffc46b; // warm, very bright yellow-orange at the top center
const AURA_COLOR_CENTER_B = 0xffb347;
const AURA_COLOR_MID_A = 0xff8a2a; // vivid orange ring
const AURA_COLOR_MID_B = 0xfc7c4a;
const AURA_COLOR_EDGE = 0xe8552a; // coral rim
const AURA_COLOR_HALO = 0xf4b79a; // soft peach-pink halo between the rim and the page
const AURA_COLOR_SPHERE = 0xff5212; // flat stand-in for the orange's own tone, where the morph starts
// Page background: dark everywhere else, warm off-white in this phase.
const PAGE_COLOR_DARK = 0x141414; // = html/body/#hero-section background in style.css
const PAGE_COLOR_LIGHT = 0xf6ecdd;
// Rim softness: from the orange's crisp silhouette to the final blur
// (fraction of the radius over which the rim fades into the page).
const AURA_FEATHER_START = 0.004;
const AURA_FEATHER = 0.25;
const AURA_GRAIN = 0.06; // static grain amplitude over everything (peak-to-peak, 0..1)
const AURA_INSET = 0.98; // the aura starts this much smaller than the silhouette, so it never peeks out
// Choreography, all as windows of the morph value m (0 = orange, 1 = aura):
const SPHERE_FADE = [0.08, 0.55]; // sphere opacity 1 -> 0
const AURA_ALPHA = [0.02, 0.45]; // aura opacity 0 -> 1
const AURA_BLUR = [0.1, 0.9]; // rim AURA_FEATHER_START -> AURA_FEATHER ("velocidad del difuminado")
const AURA_SHAPE = [0.35, 1.0]; // circle: real silhouette -> final shape
const AURA_PALETTE = [0.1, 0.7]; // flat orange tone -> palette
const PAGE_COLOR_T = [0.1, 0.8]; // page background dark -> off-white
const NAV_DARK_T = [0.35, 0.65]; // nav white -> #141414 (logo through its filter)

const auraUniforms = {
  uViewport: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
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
  uColorPage: { value: hexToVec3(PAGE_COLOR_DARK) },
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
// result is right for any FOV, distance or offset — not "projected center
// ± scale". Valid as long as nothing deforms the silhouette, which is why
// the ambient waves and the cursor dent are held at 0 during the morph.
const SILHOUETTE_SAMPLES = 12;
const _silC = new THREE.Vector3();
const _silAxis = new THREE.Vector3();
const _silU = new THREE.Vector3();
const _silV = new THREE.Vector3();
const _silP = new THREE.Vector3();
function sphereSilhouetteCircle() {
  const W = window.innerWidth;
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

// Page background + nav ink, both driven by the same morph. Applied to
// html/body AND #hero-section (whose own background exists for the
// mix-blend-mode stacking reasons documented in style.css), and passed to
// the aura shader as its page color. Only written when the value changes.
const siteNavEl = document.querySelector("#site-nav");
const heroSectionEl = document.querySelector("#hero-section");
const NAV_CLOCK_COLOR = [255, 165, 105]; // #site-nav .nav-clock's own color in style.css
const rgbOf = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
let lastPageColor = "";
let lastNavT = -1;
function updatePageColors(m) {
  const pageRgb = mixRgb(rgbOf(PAGE_COLOR_DARK), rgbOf(PAGE_COLOR_LIGHT), win(PAGE_COLOR_T, m));
  auraUniforms.uColorPage.value.set(pageRgb[0] / 255, pageRgb[1] / 255, pageRgb[2] / 255);
  const css = `rgb(${pageRgb.join(", ")})`;
  if (css !== lastPageColor) {
    lastPageColor = css;
    const inline = pageRgb.join() === rgbOf(PAGE_COLOR_DARK).join() ? "" : css; // back to the stylesheet when dark
    document.documentElement.style.backgroundColor = inline;
    document.body.style.backgroundColor = inline;
    heroSectionEl.style.backgroundColor = inline;
  }
  const navT = win(NAV_DARK_T, m);
  if (Math.abs(navT - lastNavT) > 0.002 || (navT === 0) !== (lastNavT === 0)) {
    lastNavT = navT;
    const dark = rgbOf(PAGE_COLOR_DARK);
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
// tone and its circle moves from the silhouette to the final shape. The
// sphere itself is heading to that same final shape (computeSpherePhase),
// so while both are visible they stay one shape. Called every frame AFTER
// orangeGroup and the camera are updated.
function updateAura(m) {
  updatePageColors(m);
  const sphereOpacity = 1 - win(SPHERE_FADE, m);
  uniforms.uOpacity.value = sphereOpacity;
  orangeGroup.visible = sphereOpacity > 0.001;
  auraMesh.visible = m > 0.0005;
  if (!auraMesh.visible) return;

  const sil = sphereSilhouetteCircle();
  const target = computeAuraFinalShape();
  const k = win(AURA_SHAPE, m);
  auraUniforms.uCenter.value.set(THREE.MathUtils.lerp(sil.cx, target.cx, k), THREE.MathUtils.lerp(sil.cy, target.cy, k));
  auraUniforms.uRadius.value = THREE.MathUtils.lerp(sil.r * AURA_INSET, target.r, k);
  const blur = win(AURA_BLUR, m);
  auraUniforms.uBlur.value = blur;
  auraUniforms.uFeather.value = THREE.MathUtils.lerp(AURA_FEATHER_START, AURA_FEATHER, blur);
  auraUniforms.uAlpha.value = win(AURA_ALPHA, m);
  auraUniforms.uColorMix.value = win(AURA_PALETTE, m);
  auraUniforms.uGrain.value = AURA_GRAIN * win(AURA_ALPHA, m);
  auraUniforms.uViewport.value.set(window.innerWidth, window.innerHeight);
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
  const x = (event.clientX / window.innerWidth) * 2 - 1;
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateHeadlineAlignment();
  layoutCreativityPhrase();
}
window.addEventListener("resize", onResize);

// Scroll storytelling now has 7 phases across a pin of +=400% (timeline
// total duration is 8 units, each unit = 1/8 of that scroll distance):
//   0.0-1/4    hero -> "headline" phase
//   1/4-3/8    hold: "headline" text and sphere both sit still (deliberately
//              empty timeline positions 2-3 below), forcing extra scroll
//              before the next phase can start
//   3/8-5/8    "headline" -> "featured work" phase
//   5/8-3/4    grid scroll: sphere frozen in its featured-work position,
//              .featured-work-grid itself scrolls up instead (see
//              updateFeaturedWorkScroll() below) — timeline position 5 is a
//              no-op tween that just reserves this stretch of scroll.
//   3/4-7/8    outro: .featured-work-item fades/slides out while the sphere
//              shrinks and re-centers
//   7/8-1.0    final buffer: sphere finishes settling into its small,
//              centered resting state
// orangeGroup's scale/position are computed from scrollProgress inside
// animate() every frame via computeSpherePhase() below (previously this was
// written directly in ScrollTrigger's onUpdate, but a 2-segment phase split
// reads more clearly as one function of progress than inline branching in
// the callback). onUpdate now only records scrollProgress itself.
//
// PEAK_SPHERE_SCALE/PEAK_X_SHIFT/PEAK_Y are the already-tuned end state of
// the old single-phase animation (a fixed client spec of scale 1.6 against
// the original BASE_SPHERE_SCALE of 0.92, with X chosen via a projection
// check against a reference screenshot — see prior history), now reused as
// the midpoint of the new 2-phase curve instead of being retuned from
// scratch. Expressed as a multiple of BASE_SPHERE_SCALE (rather than that
// literal 1.6) so it keeps the exact same ratio to the resting size — and
// therefore the exact same leaf/stem size at this phase, since they're
// children of orangeGroup and scale with it automatically — if
// BASE_SPHERE_SCALE is ever retuned again. FEATURED_X_SHIFT mirrors
// PEAK_X_SHIFT to the left; FEATURED_Y is a first guess to raise the
// sphere a little relative to rest — both are placeholders to adjust by
// eye against the featured work grid.
const PEAK_SPHERE_SCALE = BASE_SPHERE_SCALE * (1.6 / 0.92);
const PEAK_X_SHIFT = 1.4;
const PEAK_Y = 0;
const FEATURED_X_SHIFT = -1.4;
const FEATURED_Y = 0.15;
// Lower-left "corner" resting spot for the new work-experience phase —
// client spec is "lower and into the left corner", mirroring an OFF+BRAND-
// style reference screenshot's small-sphere-to-one-side layout (sphere
// lower-left, experience list to its right). Starting values only — tune
// by eye once on screen.
const EXPERIENCE_SPHERE_SCALE = BASE_SPHERE_SCALE * 1.35;
const EXPERIENCE_X_SHIFT = -1.6;
const EXPERIENCE_Y = -0.75;
// Outro resting state: centered, 20% bigger than the sphere's resting
// (BASE_SPHERE_SCALE) size — not a shrink-and-park like before.
const FINAL_SPHERE_SCALE = BASE_SPHERE_SCALE * 1.2;
const FINAL_SPHERE_X = 0;
const FINAL_SPHERE_Y = 0; // camera looks at world origin, so 0 = vertical screen center

// Post-experience phase: sphere leaves its lower-left corner and returns
// to dead center — same (0,0) screen-center point FINAL_SPHERE_X/Y already
// use. Scale stays at EXPERIENCE_SPHERE_SCALE through this move (only x/y
// change); the client's "grow until it fills the screen" is a separate,
// later sub-phase — see FILL_SPHERE_SCALE below.
const CENTER_SPHERE_X = 0;
const CENTER_SPHERE_Y = 0;

// Final reveal: once centered, the sphere itself grows until its own
// surface gradient fills the entire viewport — no separate full-screen
// mesh, the sphere IS the background at the end. 0.9x the camera's
// distance from the origin (camera.position.z) is the scale at which the
// sphere's silhouette, from the camera's perspective, covers even the
// screen's far corners at any realistic aspect ratio (verified up to
// ~5:1, far past any real display) while leaving a comfortable gap so the
// camera never ends up "inside" the sphere (front surface sits at
// world-z = scale, vs. the camera at camera.position.z — at 0.9x that's
// always a 10% gap). No leaf/stem-specific constant needed — as children
// of orangeGroup they scale with it automatically, and their anchor point
// (near the sphere's north pole) naturally scrolls off the top of the
// screen once the sphere grows past the visible frustum, so they simply
// disappear off-screen in lockstep with the sphere's growth.
const FILL_SPHERE_SCALE = camera.position.z * 0.9;

// 12 breakpoints across an 18-unit pinned timeline — extended from the
// original 5 (P1-P5, 8 units, scrollTrigger end:"+=400%") to fit the
// work-experience phase (P1-P9, 12 units) and then this post-experience
// vanish phase (P9b-P11, 16 units). Unit width (50% scroll distance per
// unit, i.e. end% / total units) is unchanged, and every breakpoint
// through P9 keeps the exact same absolute scroll distance it always had —
// only new units were appended after it, so every earlier phase's timing
// feels identical to before.
//
// Client feedback moved the work-experience phase to AFTER the outro CTA
// ("WANT TO SEE MORE?") instead of before it, and flagged that phase as
// feeling rushed once that move landed, since it used to run all the way
// to the very end of the scroll — which only worked because that used to
// BE the end; now something comes after it. Fixed by giving this phase
// two explicit holds instead of one: P6-P7 is where the CTA's fade-in
// comfortably finishes with room to spare, and P7-P8 is a second, entirely
// static hold with nothing scheduled in it at all — the "let it breathe
// before moving on" buffer. Only after both does the sphere make its final
// move out to the lower-left experience corner (P8-P9) for the
// work-experience list.
//
// "Where creativity meets technology" phase: PHRASE_PHASE_UNITS new units
// inserted at the very START of the timeline (right after the hero, before
// "With emotion + innovation…"). Every breakpoint below is the same unit
// count it always was, just offset by PHRASE_PHASE_UNITS (unitAt() adds
// it), and the ScrollTrigger end grows by the same 50%-per-unit, so every
// later phase lasts exactly the scroll distance it did before.
// Background: the orange rises and dissolves into a blurred aura of light
// (Diseño/reference-aura-fondo.png) — see the "Aura" block further down.
// One morph value m drives it (0 = hero orange, 1 = aura fully formed; see
// computeAuraMorph). Timeline, in units:
//   0 -> AURA_RISE_END          orange rises toward the aura's final shape
//                               while fading out; the aura grows from its
//                               silhouette (headline exits over 0 -> 1 as before)
//   PHRASE_ENTER_START (m = AURA_TEXT_AT) -> PHRASE_ENTER_END   phrase enters
//   PHRASE_ENTER_END -> PHRASE_HOLD_END      hold (phrase still)
//   PHRASE_HOLD_END -> PHRASE_PHASE_END      phrase exits, aura stays
//   PHRASE_PHASE_END -> AURA_REVERSE_END     reverse morph: the camera has
//                               switched to normal (unseen, sphere invisible)
//                               and the aura condenses back into the sphere
//                               at its peak spot, page/nav back to dark
//   AURA_REVERSE_END -> P1      sphere settles (ambient waves ramp back in)
const PHRASE_PHASE_UNITS = 5.5;
const TIMELINE_UNITS = 18 + PHRASE_PHASE_UNITS;
const unitAt = (u) => (PHRASE_PHASE_UNITS + u) / TIMELINE_UNITS;
const AURA_RISE_END = 2 / TIMELINE_UNITS; // rise + sphere->aura morph: 2 units of scroll
const AURA_TEXT_AT = 0.82; // the phrase starts entering once the aura is this formed
const PHRASE_ENTER_UNITS = 1.75;
const PHRASE_HOLD_END = 4.5 / TIMELINE_UNITS;
const PHRASE_PHASE_END = unitAt(0);
const AURA_REVERSE_END = unitAt(1);
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
const PHRASE_ENTER_START = AURA_RISE_END * invertEase(riseEase, AURA_TEXT_AT);
const PHRASE_ENTER_END = PHRASE_ENTER_START + PHRASE_ENTER_UNITS / TIMELINE_UNITS;

const P1 = unitAt(2); // sphere reaches its peak (matches the tagline already fully visible)
const P2 = unitAt(3); // end of the hold
const P3 = unitAt(5); // sphere reaches its featured position (starts the grid scroll reveal)
const P4 = unitAt(6); // grid reveal ends, grid exit sub-phase starts (sphere still frozen)
const P5 = unitAt(7); // grid fully off-screen; sphere about to start shrinking to its final-rest position
const P6 = unitAt(8); // sphere reaches its final-rest position; outro CTA starts its entrance
const P7 = unitAt(9); // CTA entrance is long finished by here — rest of this unit is already just held
const P8 = unitAt(10); // end of the pure-hold buffer; sphere starts moving to the experience corner
const P9 = unitAt(11); // sphere reaches the experience corner (work-experience list visible)
// Client feedback: the experience section needs to hold a beat longer
// before the vanish phase starts, and the final shrink-to-0 felt too
// rushed — so P9b is a new, dedicated hold (sphere+text fully static) that
// didn't exist before, and the shrink sub-phase (P10-P11) now spans 2
// units instead of 1, doubling how long the easeInQuint has to play out.
// The hold itself (P9-P9b) started at just 1 unit and was still called
// "too fast" — bumped to 3 units here.
const P9b = unitAt(14); // NEW: end of the hold at the experience corner — text starts fading out / sphere starts moving to center only after this
const P10 = unitAt(15); // sphere reaches dead center; experience text finishes fading out here too
const P11 = unitAt(17); // sphere (and leaves, automatically) finish growing to FILL_SPHERE_SCALE — 2 full units (P10-P11) instead of 1, slower

// Final shape of the aura, in CSS px: a circle centered horizontally at
// AURA_CENTER_X (fraction of the width), its center AURA_CENTER_Y (fraction
// of the height; negative = just above the top edge), radius such that its
// bottom reaches AURA_BOTTOM_Y of the height. At 16:9 that's a radius of
// ~55% of the width; deriving it from the height keeps the same vertical
// coverage on narrow/tall screens too.
const AURA_CENTER_X = 0.5;
const AURA_CENTER_Y = -0.04;
const AURA_BOTTOM_Y = 0.95;
function computeAuraFinalShape() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const cy = H * AURA_CENTER_Y;
  return { cx: W * AURA_CENTER_X, cy, r: H * AURA_BOTTOM_Y - cy };
}

// Sphere params (hero telephoto camera) whose silhouette matches the aura's
// final shape — where the orange is heading as it rises and dissolves. The
// camera (z = HERO_CAM_Z) stays far outside it (scale is ~2 world units).
function computeAuraSphereParams() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const f = H / 2 / Math.tan((HERO_FOV * Math.PI) / 360);
  const { cx, cy, r } = computeAuraFinalShape();
  return {
    scale: Math.min((HERO_CAM_Z * r) / f, HERO_CAM_Z * 0.5),
    x: (HERO_CAM_Z * (cx - W / 2)) / f,
    y: (HERO_CAM_Z * (H / 2 - cy)) / f,
  };
}

// 0 = hero orange, 1 = aura fully formed (sphere gone). Eased with
// riseEase; the reverse morph mirrors it right after the phase.
function computeAuraMorph(progress) {
  if (progress <= PHRASE_PHASE_END) return riseEase(clamp(progress / AURA_RISE_END, 0, 1));
  if (progress <= AURA_REVERSE_END) {
    return 1 - riseEase((progress - PHRASE_PHASE_END) / (AURA_REVERSE_END - PHRASE_PHASE_END));
  }
  return 0;
}

// Peel grain size (sphere.frag.glsl's uGrainScale = pores per unit of the
// sphere's own surface). In the hero camera the on-screen sphere size is
// proportional to its scale, so multiplying by (current scale / hero scale)
// keeps the pores the size they have in the hero while the orange changes
// size during the rise. From PHRASE_PHASE_END on (normal camera, sphere at
// its peak) it's GRAIN_SCALE, exactly as every later phase.
const GRAIN_SCALE = 60;
function computeGrainScale(progress) {
  if (progress > P1) return GRAIN_SCALE;
  const heroScale = computeHeroSphereParams(computeCompositionScale()).scale;
  if (progress <= PHRASE_PHASE_END) return (GRAIN_SCALE * computeSpherePhase(progress).scale) / heroScale;
  return GRAIN_SCALE; // after the phase the sphere is back in the normal camera, at its usual size
}

function computeSpherePhase(progress) {
  if (progress <= PHRASE_PHASE_END) {
    // Creativity phase: hero arc -> rises toward the aura's final shape
    // (driven by the same eased morph as the aura, so the two stay
    // locked), fading out on the way (see updateAura). Recomputed every
    // call (every frame), so it stays correct through any resize.
    const hero = computeHeroSphereParams(computeCompositionScale());
    const aura = computeAuraSphereParams();
    const m = computeAuraMorph(progress);
    return {
      scale: THREE.MathUtils.lerp(hero.scale, aura.scale, m),
      x: THREE.MathUtils.lerp(HERO_X, aura.x, m),
      y: THREE.MathUtils.lerp(hero.y, aura.y, m),
    };
  }
  if (progress <= P1) {
    // Right after the creativity phase. The camera switches from the hero
    // pair to the normal one at PHRASE_PHASE_END, while the sphere is
    // invisible (fully dissolved into the aura), so the switch can't be
    // seen and no FOV ramp ever deforms a visible sphere. The sphere is
    // already at its peak spot; the aura condenses back into it there over
    // PHRASE_PHASE_END -> AURA_REVERSE_END (updateAura, reverse morph).
    return { scale: PEAK_SPHERE_SCALE, x: PEAK_X_SHIFT, y: PEAK_Y };
  }
  if (progress <= P2) {
    // hold: same progress range as the .tagline-line hold in the timeline
    // above — the sphere stays put at its peak while the user keeps
    // scrolling through the "headline" text.
    return { scale: PEAK_SPHERE_SCALE, x: PEAK_X_SHIFT, y: PEAK_Y };
  }
  if (progress <= P3) {
    const t = (progress - P2) / (P3 - P2);
    return {
      scale: PEAK_SPHERE_SCALE,
      x: THREE.MathUtils.lerp(PEAK_X_SHIFT, FEATURED_X_SHIFT, t),
      y: THREE.MathUtils.lerp(PEAK_Y, FEATURED_Y, t),
    };
  }
  if (progress <= P5) {
    // grid-scroll phase (reveal through P4, then exit through P5): the
    // sphere doesn't move at all here — only the grid does (see
    // updateFeaturedWorkScroll()).
    return { scale: PEAK_SPHERE_SCALE, x: FEATURED_X_SHIFT, y: FEATURED_Y };
  }
  if (progress <= P6) {
    // Shrink to final rest — same lerp/target this phase always used
    // (FINAL_SPHERE_*), just no longer the very last thing that happens.
    const t = (progress - P5) / (P6 - P5);
    return {
      scale: THREE.MathUtils.lerp(PEAK_SPHERE_SCALE, FINAL_SPHERE_SCALE, t),
      x: THREE.MathUtils.lerp(FEATURED_X_SHIFT, FINAL_SPHERE_X, t),
      y: THREE.MathUtils.lerp(FEATURED_Y, FINAL_SPHERE_Y, t),
    };
  }
  if (progress <= P8) {
    // hold: sphere stays at final rest through BOTH sub-holds (P6-P7 while
    // the CTA/cards finish entering, P7-P8 as pure breathing room) while
    // the outro CTA is shown.
    return { scale: FINAL_SPHERE_SCALE, x: FINAL_SPHERE_X, y: FINAL_SPHERE_Y };
  }
  if (progress <= P9) {
    const t = (progress - P8) / (P9 - P8);
    return {
      scale: THREE.MathUtils.lerp(FINAL_SPHERE_SCALE, EXPERIENCE_SPHERE_SCALE, t),
      x: THREE.MathUtils.lerp(FINAL_SPHERE_X, EXPERIENCE_X_SHIFT, t),
      y: THREE.MathUtils.lerp(FINAL_SPHERE_Y, EXPERIENCE_Y, t),
    };
  }
  if (progress <= P9b) {
    // NEW hold: sphere stays parked in the experience corner a beat
    // longer, text still fully visible, before anything starts moving
    // toward the vanish phase.
    return { scale: EXPERIENCE_SPHERE_SCALE, x: EXPERIENCE_X_SHIFT, y: EXPERIENCE_Y };
  }
  if (progress <= P10) {
    // Sphere parked in the experience corner -> dead center. Scale held
    // at EXPERIENCE_SPHERE_SCALE, only position changes here — runs
    // alongside the experience text's fade-out (see the GSAP timeline,
    // position 14).
    const t = (progress - P9b) / (P10 - P9b);
    return {
      scale: EXPERIENCE_SPHERE_SCALE,
      x: THREE.MathUtils.lerp(EXPERIENCE_X_SHIFT, CENTER_SPHERE_X, t),
      y: THREE.MathUtils.lerp(EXPERIENCE_Y, CENTER_SPHERE_Y, t),
    };
  }
  if (progress <= P11) {
    // Centered: scale grows out to FILL_SPHERE_SCALE with an accelerating
    // ease-in (easeInQuint above), not a linear ramp, so the growth starts
    // slow and rushes outward right at the end — the leaf/stem scale (and
    // scroll off-screen) with it automatically, being children of
    // orangeGroup.
    const t = easeInQuint((progress - P10) / (P11 - P10));
    return {
      scale: THREE.MathUtils.lerp(EXPERIENCE_SPHERE_SCALE, FILL_SPHERE_SCALE, t),
      x: CENTER_SPHERE_X,
      y: CENTER_SPHERE_Y,
    };
  }
  // Final state: sphere fully grown, its own gradient filling the screen.
  return { scale: FILL_SPHERE_SCALE, x: CENTER_SPHERE_X, y: CENTER_SPHERE_Y };
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
// the "g" descender — exactly as far from the viewport's bottom as the
// logo is from its top).
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
  const textNode = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  const text = textNode.textContent;
  const cs = getComputedStyle(el);
  const fontSizePx = parseFloat(cs.fontSize);
  const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const letterSpacingPx = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing);
  const tabularNums = cs.fontVariantNumeric.includes("tabular-nums");

  const firstIndex = text.search(/\S/);
  const lastIndex = text.trimEnd().length - 1;
  const charRect = (i) => {
    const range = document.createRange();
    range.setStart(textNode, i);
    range.setEnd(textNode, i + 1);
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

const headlineWords = Array.from(document.querySelectorAll(".headline-word"));
const hwSansEls = Array.from(document.querySelectorAll(".hw-sans"));
const hwDisplayEls = Array.from(document.querySelectorAll(".hw-display"));
const navLogoEl = document.querySelector(".nav-logo");
const navClockTimeEl = document.querySelector("#nav-clock-time");

function updateHeadlineAlignment() {
  // Measure in the resting state: GSAP's exit tween puts y/scale/blur on
  // .headline-word, which getBoundingClientRect would include. Clear it for
  // the measurement and put it back afterwards.
  const savedTransforms = headlineWords.map((el) => el.style.transform);
  headlineWords.forEach((el) => (el.style.transform = "none"));

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
  // HEADLINE_BOTTOM_GAP_VH del borde inferior, así la g se ve entera.
  // Se mueve el bloque .headline-word completo, así que "Motion AI" sube
  // con "Designer" y conserva la misma separación vertical.
  const HEADLINE_BOTTOM_GAP_VH = 1.5;
  const displayInkAfter = measureTextInk(hwDisplayEls[0]);
  const targetBottomGap = (HEADLINE_BOTTOM_GAP_VH * window.innerHeight) / 100;
  const currentBottomGap = window.innerHeight - displayInkAfter.bottom;
  const baseBottomPx = (3 * window.innerHeight) / 100;
  const bottomPx = baseBottomPx + (targetBottomGap - currentBottomGap);
  headlineWords.forEach((el) => (el.style.bottom = `${bottomPx}px`));

  headlineWords.forEach((el, i) => (el.style.transform = savedTransforms[i]));

  if (window.__debugHeadline) {
    const s = measureTextInk(hwSansEls[0]);
    const d = measureTextInk(hwDisplayEls[0]);
    console.log("[headline] M-logo dx:", (s.left - logoInkLeft).toFixed(2),
      "| r-clock dx:", (d.right - clockInk.right).toFixed(2),
      "| g-bottom gap:", (window.innerHeight - d.bottom).toFixed(2));
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

const outroCtaQuestion = document.querySelector(".outro-cta-question");
const outroCtaLink = document.querySelector(".outro-cta-link");
const contactCtaHeading = document.querySelector(".contact-cta-heading");
const contactCtaLinks = Array.from(document.querySelectorAll(".contact-cta-link"));

// Aparición: fundido simple ligado al scroll, sin escalado ni rebote —
// durante la fase en la que la esfera se encoge y centra (P5 a P6).
const FLOAT_FADE_START = P5 + (P6 - P5) * 0.4;
const FLOAT_FADE_END = P6;
// El CTA se desvanece otra vez cuando la esfera empieza a moverse hacia la
// esquina de work-experience — es decir, al final del segundo hold (P8),
// no del primero (P7). Mismo tratamiento rápido que #featured-work-heading
// al salir de su fase.
const CTA_FADE_OUT_END = P8 + (P9 - P8) * 0.35;

// Aceleración final (ease-in a la quinta potencia) para el desvanecimiento
// final de la esfera: arranca lento y termina con un cierre rápido hacia 0.
function easeInQuint(t) {
  return t * t * t * t * t;
}

function updateOutroCta(progress) {
  const fadeIn = clamp((progress - FLOAT_FADE_START) / (FLOAT_FADE_END - FLOAT_FADE_START), 0, 1);
  const fadeOut = 1 - clamp((progress - P8) / (CTA_FADE_OUT_END - P8), 0, 1);
  const opacity = Math.min(fadeIn, fadeOut);
  outroCtaQuestion.style.opacity = opacity;
  outroCtaLink.style.opacity = opacity;
  // .outro-cta-link has pointer-events:auto in CSS (needed once it's the
  // visible CTA), but while opacity is still 0 it sits invisibly on top of
  // whatever else occupies that same screen position (e.g. the
  // featured-work grid, since #outro-cta shares the pinned section's
  // coordinate space the whole time) and silently steals hover/clicks from
  // it. Only actually enable pointer events once it's visible.
  outroCtaLink.style.pointerEvents = opacity > 0 ? "auto" : "none";
}

// Final "Let's contact" phase: fades in over the tail of the P11-1.0
// window, i.e. after the sphere has already finished growing to
// FILL_SPHERE_SCALE (see computeSpherePhase) — starting a little into that
// window rather than right at P11 so the text doesn't appear while the
// screen is still visibly mid-growth, and reaching full opacity well
// before scroll end so it isn't cut short. No fade-out: this is the last
// phase of the scroll, so once visible it just stays.
const CONTACT_FADE_START = P11 + (1 - P11) * 0.15;
const CONTACT_FADE_END = P11 + (1 - P11) * 0.65;

function updateContactCta(progress) {
  const opacity = clamp((progress - CONTACT_FADE_START) / (CONTACT_FADE_END - CONTACT_FADE_START), 0, 1);
  contactCtaHeading.style.opacity = opacity;
  contactCtaLinks.forEach((link) => {
    link.style.opacity = opacity;
    // Same reasoning as outroCtaLink above: these sit in the pinned
    // section's shared coordinate space the whole time, so keep them
    // click-through until they're actually visible.
    link.style.pointerEvents = opacity > 0 ? "auto" : "none";
  });
}

// ---- "Where creativity meets technology" phase -----------------------------
// Driven per frame (like updateOutroCta) from scrollProgress, which is
// additionally damped here (PHRASE_DAMPING, frame-rate independent) on top
// of the ScrollTrigger scrub, so an abrupt scroll never makes the lines
// jerk. The window itself is in timeline units (PHRASE_ENTER_START/END,
// PHRASE_HOLD_END, PHRASE_PHASE_END above).
const PHRASE_STAGGER = 0.25; // fraction of the entrance window line 2 starts after line 1
const PHRASE_FADE_PORTION = 0.4; // each line reaches opacity 1 within this first fraction of its own travel
const PHRASE_BLUR_PX = 4;
const PHRASE_EXIT_Y_PX = -30;
const PHRASE_DAMPING = 6; // 1 - exp(-PHRASE_DAMPING * delta) per frame
const phraseEnterEase = gsap.parseEase("power3.out");
const phraseExitEase = gsap.parseEase("sine.inOut");
const phraseLines = Array.from(document.querySelectorAll(".cp-line"));
const phraseLineState = phraseLines.map(() => ({ offX: 0 }));
let phraseProgress = 0;

// Puts each line's BASELINE on its CSS `top` (see #creativity-phrase in
// style.css) and caches how far each line has to travel to start fully
// off-screen (line 1 off the left edge, line 2 off the right edge).
// Transforms don't change offsets/widths or the marker-to-top difference,
// so this is safe to run mid-animation.
function layoutCreativityPhrase() {
  phraseLines.forEach((line, i) => {
    line.style.marginTop = "0px";
    const marker = document.createElement("span");
    marker.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0;border:0;";
    line.appendChild(marker);
    const baselineOffset = marker.getBoundingClientRect().bottom - line.getBoundingClientRect().top;
    marker.remove();
    line.style.marginTop = `${-baselineOffset}px`;

    const width = line.getBoundingClientRect().width;
    const margin = window.innerWidth * 0.05 + PHRASE_BLUR_PX * 2;
    phraseLineState[i].offX = i === 0 ? -(line.offsetLeft + width + margin) : window.innerWidth - line.offsetLeft + margin;
  });
}
layoutCreativityPhrase();
document.fonts.ready.then(layoutCreativityPhrase);

function updateCreativityPhrase(progress, delta) {
  phraseProgress += (progress - phraseProgress) * (1 - Math.exp(-PHRASE_DAMPING * delta));
  const p = phraseProgress;
  const enterT = clamp((p - PHRASE_ENTER_START) / (PHRASE_ENTER_END - PHRASE_ENTER_START), 0, 1);
  const exitT = phraseExitEase(clamp((p - PHRASE_HOLD_END) / (PHRASE_PHASE_END - PHRASE_HOLD_END), 0, 1));

  phraseLines.forEach((line, i) => {
    // Each line runs over its own (1 - PHRASE_STAGGER) slice of the window.
    const local = clamp((enterT - i * PHRASE_STAGGER) / (1 - PHRASE_STAGGER), 0, 1);
    const e = phraseEnterEase(local);
    const opacity = clamp(local / PHRASE_FADE_PORTION, 0, 1) * (1 - exitT);
    line.style.opacity = opacity;
    if (opacity === 0) return;
    // prefers-reduced-motion: fade only — no lateral travel, no blur, no lift.
    const x = reducedMotion ? 0 : phraseLineState[i].offX * (1 - e);
    const y = reducedMotion ? 0 : PHRASE_EXIT_Y_PX * exitT;
    const blur = reducedMotion ? 0 : PHRASE_BLUR_PX * (1 - e);
    line.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    line.style.filter = blur > 0.01 ? `blur(${blur}px)` : "none";
  });
}

let scrollProgress = 0;
const AURA_DAMPING = 5; // 1 - exp(-AURA_DAMPING * delta) per frame, see animate()
let sphereProgressDamped = 0;

const heroScrollTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "#hero-section",
    start: "top top",
    // Was "+=400%" for the original 8-unit timeline (50% scroll distance
    // per unit — 400/8), then "+=600%" once the work-experience phase
    // appended 4 more units (12 total), then "+=700%" and "+=800%" as the
    // post-experience vanish phase grew (14, then 16 total): a hold at the
    // experience corner, and doubling the shrink sub-phase's own duration.
    // Still called too fast after that — the hold itself grew again here,
    // from 1 unit to 3, landing on 18*50=900%. The creativity phase then
    // prepended PHRASE_PHASE_UNITS more (23 total = 1150%) — still 50% per
    // unit, so everything after it lasts exactly what it did before.
    end: `+=${TIMELINE_UNITS * 50}%`,
    pin: true,
    // A plain `scrub: true` links progress 1:1 to scroll position with zero
    // lag, so the sphere snaps to a dead stop the instant scrolling stops —
    // not the fluid, video-like motion of the Pinterest reference. Passing
    // a number instead makes ScrollTrigger smooth/catch-up to the real
    // scroll position over that many seconds, so the growth+shift keeps
    // gliding for a beat after the scroll input ends. Tune this duration
    // (bigger = more lag/inertia, smaller = snappier) to taste.
    scrub: 1,
    onUpdate: (self) => {
      scrollProgress = self.progress;
    },
  },
});

heroScrollTimeline
  // Salida "glow horizon": además del fundido + subida ya existentes, las
  // palabras se desenfocan y escalan ligeramente hacia afuera, como si se
  // disolvieran en un resplandor — con un pequeño stagger entre palabras.
  // Sin tinte de color (text-shadow) a propósito: .headline-word usa
  // mix-blend-mode:difference (ver comentario en style.css), así que
  // cualquier color añadido en el mismo elemento se invertiría contra el
  // fondo de forma impredecible en vez de leerse como un resplandor limpio.
  .fromTo(
    ".headline-word",
    // No xPercent/yPercent needed any more — .headline-word is now plainly
    // absolutely positioned (left/top in composition px, see style.css),
    // not centered via a transform hack, so GSAP only needs to animate the
    // exit's own y/scale/blur/opacity on top of that.
    { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    { opacity: 0, y: -60, scale: 1.15, filter: "blur(14px)", duration: 1, ease: "none" },
    0
  )
  // Creativity phase (0 -> PHRASE_PHASE_UNITS): sphere rise, phrase and
  // gradient layer are all per-frame (computeSpherePhase /
  // updateCreativityPhrase), this only reserves the scroll. Every position
  // after it is offset by PHRASE_PHASE_UNITS, so the "position N" notes in
  // the comments below are relative to the end of this phase.
  .to({}, { duration: PHRASE_PHASE_UNITS }, 0)
  .fromTo(
    ".tagline-line",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, ease: "none" },
    PHRASE_PHASE_UNITS + 1
  )
  // positions 2-3 deliberately empty: this is where the text sits still on
  // screen while the user keeps scrolling
  .to(".tagline-line", { opacity: 0, y: -40, duration: 1, ease: "none" }, PHRASE_PHASE_UNITS + 3)
  .fromTo(
    "#featured-work-heading, .featured-work-item",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "none" },
    PHRASE_PHASE_UNITS + 4
  )
  .to({}, { duration: 1 }, PHRASE_PHASE_UNITS + 5) // empty buffer: reserves scroll for the grid-reveal sub-phase (P3-P4)
  .to({}, { duration: 1 }, PHRASE_PHASE_UNITS + 6) // empty buffer: reserves scroll for the grid-exit sub-phase (P4-P5) — sphere stays frozen through this too, see computeSpherePhase()
  // Position 7 = P5, exactly where the grid finishes exiting and the
  // sphere starts shrinking to its final-rest position — same spot the
  // outro CTA has always lived. .featured-work-item itself doesn't fade
  // out by opacity, it already scrolled off the top of the screen during
  // the buffer above (see updateFeaturedWorkScroll()'s exit phase), but
  // #featured-work-heading isn't part of that scroll-away and needs its
  // own exit: fade it out fast right as the sphere starts leaving.
  .to("#featured-work-heading", { opacity: 0, y: -40, duration: 0.35, ease: "none" }, PHRASE_PHASE_UNITS + 7)
  // empty buffer: reserves scroll for the shrink-to-final sub-phase
  // (P5-P6) — the outro CTA fade-in is per-frame (updateOutroCta), not a
  // GSAP tween, so there's nothing else to add here.
  .to({}, { duration: 1 }, PHRASE_PHASE_UNITS + 7)
  // empty buffer: hold #1 at final rest (P6-P7) — outro CTA finishes its
  // fade-in here (per-frame), comfortably before this unit is even over.
  .to({}, { duration: 1 }, PHRASE_PHASE_UNITS + 8)
  // empty buffer: hold #2 at final rest (P7-P8) — a second, entirely
  // static buffer with nothing scheduled at all. Client feedback: the CTA
  // was disappearing too fast — this extra unit is purely "let it sit"
  // breathing room, on top of #1 already finishing early.
  .to({}, { duration: 1 }, PHRASE_PHASE_UNITS + 9)
  // Position 10 = P8, where the sphere starts moving out to the
  // work-experience corner (client feedback: work-experience must come
  // AFTER the outro CTA, not before it, so this whole phase moved to the
  // very end). The CTA fades back out over this same move — handled
  // per-frame in updateOutroCta() via CTA_FADE_OUT_END, no GSAP tween
  // needed for that half — while the experience heading/list fades IN,
  // finishing right as the sphere arrives (P9): same choreography
  // #featured-work-heading/.featured-work-item used while the sphere
  // approached its featured position earlier. Picked the GSAP-timeline
  // .fromTo()+stagger approach because these items are a fixed list that
  // only ever needs a single one-shot reveal — exactly the same shape as
  // .featured-work-item.
  .fromTo(
    "#experience-heading, .experience-item",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "none" },
    PHRASE_PHASE_UNITS + 10
  )
  // Position 11 = P9, where the sphere arrives at the work-experience
  // corner: empty buffer reserving the hold (P9-P9b) — client feedback
  // wanted the experience section to sit longer before the vanish phase
  // starts. duration:3 (grew from an initial 1, still called too fast) —
  // nothing fades or moves for these 3 full units.
  .to({}, { duration: 3 }, PHRASE_PHASE_UNITS + 11)
  // Position 14 = P9b, where the hold ends: the experience text fades
  // back OUT (mirror of its entrance above) while the sphere moves from
  // the corner to dead center — that move itself is per-frame in
  // computeSpherePhase(), nothing more to tween here.
  .to(
    "#experience-heading, .experience-item",
    { opacity: 0, y: -40, duration: 1, stagger: 0.1, ease: "none" },
    PHRASE_PHASE_UNITS + 14
  )
  // Position 15 = P10->P11: sphere (and leaves) grow out to
  // FILL_SPHERE_SCALE — purely per-frame (computeSpherePhase's
  // easeInQuint branch), so this is just a reserved-scroll placeholder,
  // same pattern as the grid-scroll sub-phases above. duration:2 (not 1) —
  // client feedback the growth felt too rushed, so it gets two full units
  // for the same easeInQuint curve to play out over, instead of one.
  .to({}, { duration: 2 }, PHRASE_PHASE_UNITS + 15)
  .to({}, { duration: 1 }, PHRASE_PHASE_UNITS + 17); // final buffer: sphere stays fully grown, its gradient filling the screen

// Grid-scroll phase: once the sphere has settled into its featured-work
// position (progress > GRID_SCROLL_START), further scroll no longer moves
// the sphere at all — instead it translates .featured-work-grid upward,
// revealing items that don't fit the viewport. With only 4 placeholder
// items this barely moves (they already fit), but the mechanism is ready
// for a longer real project list.
//
// A second, separate exit sub-phase (GRID_SCROLL_END through GRID_EXIT_END,
// i.e. P4 through P5) then keeps translating the grid further up until it's
// fully off-screen — this is how the grid "leaves" now, instead of the
// opacity fade the timeline used to do.
const featuredWorkGrid = document.querySelector(".featured-work-grid");
const GRID_SCROLL_START = P3;
const GRID_SCROLL_END = P4; // reveal phase ends, exit phase begins
const GRID_EXIT_END = P5; // grid is fully off-screen by here
const GRID_VISIBLE_HEIGHT_RATIO = 0.8; // visible-height budget vs. viewport — tune by eye
const GRID_EXIT_DISTANCE_PX = window.innerHeight; // extra upward travel during the exit sub-phase — generous enough to clear the grid regardless of its height

function updateFeaturedWorkScroll(progress) {
  const availableHeight = window.innerHeight * GRID_VISIBLE_HEIGHT_RATIO;
  const maxScroll = Math.max(0, featuredWorkGrid.offsetHeight - availableHeight);

  if (progress <= GRID_SCROLL_START) {
    featuredWorkGrid.style.transform = "translateY(0px)";
    return;
  }
  if (progress <= GRID_SCROLL_END) {
    const t = (progress - GRID_SCROLL_START) / (GRID_SCROLL_END - GRID_SCROLL_START);
    featuredWorkGrid.style.transform = `translateY(-${maxScroll * t}px)`;
    return;
  }
  const exitT = clamp((progress - GRID_SCROLL_END) / (GRID_EXIT_END - GRID_SCROLL_END), 0, 1);
  featuredWorkGrid.style.transform = `translateY(-${maxScroll + GRID_EXIT_DISTANCE_PX * exitT}px)`;
}

const clock = new THREE.Clock();

// After Effects-style wiggle: a slow, non-periodic drift added on top of the
// scroll-driven position (position only, never rotation). Gradient noise with
// the quintic fade is used instead of value/smoothstep noise because the
// latter stops and starts at every lattice point.
const WIGGLE_FREQUENCY = 0.5; // rate of the noise field, in cycles per second
const WIGGLE_AMP_X = 0.03; // world units (~12px at 1080p)
const WIGGLE_AMP_Y = 0.04; // world units (~17px at 1080p)
const WIGGLE_SEED_Y = 37.1;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Continuous slow spin around the sphere's own vertical axis — one full
// turn every ~40s (halved from ~20s per client feedback). Position-
// equivalent constants (wiggle) already respect reducedMotion, so this
// does too: a static sphere is way less likely to trigger motion
// sensitivity than one that's also drifting.
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
  // Clamped: THREE.Clock's first getDelta() call returns the time elapsed
  // since the clock was constructed (module load), which includes however
  // long the page took to parse/compile/load assets before the first
  // requestAnimationFrame fires — without this clamp that shows up as one
  // large, visible jump in orangeGroup.rotation.y right at startup instead
  // of a smooth, slow spin from 0.
  const rawDelta = clock.getDelta();
  const delta = Math.min(rawDelta, 1 / 30);
  // The phrase's damping must follow real elapsed time even when frames are
  // slow (the 1/30 clamp above would make it lag further behind the lower
  // the frame rate gets); only capped against a long background-tab pause.
  const phraseDelta = Math.min(rawDelta, 0.5);
  const elapsed = clock.getElapsedTime();

  uniforms.uTime.value = elapsed;

  // Frame-rate independent easing toward the cursor influence target, with
  // a slower fade-out than fade-in so the dent lingers after the cursor
  // leaves instead of snapping back.
  const lerpSpeed = cursorInfluenceTarget > cursorInfluenceCurrent ? CURSOR_LERP_SPEED_IN : CURSOR_LERP_SPEED_OUT;
  cursorInfluenceCurrent += (cursorInfluenceTarget - cursorInfluenceCurrent) * (1 - Math.exp(-lerpSpeed * delta));
  uniforms.uCursorInfluence.value = cursorInfluenceCurrent;

  // Rise/morph damping: inside the creativity phase the sphere/aura/camera
  // follow a damped copy of scrollProgress (frame-rate independent), so an
  // abrupt scroll never makes the orange or the aura jerk. Blended back to
  // the raw value over PHRASE_PHASE_END -> P1 (continuous, no switch), so
  // every later phase is driven exactly as before.
  sphereProgressDamped += (scrollProgress - sphereProgressDamped) * (1 - Math.exp(-AURA_DAMPING * phraseDelta));
  const dampWeight = 1 - smoothstep(PHRASE_PHASE_END, P1, scrollProgress);
  const sphereProgress = THREE.MathUtils.lerp(scrollProgress, sphereProgressDamped, dampWeight);
  const auraMorph = computeAuraMorph(sphereProgress);
  // Camera: the hero's near-orthographic pair (sphere = clean circle)
  // through the whole creativity phase, the normal pair from
  // PHRASE_PHASE_END on — switched while the sphere is invisible (m = 1).
  const heroCamera = sphereProgress <= PHRASE_PHASE_END;
  camera.fov = heroCamera ? HERO_FOV : NORMAL_FOV;
  camera.position.z = heroCamera ? HERO_CAM_Z : NORMAL_CAM_Z;
  camera.updateProjectionMatrix();
  // Ambient waves: 0 in the hero and through the morph (the aura tracks the
  // silhouette, it must not ripple); ramps in once the sphere has fully
  // re-formed at its peak (AURA_REVERSE_END -> P1), as every later phase.
  uniforms.uAmbientAmount.value = smoothstep(AURA_REVERSE_END, P1, sphereProgress);
  // Cursor dent: same reason — off while the orange is morphing.
  uniforms.uCursorInfluence.value = cursorInfluenceCurrent * (1 - smoothstep(0, 0.03, auraMorph));
  uniforms.uGrainScale.value = computeGrainScale(sphereProgress);

  const spherePhase = computeSpherePhase(sphereProgress);
  orangeGroup.scale.setScalar(spherePhase.scale);
  const wiggleWeight = reducedMotion ? 0 : 1 - clamp((scrollProgress - P10) / (P11 - P10), 0, 1);
  const wiggleT = elapsed * WIGGLE_FREQUENCY;
  orangeGroup.position.x = spherePhase.x + gradientNoise1D(wiggleT) * WIGGLE_AMP_X * wiggleWeight;
  orangeGroup.position.y = spherePhase.y + gradientNoise1D(wiggleT + WIGGLE_SEED_Y) * WIGGLE_AMP_Y * wiggleWeight;
  if (!reducedMotion) {
    orangeGroup.rotation.y += delta * ROTATION_SPEED;
  }
  // matrixWorld must reflect THIS frame's rotation before the normal
  // matrix is derived from it below — Three.js only refreshes it lazily
  // during renderer.render()'s own traversal, which would otherwise lag
  // the uniform by one frame.
  orangeGroup.updateMatrixWorld(true);
  uniforms.uNormalMatrix.value.getNormalMatrix(sphere.matrixWorld);
  updateFeaturedWorkScroll(scrollProgress);
  updateOutroCta(scrollProgress);
  updateContactCta(scrollProgress);
  updateCreativityPhrase(scrollProgress, phraseDelta);
  updateAura(auraMorph);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

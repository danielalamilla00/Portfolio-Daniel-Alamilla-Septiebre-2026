import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import vertexShader from "./shaders/sphere.vert.glsl?raw";
import fragmentShader from "./shaders/sphere.frag.glsl?raw";
import gradientRevealVertexShader from "./shaders/gradientReveal.vert.glsl?raw";
import gradientRevealFragmentShader from "./shaders/gradientReveal.frag.glsl?raw";

gsap.registerPlugin(ScrollTrigger);

// The featured-work images load asynchronously (picsum.photos); if any
// finish loading after ScrollTrigger has already measured the pinned
// section's scroll distance, that measurement can go stale and cut the
// pin short. Refreshing once everything (including images) has finished
// loading re-measures against the final, settled layout.
window.addEventListener("load", () => ScrollTrigger.refresh());

const canvas = document.querySelector("#sphere-canvas");
const leafLeftWrap = document.querySelector(".leaf-left-wrap");
const leafRightWrap = document.querySelector(".leaf-right-wrap");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 0, 3.1);
camera.lookAt(0, 0, 0);

// alpha:true + a fully transparent clear color so the canvas only paints
// the sphere/nub — everywhere else stays transparent and the page's own
// black body background (and now the headline text) shows through.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const uniforms = {
  uTime: { value: 0 },
  uCursorInfluence: { value: 0 },
  uCursorPoint: { value: new THREE.Vector3(0, 0, 0) },
};

const orangeGroup = new THREE.Group();
// Slightly smaller than a "full" 1.0 fit so the ambient wave's outward
// excursions (see sphere.vert.glsl) don't push the silhouette past the
// viewport edges and get clipped. Named so the scroll storytelling below
// can animate away from this resting value.
const BASE_SPHERE_SCALE = 0.92;
// Shifts the rendered sphere down within the (untouched, full-viewport)
// canvas, freeing up headroom at the top for the leaves — moving the
// canvas element itself via CSS would desync the pointer/raycast math in
// updatePointer(), which assumes the canvas exactly matches the viewport.
// -0.15 (raised from -0.25 per client feedback) still leaves the sphere's
// top comfortably below #site-nav and the leaves well clear of it.
const BASE_SPHERE_Y = -0.15;
orangeGroup.scale.setScalar(BASE_SPHERE_SCALE);
orangeGroup.position.y = BASE_SPHERE_Y;
scene.add(orangeGroup);

const geometry = new THREE.SphereGeometry(1, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
});
const sphere = new THREE.Mesh(geometry, material);
orangeGroup.add(sphere);

// Post-experience vanish reveal: a large plane sitting well BEHIND the
// sphere (z=-6, vs. the sphere's own z=0 and the camera at z=3.1), masked
// to a growing circle at its center as the sphere shrinks to nothing (see
// updateVanishReveal() below) — so it visibly emerges from UNDER the
// sphere rather than on top of it. Deliberately NOT added to orangeGroup:
// it must stay fixed at screen center regardless of the sphere's own
// x/y/scale animation. Oversized (60x60 world units) so it covers the
// full viewport at any aspect ratio without needing to size it exactly to
// the camera's frustum at that depth — the actual reveal-circle masking
// happens in screen space in the shader (uResolution/gl_FragCoord), not
// via this plane's own geometry, so being larger than necessary costs
// nothing but a few extra off-screen triangles.
const gradientRevealUniforms = {
  uTime: uniforms.uTime, // same object reference as the sphere's own — one clock, so the two stay frame-perfectly in sync automatically
  uRevealRadius: { value: 0 },
  uResolution: { value: new THREE.Vector2() }, // set for real just below, and again on every resize
};
renderer.getDrawingBufferSize(gradientRevealUniforms.uResolution.value);
const gradientRevealMaterial = new THREE.ShaderMaterial({
  vertexShader: gradientRevealVertexShader,
  fragmentShader: gradientRevealFragmentShader,
  uniforms: gradientRevealUniforms,
});
const gradientRevealMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), gradientRevealMaterial);
gradientRevealMesh.position.z = -6;
scene.add(gradientRevealMesh);

// Cursor influence: target snaps 0/1 on enter/leave of the sphere surface,
// current eases toward it every frame so the dent fades in/out instead of
// cutting.
let cursorInfluenceTarget = 0;
let cursorInfluenceCurrent = 0;
const CURSOR_LERP_SPEED_IN = 4; // fade-in: quick response when the cursor lands
const CURSOR_LERP_SPEED_OUT = 1.2; // fade-out: slower, gives the dent more inertia

const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const localCursorPoint = new THREE.Vector3();
let mousePxX = 0;
let mousePxY = 0;

function updatePointer(event) {
  mousePxX = event.clientX - window.innerWidth / 2;
  mousePxY = event.clientY - window.innerHeight / 2;

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
  // gl_FragCoord is in actual drawing-buffer pixels (CSS size * pixel
  // ratio), not CSS pixels — getDrawingBufferSize() accounts for the
  // renderer's own setPixelRatio() so the shader's screen-space math
  // lines up with real fragment coordinates.
  renderer.getDrawingBufferSize(gradientRevealUniforms.uResolution.value);
}
window.addEventListener("resize", onResize);

// The leaves are plain <img> elements, not part of the Three.js scene, so
// they're kept glued to the sphere by projecting a point near its pole
// (local +Y) from 3D world space to on-screen pixel coordinates every frame
// — this stays correct regardless of the sphere's own position/scale,
// instead of a guessed CSS percentage.
//
// The anchor sits at the sphere's nominal (undisplaced) radius-1 surface,
// then pulls INWARD from there to match the same two deformations the
// vertex shader applies (see sphere.vert.glsl's displace()):
//  - an always-on ambient noise wobble (small, roughly +/-0.1 local units)
//    — instead of tracking its exact value (fragile to replicate in JS) we
//    leave it unmatched. LEAF_ANCHOR_BASE_RADIUS used to bake in an extra
//    flat safety margin for this, but that margin is a FIXED FRACTION of
//    the sphere's radius, so on a bigger/zoomed-in render (bigger on-screen
//    radius in pixels) it turned into a large, very visible gap between
//    the leaves and the sphere even at rest — worse than the small
//    unmatched ambient wobble it was meant to cover. Better to anchor
//    right at the true surface and accept the occasional few-px
//    over/undershoot from ambient noise than a guaranteed gap that scales
//    with sphere size.
//  - the cursor "dent", which can press the surface in by up to
//    CURSOR_DEPTH_MATCH (half the sphere's radius!) whenever the pole is
//    within reach of wherever the cursor is currently pressing. This is
//    the dominant effect and cheap to replicate closely (a plain radial
//    falloff, no noise needed), so we do — padded a bit for safety since we
//    skip the shader's own edge-noise irregularity.
// Skipping the cursor term entirely (an earlier version of this code did)
// meant hovering anywhere near the top pressed the surface in by up to
// half its radius while the leaves stayed anchored at the old fixed
// point — that's the floating-gap bug this replaces.
//
// IMPORTANT: CURSOR_RADIUS_MATCH/CURSOR_DEPTH_MATCH must mirror
// CURSOR_RADIUS/CURSOR_DEPTH in sphere.vert.glsl. If those shader
// constants ever change, update these two numbers to match.
const CURSOR_RADIUS_MATCH = 1.3;
const CURSOR_DEPTH_MATCH = 0.5;
const LEAF_ANCHOR_BASE_RADIUS = 1.0; // idle anchor sits right at the nominal radius-1 surface
const LEAF_ANCHOR_CURSOR_RADIUS = CURSOR_RADIUS_MATCH * 1.15; // padded vs. the shader's dent radius
const LEAF_ANCHOR_CURSOR_DEPTH = CURSOR_DEPTH_MATCH * 1.15; // padded vs. the shader's dent depth
const LEAF_ANCHOR_MIN_RADIUS = 0.25; // never let the anchor collapse toward the center

const leafAnchorDirection = new THREE.Vector3(0, 1, 0); // fixed direction: the sphere's local "north pole"
const leafAnchorLocal = new THREE.Vector3();
const leafAnchorWorld = new THREE.Vector3();

function updateLeafAnchor() {
  // Same distance-to-cursor and falloff shape as displace() in the vertex
  // shader, measured against the undisplaced pole direction (radius 1) —
  // matching how the shader measures distToCursor from the undisplaced
  // localPosition of each vertex.
  const distToCursor = leafAnchorDirection.distanceTo(uniforms.uCursorPoint.value);
  const cursorFalloff = 1 - THREE.MathUtils.smoothstep(distToCursor, 0, LEAF_ANCHOR_CURSOR_RADIUS);
  const dentAmount = cursorFalloff * LEAF_ANCHOR_CURSOR_DEPTH * cursorInfluenceCurrent;

  const anchorRadius = Math.max(LEAF_ANCHOR_MIN_RADIUS, LEAF_ANCHOR_BASE_RADIUS - dentAmount);
  leafAnchorLocal.copy(leafAnchorDirection).multiplyScalar(anchorRadius);

  leafAnchorWorld.copy(leafAnchorLocal).applyMatrix4(sphere.matrixWorld).project(camera);

  // Small deliberate nudge left of the sphere's true central axis — a
  // pure styling choice, tune this one number if it needs more/less.
  // Lowered from 40 to 15 per client feedback ("mueve las hojas un poco
  // a la derecha") — a smaller leftward nudge means the leaves land
  // further right.
  const LEAF_GROUP_OFFSET_X_PX = 15;

  const screenX = (leafAnchorWorld.x * 0.5 + 0.5) * window.innerWidth - LEAF_GROUP_OFFSET_X_PX;
  const screenY = (1 - (leafAnchorWorld.y * 0.5 + 0.5)) * window.innerHeight;

  const leafFinalScale = orangeGroup.scale.x / BASE_SPHERE_SCALE;

  leafLeftWrap.style.left = `${screenX}px`;
  leafLeftWrap.style.top = `${screenY}px`;
  leafLeftWrap.style.transform = `scale(${leafFinalScale})`;
  leafRightWrap.style.left = `${screenX}px`;
  leafRightWrap.style.top = `${screenY}px`;
  leafRightWrap.style.transform = `scale(${leafFinalScale})`;
}

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
// updateLeafAnchor() reads sphere.matrixWorld fresh every animate() frame,
// so the leaves keep following the sphere automatically through both
// phases — no changes needed there.
//
// PEAK_SPHERE_SCALE/PEAK_X_SHIFT/PEAK_Y are the already-tuned end state of
// the old single-phase animation (a fixed client spec of scale 1.6, with X
// chosen via a projection check against a reference screenshot — see prior
// history), now reused as the midpoint of the new 2-phase curve instead of
// being retuned from scratch. FEATURED_X_SHIFT mirrors PEAK_X_SHIFT to the
// left; FEATURED_Y is a first guess to raise the sphere a little relative
// to rest — both are placeholders to adjust by eye against the featured
// work grid.
const PEAK_SPHERE_SCALE = 1.6;
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
// change); the client's "once centered, scale to 0" is a separate,
// later sub-phase — see VANISH_SPHERE_SCALE below.
const CENTER_SPHERE_X = 0;
const CENTER_SPHERE_Y = 0;

// Final vanish: once centered, scale shrinks all the way to 0. No leaf-
// specific constant needed — updateLeafAnchor() already derives
// leafFinalScale from orangeGroup.scale.x every frame, so the leaves
// shrink to 0 in lockstep with the sphere automatically.
const VANISH_SPHERE_SCALE = 0;

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
// ("WANT TO SEE MORE?") instead of before it, and flagged the CTA/floating-
// cards phase as feeling rushed once that move landed: the floating cards'
// own staggered entrance used to be allowed to run all the way to the very
// end of the scroll (CARD_STAGGER_END was a literal 1), which only worked
// because that used to BE the end — now something comes after it, so that
// same stagger window collided with the next phase's fade-out. Fixed by
// giving this phase two explicit holds instead of one: P6-P7 is sized so
// the cards' stagger comfortably finishes with room to spare, and P7-P8 is
// a second, entirely static hold with nothing scheduled in it at all — the
// "let it breathe before moving on" buffer. Only after both does the
// sphere make its final move out to the lower-left experience corner
// (P8-P9) for the work-experience list.
const P1 = 2 / 18; // sphere reaches its peak (matches the tagline already fully visible)
const P2 = 3 / 18; // end of the hold
const P3 = 5 / 18; // sphere reaches its featured position (starts the grid scroll reveal)
const P4 = 6 / 18; // grid reveal ends, grid exit sub-phase starts (sphere still frozen)
const P5 = 7 / 18; // grid fully off-screen; sphere about to start shrinking to its final-rest position
const P6 = 8 / 18; // sphere reaches its final-rest position; outro CTA + floating cards start their entrance
const P7 = 9 / 18; // cards/CTA entrance is long finished by here (see CARD_STAGGER_END) — rest of this unit is already just held
const P8 = 10 / 18; // end of the pure-hold buffer; sphere starts moving to the experience corner
const P9 = 11 / 18; // sphere reaches the experience corner (work-experience list visible)
// Client feedback: the experience section needs to hold a beat longer
// before the vanish phase starts, and the final shrink-to-0 felt too
// rushed — so P9b is a new, dedicated hold (sphere+text fully static) that
// didn't exist before, and the shrink sub-phase (P10-P11) now spans 2
// units instead of 1, doubling how long the easeInQuint has to play out.
// The hold itself (P9-P9b) started at just 1 unit and was still called
// "too fast" — bumped to 3 units here.
const P9b = 14 / 18; // NEW: end of the hold at the experience corner — text starts fading out / sphere starts moving to center only after this
const P10 = 15 / 18; // sphere reaches dead center; experience text finishes fading out here too
const P11 = 17 / 18; // sphere (and leaves, automatically) finish shrinking to scale 0 — 2 full units (P10-P11) instead of 1, slower

function computeSpherePhase(progress) {
  if (progress <= P1) {
    const t = progress / P1;
    return {
      scale: THREE.MathUtils.lerp(BASE_SPHERE_SCALE, PEAK_SPHERE_SCALE, t),
      x: THREE.MathUtils.lerp(0, PEAK_X_SHIFT, t),
      y: THREE.MathUtils.lerp(BASE_SPHERE_Y, PEAK_Y, t),
    };
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
    // Centered: scale collapses to 0 with an accelerating ease-in
    // (easeInQuint above), not a linear ramp — the leaves shrink with it
    // automatically via updateLeafAnchor()'s leafFinalScale.
    const t = easeInQuint((progress - P10) / (P11 - P10));
    return {
      scale: THREE.MathUtils.lerp(EXPERIENCE_SPHERE_SCALE, VANISH_SPHERE_SCALE, t),
      x: CENTER_SPHERE_X,
      y: CENTER_SPHERE_Y,
    };
  }
  // Final state: fully vanished at screen center.
  return { scale: VANISH_SPHERE_SCALE, x: CENTER_SPHERE_X, y: CENTER_SPHERE_Y };
}

const floatingCards = Array.from(document.querySelectorAll(".floating-card"));
const outroCtaQuestion = document.querySelector(".outro-cta-question");
const outroCtaLink = document.querySelector(".outro-cta-link");
const vanishReveal = document.getElementById("vanish-reveal");
const floatingCardsCurrentX = floatingCards.map(() => 0);
const floatingCardsCurrentY = floatingCards.map(() => 0);

// Aparición: fundido simple ligado al scroll, sin escalado ni rebote — las
// tarjetas ya están en su posición fija final (--fc-x/--fc-y), solo su
// opacidad cambia con el scroll durante la fase en la que la esfera se
// encoge y centra (P5 a P6).
const FLOAT_FADE_START = P5 + (P6 - P5) * 0.4;
const FLOAT_FADE_END = P6;
// El CTA (y las tarjetas flotantes) se desvanecen otra vez cuando la esfera
// empieza a moverse hacia la esquina de work-experience — es decir, al
// final del segundo hold (P8), no del primero (P7): P6-P7 es donde las
// tarjetas terminan de aparecer, P7-P8 es puro margen extra sin que nada
// cambie, y solo entonces empieza la salida. Mismo tratamiento rápido que
// #featured-work-heading al salir de su fase.
const CTA_FADE_OUT_END = P8 + (P9 - P8) * 0.35;

// Parallax por ratón: cada tarjeta se desplaza una cantidad distinta según
// su --fc-depth (más profundidad = más movimiento), en dirección OPUESTA
// al puntero (sensibilidad negativa, igual que en la demo de referencia de
// 21st.dev). El movimiento se suaviza con inercia (lerp) para que no salte.
const PARALLAX_SENSITIVITY = -1;
const PARALLAX_STRENGTH = 0.06; // multiplicador sobre el desplazamiento en píxeles del ratón
const PARALLAX_LERP_SPEED = 4; // suavizado, independiente del framerate

// Aparición de las tarjetas flotantes: una a una, no todas juntas. Arranca
// en el mismo punto exacto que el fundido de "WANT TO SEE MORE?"
// (FLOAT_FADE_START). Termina al 70% del primer hold (P6-P7) — antes esto
// era un 1 literal (terminaba justo al final de todo el scroll), lo cual
// solo funcionaba porque esta fase solía ser la última; ahora que
// work-experience viene después, dejar el stagger corriendo hasta el
// final chocaba con la salida de esta misma fase. Con margen hasta P7 (y
// encima todo el hold P7-P8 de propina) da tiempo de sobra a que las 8
// tarjetas terminen de aparecer antes de que empiece cualquier otra cosa.
const CARD_STAGGER_START = FLOAT_FADE_START;
const CARD_STAGGER_END = P6 + (P7 - P6) * 0.7;
const CARD_STAGGER_DURATION = 0.16; // cuánto tarda cada tarjeta en aparecer, en fracción de scroll

// Desaceleración final (ease-out cúbico) en vez de un avance lineal: cada
// tarjeta entra rápido y va frenando hasta asentarse en su opacidad/escala
// final.
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Aceleración final (ease-in a la quinta potencia) para el desvanecimiento
// final de la esfera: arranca lento y termina con un cierre rápido hacia 0
// — justo lo opuesto de easeOutCubic anterior.
function easeInQuint(t) {
  return t * t * t * t * t;
}

function updateFloatingCards(progress, delta) {
  // Ya no se quedan visibles para siempre una vez aparecidas: ahora que
  // work-experience viene después, se desvanecen igual que el CTA (mismo
  // punto de disparo P8, ver CTA_FADE_OUT_END arriba) para no quedarse
  // estorbando detrás de la lista de experiencia.
  const fadeOut = 1 - clamp((progress - P8) / (CTA_FADE_OUT_END - P8), 0, 1);
  floatingCards.forEach((card, index) => {
    const depth = parseFloat(card.style.getPropertyValue("--fc-depth")) || 1;
    const tx = parseFloat(card.style.getPropertyValue("--fc-x"));
    const ty = parseFloat(card.style.getPropertyValue("--fc-y"));
    const rot = parseFloat(card.style.getPropertyValue("--fc-rot")) || 0;

    const stagger = floatingCards.length > 1 ? index / (floatingCards.length - 1) : 0;
    const cardStart = CARD_STAGGER_START + stagger * (CARD_STAGGER_END - CARD_STAGGER_START - CARD_STAGGER_DURATION);
    const t = clamp((progress - cardStart) / CARD_STAGGER_DURATION, 0, 1);
    const opacity = easeOutCubic(t) * fadeOut;
    // Al salir, las tarjetas "se funden" en un círculo en vez de
    // simplemente desvanecerse siendo rectangulares — el border-radius
    // crece de 0 hasta 50% a la vez que se desvanecen (fadeOut 1 -> 0).
    card.style.borderRadius = `${(1 - fadeOut) * 50}%`;

    const targetX = mousePxX * PARALLAX_SENSITIVITY * depth * PARALLAX_STRENGTH;
    const targetY = mousePxY * PARALLAX_SENSITIVITY * depth * PARALLAX_STRENGTH;

    floatingCardsCurrentX[index] += (targetX - floatingCardsCurrentX[index]) * (1 - Math.exp(-PARALLAX_LERP_SPEED * delta));
    floatingCardsCurrentY[index] += (targetY - floatingCardsCurrentY[index]) * (1 - Math.exp(-PARALLAX_LERP_SPEED * delta));

    card.style.opacity = opacity;
    card.style.transform = `translate(-50%, -50%) translate(${tx}vw, ${ty}vh) translate(${floatingCardsCurrentX[index]}px, ${floatingCardsCurrentY[index]}px) scale(${opacity}) rotate(${rot}deg)`;
  });
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

// Post-experience vanish reveal: an expanding circle (see #vanish-reveal
// in style.css) grows from 0 at dead screen center out to a size that
// guarantees full-viewport coverage (100vmax — half the viewport's own
// diagonal is always < 100% of its larger dimension), over the exact same
// P10-P11 window and easeInQuint curve the sphere itself uses to shrink to
// 0 — so the reveal finishes exactly as the sphere disappears, instead of
// drifting out of sync with it.
function updateVanishReveal(progress) {
  const t = easeInQuint(clamp((progress - P10) / (P11 - P10), 0, 1));
  vanishReveal.style.clipPath = `circle(${t * 100}vmax at 50% 50%)`;
}

let scrollProgress = 0;

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
    // from 1 unit to 3, landing on 18*50=900%.
    end: "+=900%",
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
    { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    { opacity: 0, y: -60, scale: 1.15, filter: "blur(14px)", duration: 1, stagger: 0.08, ease: "none" },
    0
  )
  .fromTo(
    ".tagline-line",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, ease: "none" },
    1
  )
  // positions 2-3 deliberately empty: this is where the text sits still on
  // screen while the user keeps scrolling
  .to(".tagline-line", { opacity: 0, y: -40, duration: 1, ease: "none" }, 3)
  .fromTo(
    "#featured-work-heading, .featured-work-item",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "none" },
    4
  )
  .to({}, { duration: 1 }, 5) // empty buffer: reserves scroll for the grid-reveal sub-phase (P3-P4)
  .to({}, { duration: 1 }, 6) // empty buffer: reserves scroll for the grid-exit sub-phase (P4-P5) — sphere stays frozen through this too, see computeSpherePhase()
  // Position 7 = P5, exactly where the grid finishes exiting and the
  // sphere starts shrinking to its final-rest position — same spot the
  // outro CTA has always lived. .featured-work-item itself doesn't fade
  // out by opacity, it already scrolled off the top of the screen during
  // the buffer above (see updateFeaturedWorkScroll()'s exit phase), but
  // #featured-work-heading isn't part of that scroll-away and needs its
  // own exit: fade it out fast right as the sphere starts leaving.
  .to("#featured-work-heading", { opacity: 0, y: -40, duration: 0.35, ease: "none" }, 7)
  // empty buffer: reserves scroll for the shrink-to-final sub-phase
  // (P5-P6) — the outro CTA/.floating-card fade-in is per-frame
  // (updateOutroCta/updateFloatingCards), not a GSAP tween, so there's
  // nothing else to add here.
  .to({}, { duration: 1 }, 7)
  // empty buffer: hold #1 at final rest (P6-P7) — outro CTA + floating
  // cards run their fade-in/stagger here (per-frame, see CARD_STAGGER_END),
  // comfortably finishing before this unit is even over.
  .to({}, { duration: 1 }, 8)
  // empty buffer: hold #2 at final rest (P7-P8) — a second, entirely
  // static buffer with nothing scheduled at all. Client feedback: the CTA
  // was disappearing too fast, before the cards even finished their own
  // entrance — this extra unit is purely "let it sit" breathing room, on
  // top of #1 already finishing early.
  .to({}, { duration: 1 }, 9)
  // Position 10 = P8, where the sphere starts moving out to the
  // work-experience corner (client feedback: work-experience must come
  // AFTER the outro CTA, not before it, so this whole phase moved to the
  // very end). The CTA/floating-cards fade back out over this same move —
  // handled per-frame in updateOutroCta()/updateFloatingCards() via
  // CTA_FADE_OUT_END, no GSAP tween needed for that half — while the
  // experience heading/list fades IN, finishing right as the sphere
  // arrives (P9): same choreography #featured-work-heading/
  // .featured-work-item used while the sphere approached its featured
  // position earlier. Picked the GSAP-timeline .fromTo()+stagger approach
  // (not updateFloatingCards' per-frame one) because these items are a
  // fixed, non-mouse-reactive list that only ever needs a single one-shot
  // reveal — exactly the same shape as .featured-work-item, not the
  // continuous per-frame parallax .floating-card needs.
  .fromTo(
    "#experience-heading, .experience-item",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "none" },
    10
  )
  // Position 11 = P9, where the sphere arrives at the work-experience
  // corner: empty buffer reserving the hold (P9-P9b) — client feedback
  // wanted the experience section to sit longer before the vanish phase
  // starts. duration:3 (grew from an initial 1, still called too fast) —
  // nothing fades or moves for these 3 full units.
  .to({}, { duration: 3 }, 11)
  // Position 14 = P9b, where the hold ends: the experience text fades
  // back OUT (mirror of its entrance above) while the sphere moves from
  // the corner to dead center — that move itself is per-frame in
  // computeSpherePhase(), nothing more to tween here.
  .to(
    "#experience-heading, .experience-item",
    { opacity: 0, y: -40, duration: 1, stagger: 0.1, ease: "none" },
    14
  )
  // Position 15 = P10->P11: sphere (and leaves) shrink to scale 0 —
  // purely per-frame (computeSpherePhase's easeInQuint branch), so this
  // is just a reserved-scroll placeholder, same pattern as the grid-scroll
  // sub-phases above. duration:2 (not 1) — client feedback the shrink felt
  // too rushed, so it gets two full units for the same easeInQuint curve
  // to play out over, instead of one.
  .to({}, { duration: 2 }, 15)
  .to({}, { duration: 1 }, 17); // final buffer: sphere stays fully vanished at scale 0

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
const GRID_SCROLL_START = 5 / 18; // must match P3 above
const GRID_SCROLL_END = 6 / 18; // must match P4 above — reveal phase ends, exit phase begins
const GRID_EXIT_END = 7 / 18; // must match P5 above — grid is fully off-screen by here
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

function animate() {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  uniforms.uTime.value = elapsed;

  // Frame-rate independent easing toward the cursor influence target, with
  // a slower fade-out than fade-in so the dent lingers after the cursor
  // leaves instead of snapping back.
  const lerpSpeed = cursorInfluenceTarget > cursorInfluenceCurrent ? CURSOR_LERP_SPEED_IN : CURSOR_LERP_SPEED_OUT;
  cursorInfluenceCurrent += (cursorInfluenceTarget - cursorInfluenceCurrent) * (1 - Math.exp(-lerpSpeed * delta));
  uniforms.uCursorInfluence.value = cursorInfluenceCurrent;

  const spherePhase = computeSpherePhase(scrollProgress);
  orangeGroup.scale.setScalar(spherePhase.scale);
  orangeGroup.position.x = spherePhase.x;
  orangeGroup.position.y = spherePhase.y;
  updateFeaturedWorkScroll(scrollProgress);
  updateFloatingCards(scrollProgress, delta);
  updateOutroCta(scrollProgress);
  updateVanishReveal(scrollProgress);

  renderer.render(scene, camera);
  updateLeafAnchor();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

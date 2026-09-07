import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import vertexShader from "./shaders/sphere.vert.glsl?raw";
import fragmentShader from "./shaders/sphere.frag.glsl?raw";

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

  const leafScaleRatio = orangeGroup.scale.x / BASE_SPHERE_SCALE;

  // The small, centered resting state (end of the outro — see
  // computeSpherePhase()) is the only phase where orangeGroup ever shrinks
  // below its resting scale, so it doubles as a clean "how small is the
  // sphere right now" signal without needing scrollProgress here. Blending
  // in an extra shrink + rightward nudge only as that happens keeps every
  // earlier phase (hero/headline/featured-work) completely untouched.
  const smallness = THREE.MathUtils.clamp(
    (BASE_SPHERE_SCALE - orangeGroup.scale.x) / (BASE_SPHERE_SCALE - SMALL_SPHERE_SCALE),
    0,
    1
  );
  const leafFinalScale = leafScaleRatio * THREE.MathUtils.lerp(1, SMALL_LEAF_EXTRA_SCALE, smallness);
  const leafExtraOffsetX = THREE.MathUtils.lerp(0, SMALL_LEAF_EXTRA_OFFSET_X_PX, smallness);

  leafLeftWrap.style.left = `${screenX + leafExtraOffsetX}px`;
  leafLeftWrap.style.top = `${screenY}px`;
  leafLeftWrap.style.transform = `scale(${leafFinalScale})`;
  leafRightWrap.style.left = `${screenX + leafExtraOffsetX}px`;
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
// Outro resting state: small and centered. First estimate against the
// client's reference image — tune SMALL_SPHERE_SCALE by eye.
const SMALL_SPHERE_SCALE = 0.24;
const SMALL_SPHERE_X = 0;
const SMALL_SPHERE_Y = 0.27; // tune by eye
// Extra leaf adjustment used only in that same small resting state (see
// updateLeafAnchor()) — the leaves' proportional scale still read as too
// big next to the tiny sphere, so this shrinks them further and nudges
// them right. Tune by eye.
const SMALL_LEAF_EXTRA_SCALE = 0.8;
const SMALL_LEAF_EXTRA_OFFSET_X_PX = 15;

const P1 = 2 / 8; // sphere reaches its peak (matches the tagline already fully visible)
const P2 = 3 / 8; // end of the hold
const P3 = 5 / 8; // sphere reaches its featured position (starts the grid scroll)
const P4 = 6 / 8; // starts shrinking/centering (matches the grid fading out)
const P5 = 7 / 8; // finishes shrinking/centering

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
  if (progress <= P4) {
    // grid-scroll phase: the sphere no longer moves — only the grid does.
    return { scale: PEAK_SPHERE_SCALE, x: FEATURED_X_SHIFT, y: FEATURED_Y };
  }
  if (progress <= P5) {
    const t = (progress - P4) / (P5 - P4);
    return {
      scale: THREE.MathUtils.lerp(PEAK_SPHERE_SCALE, SMALL_SPHERE_SCALE, t),
      x: THREE.MathUtils.lerp(FEATURED_X_SHIFT, SMALL_SPHERE_X, t),
      y: THREE.MathUtils.lerp(FEATURED_Y, SMALL_SPHERE_Y, t),
    };
  }
  return { scale: SMALL_SPHERE_SCALE, x: SMALL_SPHERE_X, y: SMALL_SPHERE_Y };
}

const floatingCards = Array.from(document.querySelectorAll(".floating-card"));
const outroCtaQuestion = document.querySelector(".outro-cta-question");
const outroCtaLink = document.querySelector(".outro-cta-link");
const floatingCardsCurrentX = floatingCards.map(() => 0);
const floatingCardsCurrentY = floatingCards.map(() => 0);

// Aparición: fundido simple ligado al scroll, sin escalado ni rebote — las
// tarjetas ya están en su posición fija final (--fc-x/--fc-y), solo su
// opacidad cambia con el scroll durante la fase en la que la esfera se
// encoge y centra (P4 a P5). Una vez visibles se quedan así.
const FLOAT_FADE_START = P4 + (P5 - P4) * 0.4;
const FLOAT_FADE_END = P5;

// Parallax por ratón: cada tarjeta se desplaza una cantidad distinta según
// su --fc-depth (más profundidad = más movimiento), en dirección OPUESTA
// al puntero (sensibilidad negativa, igual que en la demo de referencia de
// 21st.dev). El movimiento se suaviza con inercia (lerp) para que no salte.
const PARALLAX_SENSITIVITY = -1;
const PARALLAX_STRENGTH = 0.06; // multiplicador sobre el desplazamiento en píxeles del ratón
const PARALLAX_LERP_SPEED = 4; // suavizado, independiente del framerate

// Aparición de las tarjetas flotantes: una a una, no todas juntas. Empieza
// cuando la esfera está casi en su posición final (P4-P5 es la fase en la
// que se encoge y centra; arrancamos al 75% de esa transición) y las 8
// tarjetas se van repartiendo su aparición hasta el final del scroll pineado.
const CARD_STAGGER_START = P4 + (P5 - P4) * 0.25;
const CARD_STAGGER_END = 1;
const CARD_STAGGER_DURATION = 0.12; // cuánto tarda cada tarjeta en aparecer, en fracción de scroll

function updateFloatingCards(progress, delta) {
  floatingCards.forEach((card, index) => {
    const depth = parseFloat(card.style.getPropertyValue("--fc-depth")) || 1;
    const tx = parseFloat(card.style.getPropertyValue("--fc-x"));
    const ty = parseFloat(card.style.getPropertyValue("--fc-y"));
    const rot = parseFloat(card.style.getPropertyValue("--fc-rot")) || 0;

    const stagger = floatingCards.length > 1 ? index / (floatingCards.length - 1) : 0;
    const cardStart = CARD_STAGGER_START + stagger * (CARD_STAGGER_END - CARD_STAGGER_START - CARD_STAGGER_DURATION);
    const opacity = clamp((progress - cardStart) / CARD_STAGGER_DURATION, 0, 1);

    const targetX = mousePxX * PARALLAX_SENSITIVITY * depth * PARALLAX_STRENGTH;
    const targetY = mousePxY * PARALLAX_SENSITIVITY * depth * PARALLAX_STRENGTH;

    floatingCardsCurrentX[index] += (targetX - floatingCardsCurrentX[index]) * (1 - Math.exp(-PARALLAX_LERP_SPEED * delta));
    floatingCardsCurrentY[index] += (targetY - floatingCardsCurrentY[index]) * (1 - Math.exp(-PARALLAX_LERP_SPEED * delta));

    card.style.opacity = opacity;
    card.style.transform = `translate(-50%, -50%) translate(${tx}vw, ${ty}vh) translate(${floatingCardsCurrentX[index]}px, ${floatingCardsCurrentY[index]}px) scale(${opacity}) rotate(${rot}deg)`;
  });
}

function updateOutroCta(progress) {
  const opacity = clamp((progress - FLOAT_FADE_START) / (FLOAT_FADE_END - FLOAT_FADE_START), 0, 1);
  outroCtaQuestion.style.opacity = opacity;
  outroCtaLink.style.opacity = opacity;
}

let scrollProgress = 0;

const heroScrollTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "#hero-section",
    start: "top top",
    end: "+=400%",
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
  .to(".headline-word", { opacity: 0, y: -40, duration: 1, ease: "none" }, 0)
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
    ".featured-work-item",
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "none" },
    4
  )
  .to({}, { duration: 1 }, 5) // empty buffer: reserves scroll for the grid-scroll phase below
  // position 6 deliberately empty too: the grid no longer fades out by
  // opacity here — it scrolls itself off the top of the screen instead,
  // see updateFeaturedWorkScroll()'s exit phase below.
  .to({}, { duration: 1 }, 7); // final buffer: sphere finishes shrinking/centering here

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
const GRID_SCROLL_START = 5 / 8; // must match P3 above
const GRID_SCROLL_END = 6 / 8; // must match P4 above — reveal phase ends, exit phase begins
const GRID_EXIT_END = 7 / 8; // must match P5 above — grid is fully off-screen by here
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

  renderer.render(scene, camera);
  updateLeafAnchor();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

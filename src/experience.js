import * as THREE from "three";
import { ORANGE_PALETTE } from "./palette.js";
import { canvasPixelRatio } from "./viewport.js";

// ---- Experience: a timeline flown over by a paper plane -----------------------
// The section after the "Still thirsty for more?" screen, inside the black
// panel (.more, see main.js and index.html): a title, a line with one point
// per job, each job's texts, and a paper plane that flies along the line —
// the line is drawn as it goes, and a point lights up and its texts come in
// as it passes. When it is over, the plane comes back across the screen and
// opens it, from its tail, onto the next section (.ab, About me:
// src/about.js).
// There are two versions of it, over the same markup and the same jobs
// (XP_ITEMS); main.js mounts the one that goes with the screen (in a
// gsap.matchMedia() context) and takes it down when the other one's turn
// comes (destroy(): nothing of it is left):
//   - a wide screen's (createWide): the vertical scroll goes on as a move of
//     the "camera" to the RIGHT. The panel's content is a track (.more-track)
//     — the "Still thirsty" screen, then this section, side by side — slid
//     left under the panel, which stays put; the line is horizontal and the
//     plane loops around it;
//   - a phone's (createPhone): no sideways move. The track is a column —
//     that screen, then this section under it — and goes up with the scroll,
//     as a page would; the line is vertical, down the left margin, each job
//     beside its point, and the plane flies down it.
// main.js hands update() the scroll since the panel was in place (vh, already
// damped); everything follows from that one number, so it runs backwards as
// is. How much scroll each version takes is its own: scrollVh (the timeline),
// outVh (the way back) and arriveVh (the scroll at which the section is in
// place: where the nav's link lands).
//
// THE WIDE VERSION. Lengths along the track are in vw meaning 1% of the
// PANEL's width (cqw in style.css: the panel is the container), heights in
// vh; the title and the line start at the page's left margin (style.css);
// over each point what the job was, where and when, and under it a few words
// about it. When the section has just filled the screen (the camera has
// travelled 100vw) the scroll holds it there for a moment before going on.
//   EXPERIENCE_SCROLL_MULT   how long all of that scroll is, in times the two
//                       lengths under it: the higher, the slower the camera
//                       goes — and with it the plane, the points and the
//                       texts, which are all placed by the camera
//   XP_VH_PER_VW        vertical scroll that moves the camera 1vw
//   XP_ARRIVE_HOLD_VH   scroll for which the section stays as it arrives
//   XP_LINE_Y           the line's height on the screen (0 top, 1 bottom)
//   XP_FIRST_DOT_VW     where the first point is, from the section's left edge
//   XP_DOT_SPACING_VW   distance between points
//   XP_END_PAD_VW       track left after the last point
//   XP_PASS_AT          where on screen (% of its width) each point is when
//                       the plane goes through it: this is what ties the plane
//                       to the camera, and keeps it around the middle of the
//                       screen
// (track = 100 + XP_WIDTH_VW; the camera travels XP_WIDTH_VW.)
const EXPERIENCE_SCROLL_MULT = 1.6;
const XP_VH_PER_VW = 1.75 * EXPERIENCE_SCROLL_MULT;
const XP_ARRIVE_HOLD_VH = 40 * EXPERIENCE_SCROLL_MULT;
const XP_LINE_Y = 0.72;
const XP_FIRST_DOT_VW = 25;
const XP_DOT_SPACING_VW = 45;
const XP_END_PAD_VW = 50;
const XP_PASS_AT = [56, 58, 60, 64];
const XP_ITEMS = [
  {
    role: "Video Editor & Digital Content Creator",
    place: "Oniria Agency · Valencia",
    dates: "Mar 2023 – Jun 2023",
    description: "Designed and managed social media for several brands, creating visuals and editing video and photo content for posts.",
  },
  {
    role: "Graphic Designer & Video Editor",
    place: "Id Finance · Barcelona",
    dates: "Jul 2023 – Jul 2024",
    description: "Online and offline design for Id Finance, Moneyman and Plazo.es — from urban MUPIs to animated paid campaigns for Google, YouTube and Meta.",
    descriptionWidth: "37ch", // the longest: wider than the rest (--xp-desc-width) on a wide screen, to take as many lines
  },
  {
    role: "Motion & Graphic Designer",
    place: "LightSound Group · Barcelona",
    dates: "Nov 2024 – Feb 2025",
    description: "Motion and static content for screens at live events and the company showroom, from concept to final delivery.",
  },
  {
    role: "Design & Content Manager",
    place: "TMM Group · Barcelona",
    dates: "Feb 2025 – Present",
    description: "Dynamic and static content for screens and holograms, managing the full production and working directly with clients.",
  },
];
const dotX = (index) => XP_FIRST_DOT_VW + index * XP_DOT_SPACING_VW;
const XP_WIDTH_VW = dotX(XP_ITEMS.length - 1) + XP_END_PAD_VW;
// Scroll, in vh from where the track starts to move: until the section fills
// the screen, and for the whole move (hold included).
const XP_ARRIVE_VH = 100 * XP_VH_PER_VW;
const XP_SCROLL_VH = XP_WIDTH_VW * XP_VH_PER_VW + XP_ARRIVE_HOLD_VH;

// The plane's route there: a smooth curve (Catmull-Rom) that comes in from
// under the screen, goes through every point of the line and leaves past the
// right edge of the last screen; at both ends it is out of sight. Between two
// of those waypoints it goes through the entries of XP_PATH_LEGS, each [share
// of the way from one waypoint to the next, vh above the line, depth]: a
// share that goes back makes a loop, a negative height a dive.
// Depth (-1 far .. 1 near) is the third axis: it makes the plane smaller or
// bigger (XP_DEPTH_SCALE), turns it away from or towards the viewer
// (XP_DEPTH_VW) and decides which side of the timeline it is drawn on —
// BEHIND the line, the points and the texts while it is negative, in FRONT
// of them from 0 up (.xp-plane.is-behind in style.css). So the entries with
// depth 0 are where it changes side, and they are placed where it is over
// nothing: high above or far below the line, away from any text already
// shown — or right at a point it has just gone through in front, whose texts
// are then only starting to come in, so that it never flies over a
// description.
//   XP_PATH_ENTRY            where it comes in from: [vw before the first
//                            point, depth]; under the bottom edge
//   XP_PATH_EXIT             where it ends: [vh above the line, depth]; past
//                            the right edge of the last screen
//   XP_PATH_OFFSCREEN        how far outside the screen those two ends are,
//                            in plane lengths
//   XP_PATH_ENTER_CAMERA_VW  camera travel at which it starts to come in
//                            (it leaves when the camera stops)
//   XP_DOT_DEPTH             its depth as it goes through each point: behind
//                            or in front of the point and the line
const XP_PATH_ENTRY = [-25, 0.9];
const XP_PATH_EXIT = [22, 1];
const XP_PATH_OFFSCREEN = 0.8;
const XP_PATH_ENTER_CAMERA_VW = 40;
const XP_DOT_DEPTH = [-0.5, 0.5, -0.5, 0.5];
const XP_PATH_LEGS = [
  // up from under the screen, in front; over the top it goes behind
  [[0.14, -24, 0.9], [0.3, 4, 0.7], [0.46, 17, 0.3], [0.58, 19, 0], [0.8, 10, -0.4]],
  // a loop behind the first text, then up and to the front
  [[0.16, 5, -0.6], [0.34, 16, -0.8], [0.38, 28, -0.9], [0.21, 34, -1], [0.03, 28, -0.9], [-0.01, 16, -0.8], [0.06, 7, -0.7], [0.26, 9, -0.5], [0.5, 22, 0], [0.78, 12, 0.5]],
  // through the point and behind at once (its texts are only starting to
  // show), then a dive behind the description under it
  [[0.04, -1.5, 0], [0.16, -7, -0.4], [0.36, -13, -0.6], [0.5, -15, -0.6], [0.66, -12, -0.6], [0.86, -5, -0.6]],
  // up to the front, and a loop in front of the third text
  [[0.16, 5, -0.5], [0.34, 16, -0.3], [0.38, 28, 0], [0.21, 34, 0.5], [0.03, 28, 0.8], [-0.01, 16, 1], [0.06, 7, 0.9], [0.26, 9, 0.7], [0.5, 16, 0.6], [0.78, 10, 0.5]],
  // likewise: behind at once and a dip behind the last description; past it,
  // to the front and out to the right, climbing and coming closer
  [[0.03, -1.5, 0], [0.12, -6, -0.4], [0.3, -10, -0.3], [0.42, -10, 0], [0.6, 3, 0.7], [0.82, 14, 1]],
];

// The plane itself: a low-poly dart, XP_PLANE_VW long, seen at an angle
// (XP_PLANE_TILT, radians around its own length) so its wings show. It is
// filled with the web's gradient — the one of the titles (--more-gradient in
// style.css: the same colors of palette.js at the same stops,
// XP_PLANE_GRADIENT) — along its own length, from its tail to its nose, so
// the gradient goes with it however it turns. Each face is a touch lighter
// or darker than that with the way it faces (XP_PLANE_SHADE: towards the
// palette's cream, or the same color deeper; never gray), so it still reads
// as folded paper; with the titles' grain over it (XP_PLANE_GRAIN, as
// --more-grain) and thin lighter edges. It leans into its turns (XP_BANK, clamped to
// XP_BANK_MAX). Where it is and how it is turned come from the scroll alone:
// when the scroll stops, so does the plane.
const XP_PLANE_VW = 12;
// Its shape, in plane lengths: nose forward (+x), wings along z, the fold of
// the keel underneath.
const XP_PLANE_SHAPE = {
  nose: [0.62, 0, 0],
  wingLeft: [-0.38, 0.06, 0.42],
  wingRight: [-0.38, 0.06, -0.42],
  foldLeft: [-0.38, 0.06, 0.07],
  foldRight: [-0.38, 0.06, -0.07],
  keel: [-0.38, -0.2, 0],
};
const XP_PLANE_TILT = -0.95;
const XP_PLANE_GRADIENT = [
  [0, ORANGE_PALETTE.yellowOrangeLight], // the tail
  [0.25, ORANGE_PALETTE.yellowOrange],
  [0.5, ORANGE_PALETTE.orange],
  [0.78, ORANGE_PALETTE.orangeDeep],
  [1, ORANGE_PALETTE.coral], // the nose
];
const XP_PLANE_SHADE = 0.14; // how much lighter or darker a face gets, 0..1
const XP_PLANE_GRAIN = 0.28; // the strongest a pixel of grain gets, 0..1
const XP_DEPTH_SCALE = 0.22; // size change at depth +-1
const XP_DEPTH_VW = 9; // how deep "1" is, for the turn towards the viewer
const XP_BANK = 0.022;
const XP_BANK_MAX = 0.8;
const XP_SAMPLES = 960; // resolution of the route's lookup table

// The texts: when the plane goes through a point, its letters come in along
// a wave that flattens out (each letter offset and turned a little, later
// ones later). The scroll starts it, but it plays in time — XP_TEXT_SECONDS,
// or XP_TEXT_OUT_SECONDS backwards when the plane goes back past the point —
// so a text never stays half way, bent, wherever the scroll stops. The
// description under the point comes in with it, in the same time: fading in
// and settling down from XP_DESC_SHIFT_PX nearer the line.
const XP_TEXT_SECONDS = 1.1;
const XP_TEXT_OUT_SECONDS = 0.45;
const XP_TEXT_STAGGER = 1.1; // how much later the last letter starts than the first (1 = a whole run)
const XP_TEXT_WAVE_EM = 0.85;
const XP_TEXT_WAVE_DEG = 26;
const XP_TEXT_WAVE_STEP = 0.55; // phase between a letter and the next, radians
const XP_TEXT_WAVE_TURNS = 5; // how far the wave travels while a letter comes in, radians
const XP_DESC_SHIFT_PX = 20;

// After the timeline: the plane, which left on the right, comes back across
// the screen in one straight line, from beyond its top right corner to beyond
// its bottom left one, facing the way it goes and growing a little. From its
// tail the screen opens onto the next section (.ab): a wedge with straight
// sides whose tip is the plane's tail and which fans out behind it, wider and
// wider, until it is all of the screen as the plane leaves. From then on the
// scroll is that section's (src/about.js). Tied to the scroll, in vh:
//   XP_OUT_FLIGHT_VH   the flight, and the wedge with it
// The flight:
//   XP_OUT_ENTRY / _EXIT   two points of its line, on the SCREEN: [x, y] as
//                      fractions of its width and height from the top left
//                      corner. It starts and ends as far beyond them as it
//                      takes to be out of sight
//   XP_OUT_SIZE        its size at the start and at the end, in normal sizes
//                      (growing slowly at first)
//   XP_OUT_ROLL_DEG    it rocks this much to either side on the way...
//   XP_OUT_ROLL_TURNS  ...this many times
// The wedge:
//   XP_OUT_TAIL        its tip: a point of the plane, in the plane's own
//                      lengths ([along it, up, across]: the middle of its
//                      rear edge). Where that is on screen is worked out from
//                      the plane as it is drawn
//   XP_OUT_WEDGE_DEG   how wide it is open at the start and at the end
//   XP_OUT_PHOTO_ZOOM  the size of that section's picture when the wedge
//                      starts; it settles to 1 as it opens
const XP_OUT_FLIGHT_VH = 95;
const XP_OUT_ENTRY = [1, 0];
const XP_OUT_EXIT = [0, 1];
const XP_OUT_SIZE = [1.25, 2];
const XP_OUT_ROLL_DEG = 3;
const XP_OUT_ROLL_TURNS = 2;
const XP_OUT_TAIL = [XP_PLANE_SHAPE.keel[0], 0, 0];
const XP_OUT_WEDGE_DEG = [10, 190];
const XP_OUT_PHOTO_ZOOM = 1.08;

// THE PHONE'S VERSION. The section is a column as wide as the screen and as
// tall as it needs (style.css, .more.is-vertical): the title, then each job
// — its point on the line, at the left margin, and beside it what it was,
// where, when and a few words about it. The track goes up as fast as the
// scroll. The plane points down the line and stays at one height on the
// screen while the line goes by under it: before the line's start has got up
// to that height it waits on it, and comes up with it from under the screen.
// A point lights up when the plane is on it, and its job's texts come in (a
// fade, rising a little), in time, as on a wide screen.
//   XP_PHONE_PLANE_VW     the plane's length
//   XP_PHONE_PLANE_AT     the height on the screen it flies at (0 top, 1 bottom)
//   XP_PHONE_SWAY         how much it rocks as the page moves, radians...
//   XP_PHONE_SWAY_VH      ...once every this much scroll
//   XP_PHONE_AFTER_VH     how far past the last point the line goes on. Down
//                         that last stretch the plane leaves: off the bottom
//                         of the screen, to the left (XP_PHONE_LEAVE_TO, where
//                         it is heading: [x, y] in screens from the top left)
//   XP_PHONE_OUT_VH       the way back, and the wedge with it (shorter than
//                         a wide screen's: it is a shorter way)
//   XP_PHONE_TEXT_SECONDS / _OUT_SECONDS   a job's texts coming in, and going
//   XP_PHONE_TEXT_RISE_PX how far under their place they start
// Nothing of the section goes up into the nav's place: each text, each point
// and the title fade out as they get to it, and the line is cut there.
//   XP_PHONE_NAV_GAP_PX   how far under the nav that is
//   XP_PHONE_NAV_FADE_PX  the stretch of screen over which they fade
const XP_PHONE_PLANE_VW = 28;
const XP_PHONE_PLANE_AT = 0.5;
const XP_PHONE_SWAY = 0.16;
const XP_PHONE_SWAY_VH = 55;
const XP_PHONE_AFTER_VH = 26;
const XP_PHONE_LEAVE_TO = [-0.35, 1.25];
const XP_PHONE_OUT_VH = 70;
const XP_PHONE_TEXT_SECONDS = 0.7;
const XP_PHONE_TEXT_OUT_SECONDS = 0.3;
const XP_PHONE_TEXT_RISE_PX = 26;
const XP_PHONE_NAV_GAP_PX = 24;
const XP_PHONE_NAV_FADE_PX = 36;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// y(x) through the given points, never overshooting between them (monotone
// cubic, Fritsch-Carlson): the plane's place on its route as the camera moves.
function monotone(xs, ys) {
  const n = xs.length;
  const slope = [];
  for (let i = 0; i < n - 1; i++) slope.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const size = Math.hypot(a, b);
    if (size > 3) {
      tangent[i] = (3 / size) * a * slope[i];
      tangent[i + 1] = (3 / size) * b * slope[i];
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * tangent[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * tangent[i + 1];
  };
}

// One line of text as letters (inline-block, grouped by word so a word
// never breaks), appended to `parent`; returns the letters.
function splitLine(parent, className, text) {
  const line = document.createElement("span");
  line.className = className;
  line.setAttribute("aria-hidden", "true");
  const chars = [];
  text.split(" ").forEach((word, index) => {
    if (index) line.append(" ");
    const wordEl = document.createElement("span");
    wordEl.className = "xp-word";
    for (const letter of word) {
      const char = document.createElement("span");
      char.className = "xp-char";
      char.textContent = letter;
      wordEl.appendChild(char);
      chars.push(char);
    }
    line.appendChild(wordEl);
  });
  parent.appendChild(line);
  return chars;
}

// The jobs, as items of `list` (.xp-items): each a point, what it was (in
// letters: a wide screen brings them in one by one) and a few words about it.
function buildItems(list) {
  return XP_ITEMS.map((item) => {
    const el = document.createElement("li");
    el.className = "xp-item";
    const dot = document.createElement("span");
    dot.className = "xp-dot";
    const text = document.createElement("p");
    text.className = "xp-text";
    text.setAttribute("aria-label", `${item.role}. ${item.place}. ${item.dates}`);
    const chars = [
      ...splitLine(text, "xp-role", item.role),
      ...splitLine(text, "xp-place", item.place),
      ...splitLine(text, "xp-dates", item.dates),
    ];
    const desc = document.createElement("p");
    desc.className = "xp-desc";
    desc.textContent = item.description;
    if (item.descriptionWidth) desc.style.setProperty("--xp-desc-wide", item.descriptionWidth);
    el.append(dot, text, desc);
    list.appendChild(el);
    return { el, dot, text, chars, desc, shown: 0, target: 0 };
  });
}

// -- the plane ------------------------------------------------------------------------
// Its own small scene and renderer on `canvas` (.xp-plane): made once, the
// first time a version of the section needs it, and kept from then on (a
// canvas has one WebGL context: whichever version is mounted draws with it).
// World units are px: size() says how big the canvas is and how far down it
// y = 0 is (`top`: y goes up from there).
const planes = new WeakMap();
function planeOf(canvas) {
  if (planes.has(canvas)) return planes.get(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, -1, 0.1, 4000);
  camera.position.z = 2000;

  const { nose, wingLeft, wingRight, foldLeft, foldRight, keel } = XP_PLANE_SHAPE;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [nose, wingLeft, foldLeft, nose, foldRight, wingRight, nose, foldLeft, keel, nose, keel, foldRight].flat(),
      3
    )
  );
  const color = (hex) => ({ value: new THREE.Color(hex).convertLinearToSRGB() }); // the shader writes sRGB as is
  const body = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      polygonOffset: true, // behind its own edges
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      uniforms: {
        uColors: { value: XP_PLANE_GRADIENT.map(([, hex]) => color(hex).value) },
        uStops: { value: XP_PLANE_GRADIENT.map(([at]) => at) },
        uCream: color(ORANGE_PALETTE.cream),
        uTail: { value: keel[0] },
        uNose: { value: nose[0] },
        uShade: { value: XP_PLANE_SHADE },
        uGrain: { value: XP_PLANE_GRAIN },
      },
      vertexShader: `
        varying vec3 vView;
        varying float vAlong;
        void main() {
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          vView = view.xyz;
          vAlong = position.x; // along its own length
          gl_Position = projectionMatrix * view;
        }`,
      // The gradient by where the point is along the plane; then the face's
      // own shade, flat, from its normal (screen-space derivatives) against
      // a light up and to the left; then grain, one value per pixel.
      fragmentShader: `
        uniform vec3 uColors[${XP_PLANE_GRADIENT.length}];
        uniform float uStops[${XP_PLANE_GRADIENT.length}];
        uniform vec3 uCream;
        uniform float uTail;
        uniform float uNose;
        uniform float uShade;
        uniform float uGrain;
        varying vec3 vView;
        varying float vAlong;
        float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * 0.1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
        }
        void main() {
          float along = clamp((vAlong - uTail) / (uNose - uTail), 0.0, 1.0);
          vec3 color = uColors[0];
          for (int i = 1; i < ${XP_PLANE_GRADIENT.length}; i++) {
            color = mix(color, uColors[i], clamp((along - uStops[i - 1]) / (uStops[i] - uStops[i - 1]), 0.0, 1.0));
          }
          vec3 normal = normalize(cross(dFdx(vView), dFdy(vView)));
          float lit = dot(normal, normalize(vec3(-0.35, 0.75, 0.56)));
          color = lit > 0.0 ? mix(color, uCream, lit * uShade * 2.0) : color * (1.0 + lit * uShade);
          vec2 cell = floor(gl_FragCoord.xy);
          float grain = hash12(cell) + hash12(cell + 17.0) - 1.0; // -1..1, mostly near 0
          color = mix(color, vec3(step(0.0, grain)), abs(grain) * uGrain);
          gl_FragColor = vec4(color, 1.0);
        }`,
    })
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 1),
    new THREE.LineBasicMaterial({ color: ORANGE_PALETTE.cream, transparent: true, opacity: 0.9 })
  );
  const plane = new THREE.Group();
  plane.rotation.order = "ZYX"; // roll around its length first, then the turn in depth, then the climb
  plane.add(body, edges);
  scene.add(plane);
  renderer.compile(scene, camera);

  let drawn = false; // there is something on the canvas
  const kit = {
    plane,
    size(width, height, top) {
      renderer.setPixelRatio(canvasPixelRatio());
      renderer.setSize(width, height, false);
      camera.right = width;
      camera.top = top;
      camera.bottom = top - height;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
      drawn = true;
    },
    clear() {
      if (!drawn) return;
      renderer.clear();
      drawn = false;
    },
  };
  planes.set(canvas, kit);
  return kit;
}

// -- the way back -----------------------------------------------------------------------
// Its line on a screen `width` x `height` px whose top edge is `top` px over
// y = 0, for a plane `planeSize` px long. Distances along it are px from the
// entry point; the plane's middle starts where its nose is still out of sight
// and ends where its tail is.
function returnLine(width, height, top, planeSize) {
  const entry = new THREE.Vector3(XP_OUT_ENTRY[0] * width, top - XP_OUT_ENTRY[1] * height, 0);
  const heading = new THREE.Vector3(XP_OUT_EXIT[0] * width, top - XP_OUT_EXIT[1] * height, 0).sub(entry).normalize();
  const reach = [0, width].flatMap((x) => [top, top - height].map((y) => (x - entry.x) * heading.x + (y - entry.y) * heading.y));
  const start = Math.min(...reach) - planeSize * XP_OUT_SIZE[0] * (XP_PLANE_SHAPE.nose[0] + 0.5);
  const end = Math.max(...reach) + planeSize * XP_OUT_SIZE[1] * (0.5 - XP_OUT_TAIL[0]);
  return { entry, heading, start, travel: end - start, turn: Math.atan2(-heading.y, -heading.x), far: Math.hypot(width, height) * 4, top, planeSize };
}
// One frame of it, `torn` (0..1) of the way: the plane, and `photo` (the next
// section) cut to the wedge that opens from its tail.
const returnPoint = new THREE.Vector3();
const returnTail = new THREE.Vector3();
function drawReturn(kit, back, torn, photo) {
  const { plane } = kit;
  const { entry, heading, start, travel, turn, far, top, planeSize } = back;
  // On the one line, growing; as on its way out but turned round (half a
  // turn in depth), pointing along the line; only rocking a little.
  const size = planeSize * (XP_OUT_SIZE[0] + (XP_OUT_SIZE[1] - XP_OUT_SIZE[0]) * torn * torn);
  returnPoint.copy(entry).addScaledVector(heading, start + travel * torn);
  const rock = Math.sin(torn * XP_OUT_ROLL_TURNS * Math.PI * 2) * THREE.MathUtils.degToRad(XP_OUT_ROLL_DEG);
  plane.rotation.set(-XP_PLANE_TILT + rock, Math.PI, turn);
  plane.position.set(returnPoint.x, returnPoint.y, 0);
  plane.scale.setScalar(size);
  kit.render();

  // The wedge: its tip where the plane's tail is on screen, open towards
  // where the plane came from. Its far side is a few corners well outside
  // the screen, so all that shows of it is its two straight sides.
  returnTail.set(...XP_OUT_TAIL).applyEuler(plane.rotation).multiplyScalar(size).add(plane.position);
  const open = THREE.MathUtils.degToRad(XP_OUT_WEDGE_DEG[0] + (XP_OUT_WEDGE_DEG[1] - XP_OUT_WEDGE_DEG[0]) * torn);
  const from = Math.atan2(-heading.y, -heading.x) - open / 2;
  const steps = Math.ceil(open / (Math.PI / 4));
  const corners = [[returnTail.x, returnTail.y]];
  for (let step = 0; step <= steps; step++) {
    const angle = from + (open * step) / steps;
    corners.push([returnTail.x + Math.cos(angle) * far, returnTail.y + Math.sin(angle) * far]);
  }
  photo.style.clipPath = `polygon(${corners.map(([x, y]) => `${x.toFixed(1)}px ${(top - y).toFixed(1)}px`).join(",")})`; // the screen's y goes down
}

// `panel`: the black panel (.more). `mode`: which version of the section —
// "wide", "phone", or "static" (prefers-reduced-motion: no move at all; the
// section is taken out of the panel and laid out as a plain vertical timeline
// after the projects, .xp.is-static, with the plane still). What comes back:
//   update(vh)   the scroll since the panel was in place
//   layout()     the window has changed size (main.js calls it, before it
//                measures the page again: scrollVh may have changed)
//   destroy()    takes it down, leaving the markup as it found it
//   scrollVh, outVh, arriveVh   the scroll it takes (see the top of the file)
export function createExperience(panel, mode) {
  if (mode === "static") return createStatic(panel);
  return mode === "phone" ? createPhone(panel) : createWide(panel);
}

function createStatic(panel) {
  const section = panel.querySelector(".xp");
  const canvas = panel.querySelector(".xp-plane");
  const photo = panel.querySelector(".ab");
  const items = buildItems(section.querySelector(".xp-items"));
  // A plain section after the projects: everything shown, nothing moving.
  section.classList.add("is-static", "grain");
  section.append(canvas);
  document.querySelector("#experience").remove(); // the horizontal version's anchor
  section.id = "experience";
  document.querySelector("#projects").after(section);
  photo.classList.add("is-static");
  document.querySelector("#about").remove(); // likewise
  photo.id = "about";
  section.after(photo);
  items.forEach((item) => item.el.classList.add("is-on"));
  const kit = planeOf(canvas);
  const layout = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    kit.size(width, height, height * XP_LINE_Y);
    kit.plane.position.set(width / 2, height * (XP_LINE_Y - 0.5), 0); // the middle of its canvas
    kit.plane.scale.setScalar(width * 0.7);
    kit.plane.rotation.set(XP_PLANE_TILT, -0.25, 0.12);
    kit.render();
  };
  layout();
  return { update() {}, layout, destroy() {}, scrollVh: 0, outVh: 0, arriveVh: 0 };
}

// ---- the wide screen's --------------------------------------------------------------
function createWide(panel) {
  const track = panel.querySelector(".more-track");
  const section = panel.querySelector(".xp");
  const line = section.querySelector(".xp-line");
  const canvas = panel.querySelector(".xp-plane");
  const photo = panel.querySelector(".ab"); // the next section, which the way back opens...
  const picture = photo.querySelector(".ab-photo img"); // ...and its picture

  panel.style.setProperty("--xp-width", `${XP_WIDTH_VW}cqw`);
  panel.style.setProperty("--xp-line-y", `${XP_LINE_Y * 100}%`);
  const items = buildItems(section.querySelector(".xp-items"));
  items.forEach((item, index) => item.el.style.setProperty("--xp-x", `${dotX(index)}cqw`));

  // The plane: made (and its shaders compiled) while the browser has nothing
  // to do, so that does not cost a frame when it comes in.
  let kit = null;
  let width = 0; // of what the plane is drawn on, CSS px
  let height = 0;
  function readyPlane() {
    if (kit || dead) return;
    kit = planeOf(canvas);
    kit.size(width, height, height * XP_LINE_Y);
  }

  // -- the route -----------------------------------------------------------------
  // Everything about it is worked out here, once per size: the curve, where
  // along it each point of the line is, and a table of position / direction /
  // lean every 1/XP_SAMPLES of its length.
  let unit = 1; // px per vw (1% of the panel's width)
  let planeSize = 1; // px
  let flight = null;
  function buildFlight() {
    width = panel.clientWidth;
    height = panel.clientHeight;
    unit = width / 100;
    planeSize = XP_PLANE_VW * unit;
    const vh = height / 100;
    const dots = items.map((_, index) => dotX(index));
    // [vw, px above the line, depth]. The two ends are out of the picture
    // whatever its shape: under the bottom edge, and past the right edge of
    // what the camera shows when it stops.
    const outside = XP_PATH_OFFSCREEN * planeSize;
    const waypoints = [
      [dots[0] + XP_PATH_ENTRY[0], -height * (1 - XP_LINE_Y) - outside, XP_PATH_ENTRY[1]],
      ...dots.map((x, index) => [x, 0, XP_DOT_DEPTH[index]]),
      [XP_WIDTH_VW + outside / unit, XP_PATH_EXIT[0] * vh, XP_PATH_EXIT[1]],
    ];
    const points = [];
    const waypointAt = []; // index of each waypoint among the curve's points
    waypoints.forEach((waypoint, index) => {
      waypointAt.push(points.length);
      points.push(waypoint);
      const next = waypoints[index + 1];
      if (next) XP_PATH_LEGS[index].forEach(([share, y, z]) => points.push([waypoint[0] + (next[0] - waypoint[0]) * share, y * vh, z]));
    });
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, y, z]) => new THREE.Vector3(x * unit, y, z * XP_DEPTH_VW * unit)),
      false,
      "centripetal"
    );
    const PER_SEGMENT = 24;
    const lengths = curve.getLengths((points.length - 1) * PER_SEGMENT);
    const along = waypointAt.map((index) => lengths[index * PER_SEGMENT] / lengths[lengths.length - 1]); // 0..1 of the route

    const table = { x: [], y: [], depth: [], pitch: [], yaw: [], bank: [], head: [] };
    const point = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    for (let i = 0; i <= XP_SAMPLES; i++) {
      curve.getPointAt(i / XP_SAMPLES, point);
      curve.getTangentAt(i / XP_SAMPLES, tangent);
      table.x.push(point.x);
      table.y.push(point.y);
      table.depth.push(point.z / (XP_DEPTH_VW * unit));
      // the climb angle, kept continuous so a loop is a full turn and not a flip
      let pitch = Math.atan2(tangent.y, tangent.x);
      if (i) pitch += Math.round((table.pitch[i - 1] - pitch) / (Math.PI * 2)) * Math.PI * 2;
      table.pitch.push(pitch);
      table.yaw.push(Math.atan2(tangent.z, Math.hypot(tangent.x, tangent.y)));
      table.head.push(i ? Math.max(table.head[i - 1], point.x) : point.x); // the furthest right it has been
    }
    for (let i = 0; i <= XP_SAMPLES; i++) {
      const turn = (table.pitch[Math.min(i + 3, XP_SAMPLES)] - table.pitch[Math.max(i - 3, 0)]) * (XP_SAMPLES / 6);
      table.bank.push(clamp(turn * XP_BANK, -XP_BANK_MAX, XP_BANK_MAX));
    }

    // Camera positions (vw travelled) at which the plane is at each waypoint:
    // still out of sight until XP_PATH_ENTER_CAMERA_VW, then through every
    // point when that point is at its XP_PASS_AT, and gone when the camera
    // stops.
    const cameraAt = [XP_PATH_ENTER_CAMERA_VW, ...dots.map((x, index) => 100 + x - XP_PASS_AT[index]), XP_WIDTH_VW];

    flight = { table, along, cameraAt, alongAt: monotone(cameraAt, along), lineStart: line.offsetLeft, lineEnd: XP_WIDTH_VW * unit, back: returnLine(width, height, height * XP_LINE_Y, planeSize) };
  }
  const sample = (values, at) => {
    const f = clamp(at, 0, 1) * XP_SAMPLES;
    const i = Math.min(Math.floor(f), XP_SAMPLES - 1);
    return values[i] + (values[i + 1] - values[i]) * (f - i);
  };

  // -- the plane's two flights --------------------------------------------------------
  // Both are drawn straight from update(), in the frame the scroll moves the
  // camera: nothing about the plane runs on its own.
  let scrolled = 0; // vh, what update() was last given
  let out = 0; // vh scrolled after it, 0..XP_OUT_FLIGHT_VH
  let cameraVw = 0;
  let at = 0; // the plane's place on its route, 0..1
  let behind = false; // which side of the timeline the canvas is on
  let torn = 0; // how far along its way back the plane is: how open the picture, 0..1
  let dead = false; // taken down
  // On its route and not at either end of it, where it is out of sight. (The
  // scroll can stop a rounding error short of the end.)
  const flying = () => at > 0 && at < 1 - 1e-6;
  // On its way back, opening the picture.
  const returning = () => torn > 0 && torn < 1;
  // Its one canvas goes under or over the track with it, in the same frame it
  // is drawn.
  function setBehind(value) {
    if (value === behind) return;
    behind = value;
    canvas.classList.toggle("is-behind", behind);
  }
  // Over the timeline: where its route says for where the camera is.
  function drawFlight() {
    if (!flying()) {
      if (!returning() && kit) kit.clear();
      return;
    }
    readyPlane();
    const { table } = flight;
    const depth = sample(table.depth, at);
    setBehind(depth < 0);
    const left = (100 - cameraVw) * unit; // the section's left edge on screen
    kit.plane.position.set(left + sample(table.x, at), sample(table.y, at), 0);
    kit.plane.scale.setScalar(planeSize * (1 + depth * XP_DEPTH_SCALE));
    kit.plane.rotation.set(XP_PLANE_TILT + sample(table.bank, at), -sample(table.yaw, at), sample(table.pitch, at));
    kit.render();
  }
  // The way back: the plane and the wedge that opens from its tail, in the
  // same frame.
  function drawBack() {
    if (!returning()) {
      if (!flying() && kit) kit.clear();
      photo.style.clipPath = "none"; // all of it (and out of sight before the flight: .is-on)
      return;
    }
    readyPlane();
    setBehind(false);
    drawReturn(kit, flight.back, torn, photo);
  }

  // -- the texts -------------------------------------------------------------------
  function drawText(item) {
    const count = item.chars.length;
    item.chars.forEach((char, i) => {
      // each letter's own run, 0..1, the later the further along the text
      const run = clamp(item.shown * (1 + XP_TEXT_STAGGER) - (i / count) * XP_TEXT_STAGGER, 0, 1);
      const left = (1 - run) ** 3; // what is left of the wave for it
      const phase = i * XP_TEXT_WAVE_STEP - run * XP_TEXT_WAVE_TURNS;
      char.style.opacity = clamp(run * 2.5, 0, 1);
      char.style.transform = left
        ? `translateY(${(left * XP_TEXT_WAVE_EM * Math.sin(phase)).toFixed(3)}em) rotate(${(left * XP_TEXT_WAVE_DEG * Math.cos(phase)).toFixed(2)}deg)`
        : "none";
    });
    const settled = 1 - (1 - item.shown) ** 3;
    item.desc.style.opacity = settled.toFixed(3);
    item.desc.style.transform = `translate3d(-50%, ${((settled - 1) * XP_DESC_SHIFT_PX).toFixed(2)}px, 0)`;
  }
  let textsRunning = false;
  let textsAt = 0; // time of their last frame
  function tickTexts(now) {
    const delta = Math.min((now - textsAt) / 1000, 0.05);
    textsAt = now;
    textsRunning = false;
    for (const item of items) {
      if (item.shown === item.target) continue;
      item.shown = item.target ? Math.min(1, item.shown + delta / XP_TEXT_SECONDS) : Math.max(0, item.shown - delta / XP_TEXT_OUT_SECONDS);
      drawText(item);
      if (item.shown !== item.target) textsRunning = true;
    }
    if (textsRunning && !dead) requestAnimationFrame(tickTexts);
  }

  function layout() {
    buildFlight();
    if (kit) kit.size(width, height, height * XP_LINE_Y);
    update(scrolled, true);
  }

  // `vh`: the scroll since the panel was in place, 0..XP_SCROLL_VH + XP_OUT_FLIGHT_VH.
  function update(vh, force) {
    if (vh === scrolled && !force) return;
    scrolled = vh;
    out = clamp(vh - XP_SCROLL_VH, 0, XP_OUT_FLIGHT_VH);
    // The camera: to where the section fills the screen, a hold there, and on.
    const moved = clamp(vh, 0, XP_SCROLL_VH);
    cameraVw = moved <= XP_ARRIVE_VH ? moved / XP_VH_PER_VW : 100 + Math.max(0, moved - XP_ARRIVE_VH - XP_ARRIVE_HOLD_VH) / XP_VH_PER_VW;
    track.style.transform = `translate3d(${(-cameraVw * unit).toFixed(2)}px, 0, 0)`;

    at = flight.alongAt(cameraVw);
    // The line is drawn up to the furthest right the plane has been.
    const head = sample(flight.table.head, at);
    line.style.transform = `scaleX(${clamp((head - flight.lineStart) / (flight.lineEnd - flight.lineStart), 0, 1).toFixed(5)})`;

    items.forEach((item, index) => {
      item.el.classList.toggle("is-on", at >= flight.along[index + 1] - 1e-6);
      item.target = cameraVw >= flight.cameraAt[index + 1] ? 1 : 0;
      if (item.shown !== item.target && !textsRunning) {
        textsRunning = true;
        textsAt = performance.now();
        requestAnimationFrame(tickTexts);
      }
    });

    // The way back: the picture loaded and decoded as soon as it starts, and
    // as open as the plane has got.
    if (out > 0 && picture.loading === "lazy") {
      picture.loading = "eager";
      picture.decode().catch(() => {});
    }
    const flown = clamp(out / XP_OUT_FLIGHT_VH, 0, 1);
    if (flown !== torn || force) {
      torn = flown;
      photo.classList.toggle("is-on", torn > 0);
      track.style.visibility = torn === 1 ? "hidden" : "visible"; // under that section, which later goes away upwards: only the panel's black is left
      picture.style.transform = `scale(${(XP_OUT_PHOTO_ZOOM + (1 - XP_OUT_PHOTO_ZOOM) * torn).toFixed(4)})`;
      drawBack();
    }
    drawFlight();
  }

  layout();
  const idle = window.requestIdleCallback ? window.requestIdleCallback(readyPlane, { timeout: 3000 }) : setTimeout(readyPlane, 1500); // (Safari has no idle callback)
  function destroy() {
    dead = true;
    if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
    else clearTimeout(idle);
    if (kit) kit.clear();
    canvas.classList.remove("is-behind");
    items.forEach((item) => item.el.remove());
    track.style.transform = track.style.visibility = line.style.transform = "";
    photo.style.clipPath = picture.style.transform = "";
    photo.classList.remove("is-on");
    panel.style.removeProperty("--xp-width");
    panel.style.removeProperty("--xp-line-y");
  }
  return { update, layout, destroy, scrollVh: XP_SCROLL_VH, outVh: XP_OUT_FLIGHT_VH, arriveVh: XP_ARRIVE_VH };
}

// ---- the phone's --------------------------------------------------------------------
function createPhone(panel) {
  const track = panel.querySelector(".more-track");
  const section = panel.querySelector(".xp");
  const label = section.querySelector(".more-label");
  const title = section.querySelector(".xp-title");
  const line = section.querySelector(".xp-line");
  const canvas = panel.querySelector(".xp-plane");
  const photo = panel.querySelector(".ab");
  const picture = photo.querySelector(".ab-photo img");

  panel.classList.add("is-vertical"); // the column, and everything in it (style.css)
  const items = buildItems(section.querySelector(".xp-items"));

  // The plane's canvas only works while the section is on screen.
  let kit = null;
  let onScreen = false;
  const watcher = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    update(scrolled, true);
  });
  watcher.observe(section);

  // -- sizes: worked out here, once per size of the screen ------------------------
  // (px; down the section from its top edge unless it says otherwise)
  let width = 0;
  let height = 0; // the panel's: a screen
  let planeSize = 0;
  let lineX = 0; // the line, from the screen's left edge
  let lineTop = 0; // where it starts...
  let lineEnd = 0; // ...and where it ends: where the plane has gone
  let dots = []; // the middle of each point
  let lastDot = 0;
  let safe = 0; // down the SCREEN: nothing is shown over this (the nav's place)
  let fading = []; // what fades out as it gets there: { el, top (down the section), item (its job, if it is one of a job's texts) }
  let back = null; // the way back's line
  const self = { update, layout, destroy, scrollVh: 0, outVh: XP_PHONE_OUT_VH, arriveVh: 100 };
  function measure() {
    width = panel.clientWidth;
    height = panel.clientHeight;
    planeSize = (XP_PHONE_PLANE_VW / 100) * width;
    dots = items.map((item) => item.el.offsetTop + item.dot.offsetTop + item.dot.offsetHeight / 2);
    lastDot = dots[dots.length - 1];
    lineTop = title.offsetTop + title.offsetHeight;
    lineEnd = lastDot + (XP_PHONE_AFTER_VH / 100) * height;
    line.style.top = `${lineTop}px`;
    line.style.height = `${lineEnd - lineTop}px`;
    lineX = line.offsetLeft + line.offsetWidth / 2;
    safe = document.querySelector("#site-nav").getBoundingClientRect().bottom + XP_PHONE_NAV_GAP_PX;
    fading = [
      { el: label, top: label.offsetTop },
      { el: title, top: title.offsetTop },
      ...items.flatMap((item) => [
        { el: item.dot, top: item.el.offsetTop + item.dot.offsetTop },
        { el: item.text, top: item.el.offsetTop + item.text.offsetTop, item },
        { el: item.desc, top: item.el.offsetTop + item.desc.offsetTop, item },
      ]),
    ];
    back = returnLine(width, height, 0, planeSize);
    // The track goes up, a px for a px of scroll, until the plane (which
    // stays at its height on the screen) is at the end of the line: from the
    // section's top edge at the bottom of the screen to that.
    self.scrollVh = ((height - height * XP_PHONE_PLANE_AT + lineEnd) / height) * 100;
    if (kit) kit.size(width, height, 0);
  }

  // -- the plane --------------------------------------------------------------------
  let scrolled = 0; // vh, what update() was last given
  let torn = 0; // how far along its way back the plane is, 0..1
  let dead = false; // taken down
  const returning = () => torn > 0 && torn < 1;
  function readyPlane() {
    if (kit) return;
    kit = planeOf(canvas);
    kit.size(width, height, 0);
  }
  // On the line: `top` px down the screen is where the section's top edge
  // is; `down` px down the section is where the plane is on it.
  function drawFlight(top, down) {
    const y = top + down; // on the screen
    if (returning() || !onScreen || y > height + planeSize) {
      if (!returning() && kit) kit.clear();
      return;
    }
    readyPlane();
    // Past the last point it leaves: from the line to out of the screen, down
    // and to the left, faster and faster, turning to where it goes.
    const leaving = clamp((down - lastDot) / (lineEnd - lastDot), 0, 1) ** 2;
    const toX = XP_PHONE_LEAVE_TO[0] * width;
    const toY = XP_PHONE_LEAVE_TO[1] * height;
    const x = lineX + (toX - lineX) * leaving;
    const screenY = y + (toY - y) * leaving;
    const heading = -Math.PI / 2 - Math.atan2(lineX - toX, toY - y) * Math.min(leaving * 4, 1);
    const sway = Math.sin((down / height) * (100 / XP_PHONE_SWAY_VH) * Math.PI * 2) * XP_PHONE_SWAY;
    kit.plane.position.set(x, -screenY, 0);
    kit.plane.scale.setScalar(planeSize);
    kit.plane.rotation.set(XP_PLANE_TILT + sway, 0, heading);
    kit.render();
    if (screenY > height + planeSize) kit.clear(); // (gone)
  }

  // -- the texts ---------------------------------------------------------------------
  // A job's two texts: as far in as the job is (item.shown), each as much
  // there as the nav's place lets it be (its own .clear, 0..1: drawClear).
  function drawText(item) {
    const settled = 1 - (1 - item.shown) ** 3;
    for (const el of [item.text, item.desc]) {
      el.style.opacity = (settled * (el.clear ?? 1)).toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - settled) * XP_PHONE_TEXT_RISE_PX).toFixed(2)}px, 0)`;
    }
  }
  // What has got up to the nav's place fades out; the line is cut there.
  // `top`: the section's top edge, px down the screen; `drawn`: how much of
  // the line is drawn (its scale: what cuts it is scaled with it).
  function drawClear(top, drawn) {
    for (const { el, top: at, item } of fading) {
      const clear = clamp((top + at - safe) / XP_PHONE_NAV_FADE_PX, 0, 1);
      if (clear === el.clear) continue;
      el.clear = clear;
      if (item) drawText(item);
      else el.style.opacity = clear.toFixed(3);
    }
    line.style.clipPath = `inset(${(Math.max(0, safe - top - lineTop) / Math.max(drawn, 1e-4)).toFixed(1)}px 0 0 0)`;
  }
  let textsRunning = false;
  let textsAt = 0; // time of their last frame
  function tickTexts(now) {
    const delta = Math.min((now - textsAt) / 1000, 0.05);
    textsAt = now;
    textsRunning = false;
    for (const item of items) {
      if (item.shown === item.target) continue;
      item.shown = item.target ? Math.min(1, item.shown + delta / XP_PHONE_TEXT_SECONDS) : Math.max(0, item.shown - delta / XP_PHONE_TEXT_OUT_SECONDS);
      drawText(item);
      if (item.shown !== item.target) textsRunning = true;
    }
    if (textsRunning && !dead) requestAnimationFrame(tickTexts);
  }

  function layout() {
    measure();
    update(scrolled, true);
  }

  // `vh`: the scroll since the panel was in place, 0..scrollVh + XP_PHONE_OUT_VH.
  function update(vh, force) {
    if (dead || (vh === scrolled && !force)) return;
    scrolled = vh;
    const moved = (clamp(vh, 0, self.scrollVh) / 100) * height; // px the track has gone up
    track.style.transform = `translate3d(0, ${(-moved).toFixed(2)}px, 0)`;
    const top = height - moved; // the section's top edge, on the screen
    // The plane: at its height on the screen, or on the line's start while
    // that is still under it.
    const down = Math.max(height * XP_PHONE_PLANE_AT - top, lineTop);
    const drawn = clamp((down - lineTop) / (lineEnd - lineTop), 0, 1);
    line.style.transform = `scaleY(${drawn.toFixed(5)})`;
    drawClear(top, drawn);
    items.forEach((item, index) => {
      const passed = down >= dots[index] - 0.5;
      item.el.classList.toggle("is-on", passed);
      item.target = passed ? 1 : 0;
      if (item.shown !== item.target && !textsRunning) {
        textsRunning = true;
        textsAt = performance.now();
        requestAnimationFrame(tickTexts);
      }
    });

    // The way back, as a wide screen's.
    const out = clamp(vh - self.scrollVh, 0, XP_PHONE_OUT_VH);
    if (out > 0 && picture.loading === "lazy") {
      picture.loading = "eager";
      picture.decode().catch(() => {});
    }
    const flown = out / XP_PHONE_OUT_VH;
    if (flown !== torn || force) {
      torn = flown;
      photo.classList.toggle("is-on", torn > 0);
      track.style.visibility = torn === 1 ? "hidden" : "visible";
      picture.style.transform = `scale(${(XP_OUT_PHOTO_ZOOM + (1 - XP_OUT_PHOTO_ZOOM) * torn).toFixed(4)})`;
      if (returning()) {
        readyPlane();
        drawReturn(kit, back, torn, photo);
      } else photo.style.clipPath = "none";
    }
    drawFlight(top, down);
  }

  function destroy() {
    dead = true;
    watcher.disconnect();
    if (kit) kit.clear();
    panel.classList.remove("is-vertical");
    items.forEach((item) => item.el.remove());
    track.style.transform = track.style.visibility = "";
    line.style.transform = line.style.top = line.style.height = line.style.clipPath = "";
    label.style.opacity = title.style.opacity = "";
    photo.style.clipPath = picture.style.transform = "";
    photo.classList.remove("is-on");
  }
  measure();
  update(0, true);
  return self;
}

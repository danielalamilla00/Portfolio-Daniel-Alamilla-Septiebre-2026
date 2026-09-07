uniform float uTime;
uniform float uCursorInfluence;
uniform vec3 uCursorPoint;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vNoise;

// --- Simplex 3D noise (Ashima Arts / Ian McEwan) ---
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Three low-frequency noise layers, each traveling across the sphere in its
// own direction and at its own speed, so several wide lobes sweep the whole
// silhouette at once instead of one bump breathing in place.
const float FREQ_1 = 0.6;
const float FREQ_2 = 1.1;
const float FREQ_3 = 1.7;

const vec3 FLOW_DIR_1 = vec3(1.0, 0.25, -0.1);
const vec3 FLOW_DIR_2 = vec3(-0.2, 1.0, 0.35);
const vec3 FLOW_DIR_3 = vec3(0.7, -0.6, 0.55);

const float WEIGHT_1 = 0.5;
const float WEIGHT_2 = 0.3;
const float WEIGHT_3 = 0.2;

float travelingWaves(vec3 n, float flowTime) {
  vec3 c1 = n * FREQ_1 + FLOW_DIR_1 * flowTime;
  vec3 c2 = n * FREQ_2 + FLOW_DIR_2 * flowTime;
  vec3 c3 = n * FREQ_3 + FLOW_DIR_3 * flowTime;

  return snoise(c1) * WEIGHT_1 + snoise(c2) * WEIGHT_2 + snoise(c3) * WEIGHT_3;
}

// Always-on ambient motion: the surface never sits still, but the outline
// stays close to a sphere with only subtle motion. Note this only scales
// the vertex displacement — the color flow (which reads the same noise
// value directly in the fragment shader) keeps its own pace via FLOW_SPEED.
const float AMBIENT_AMPLITUDE = 0.055;
const float FLOW_SPEED = 0.14;

// Displacing along the normal reads mostly as depth change where a point
// faces the camera, but almost entirely as visible silhouette movement at
// grazing angles — so boosting amplitude there (edgeFactor near 1) makes
// the outline noticeably livelier without over-animating the front face.
const float EDGE_BOOST_STRENGTH = 0.9;

// Local dent that follows the raycasted cursor point, like a finger
// pressing into gelatin. Radius/depth are in object-space units (sphere
// radius is 1) and large enough to visibly break the outer silhouette,
// not just texture the surface locally.
// This is a pure inward press, so it can only recede the silhouette where
// its influence actually reaches the grazing edge: on a unit sphere, the
// chord distance from a front-facing point to the visible rim is ~1.4, so
// the radius has to be large enough to reach past that, not just a small
// local patch, for the whole outline to visibly react.
const float CURSOR_RADIUS = 1.3;
const float CURSOR_DEPTH = 0.5;

// A dedicated noise field breaks the dent's edge (and its inner depth) out
// of a perfectly round hole, and keeps animating with uTime so the pressed
// area keeps bubbling even while the cursor holds still. Frequencies are
// kept low (matching the ambient waves) so the finite-difference normal
// recalculation below can still resolve them smoothly instead of faceting.
const float DENT_EDGE_FREQUENCY = 1.8;
const float DENT_EDGE_SPEED = 0.4;
const float DENT_EDGE_VARIATION = 0.35;
const float DENT_DEPTH_FREQUENCY = 1.5;
const float DENT_DEPTH_SPEED = 0.3;

// A small, fixed, smooth dimple at the sphere's +Y pole — where the leaves
// (see main.js's leafAnchorDirection) visually meet the skin, so it reads
// as the surface pinching in slightly right where they attach. Always on,
// not noise-driven — deliberately simple, unlike the fuller calyx-scar
// dimple this project has had before.
const vec3 POLE = vec3(0.0, 1.0, 0.0);
const float LEAF_DIMPLE_RADIUS = 0.32;
const float LEAF_DIMPLE_DEPTH = 0.09;

// Displaces a point on the unit sphere outward along its own normal by an
// amount driven by the flowing noise field, then presses it back inward
// near the cursor point with an irregular, animated dent, and carves the
// small fixed leaf-attachment dimple at the pole.
vec3 displace(vec3 localPosition, float flowTime, float ambientMultiplier) {
  vec3 n = normalize(localPosition);

  float ambientNoise = travelingWaves(n, flowTime);
  vec3 displaced = localPosition + n * ambientNoise * AMBIENT_AMPLITUDE * ambientMultiplier;

  float distToCursor = length(localPosition - uCursorPoint);

  // Perturb the influence radius per-vertex so the dent's boundary reads as
  // an irregular, organic edge instead of a clean circle.
  float edgeNoise = snoise(localPosition * DENT_EDGE_FREQUENCY + vec3(uTime * DENT_EDGE_SPEED));
  float dentRadius = CURSOR_RADIUS * (1.0 + edgeNoise * DENT_EDGE_VARIATION);
  float cursorFalloff = 1.0 - smoothstep(0.0, max(dentRadius, 0.05), distToCursor);

  // A second, gentler noise layer breaks up the depth inside the dent so
  // it isn't a flat-bottomed bowl, and keeps shifting over time.
  float depthNoise = snoise(localPosition * DENT_DEPTH_FREQUENCY + vec3(uTime * DENT_DEPTH_SPEED, 5.2, -3.1));
  float dentDepth = CURSOR_DEPTH * (0.85 + 0.15 * (depthNoise * 0.5 + 0.5));

  displaced -= n * cursorFalloff * dentDepth * uCursorInfluence;

  float distToPole = length(localPosition - POLE);
  float leafDimpleFalloff = 1.0 - smoothstep(0.0, LEAF_DIMPLE_RADIUS, distToPole);
  displaced -= n * leafDimpleFalloff * LEAF_DIMPLE_DEPTH;

  return displaced;
}

void main() {
  // Slow, continuously flowing time offset so the noise field drifts
  // instead of oscillating in place. Always running, regardless of cursor.
  float flowTime = uTime * FLOW_SPEED;

  vec3 n = normalize(position);

  // Build a tangent basis around this vertex so we can sample two
  // neighboring points on the displaced surface and derive a smooth
  // normal from them, instead of reusing the undeformed sphere normal
  // (which is what made the surface look faceted).
  vec3 up = abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tangent = normalize(cross(up, n));
  vec3 bitangent = cross(n, tangent);

  float epsilon = 0.02;

  // Rough (undisplaced) world-space normal/view direction, just to derive
  // how close this vertex is to the silhouette edge as seen by the camera.
  vec3 worldNormalApprox = normalize(normalMatrix * n);
  vec3 worldPositionApprox = (modelMatrix * vec4(position, 1.0)).xyz;
  vec3 viewDirApprox = normalize(cameraPosition - worldPositionApprox);
  float edgeFactor = 1.0 - abs(dot(worldNormalApprox, viewDirApprox));
  float ambientMultiplier = 1.0 + edgeFactor * EDGE_BOOST_STRENGTH;

  vec3 p0 = displace(position, flowTime, ambientMultiplier);
  vec3 p1 = displace(position + tangent * epsilon, flowTime, ambientMultiplier);
  vec3 p2 = displace(position + bitangent * epsilon, flowTime, ambientMultiplier);

  vec3 recalculatedNormal = normalize(cross(p1 - p0, p2 - p0));
  if (dot(recalculatedNormal, n) < 0.0) {
    recalculatedNormal = -recalculatedNormal;
  }

  vNoise = travelingWaves(n, flowTime);
  vNormal = normalize(normalMatrix * recalculatedNormal);

  vec4 worldPosition = modelMatrix * vec4(p0, 1.0);
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}

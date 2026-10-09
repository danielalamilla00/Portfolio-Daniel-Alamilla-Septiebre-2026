uniform float uTime;
uniform float uCursorInfluence;
uniform vec3 uCursorPoint;
// Gates ONLY the ambient traveling-wave displacement below (not the cursor
// dent) — 0 during the hero's resting state (scroll=0) so the silhouette
// reads as a clean, undistorted sphere there, ramping to 1 over the 0->P1
// transition so every later phase keeps the exact same always-on ambient
// breathing it always had. Set from main.js.
uniform float uAmbientAmount;

// All of the constants below USED to be local `const`s here, each with an
// identical copy hand-kept in sync in main.js (which needs the exact same
// math to compute where the sprig's base should sit on this displaced
// surface — see updateSprigFollow() there). Two copies of the same numbers
// is exactly how things drift out of sync, so main.js is now the single
// source of truth for all of them, passed in as uniforms — change a value
// in ONE place (the constants block right above where `uniforms` is built
// in main.js) and both the sphere's own displacement and the sprig's
// tracking move together automatically.
uniform float uFreq1;
uniform float uFreq2;
uniform float uFreq3;
uniform vec3 uFlowDir1;
uniform vec3 uFlowDir2;
uniform vec3 uFlowDir3;
uniform float uWeight1;
uniform float uWeight2;
uniform float uWeight3;
uniform float uAmbientAmplitude;
uniform float uFlowSpeed;
uniform float uEdgeBoostStrength;
uniform float uCursorRadius;
uniform float uCursorDepth;
uniform float uDentEdgeFrequency;
uniform float uDentEdgeSpeed;
uniform float uDentEdgeVariation;
uniform float uDentDepthFrequency;
uniform float uDentDepthSpeed;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying float vNoise;

// --- Simplex 3D noise (Ashima Arts / Ian McEwan) ---
// Ported 1:1 to JS in main.js (updateSprigFollow's snoise3()) — if this
// function's math ever changes, mirror the change there too.
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
// silhouette at once instead of one bump breathing in place. Ported 1:1 to
// JS in main.js as travelingWavesJS().
float travelingWaves(vec3 n, float flowTime) {
  vec3 c1 = n * uFreq1 + uFlowDir1 * flowTime;
  vec3 c2 = n * uFreq2 + uFlowDir2 * flowTime;
  vec3 c3 = n * uFreq3 + uFlowDir3 * flowTime;

  return snoise(c1) * uWeight1 + snoise(c2) * uWeight2 + snoise(c3) * uWeight3;
}

// Displaces a point on the unit sphere outward along its own normal by an
// amount driven by the flowing noise field, then presses it back inward
// near the cursor point with an irregular, animated dent. Ported 1:1 to JS
// in main.js as displaceJS() — see updateSprigFollow() there, which
// evaluates this exact function at the +Y pole every frame so the sprig's
// own anchor tracks this same displacement instead of floating over a
// dead, fixed point.
vec3 displace(vec3 localPosition, float flowTime, float ambientMultiplier) {
  vec3 n = normalize(localPosition);

  float ambientNoise = travelingWaves(n, flowTime);
  vec3 displaced = localPosition + n * ambientNoise * uAmbientAmplitude * ambientMultiplier * uAmbientAmount;

  float distToCursor = length(localPosition - uCursorPoint);

  // Perturb the influence radius per-vertex so the dent's boundary reads as
  // an irregular, organic edge instead of a clean circle.
  float edgeNoise = snoise(localPosition * uDentEdgeFrequency + vec3(uTime * uDentEdgeSpeed));
  float dentRadius = uCursorRadius * (1.0 + edgeNoise * uDentEdgeVariation);
  float cursorFalloff = 1.0 - smoothstep(0.0, max(dentRadius, 0.05), distToCursor);

  // A second, gentler noise layer breaks up the depth inside the dent so
  // it isn't a flat-bottomed bowl, and keeps shifting over time.
  float depthNoise = snoise(localPosition * uDentDepthFrequency + vec3(uTime * uDentDepthSpeed, 5.2, -3.1));
  float dentDepth = uCursorDepth * (0.85 + 0.15 * (depthNoise * 0.5 + 0.5));

  displaced -= n * cursorFalloff * dentDepth * uCursorInfluence;

  return displaced;
}

void main() {
  // Slow, continuously flowing time offset so the noise field drifts
  // instead of oscillating in place. Always running, regardless of cursor.
  float flowTime = uTime * uFlowSpeed;

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
  float ambientMultiplier = 1.0 + edgeFactor * uEdgeBoostStrength;

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
  // Raw, UNDISPLACED object-space position — unlike vWorldPosition (which
  // moves every frame from the ambient wave/cursor-dent displacement
  // above), this is fixed to the mesh's own geometry. The fragment
  // shader's fine pore/bump noise samples this instead, so that texture
  // reads as baked into the material and holds still, rather than
  // swimming/shimmering as the surface breathes.
  vLocalPosition = position;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}

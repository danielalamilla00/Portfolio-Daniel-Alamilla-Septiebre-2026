// Post-experience vanish reveal, rendered on a large plane sitting BEHIND
// the sphere (see main.js) so it stays hidden under it until the sphere
// shrinks away. Deliberately reuses sphere.frag.glsl's own color palette
// and mixing logic almost verbatim (see that file's comments for why those
// specific tones/thresholds), driven by the SAME uTime uniform instance as
// the sphere's own material — not a copy — so the two are always in exact
// lockstep, no separate clock to drift out of sync. The only real
// difference is the noise source: the sphere's vNoise comes from 3D
// traveling waves sampled at each vertex's position on the sphere; this
// has no sphere to sample, so the same traveling-waves technique is
// resampled in 2D screen space instead (gl_FragCoord/uResolution), which
// is why it's a separate small shader rather than literally sharing
// sphere.frag.glsl.
uniform float uTime;
uniform float uRevealRadius; // 0..~1, fraction of max(uResolution.x, uResolution.y) — 0 = fully hidden, ~0.75+ = covers every corner
uniform vec2 uResolution;

// --- Simplex 3D noise (Ashima Arts / Ian McEwan) — copied from
// sphere.vert.glsl verbatim; fragment shaders can't import a vertex
// shader's functions, and this is the same noise sphere.frag.glsl's own
// coloring is ultimately built on. ---
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

// Same "several wide lobes drifting across the surface" idea as sphere.vert
// .glsl's travelingWaves(), just sampled in 2D screen-space instead of on a
// 3D sphere normal — same frequencies/weights/flow speed so the drift pace
// reads as the same animation, not a different one running alongside it.
const float FREQ_1 = 0.6;
const float FREQ_2 = 1.1;
const float FREQ_3 = 1.7;

const vec2 FLOW_DIR_1 = vec2(1.0, 0.25);
const vec2 FLOW_DIR_2 = vec2(-0.2, 1.0);
const vec2 FLOW_DIR_3 = vec2(0.7, -0.6);

const float WEIGHT_1 = 0.5;
const float WEIGHT_2 = 0.3;
const float WEIGHT_3 = 0.2;
const float FLOW_SPEED = 0.14; // matches sphere.vert.glsl's FLOW_SPEED

float travelingWaves2D(vec2 uv, float flowTime) {
  vec3 c1 = vec3(uv * FREQ_1 + FLOW_DIR_1 * flowTime, 0.0);
  vec3 c2 = vec3(uv * FREQ_2 + FLOW_DIR_2 * flowTime, 17.0);
  vec3 c3 = vec3(uv * FREQ_3 + FLOW_DIR_3 * flowTime, -9.0);
  return snoise(c1) * WEIGHT_1 + snoise(c2) * WEIGHT_2 + snoise(c3) * WEIGHT_3;
}

const float SATURATION_BOOST = 1.3;
const float CONTRAST_BOOST = 1.12;

vec3 gradeColor(vec3 color, float saturation, float contrast) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 saturated = mix(vec3(luminance), color, saturation);
  return (saturated - 0.5) * contrast + 0.5;
}

void main() {
  float maxDim = max(uResolution.x, uResolution.y);
  vec2 center = uResolution * 0.5;
  float distFromCenter = length(gl_FragCoord.xy - center) / maxDim;
  if (distFromCenter > uRevealRadius) {
    discard;
  }

  vec2 uv = gl_FragCoord.xy / uResolution;
  float flowTime = uTime * FLOW_SPEED;
  float rawValue = clamp(travelingWaves2D(uv * 3.0, flowTime) * 0.5 + 0.5, 0.0, 1.0);

  // Same spread-out-from-the-midpoint trick as sphere.frag.glsl, same
  // reason: without it the mid-tone dominates and the other zones barely
  // show.
  const float COLOR_SPREAD = 2.0;
  float mixValue = clamp(0.5 + (rawValue - 0.5) * COLOR_SPREAD, 0.0, 1.0);

  vec3 burntOrange = vec3(0.988, 0.486, 0.290); // #FC7C4A
  vec3 vividOrange = vec3(0.992, 0.561, 0.286); // #FD8F49
  vec3 goldOrange = vec3(0.867, 0.341, 0.157); // #DD5728
  vec3 creamWhite = goldOrange;

  vec3 skinColor = mix(burntOrange, vividOrange, smoothstep(0.22, 0.5, mixValue));
  skinColor = mix(skinColor, goldOrange, smoothstep(0.5, 0.75, mixValue));
  skinColor = mix(skinColor, creamWhite, smoothstep(0.78, 0.95, mixValue));

  vec3 baseColor = gradeColor(skinColor, SATURATION_BOOST, CONTRAST_BOOST);

  gl_FragColor = vec4(baseColor, 1.0);
}

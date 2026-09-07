uniform float uTime;
uniform float uCursorInfluence;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vNoise;

// Cheap hash-based noise, used only for a light pixel-level dither on top
// of the large-scale vertex noise, to avoid flat, banded color transitions.
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

const float SATURATION_BOOST = 1.3;
const float CONTRAST_BOOST = 1.12;

// Pushes color away from (saturation > 1) or toward (< 1) its own grayscale
// luminance, and separately pushes values away from mid-gray for contrast.
vec3 gradeColor(vec3 color, float saturation, float contrast) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  vec3 saturated = mix(vec3(luminance), color, saturation);
  return (saturated - 0.5) * contrast + 0.5;
}

void main() {
  vec3 burntOrange = vec3(0.988, 0.486, 0.290); // #FC7C4A
  vec3 vividOrange = vec3(0.992, 0.561, 0.286); // #FD8F49
  vec3 goldOrange = vec3(0.867, 0.341, 0.157); // #DD5728
  vec3 creamWhite = goldOrange; // light zone now matches the medium-light zone

  // Reuse the same low-frequency noise field that drives the deformation
  // (few large waves, not many small ones) so the color patches follow the
  // same organic ondulations, plus a very light pixel-level dither so
  // transitions don't read as flat, simple bands.
  float pixelNoise = hash13(vWorldPosition * 6.0 + uTime * 0.05) - 0.5;
  float rawValue = clamp(vNoise * 0.5 + 0.5 + pixelNoise * 0.06, 0.0, 1.0);

  // vNoise (a sum of several noise layers) naturally clusters around its
  // midpoint, which is what made every color but the mid-tone look like a
  // thin accent. Stretching it away from 0.5 spreads the values back out
  // so each of the 4 zones actually claims a large, visible share of the
  // surface instead of the middle tone dominating everything.
  const float COLOR_SPREAD = 2.0;
  float mixValue = clamp(0.5 + (rawValue - 0.5) * COLOR_SPREAD, 0.0, 1.0);

  // Four watercolor-like zones with wide, soft crossfades so they read as
  // big blended patches, not hard edges or small spots. Thresholds are
  // pushed high across the board so the dark, burnt tone owns most of the
  // low-to-mid range and reads as the dominant color, with the lighter
  // tones reserved for a smaller portion near the top.
  vec3 skinColor = mix(burntOrange, vividOrange, smoothstep(0.22, 0.5, mixValue));
  skinColor = mix(skinColor, goldOrange, smoothstep(0.5, 0.75, mixValue));
  skinColor = mix(skinColor, creamWhite, smoothstep(0.78, 0.95, mixValue));

  vec3 baseColor = gradeColor(skinColor, SATURATION_BOOST, CONTRAST_BOOST);

  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Same orbiting light used below for the specular highlight, reused here
  // for a simple diffuse term that pushes the palette toward white on the
  // lit side and toward black on the shadowed side — a touch of real
  // light/shadow contrast on top of the noise-driven colors, moving
  // together with the highlight as the light orbits.
  vec3 lightPos = vec3(sin(uTime * 0.4) * 2.5, cos(uTime * 0.3) * 2.0, cos(uTime * 0.4) * 2.5);
  vec3 lightDir = normalize(lightPos - vWorldPosition);
  float diffuse = dot(normal, lightDir) * 0.5 + 0.5;
  baseColor = mix(baseColor, vec3(0.0), (1.0 - diffuse) * 0.22);
  baseColor = mix(baseColor, vec3(1.0), diffuse * diffuse * 0.18);

  // Fresnel: silhouette/edges read brighter than the center, like a wet,
  // glossy surface catching grazing light. Always on at a moderate level.
  float fresnelRaw = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
  vec3 fresnelColor = vec3(1.0) * fresnelRaw * 0.45;

  // Specular highlight from the same orbiting light, Blinn-Phong style, for
  // the moving glossy reflection. Always on at a base level, and flares up
  // brighter while the cursor is pressing into the surface.
  vec3 halfDir = normalize(lightDir + viewDir);
  float specAngle = max(dot(normal, halfDir), 0.0);
  float specularRaw = pow(specAngle, 140.0);
  float specularStrength = mix(0.3, 1.1, uCursorInfluence);
  vec3 specularColor = vec3(1.0) * specularRaw * specularStrength;

  vec3 color = clamp(baseColor + fresnelColor + specularColor, 0.0, 1.0);

  gl_FragColor = vec4(color, 1.0);
}

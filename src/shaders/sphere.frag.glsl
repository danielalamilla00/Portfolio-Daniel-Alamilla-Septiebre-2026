uniform float uTime;
uniform float uCursorInfluence;
// Normal matrix of the sphere's own matrixWorld (set in main.js, rebuilt
// every frame right after orangeGroup.rotation.y is advanced). The bump
// below is derived from vLocalPosition, so it comes out in local space —
// now that the sphere continuously rotates, local space no longer points
// the same way as vNormal's world/view space, so this transforms it before
// the two are combined.
uniform mat3 uNormalMatrix;
// Pore density of the peel grain below (pores per unit of the sphere's own
// surface). Driven from main.js (computeGrainScale): 60 in every phase
// except the creativity phase, where it grows with the sphere so the pores
// keep the same on-screen size they have in the hero.
uniform float uGrainScale;
// 1 except while the orange dissolves into the creativity phase's aura
// (main.js updateAura); the material is transparent for this.
uniform float uOpacity;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying float vNoise;

// Cheap hash-based noise, used only for a light pixel-level dither on top
// of the large-scale vertex noise, to avoid flat, banded color transitions.
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// Jittered-grid cell hash for Worley/cellular noise below: maps an integer
// cell coordinate to a pseudo-random point inside that cell.
vec3 hashCell3D(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453123);
}

// Classic 3D Worley/cellular noise: scatters one jittered point per grid
// cell and, for every sample, finds the nearest (f1) and second-nearest
// (f2) of those points by checking the full 3x3x3 neighborhood (has to
// check all 27, not just the sample's own cell, since the nearest point
// can easily sit in a neighboring cell near a cell edge). toNearest (the
// un-normalized vector from the sample to that nearest point) is returned
// too, since the orange-peel bump below reuses it directly as a cheap
// pit/dome normal direction instead of paying for extra finite-difference
// samples just to estimate a gradient.
void worley3D(vec3 p, out float f1, out float f2, out vec3 toNearest) {
  vec3 cell = floor(p);
  vec3 localPos = fract(p);
  f1 = 8.0;
  f2 = 8.0;
  toNearest = vec3(0.0);
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 offset = vec3(float(x), float(y), float(z));
        vec3 featurePoint = offset + hashCell3D(cell + offset);
        vec3 diff = featurePoint - localPos;
        float dist = length(diff);
        if (dist < f1) {
          f2 = f1;
          f1 = dist;
          toNearest = diff;
        } else if (dist < f2) {
          f2 = dist;
        }
      }
    }
  }
}

const float SATURATION_BOOST = 1.7;
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
  // Floored at 0.4 instead of a plain smoothstep: on tight close-ups (e.g.
  // the final full-screen FILL phase in main.js) the visible patch of
  // surface can be small enough that the noise never crosses the 0.5
  // threshold anywhere in view, making the darkest tone vanish entirely.
  // The floor guarantees goldOrange always contributes a clearly visible
  // amount, so it's always present in the gradient, while still letting it
  // swell stronger wherever the noise actually pushes past the threshold.
  float goldPresence = max(0.4, smoothstep(0.5, 0.75, mixValue));
  skinColor = mix(skinColor, goldOrange, goldPresence);
  skinColor = mix(skinColor, creamWhite, smoothstep(0.78, 0.95, mixValue));

  vec3 baseColor = gradeColor(skinColor, SATURATION_BOOST, CONTRAST_BOOST);

  // Orange-peel grain — tune these two:
  //   grainScale     how many pores fit across the sphere (higher = smaller,
  //                  denser pores). Now the uGrainScale uniform (base value
  //                  GRAIN_SCALE in main.js).
  //   grainIntensity overall strength of the effect — both the lighting
  //                  bump below and the direct shading here scale off this
  //                  single value, so the base color gradient above keeps
  //                  doing the real work and this stays a subtle detail on
  //                  top of it, not a recolor.
  float grainScale = uGrainScale;
  const float grainIntensity = 0.18;

  // Sampled from vLocalPosition (the mesh's own static, undisplaced
  // geometry), NOT vWorldPosition — vWorldPosition shifts every frame with
  // the ambient wave/cursor-dent animation (see displace() in
  // sphere.vert.glsl), and at this frequency even that tiny per-frame
  // movement would read as the whole pore pattern swimming/shimmering.
  // vLocalPosition never changes (the sphere doesn't rotate), so the grain
  // stays glued to the surface like a real baked texture, moving only when
  // the surface itself visibly deforms.
  float wF1, wF2;
  vec3 wToNearest;
  worley3D(vLocalPosition * grainScale, wF1, wF2, wToNearest);

  // f1 is the distance from this point to the center of its pore — small
  // right at the center (the "bottom" of the pit), so 1-smoothstep(f1)
  // peaks there and fades out toward the pore's rim. f2-f1 is small only
  // right on the ridge exactly between two neighboring pores, which is
  // what the thin edge highlight below picks out.
  float poreDarken = 1.0 - smoothstep(0.0, 0.5, wF1);
  float edgeLight = 1.0 - smoothstep(0.0, 0.12, wF2 - wF1);
  baseColor *= 1.0 - poreDarken * grainIntensity * 0.6;
  baseColor += edgeLight * grainIntensity * 0.12;

  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);

  // Bump: reuses wToNearest (the direction, in local space, from this
  // point toward its pore's center) as a cheap pit normal — tilting the
  // normal AWAY from each pore's center approximates the gradient of a
  // small conical dimple, so the rim catches light on one side and falls
  // into shadow on the other, like a real pit — without paying for extra
  // Worley evaluations just to estimate a gradient via finite differences.
  // wToNearest comes from vLocalPosition, i.e. local space. The sphere now
  // spins continuously (see ROTATION_SPEED in main.js), so local space no
  // longer points the same way as vNormal's world/view space — uNormalMatrix
  // (built from the sphere's own matrixWorld) transforms it into world space
  // before it gets combined with normal below.
  vec3 bumpDir = wF1 > 0.0001 ? normalize(uNormalMatrix * wToNearest) : vec3(0.0);
  normal = normalize(normal - bumpDir * grainIntensity);

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
  float specularStrength = mix(0.3, 0.6, uCursorInfluence);
  vec3 specularColor = vec3(1.0) * specularRaw * specularStrength;

  vec3 color = clamp(baseColor + fresnelColor + specularColor, 0.0, 1.0);

  gl_FragColor = vec4(color, uOpacity);
}

// Aura background of the creativity phase (see updateAura() in main.js):
// a radial gradient circle whose soft rim fades through a peach halo into
// the page color, plus static fine grain over everything. All geometry is
// in CSS px, top-left origin.
uniform vec2 uViewport;    // CSS px
uniform float uPixelRatio;
uniform vec2 uCenter;      // CSS px
uniform float uRadius;     // CSS px
uniform float uFeather;    // rim-to-page fade width, fraction of the radius
uniform float uBlur;       // 0 = crisp orange silhouette, 1 = fully blurred aura
uniform float uAlpha;      // aura opacity over the page
uniform float uColorMix;   // 0 = flat sphere tone, 1 = full aura palette
uniform float uGrain;      // grain amplitude, peak-to-peak
uniform vec3 uColorSphere;
uniform vec3 uColorCenterA;
uniform vec3 uColorCenterB;
uniform vec3 uColorMidA;
uniform vec3 uColorMidB;
uniform vec3 uColorEdge;
uniform vec3 uColorHalo;
uniform vec3 uColorPage;   // page background (same as html/body)

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uViewport.y * uPixelRatio - gl_FragCoord.y) / uPixelRatio;
  float r = length(px - uCenter) / max(uRadius, 1.0);

  // Wide, overlapping smoothsteps so every band blends into the next —
  // the reference reads as one continuous blur, not rings.
  vec3 palette = mix(uColorCenterA, uColorCenterB, smoothstep(0.0, 0.3, r));
  palette = mix(palette, uColorMidA, smoothstep(0.18, 0.45, r));
  palette = mix(palette, uColorMidB, smoothstep(0.4, 0.62, r));
  palette = mix(palette, uColorEdge, smoothstep(0.55, 0.78, r));
  // The halo only exists once the rim is blurred (no pink ring around the
  // crisp disk at the start of the morph).
  palette = mix(palette, uColorHalo, smoothstep(0.78, 0.98, r) * uBlur);

  vec3 color = mix(uColorSphere, palette, uColorMix);
  float inside = 1.0 - smoothstep(1.0 - uFeather, 1.0, r);
  color = mix(uColorPage, color, inside * uAlpha);

  // Static grain: per device pixel, never animated, over aura and page alike.
  color += (hash12(floor(gl_FragCoord.xy)) - 0.5) * uGrain;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}

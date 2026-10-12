import * as THREE from "three";
import vertexShader from "./shaders/aura.vert.glsl?raw";
import fragmentShader from "./shaders/aura.frag.glsl?raw";
import { ORANGE_PALETTE, hexToRgb } from "./palette.js";
import { GRAIN } from "./grain.js";

// ---- The aura's gradient ------------------------------------------------------
// One blurred radial gradient (src/shaders/aura.frag.glsl): the background
// of the creativity phase. main.js gets a full-screen quad from createAura()
// and drives its uniforms (updateAura): where it is, how big, how opaque.
// Its colors, the softness of its rim and its final shape live here; its
// grain is the web's (grain.js). (The Contact section has the same one upside down: contact.js.)
// Palette, inside -> out. The colors themselves live in palette.js.
const AURA_COLOR_CENTER_A = ORANGE_PALETTE.yellowOrangeLight; // warm, very bright yellow-orange at the center
const AURA_COLOR_CENTER_B = ORANGE_PALETTE.yellowOrange;
const AURA_COLOR_MID_A = ORANGE_PALETTE.orange; // vivid orange ring
const AURA_COLOR_MID_B = ORANGE_PALETTE.orangeWarm;
const AURA_COLOR_EDGE = ORANGE_PALETTE.coral; // rim
const AURA_COLOR_HALO = ORANGE_PALETTE.peach; // soft halo between the rim and the page
const AURA_COLOR_SPHERE = ORANGE_PALETTE.orangeDeep; // flat stand-in for the orange's own tone, where the hero's morph starts
// Rim softness: fraction of the radius over which the rim fades into the page.
export const AURA_FEATHER = 0.25;

// Final shape of the aura on a screen `width` x `height`, in CSS px: a circle
// centered horizontally at AURA_CENTER_X (fraction of the width), its center
// AURA_CENTER_Y (fraction of the height; negative = just above the top
// edge). Its radius is the LARGER of two measures, so it reads the same size
// on any screen shape:
//   - AURA_RADIUS_W of the width (the size knob: raise it for a bigger
//     aura). On wide windows this is the one that applies, and the bottom
//     of the circle then runs past the bottom edge, softly cut by its rim;
//   - whatever makes its bottom reach AURA_BOTTOM_Y of the height, which
//     takes over on narrow/tall screens (where a % of the width alone
//     would leave a small disc at the top).
// At 16:9 both give about the same circle.
const AURA_CENTER_X = 0.5;
const AURA_CENTER_Y = -0.04;
const AURA_RADIUS_W = 0.55;
const AURA_BOTTOM_Y = 0.95;
export function auraFinalShape(width, height) {
  const cy = height * AURA_CENTER_Y;
  return { cx: width * AURA_CENTER_X, cy, r: Math.max(width * AURA_RADIUS_W, height * AURA_BOTTOM_Y - cy) };
}

// Colors are sRGB 0..1 (ShaderMaterial output is not color-managed here).
const toVec3 = (rgb) => new THREE.Vector3(...rgb.map((channel) => channel / 255));

// A quad that covers whatever it is rendered to, with the aura's shader.
// `pageRgb`: the color around the aura ([r, g, b], 0..255), which the quad
// paints too, so there is never a seam with what is behind the canvas.
export function createAura(pageRgb) {
  const uniforms = {
    uViewport: { value: new THREE.Vector2(1, 1) },
    uPixelRatio: { value: 1 },
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: 1 },
    uFeather: { value: AURA_FEATHER },
    uBlur: { value: 1 },
    uAlpha: { value: 1 },
    uColorMix: { value: 1 },
    uGrain: { value: GRAIN },
    uColorSphere: { value: toVec3(hexToRgb(AURA_COLOR_SPHERE)) },
    uColorCenterA: { value: toVec3(hexToRgb(AURA_COLOR_CENTER_A)) },
    uColorCenterB: { value: toVec3(hexToRgb(AURA_COLOR_CENTER_B)) },
    uColorMidA: { value: toVec3(hexToRgb(AURA_COLOR_MID_A)) },
    uColorMidB: { value: toVec3(hexToRgb(AURA_COLOR_MID_B)) },
    uColorEdge: { value: toVec3(hexToRgb(AURA_COLOR_EDGE)) },
    uColorHalo: { value: toVec3(hexToRgb(AURA_COLOR_HALO)) },
    uColorPage: { value: toVec3(pageRgb) },
  };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false })
  );
  mesh.frustumCulled = false; // positioned in clip space by its vertex shader
  return { mesh, uniforms };
}

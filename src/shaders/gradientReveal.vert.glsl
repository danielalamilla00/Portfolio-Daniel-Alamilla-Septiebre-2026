// Trivial pass-through: all the interesting work happens in the fragment
// shader using gl_FragCoord (real screen pixels), so this plane doesn't
// even need a varying UV — just project its vertices normally.
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

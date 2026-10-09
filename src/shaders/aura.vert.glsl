// Full-screen quad: the 2x2 plane's vertices are used directly as clip-space
// positions, so it always covers the viewport regardless of the camera.
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}

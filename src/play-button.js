// ---- The play / pause button over a project's video -----------------------------------
// One for every video with one (src/case.js): a round button in the video's
// middle, frosted, with no words — a play triangle, or a pause (two bars)
// while it plays. Before the video has been played it is always there;
// pressed — it, or anywhere on the video — the video starts (`start()`: from
// its beginning, with its sound) and the button turns to a pause. While it
// plays the button shows only while the pointer moves over the video (and
// goes PB_IDLE_MS after it stops), or, on a touch screen, when the video is
// touched; pressed then, the video stops, and the play is there again and
// stays.
//   PB_IDLE_MS   how long the pause shows after the pointer stops
const PB_IDLE_MS = 1500;
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5.8 5.2v13.6a.8.8 0 0 0 1.2.7l10.9-6.8a.8.8 0 0 0 0-1.4L7 4.5A.8.8 0 0 0 5.8 5.2Z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';

// `host`: what the button sits in, and what is pressed or hovered (the video
// and all over it but its controls); `video()`: the video playing now (a
// bigger file may take its place); `start()`: the first press. What it gives
// back: the button, and `reset()`, which takes it back to before that first
// press (a full-screen final result back to its muted preview, case.js).
export function playButton(host, video, start) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pb";
  host.classList.add("pb-host");
  let started = false;
  let idle = 0;
  const show = (on) => button.classList.toggle("is-hidden", !on);
  const draw = () => {
    const playing = started && !video().paused;
    button.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    button.classList.toggle("is-pause", playing);
    // (the host, for its hover: the picture under it grows a little — case.css — but not while it plays)
    host.classList.toggle("is-playing", playing);
    button.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    if (!playing) {
      clearTimeout(idle);
      show(true);
    }
  };
  // (for a while, while it plays)
  const wake = () => {
    if (!started || video().paused) return;
    show(true);
    clearTimeout(idle);
    idle = setTimeout(() => !video().paused && show(false), PB_IDLE_MS);
  };
  const press = () => {
    if (!started) {
      started = true;
      start();
    } else if (video().paused) video().play().catch(() => {});
    else video().pause();
  };
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    press();
  });
  let touched = false; // (the last press was a finger's)
  let hiddenAtTouch = false;
  host.addEventListener("pointerdown", (event) => {
    touched = event.pointerType === "touch";
    hiddenAtTouch = button.classList.contains("is-hidden");
    if (touched) wake();
  });
  host.addEventListener("click", (event) => {
    if (event.target.closest(".cs-controls, .pb")) return;
    // (a finger on the playing video, the pause not there: it comes, nothing is pressed)
    if (touched && started && !video().paused && hiddenAtTouch) return;
    press();
  });
  host.addEventListener("pointermove", (event) => event.pointerType !== "touch" && wake());
  // (a finger lifted "leaves" too: only a mouse's leaving hides it)
  host.addEventListener("pointerleave", (event) => event.pointerType !== "touch" && started && !video().paused && show(false));
  // (what the video playing now does — heard at the host, on their way down)
  host.addEventListener("play", (event) => event.target === video() && (draw(), wake()), true);
  host.addEventListener("pause", (event) => event.target === video() && draw(), true);
  button.addEventListener("focus", wake);
  draw();
  return {
    button,
    reset() {
      started = false;
      draw();
    },
  };
}

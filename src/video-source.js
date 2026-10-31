// ---- Which file of a project's video to play ---------------------------------------
// A project's video is in several sizes (projects.js: video, the files' path
// up to their size, and videoSizes, the heights there are: 1440 at the
// most), each an MP4 in H.264 — what every browser plays: <path>-<size>.mp4.
// The one played is the size the video is shown at asks for — in device
// pixels, its width × devicePixelRatio (VS_BANDS) — or the biggest there is
// under it. When it is shown bigger (whole screen), upgrade() loads the
// bigger one beside it and puts it in its place at the same moment of the
// video, without a stop.
//   VS_BANDS       [from px wide, the height asked for], biggest first
//   VS_LEAD_S      how far ahead of the one playing the bigger one waits
const VS_BANDS = [
  [1300, 1440],
  [900, 1080],
  [0, 720],
];
const VS_LEAD_S = 0.5;

// The height asked for at `pixels` wide, and the size played for it.
function sizeFor(project, pixels) {
  const asked = VS_BANDS.find(([from]) => pixels >= from)[1];
  const sizes = [...project.videoSizes].sort((a, b) => b - a);
  return sizes.find((size) => size <= asked) || sizes[sizes.length - 1];
}
const fileOf = (project, size) => encodeURI(`${project.video}-${size}.mp4`);

// Put the file for `pixels` on `video` (one of a single file: that file).
export function setSource(video, project, pixels) {
  if (!project.videoSizes) {
    video.src = encodeURI(project.video);
    return;
  }
  const size = sizeFor(project, pixels);
  video.dataset.size = String(size);
  video.src = fileOf(project, size);
}

// If `pixels` asks for a bigger file than `video` plays, that one: loaded
// right behind it (in the same place, under it: `video` sits over it, both
// filling their box), and at the same moment of the video it takes its place
// — `adopt(next)` gives it what the old one had —, playing if it was, and
// the old one goes. Muted until then (its sound, as the old one's, from then
// on). Once at a time; never smaller.
export function upgrade(video, project, pixels, adopt) {
  if (!project.videoSizes || video.dataset.upgrading) return;
  const size = sizeFor(project, pixels);
  if (size <= +video.dataset.size) return;
  video.dataset.upgrading = "1";
  const next = document.createElement("video");
  next.className = video.className;
  next.muted = true;
  next.defaultMuted = video.defaultMuted;
  next.loop = video.loop;
  next.playsInline = true;
  next.preload = "auto";
  for (const name of ["aria-label", "aria-hidden"]) if (video.hasAttribute(name)) next.setAttribute(name, video.getAttribute(name));
  setSource(next, project, pixels);
  video.before(next);
  // (it waits a little ahead, VS_LEAD_S, on its frame, and takes the place
  // when the one playing gets there: never a step back in time. If the one
  // playing jumps back meanwhile — started again, gone round its loop —, it
  // aims again)
  const put = () => {
    next.muted = video.muted;
    adopt(next);
    const playing = !video.paused;
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
    if (playing) next.play().catch(() => {});
  };
  const aim = () => {
    // (stopped: where it is)
    const at = video.paused ? video.currentTime : Math.min(video.currentTime + VS_LEAD_S, (video.duration || Infinity) - 0.05);
    next.addEventListener(
      "seeked",
      () => {
        let last = video.currentTime;
        const wait = () => {
          const now = video.currentTime;
          if (video.paused || (now >= at && now < at + VS_LEAD_S)) put();
          else if (now < last - 0.05 || now < at - VS_LEAD_S - 0.25 || now >= at + VS_LEAD_S) aim();
          else requestAnimationFrame(wait);
          last = now;
        };
        wait();
      },
      { once: true }
    );
    next.currentTime = at;
  };
  next.addEventListener(
    "canplay",
    aim,
    { once: true }
  );
}

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyPalette } from "./palette.js";
import { applyGrain } from "./grain.js";
import { startNavClock } from "./clock.js";
import { setupMenu } from "./menu.js";
import { onViewportChange } from "./viewport.js";
import { createYouTubePlayer } from "./youtube.js";
import { PROJECTS, nextProjects, projectUrl } from "./data/projects.js";

// ---- A project's page --------------------------------------------------------------
// One template for every project, filled in from its entry in
// src/data/projects.js — the one whose slug is in the address
// (work.html#<slug>). A case study laid out as:
//   - its category, small, and its name, giant, centered;
//   - two columns on the page's twelve: on the left (four), what it was for,
//     what was hard about it and a table of facts; on the right (eight), the
//     video, with its poster and a few controls of its own over it, and
//     under it its frames — short clips cut from it, then any other pictures
//     of it — one after another, all of them the same 16:9 box, each fading
//     out as it leaves through the top of the screen. At the start of the
//     block both columns stop, the video's middle level with the texts', for
//     a while of scroll (PROJECT_VIDEO_HOLD_VH); then the video goes on up
//     and the frames come after it, while the texts stay where they are
//     until the end of the block;
//   - "Next project", giant, and the next three projects of the Works page;
//     a link back to all of them.
// On a phone it is one column, and nothing stops: the name, the video, the
// texts, the facts, the frames, the end.
//   PROJECT_VIDEO_HOLD_VH   how long the two columns stay still, in scroll
//                     (a share of the screen's height, in hundredths)
//   PJ_STICK_GAP_PX   the least room left between the two columns, when they
//                     stop, and the nav above them or the screen's foot
//   PJ_PARALLAX       how far a frame's picture moves inside its box as the
//                     page goes by (each way, a share of the box's height)
//   PJ_FADE_S         how long a frame takes to come in
//   PJ_FADE_FROM      where on the screen a piece's top is when it starts to
//                     fade out (it is gone when its foot reaches the nav)
const PROJECT_VIDEO_HOLD_VH = 120;
const PJ_STICK_GAP_PX = 24;
const PJ_PARALLAX = 0.05;
const PJ_FADE_S = 0.9;
const PJ_FADE_FROM = 0.3;
// YouTube puts its own interface over the picture for a few seconds each time
// its video starts to move (title, buttons; measured: gone 3.7 to 4.2 s in):
// its poster stays over it until then.
const PJ_YOUTUBE_UI_S = 4.6;

gsap.registerPlugin(ScrollTrigger);
applyPalette();
startNavClock();
setupMenu();
applyGrain();
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function render(project) {
  document.title = `alamilla | ${project.title}`;
  const page = document.querySelector(".pj");

  // -- the head
  const head = element("header", "pj-head");
  head.append(element("p", "pj-category", project.category), element("h1", "pj-title title-gradient", project.title));

  // -- the two columns: the video, the texts and facts, the frames (in that
  // order for a phone; placed in the two columns by the stylesheet)
  const body = element("div", "pj-body");
  const info = element("aside", "pj-info");
  info.append(label("Idea"), element("p", "pj-copy", project.idea), label("Challenge"), element("p", "pj-copy", project.challenge), factsTable(project));
  const frames = element("div", "pj-frames");
  project.frames.concat(project.extraFrames).forEach((frame) => frames.appendChild(frameOf(frame, project.title)));
  const video = videoBlock(project);
  // (the video in its place in the grid, and in what holds its place while
  // it is pinned: one of the page's own, so that the video — an iframe, for
  // YouTube's and Vimeo's — is never moved in the page, which would load it
  // again)
  const slot = element("div", "pj-video-slot");
  const spacer = element("div");
  spacer.appendChild(video.box);
  slot.appendChild(spacer);
  body.append(slot, info, frames);

  // -- the end
  const end = element("section", "pj-end");
  const heading = element("h2", "pj-next-heading");
  heading.append(element("span", "pj-next-sans", "Next"), " ", element("span", "title-gradient", "project"));
  const row = element("div", "pj-next-row");
  nextProjects(project, 3).forEach((next, index) => row.appendChild(nextCard(next, index)));
  const back = element("a", "pj-back", "← Back to all");
  back.href = "works.html";
  end.append(heading, row, back);

  page.append(head, body, end);
  video.held = holdVideo(body, video.box, spacer, info);
  animate(video);
}

const label = (text) => element("p", "pj-label title-gradient", text);

// The facts: one row each, the name of it on the left and what it is on the
// right; credits, when there are any, a line each.
function factsTable(project) {
  const table = element("dl", "pj-facts");
  const row = (name, ...values) => {
    const item = element("div", "pj-fact");
    const value = element("dd", "pj-fact-value");
    values.forEach((text, index) => {
      if (index) value.appendChild(element("br"));
      value.append(text);
    });
    item.append(element("dt", "pj-fact-name", name), value);
    table.appendChild(item);
  };
  [
    ["Client", project.client],
    ["Industry", project.industry],
    ["Role", project.role],
    ["Tools", project.tools],
    ["Year", project.year],
  ].forEach(([name, value]) => value && row(name, value));
  if (project.credits && project.credits.length) row("Credits", ...project.credits.map(({ role, name }) => `${name}, ${role}`));
  return table;
}

// -- the video ---------------------------------------------------------------------------
// Its poster over it until it plays. It starts by itself, silent; its controls are the
// page's: play / pause, where it is (and where to go: the bar), sound, full
// screen — and, in its middle while it is not being watched, "Click to watch
// project" (watchButton). Whatever plays it — a <video>, YouTube's player, Vimeo's — is
// behind one small interface: play(), pause(), seek(share), setMuted(),
// and it says when it plays or stops and how far in it is (onState, onTime).
// What it gives back: its box, its player, and whether it is playing.
const youTubeId = (url) => (url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([\w-]{11})/) || [])[1];
const vimeoId = (url) => (url.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1];
function videoBlock(project) {
  const box = element("div", "pj-video");
  box.setAttribute("aria-label", `${project.title}: the video`);
  const stage = element("div", "pj-video-stage");
  const poster = element("img", "pj-poster");
  poster.src = encodeURI(project.poster);
  poster.alt = "";
  poster.fetchPriority = "high";
  stage.appendChild(poster);

  const controls = element("div", "pj-controls");
  const playButton = element("button", "pj-control", "Play");
  const bar = element("div", "pj-bar");
  const fill = element("span", "pj-bar-fill");
  bar.appendChild(fill);
  bar.setAttribute("role", "slider");
  bar.setAttribute("aria-label", "Where the video is");
  bar.setAttribute("aria-valuemin", "0");
  bar.setAttribute("aria-valuemax", "100");
  bar.tabIndex = 0;
  const soundButton = element("button", "pj-control", "Sound on");
  const fullButton = element("button", "pj-control", "Full screen");
  [playButton, soundButton, fullButton].forEach((button) => (button.type = "button"));
  controls.append(playButton, bar, soundButton, fullButton);
  const watch = watchButton(() => {
    setSound(true);
    player.play();
  });
  box.append(stage, controls, watch.button);

  let playing = false;
  let muted = true;
  // (watched: playing, with its sound)
  const watched = () => watch.show(!playing || muted);
  let share = 0; // how far in, 0..1
  const show = (on) => box.classList.toggle("is-playing", on);
  // (YouTube's: the poster stays over its first seconds, from the first time
  // it moves: PJ_YOUTUBE_UI_S)
  let posterHeld = Boolean(youTubeId(project.video));
  let started = false;
  const onState = (on) => {
    playing = on;
    playButton.textContent = on ? "Pause" : "Play";
    if (on && !started) {
      started = true;
      if (posterHeld)
        setTimeout(() => {
          posterHeld = false;
          show(true);
        }, PJ_YOUTUBE_UI_S * 1000);
    }
    if (on && !posterHeld) show(true);
    watched();
  };
  const onTime = (at) => {
    share = at;
    fill.style.transform = `scaleX(${at.toFixed(4)})`;
    bar.setAttribute("aria-valuenow", String(Math.round(at * 100)));
  };
  const player = makePlayer(project.video, stage, poster, { onState, onTime });

  const setSound = (on) => {
    muted = !on;
    player.setMuted(muted);
    soundButton.textContent = muted ? "Sound on" : "Sound off";
    watched();
  };
  playButton.addEventListener("click", () => (playing ? player.pause() : player.play()));
  soundButton.addEventListener("click", () => setSound(muted));
  const seekTo = (event) => {
    const rect = bar.getBoundingClientRect();
    player.seek(Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1));
  };
  bar.addEventListener("pointerdown", (event) => {
    bar.setPointerCapture(event.pointerId);
    seekTo(event);
    const move = (e) => seekTo(e);
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", () => bar.removeEventListener("pointermove", move), { once: true });
  });
  bar.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 0.05, ArrowLeft: -0.05 }[event.key];
    if (!step) return;
    event.preventDefault();
    player.seek(Math.min(Math.max(share + step, 0), 1));
  });
  // Full screen: the box, controls and all (an iPhone only does it for a
  // <video>, its own way).
  if (document.fullscreenEnabled || player.nativeFullscreen) {
    fullButton.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.fullscreenEnabled) box.requestFullscreen();
      else player.nativeFullscreen();
    });
    document.addEventListener("fullscreenchange", () => (fullButton.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen"));
  } else fullButton.hidden = true;
  return { box, player, playing: () => playing };
}

// "Click to watch project": over a project's video, in its middle, while it
// is not being watched — before it starts, stopped, or playing by itself
// with no sound —; pressed, it plays it with its sound (onWatch), and goes
// (fading; it comes back the same way). What it gives back: the button, and
// show(on).
const PJ_PLAY_ICON = '<svg class="pj-watch-icon" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><path d="M1.5 0.8 9.2 5 1.5 9.2Z" fill="currentColor"/></svg>';
function watchButton(onWatch) {
  const button = element("button", "pj-watch");
  button.type = "button";
  button.innerHTML = `${PJ_PLAY_ICON}<span>Click to watch project</span>`;
  button.addEventListener("click", onWatch);
  return { button, show: (on) => button.classList.toggle("is-hidden", !on) };
}

function makePlayer(url, stage, poster, { onState, onTime }) {
  // YouTube's player: its own controls off; how far in, asked for while it plays.
  if (youTubeId(url)) {
    const id = youTubeId(url);
    const frame = element("iframe", "pj-embed");
    frame.allow = "autoplay; encrypted-media; picture-in-picture";
    frame.title = "Video";
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({ enablejsapi: 1, origin: window.location.origin, autoplay: 1, mute: 1, controls: 0, loop: 1, playlist: id, playsinline: 1, rel: 0, iv_load_policy: 3, disablekb: 1, fs: 0 })}`;
    stage.appendChild(frame);
    let duration = 0;
    let ticking = 0;
    const youTube = createYouTubePlayer(frame, (on) => {
      onState(on);
      clearInterval(ticking);
      if (!on) return;
      youTube.duration().then((d) => (duration = d));
      ticking = setInterval(() => youTube.time().then((t) => duration && onTime(t / duration)), 250);
    });
    return {
      play: () => youTube.play(),
      pause: () => youTube.pause(),
      seek: (at) => youTube.duration().then((d) => youTube.seek(at * d)),
      setMuted: (muted) => youTube.setMuted(muted),
    };
  }
  // Vimeo's: told what to do, and listened to, through its frame's messages.
  if (vimeoId(url)) {
    const frame = element("iframe", "pj-embed");
    frame.allow = "autoplay; fullscreen; picture-in-picture";
    frame.title = "Video";
    frame.src = `https://player.vimeo.com/video/${vimeoId(url)}?${new URLSearchParams({ autoplay: 1, muted: 1, loop: 1, controls: 0, title: 0, byline: 0, portrait: 0, dnt: 1, playsinline: 1 })}`;
    stage.appendChild(frame);
    const origin = "https://player.vimeo.com";
    const post = (method, value) => frame.contentWindow.postMessage(JSON.stringify(value === undefined ? { method } : { method, value }), origin);
    let duration = 0;
    window.addEventListener("message", (event) => {
      if (event.origin !== origin || event.source !== frame.contentWindow) return;
      const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      if (data.event === "ready") ["play", "pause", "timeupdate"].forEach((name) => post("addEventListener", name));
      else if (data.event === "play") onState(true);
      else if (data.event === "pause") onState(false);
      else if (data.event === "timeupdate" || data.event === "playProgress") { // (what it answers "timeupdate" with)
        duration = data.data.duration;
        onTime(data.data.percent);
        onState(true);
      }
    });
    return {
      play: () => post("play"),
      pause: () => post("pause"),
      seek: (at) => duration && post("setCurrentTime", at * duration),
      setMuted: (muted) => post("setMuted", muted),
    };
  }
  // An MP4: a <video> of the page's own.
  const video = element("video", "pj-embed");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  video.poster = poster.src;
  video.src = encodeURI(url);
  stage.appendChild(video);
  video.addEventListener("play", () => onState(true));
  video.addEventListener("pause", () => onState(false));
  video.addEventListener("timeupdate", () => video.duration && onTime(video.currentTime / video.duration));
  return {
    play: () => video.play(),
    pause: () => video.pause(),
    seek: (at) => video.duration && (video.currentTime = at * video.duration),
    setMuted: (muted) => (video.muted = muted),
    nativeFullscreen: video.webkitEnterFullscreen ? () => video.webkitEnterFullscreen() : null,
  };
}

// -- the frames: pictures moving, not players — silent, in a loop, no
// controls, nothing to press (not even on an iPhone: no menu, no picture in
// picture, no casting). Each clip loads when it is a screen away and plays
// only while it is on screen (not "autoplay": loaded a screen early, it
// would start playing there). Its poster: its first frame, the .webp of the
// same name.
// (The one that loads them first: when one comes on screen, it has its
// source before it is told to play.)
const nearClips = new IntersectionObserver(
  (entries) => {
    for (const { target: video, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      video.preload = "auto";
      video.src = video.dataset.src;
      nearClips.unobserve(video);
    }
  },
  { rootMargin: "100% 0px" }
);
const shownClips = new IntersectionObserver((entries) => {
  for (const { target: video, isIntersecting } of entries) {
    if (isIntersecting) video.play().catch(() => {});
    else video.pause();
  }
});
function frameOf(frame, title) {
  const box = element("figure", "pj-frame");
  let media;
  if (frame.video) {
    media = element("video");
    media.muted = true;
    media.loop = true;
    media.playsInline = true;
    media.preload = "none";
    media.disablePictureInPicture = true;
    media.disableRemotePlayback = true;
    media.poster = encodeURI(frame.video.replace(/\.mp4$/, ".webp"));
    media.dataset.src = encodeURI(frame.video);
    media.addEventListener("contextmenu", (event) => event.preventDefault());
    nearClips.observe(media);
    shownClips.observe(media);
  } else {
    media = element("img");
    media.loading = "lazy";
    media.decoding = "async";
    media.alt = `${title}: a frame`;
    media.src = encodeURI(frame.image);
  }
  if (frame.focus) media.style.objectPosition = frame.focus;
  box.appendChild(media);
  return box;
}

// -- the end: the next three projects ------------------------------------------------------
function nextCard(project, index) {
  const card = element("a", "pj-card");
  card.href = projectUrl(project);
  const thumb = element("span", "pj-card-thumb");
  const image = element("img");
  image.src = encodeURI(project.poster);
  image.alt = "";
  image.loading = "lazy";
  thumb.appendChild(image);
  const line = element("span", "pj-card-line");
  line.append(element("span", "pj-card-name", `${String(index + 1).padStart(2, "0")} ${project.title}`), element("span", "pj-card-more", "Full project ↗"));
  card.append(thumb, line);
  return card;
}

// -- the two columns at the start of the block: where they stop — in the
// middle of what is left of the screen under the nav (the video's column is
// that tall, the video in its middle: the stylesheet), the texts' middle
// level with the video's (if they are taller than that, as high as their end
// can be seen) — the texts lowered in the page as much as they have to be to
// get there at the same time (--pj-info-shift). The texts stop there
// (sticky: --pj-stick) for the rest of the block; the video, pinned, for
// PROJECT_VIDEO_HOLD_VH of scroll, and then goes on. The scroll it is held
// for is room under its column (--pj-hold-room), so that nothing jumps and
// the frames, after it, get there as the video goes on — less what is
// already under the video in its column, so that the first comes as close
// under it as the frames are to each other. (Not the pin's own room, which
// would be inside the column and make it taller than the screen: the video
// would no longer be in its middle.) Measured again each time the page is
// (a new size, the fonts in). Not on a phone.
// What it gives back: while it holds the video, where on the screen (top)
// and until what scroll (end) — for the video's fade, after it (animate).
function holdVideo(body, box, spacer, info) {
  let hold = null;
  let videoTop = 0;
  gsap.matchMedia().add("(min-width: 768px)", () => {
    const place = () => {
      const nav = document.querySelector("#site-nav").getBoundingClientRect().bottom;
      const middle = (nav + window.innerHeight) / 2;
      const tall = info.offsetHeight > window.innerHeight - nav - 2 * PJ_STICK_GAP_PX;
      const textsTop = tall ? window.innerHeight - PJ_STICK_GAP_PX - info.offsetHeight : middle - info.offsetHeight / 2;
      videoTop = Math.max(middle - box.offsetHeight / 2, nav);
      body.style.setProperty("--pj-info-shift", `${Math.max(textsTop - nav, 0)}px`);
      const under = (box.parentElement.parentElement.offsetHeight - box.offsetHeight) / 2;
      body.style.setProperty("--pj-hold-room", `${(window.innerHeight * PROJECT_VIDEO_HOLD_VH) / 100 - under}px`);
      info.style.setProperty("--pj-stick", `${textsTop}px`);
    };
    place();
    ScrollTrigger.addEventListener("refreshInit", place);
    hold = ScrollTrigger.create({
      trigger: box,
      start: () => `top ${videoTop}px`,
      end: () => `+=${(window.innerHeight * PROJECT_VIDEO_HOLD_VH) / 100}`,
      pin: true,
      pinSpacer: spacer,
      pinSpacing: false,
      // (not anticipated: measured frame by frame, a wheel's scroll pinned it
      // up to 60px early, a jump; it is pinned on the frame it gets there)
      anticipatePin: 0,
      refreshPriority: 1, // (before the video's fade, which starts at its end)
    });
    return () => {
      ScrollTrigger.removeEventListener("refreshInit", place);
      ["--pj-info-shift", "--pj-hold-room"].forEach((name) => body.style.removeProperty(name));
      info.style.removeProperty("--pj-stick");
      hold = null;
    };
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  onViewportChange(() => ScrollTrigger.refresh());
  return () => hold && { top: videoTop, end: hold.end };
}

// -- coming in: each frame fades in once as it gets on screen (its picture:
// the box itself is what fades out), and its picture moves a little inside
// its box as the page goes by.
// -- going out: each piece (the video, each frame) fades with the page, from
// whole while its top is under PJ_FADE_FROM of the screen to gone when its
// foot reaches the nav — and back, scrolling back. (The video, held at the
// start of the block, from where it is let go: at once if it was held above
// PJ_FADE_FROM.) The video, gone while it plays, stops; back on screen, it
// plays again (only if it was playing).
function animate(video) {
  if (reducedMotion) return;
  const navFoot = () => document.querySelector("#site-nav").getBoundingClientRect().bottom;
  const fadeOut = (piece, more) =>
    gsap.fromTo(piece, { opacity: 1 }, {
      opacity: 0,
      ease: "power1.in",
      immediateRender: false,
      scrollTrigger: { trigger: piece, start: `clamp(top ${PJ_FADE_FROM * 100}%)`, end: () => `bottom ${navFoot()}px`, scrub: true, invalidateOnRefresh: true, ...more },
    });
  const held = (whileHeld, otherwise) => () => (video.held() ? whileHeld(video.held()) : otherwise());
  let stopped = false;
  fadeOut(video.box, {
    start: held(({ top, end }) => end + Math.max(top - window.innerHeight * PJ_FADE_FROM, 0), () => `clamp(top ${PJ_FADE_FROM * 100}%)`),
    end: held(({ top, end }) => end + top + video.box.offsetHeight - navFoot(), () => `bottom ${navFoot()}px`),
    onLeave: () => {
      stopped = video.playing();
      if (stopped) video.player.pause();
    },
    onEnterBack: () => {
      if (stopped) video.player.play();
      stopped = false;
    },
  });
  gsap.utils.toArray(".pj-frame").forEach((frame) => {
    gsap.from(frame.firstElementChild, { autoAlpha: 0, duration: PJ_FADE_S, ease: "power2.out", scrollTrigger: { trigger: frame, start: "top 92%", once: true } });
    fadeOut(frame);
    gsap.fromTo(
      frame.firstElementChild,
      { yPercent: -PJ_PARALLAX * 100 },
      { yPercent: PJ_PARALLAX * 100, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true } }
    );
  });
}

// -- the project in the address ------------------------------------------------------------
const slug = decodeURIComponent(window.location.hash.slice(1));
const project = PROJECTS.find((entry) => entry.slug && entry.slug === slug);
if (!project) window.location.replace("works.html");
else render(project);
// Another project's address on this page (a "Full project" link): that one.
window.addEventListener("hashchange", () => window.location.reload());

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyPalette } from "./palette.js";
import { applyGrain } from "./grain.js";
import { startNavClock } from "./clock.js";
import { setupMenu } from "./menu.js";
import { onViewportChange } from "./viewport.js";
import { setupProjectAura } from "./project-aura.js";
import { createYouTubePlayer } from "./youtube.js";
import { PROJECTS, MOVED, nextProjects, projectUrl } from "./data/projects.js";
import { plainTitle, titleParts } from "./title.js";

// ---- A project's page --------------------------------------------------------------
// One template for every project, filled in from its entry in
// src/data/projects.js — the one whose slug is in the address
// (work.html#<slug>). A case study laid out as:
//   - over the aura (project-aura.js), its category, small, its name and what
//     it is in a line, centered;
//   - two columns on the page's twelve, about a screen tall, their middles
//     level: on the left (four), what it was for, what was hard about it and
//     a table of facts; on the right (eight), the video, 16:9, with its
//     poster and a few controls of its own over it. In the middle of the
//     screen the block stops, all of it, for a while of scroll
//     (PROJECT_HOLD_VH: holdBlock), and then goes on up, the video fading
//     out as it leaves through the top of the screen;
//   - "Next project", giant, and the next three projects of the Works page;
//     a link back to all of them.
// On a phone it is one column, and nothing stops: the name, the video, the
// texts, the facts, the end. The nav is at the top of the page, and goes up
// with it (project.css).
//   PROJECT_HOLD_VH   how long the block stays still, in scroll (a share of
//                     the screen's height, in hundredths)
//   PJ_HOLD_MARGIN_PX the least room between the held block and the screen's
//                     top and foot
//   PJ_HOLD_MIN_HEIGHT_PX  a screen less tall than this: no hold
//   PJ_FIT_MIN_*      how small the block can be made to fit (fitBlock)
//   PJ_FADE_S         how long the two columns take to come in
//   PJ_FADE_FROM      where on the screen the video's top is when it starts
//                     to fade out (it is gone when its foot reaches the top)
const PROJECT_HOLD_VH = 150;
const PJ_HOLD_MARGIN_PX = 32;
const PJ_HOLD_MIN_HEIGHT_PX = 650;
const PJ_FIT_MIN_SPACE_PX = 16;
const PJ_FIT_MIN_ROW_PX = 6;
const PJ_FIT_MIN_TEXT_PX = 14;
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
  document.title = `alamilla | ${plainTitle(project.title)}`;
  const page = document.querySelector(".pj");

  // -- the head
  const head = element("header", "pj-head");
  // (its name in the web's two letters, and under it, what it is in a line)
  const name = element("h1", "pj-title");
  name.append(...titleParts(project.title));
  head.append(element("p", "pj-category", project.category), name);
  if (project.tagline) head.appendChild(element("p", "pj-tagline", project.tagline));

  // -- the two columns: the video, then the texts and facts (in that order
  // for a phone; placed in the two columns by the stylesheet)
  const body = element("div", "pj-body");
  const info = element("aside", "pj-info");
  info.append(label("Idea"), element("p", "pj-copy", project.idea), label("Challenge"), element("p", "pj-copy", project.challenge), factsTable(project));
  const video = videoBlock(project);
  body.append(video.box, info);
  // (and round it, what holds its place while it is pinned: one of the
  // page's own, so that the video — an iframe, for YouTube's and Vimeo's —
  // is never moved in the page, which would load it again)
  const spacer = element("div", "pj-hold");
  spacer.appendChild(body);

  // -- the end
  const end = element("section", "pj-end");
  const heading = element("h2", "pj-next-heading");
  heading.append(...titleParts("Next *project*"));
  const row = element("div", "pj-next-row");
  nextProjects(project, 3).forEach((next, index) => row.appendChild(nextCard(next, index)));
  const back = element("a", "pj-back", "← Back to all");
  back.href = "works.html";
  end.append(heading, row, back, document.querySelector(".pj-foot"));

  page.append(head, spacer, end);
  setupProjectAura(document.querySelector(".pj-aura"));
  video.held = holdBlock(body, spacer, video.box);
  animate(body, video);
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
    ["Display", project.display],
    ["Role", project.role],
    ["Tools", project.tools],
    ["Year", project.year],
  ].forEach(([name, value]) => value && row(name, value));
  if (project.credits && project.credits.length) row("Credits", ...project.credits.map(({ role, name }) => `${name}, ${role}`));
  return table;
}

// -- the video ---------------------------------------------------------------------------
// Its poster over it until it plays. It waits, stopped, until someone
// presses play (and then plays with its sound); its controls are the
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
  box.setAttribute("aria-label", `${plainTitle(project.title)}: the video`);
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
  const soundButton = element("button", "pj-control", "Sound off");
  const fullButton = element("button", "pj-control", "Full screen");
  [playButton, soundButton, fullButton].forEach((button) => (button.type = "button"));
  controls.append(playButton, bar, soundButton, fullButton);
  const watch = watchButton(() => {
    setSound(true);
    player.play();
  });
  box.append(stage, controls, watch.button);

  let playing = false;
  let muted = false;
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
  // (an MP4 that has a lighter one for a phone: that one, on a phone)
  const small = project.videoSmall && window.matchMedia("(max-width: 767px)").matches;
  const player = makePlayer(small ? project.videoSmall : project.video, stage, poster, { onState, onTime });

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
// is not being watched — before it starts, stopped, or playing with its
// sound off —; pressed, it plays it with its sound (onWatch), and goes
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
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({ enablejsapi: 1, origin: window.location.origin, autoplay: 0, mute: 0, controls: 0, loop: 1, playlist: id, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0 })}`;
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
    frame.src = `https://player.vimeo.com/video/${vimeoId(url)}?${new URLSearchParams({ autoplay: 0, muted: 0, loop: 1, controls: 0, title: 0, byline: 0, portrait: 0, dnt: 1, playsinline: 1 })}`;
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
  video.loop = true;
  video.playsInline = true;
  video.preload = "metadata";
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
  const name = element("span", "pj-card-name", `${String(index + 1).padStart(2, "0")} `);
  name.append(...titleParts(project.title));
  line.append(name, element("span", "pj-card-more", "Full project ↗"));
  card.append(thumb, line);
  return card;
}

// -- the block, held: it is pinned, all of it, PJ_HOLD_MARGIN_PX from the
// top of the screen — or lower, so as to be in the middle of the screen,
// PJ_HOLD_MARGIN_PX left above it and under it — for PROJECT_HOLD_VH of
// scroll; nothing in it moves; then it goes on up. The scroll it is held for
// is room added under it (its own spacer: pinSpacing), so that nothing
// jumps. All of it has to be seen while it is held: if it is taller than
// that room, it is made smaller until it fits (fitBlock). If it cannot be,
// and on a phone or a screen under PJ_HOLD_MIN_HEIGHT_PX tall, it is not held.
// What it gives back: while it holds the block, where on the screen the
// video's top is (top) and until what scroll (end) — for the video's fade,
// after it (animate).
function holdBlock(body, spacer, box) {
  let hold = null;
  let holdTop = 0; // where the block's top is held
  const arrange = () => {
    const can = window.innerWidth >= 768 && window.innerHeight >= PJ_HOLD_MIN_HEIGHT_PX && fitBlock(body, box);
    if (can) holdTop = PJ_HOLD_MARGIN_PX + Math.max((window.innerHeight - 2 * PJ_HOLD_MARGIN_PX - body.offsetHeight) / 2, 0);
    if (can && !hold) {
      hold = ScrollTrigger.create({
        trigger: body,
        start: () => `top top+=${holdTop}`,
        end: () => `+=${(window.innerHeight * PROJECT_HOLD_VH) / 100}`,
        pin: true,
        pinSpacer: spacer,
        pinSpacing: true,
        // (not anticipated: measured frame by frame, a wheel's scroll pinned it
        // up to 48px early and let it go 24px late, a jump; it is pinned on the
        // frame it gets there)
        anticipatePin: 0,
        refreshPriority: 1, // (before the video's fade, which starts at its end)
      });
    } else if (!can && hold) {
      hold.kill(true);
      hold = null;
    }
    ScrollTrigger.refresh();
  };
  arrange();
  // (again once the video is in, and the fonts, and on a new size)
  const embed = box.querySelector(".pj-embed");
  embed.addEventListener(embed.tagName === "IFRAME" ? "load" : "loadedmetadata", () => ScrollTrigger.refresh(), { once: true });
  document.fonts.ready.then(arrange);
  onViewportChange(arrange);
  return () => hold && { top: holdTop + (box.getBoundingClientRect().top - body.getBoundingClientRect().top), end: hold.end };
}

// The block made to fit the room it is held in (the screen less
// PJ_HOLD_MARGIN_PX above and under), never by cutting or hiding any of its
// words: the video no taller than that room; then, as little as it takes, in
// this order — the room between the texts (down to PJ_FIT_MIN_SPACE_PX), the
// facts' rows (to PJ_FIT_MIN_ROW_PX each way), the texts' size (to
// PJ_FIT_MIN_TEXT_PX). Each stage as little as it takes (halving, 12 times).
// Whether it fits.
const PJ_FIT_KNOBS = ["--pj-space", "--pj-fact-pad", "--pj-copy-size", "--pj-label-size", "--pj-video-max"];
function fitBlock(body, box) {
  PJ_FIT_KNOBS.forEach((name) => body.style.removeProperty(name));
  const room = window.innerHeight - 2 * PJ_HOLD_MARGIN_PX;
  const info = body.querySelector(".pj-info");
  if (box.offsetHeight > room) body.style.setProperty("--pj-video-max", `${room}px`);
  const fits = () => info.offsetHeight <= room - 2; // (and a little to spare: rounding)
  if (fits()) return true;
  const px = (selector, property) => parseFloat(getComputedStyle(body.querySelector(selector))[property]);
  const from = {
    space: px(".pj-copy + .pj-label", "marginTop") + px(".pj-label", "paddingTop"),
    pad: px(".pj-fact", "paddingTop"),
    copy: px(".pj-copy", "fontSize"),
    label: px(".pj-label", "fontSize"),
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const stages = [
    (t) => body.style.setProperty("--pj-space", `${lerp(from.space, Math.min(from.space, PJ_FIT_MIN_SPACE_PX), t)}px`),
    (t) => body.style.setProperty("--pj-fact-pad", `${lerp(from.pad, Math.min(from.pad, PJ_FIT_MIN_ROW_PX), t)}px`),
    (t) => {
      body.style.setProperty("--pj-copy-size", `${lerp(from.copy, Math.min(from.copy, PJ_FIT_MIN_TEXT_PX), t)}px`);
      body.style.setProperty("--pj-label-size", `${lerp(from.label, Math.min(from.label, PJ_FIT_MIN_TEXT_PX), t)}px`);
    },
  ];
  for (const stage of stages) {
    stage(1);
    if (!fits()) continue; // (all of this one, and on to the next)
    let low = 0;
    let high = 1;
    for (let k = 0; k < 12; k++) {
      const mid = (low + high) / 2;
      stage(mid);
      if (fits()) high = mid;
      else low = mid;
    }
    stage(high);
    return true;
  }
  return false;
}

// -- coming in: the two columns fade in, once, as they get on screen.
// -- going out: the video fades with the page, from whole while its top is
// under PJ_FADE_FROM of the screen to gone when its foot reaches the top —
// and back, scrolling back (held, from where the block is let go: at once
// if it was held above PJ_FADE_FROM). Gone while it plays, it stops; back on
// screen, it plays again (only if it was playing).
function animate(body, video) {
  if (reducedMotion) return;
  gsap.from(body, { autoAlpha: 0, duration: PJ_FADE_S, ease: "power2.out", scrollTrigger: { trigger: body, start: "top 92%", once: true } });
  const held = (whileHeld, otherwise) => () => (video.held() ? whileHeld(video.held()) : otherwise());
  let stopped = false;
  gsap.fromTo(video.box, { opacity: 1 }, {
    opacity: 0,
    ease: "power1.in",
    immediateRender: false,
    scrollTrigger: {
      trigger: video.box,
      start: held(({ top, end }) => end + Math.max(top - window.innerHeight * PJ_FADE_FROM, 0), () => `clamp(top ${PJ_FADE_FROM * 100}%)`),
      end: held(({ top, end }) => end + top + video.box.offsetHeight, () => "bottom top"),
      scrub: true,
      invalidateOnRefresh: true,
      onLeave: () => {
        stopped = video.playing();
        if (stopped) video.player.pause();
      },
      onEnterBack: () => {
        if (stopped) video.player.play();
        stopped = false;
      },
    },
  });
}

// -- the project in the address ------------------------------------------------------------
// (one of an old address goes on to its new one: MOVED)
const asked = decodeURIComponent(window.location.hash.slice(1));
const slug = MOVED[asked] || asked;
if (slug !== asked) window.history.replaceState(null, "", `#${slug}`);
const project = PROJECTS.find((entry) => entry.slug && entry.slug === slug);
if (!project) window.location.replace("works.html");
else render(project);
// Another project's address on this page (a "Full project" link): that one.
window.addEventListener("hashchange", () => window.location.reload());

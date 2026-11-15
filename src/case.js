import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyGrain } from "./grain.js";
import { onViewportChange, MOBILE_MAX_PX } from "./viewport.js";
import { plainTitle } from "./title.js";
import { setSource, upgrade } from "./video-source.js";
import { playButton } from "./play-button.js";
import { PROJECTS, nextProjects, projectUrl } from "./data/projects.js";
import { createAuraCanvas, auraFinalShape } from "./aura.js";
import { CONTACT_AURA_INTENSITY, CONTACT_AURA_FROM_INTENSITY } from "./contact.js";

gsap.registerPlugin(ScrollTrigger);

// ---- A project's page --------------------------------------------------------------
// A project's page (work.html), the same for every project, in sections on
// two grounds — dark (the page's black, words in cream) and light (cream,
// words in #141414), each with the web's grain. In order:
//   - the cover (dark), fixed: the project's video, the whole screen, muted,
//     in a loop, nothing over it (but the nav); with a mouse, the pointer
//     over it is a play (playCursor()); pressed (or tapped), the video opens
//     the whole screen, from its start, with its sound and its own bar (openPlayer());
//     closed, the cover's loop goes on. It stays alone for CS_COVER_HOLD_VH of
//     scroll; then its video stops and
//   - the cream (light) comes up over it, CS_STACK_VH of scroll: a big
//     sentence whose words light up one after another as it crosses the
//     screen; on the right, lower, "(About the project)" and its text; its
//     tags and its facts (client, role, tools, year); a picture, held once in
//     the screen's middle — one timeline on that hold: its mask opens from
//     its middle to the whole screen (CS_HOLD_WIDEN_VH of scroll), the
//     picture in it going from CS_REVEAL_ZOOM down to 1, stays whole and still
//     (CS_HOLD_STILL_VH), and then goes up with the rest, as the page does;
//   - a project with its pieces (case.creative, case.final: Caprabo's
//     holograms): under it, a dark layer — its creative response (a
//     big sentence lighting up the same way, its Catavalo in the gradient;
//     the concept and the challenge) and its pieces, square videos in a
//     grid, each played with its sound when pressed (finalBlock());
//   - then the end: a stretch of the page's black (40vh, a phone's 25vh:
//     case.css), and a screen of it, Contact's aura coming up from its foot
//     as it is scrolled to (endAura()), and over it, in the
//     middle of the room the foot leaves, "Watch more projects" and the other
//     projects, from the one after this in the Works page's order, as a
//     carousel (endBlock()); the page's foot at its foot.
// Over the cream, the picture and the dark layer, a bar fixed at the screen's
// foot: back and the project's name, in the colours of the ground under it. Labels, texts
// and facts come in fading and rising.
//   CS_COVER_HOLD_VH     the cover alone, held, in hundredths of the screen
//   CS_STACK_VH          the cream's way up over it
//   CS_LIT_FROM          how lit a big sentence's words are before the scroll
//                        lights them up (their opacity)
//   CS_HOLD_WIDEN_VH     the scroll the held picture widens over,
//   CS_HOLD_STILL_VH     ...and the scroll it then stays whole and still
//   CS_WIDE_FADE_VH      ...and, going up, the scroll its foot takes to go
//                        to the page's black (case.css: .cs-wide-fade)
//   CS_REVEAL_FROM(_PHONE)  how much of its size the held picture shows at
//                        first, in its middle, its shape (a phone's)
//   CS_REVEAL_ZOOM       how big the picture is inside its mask as it starts
//                        to open (it is 1 when the mask is open)
//   CS_REVEAL_*          how words come in (once, at CS_REVEAL_START): from
//                        CS_REVEAL_RISE_PX lower, in CS_REVEAL_S, one
//                        CS_REVEAL_STAGGER_S after another
//   CS_SCRUB             the scroll-driven moves' damping (the web's: scrub 1)
//   CS_PLAYER_IDLE_MS    the video open on the whole screen: its bar hides
//                        after the pointer has been still this long
//   CS_PLAY_LERP         the play over the cover: the share of the way left
//                        to the pointer it goes each frame (at 60fps)
//   CS_MORE_*_VW         the other projects' carousel: the card in the middle
//                        and the ones at its sides, wide (a phone's), the
//                        room between them
//   CS_DRAG_PX           how far a drag goes to change its card
//   CS_WHEEL_STEP_PX     how far a sideways wheel goes to change its card
//   CS_END_AURA_PAD_PX   the end's aura: black left above its circle, in the
//                        end
const CS_COVER_HOLD_VH = 120;
const CS_STACK_VH = 100;
const CS_LIT_FROM = 0.15;
const CS_HOLD_WIDEN_VH = 70;
const CS_HOLD_STILL_VH = 30;
const CS_WIDE_FADE_VH = 25;
const CS_REVEAL_FROM = 0.35;
const CS_REVEAL_FROM_PHONE = 0.6;
const CS_REVEAL_ZOOM = 1.35;
const CS_REVEAL_START = "top 85%";
const CS_REVEAL_S = 0.9;
const CS_REVEAL_STAGGER_S = 0.08;
const CS_REVEAL_RISE_PX = 40;
const CS_SCRUB = 1;
const CS_PLAYER_IDLE_MS = 2000;
const CS_PLAY_LERP = 0.18;
const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.8 5.2v13.6a.8.8 0 0 0 1.2.7l10.9-6.8a.8.8 0 0 0 0-1.4L7 4.5A.8.8 0 0 0 5.8 5.2Z" fill="currentColor"/></svg>';
const CS_MORE_ACTIVE_VW = 45;
const CS_MORE_SIDE_VW = 22;
const CS_MORE_ACTIVE_PHONE_VW = 80;
const CS_MORE_SIDE_PHONE_VW = 40;
const CS_MORE_GAP_VW = 2;
const CS_DRAG_PX = 60;
const CS_WHEEL_STEP_PX = 50;
const CS_END_AURA_PAD_PX = 2;
const CS_BLACK = [10, 10, 10]; // the page's (project.css)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phone = () => window.innerWidth <= MOBILE_MAX_PX;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

// What the page shown now has set going outside its own elements — on the
// window, the document, the screen's size, observers —, all undone when it is
// left (renderCase's destroy): `scope.abort` for listeners, `scope.undo` for
// the rest.
let scope = null;
const onView = (run) => scope.undo.push(onViewportChange(run));
function observe(callback, target, options) {
  const observer = new IntersectionObserver(callback, options);
  observer.observe(target);
  scope.undo.push(() => observer.disconnect());
}

// A picture of the project's (its two sizes: <base>-1280.webp, -1920.webp),
// `size` its [width, height], from which its box is made before it comes in.
function picture({ src, alt }, sizes, className, size) {
  const image = element("img", className);
  image.src = encodeURI(`${src}-1280.webp`);
  image.srcset = `${encodeURI(`${src}-1280.webp`)} 1280w, ${encodeURI(`${src}-1920.webp`)} 1920w`;
  image.sizes = sizes;
  image.alt = alt;
  [image.width, image.height] = size;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

// A sentence in the web's two letters, a word at a time (so that its words
// can light up one by one): its *words between asterisks* in Catavalo
// (`displayClass`: .title-gradient on the dark layer), the rest in Inter
// Tight.
function phrase(text, displayClass = "title-display") {
  const nodes = [];
  text.split("*").forEach((part, index) => {
    part.split(/(\s+)/).forEach((word) => {
      if (!word) return;
      if (/^\s+$/.test(word)) return nodes.push(document.createTextNode(" "));
      nodes.push(element("span", `cs-word ${index % 2 ? displayClass : "title-sans"}`, word));
    });
  });
  return nodes;
}

// What it gives back: what takes the page down again (project.js, another
// project shown in its place).
export function renderCase(project) {
  const data = project.case;
  // (a project with no case is a mistake in projects.js)
  if (!data) throw new Error(`projects.js: "${project.slug}" has no case`);
  const mine = (scope = { abort: new AbortController(), undo: [] });
  const context = gsap.context(() => {});
  document.title = `alamilla | ${plainTitle(project.title)}`;
  document.body.classList.add("is-case");
  const page = document.querySelector(".pj");
  page.classList.add("cs");
  const sections = [];
  const section = (tone, name) => {
    const box = element("section", `cs-section cs-${name} grain`);
    box.dataset.tone = tone;
    sections.push(box);
    return box;
  };
  const label = (text) => element("p", "cs-label", text);

  // -- the cover
  const cover = section("dark", "cover");
  const video = element("video", "cs-cover-video");
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  video.poster = encodeURI(project.poster);
  video.setAttribute("aria-hidden", "true");
  setSource(video, project, Math.round(window.innerWidth * window.devicePixelRatio));
  // (its name, for whoever cannot see it: what pressing it does)
  const open = element("button", "cs-cover-open");
  open.type = "button";
  open.setAttribute("aria-label", `Play ${plainTitle(project.title)}, full screen`);
  cover.append(video, element("div", "cs-cover-shade"), open);

  // -- the cream: the statement, about, tags and facts, the held picture
  const intro = section("light", "intro");
  const statement = element("p", "cs-statement");
  statement.append(...phrase(data.statement));
  const about = element("div", "cs-aside");
  about.append(label("(About the project)"), element("p", "cs-copy", project.idea));
  const tags = element("ul", "cs-tags");
  data.tags.forEach((tag) => tags.appendChild(element("li", "", `#${tag}`)));
  const facts = element("dl", "cs-facts");
  [
    ["Client", project.client],
    ["Display", project.display],
    ["Role", project.role],
    ["Tools", project.tools],
    ["Year", project.year],
  ].forEach(([key, value]) => {
    if (!value) return;
    const item = element("div", "cs-fact");
    item.append(element("dt", "", key), element("dd", "", value));
    facts.appendChild(item);
  });
  const meta = element("div", "cs-meta");
  meta.append(tags, facts);
  // (always its 1920 file, a phone's too: it is CS_REVEAL_ZOOM in its frame at first — holdPicture())
  const wide = element("figure", "cs-frame cs-wide");
  wide.appendChild(picture(data.picture, "1400px", "cs-picture", data.pictureSize));
  // (its foot going to the page's black, with its grain: holdPicture())
  const fade = element("div", "cs-wide-fade grain");
  fade.setAttribute("aria-hidden", "true");
  wide.appendChild(fade);
  const column = element("div", "cs-col");
  column.append(statement, about, meta, wide);
  intro.appendChild(column);

  // -- its pieces, if it has them: the dark layer
  let creative = null;
  if (data.creative) {
    creative = section("dark", "creative");
    const big = element("p", "cs-statement");
    big.append(...phrase(data.creative.statement, "title-gradient"));
    const concept = element("div", "cs-aside");
    concept.append(label("(Creative response)"), ...data.creative.paragraphs.map((text) => element("p", "cs-copy", text)));
    (data.creative.more || []).forEach(({ label: name, text }) => concept.append(label(name), element("p", "cs-copy", text)));
    const darkColumn = element("div", "cs-col");
    darkColumn.append(big, concept);
    if (data.final) darkColumn.appendChild(finalBlock(project, data.final));
    creative.appendChild(darkColumn);
  }

  // -- the end: Contact's aura, the other projects over it, and the page's foot
  const end = section("dark", "end");
  const more = element("div", "cs-more");
  const moreTitle = element("h2", "cs-more-title");
  moreTitle.append(...phrase("Watch more *projects*"));
  more.appendChild(moreTitle);
  endBlock(project, more);
  end.appendChild(more);
  const foot = document.querySelector(".pj-foot");
  const footHome = foot.parentNode;
  const footAfter = foot.nextSibling;
  end.appendChild(foot);
  page.append(cover, intro, ...(creative ? [creative] : []), end);

  const bar = barBlock(project);
  document.body.appendChild(bar);

  applyGrain();
  const player = coverVideo(project, cover, video);
  context.add(() => holdCover(cover, intro, player));
  watchTones(sections, end, bar);
  document.fonts.ready.then(() => {
    if (mine.dead) return;
    context.add(() => {
      page.querySelectorAll(".cs-statement").forEach(lightUp);
      holdPicture(intro, wide, creative || end);
      endAura(end);
      comeIn(page);
    });
    ScrollTrigger.refresh();
  });
  // (measured again once the video and the picture are in)
  let soon = 0;
  const later = () => {
    clearTimeout(soon);
    soon = setTimeout(() => ScrollTrigger.refresh(), 200);
  };
  page.querySelectorAll("img").forEach((image) => image.addEventListener("load", later, { once: true }));
  page.querySelectorAll("video").forEach((one) => one.addEventListener("loadedmetadata", later, { once: true }));
  onView(() => ScrollTrigger.refresh());

  return () => {
    mine.dead = true;
    clearTimeout(soon);
    mine.abort.abort();
    mine.undo.forEach((undo) => undo());
    context.revert();
    // (and what was made later, on a new size: holdPicture())
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    page.querySelectorAll("video").forEach((one) => {
      one.pause();
      one.removeAttribute("src");
      one.load();
    });
    if (document.fullscreenElement) document.exitFullscreen();
    footHome.insertBefore(foot, footAfter);
    page.replaceChildren();
    page.classList.remove("cs");
    bar.remove();
    document.body.classList.remove("is-case");
  };
}

// The cover's video: muted, in a loop (with a mouse, a play over it:
// playCursor()); pressed — or tapped —, the video opens on the whole screen
// (openPlayer()), and the loop stops until it is closed. What it gives back:
// what stops the loop and lets it go on (holdCover(): the cream coming up
// over it).
function coverVideo(project, cover, video) {
  let under = false; // (the cream over it: the loop stopped)
  let watching = false;
  const loop = () => !under && !watching && video.play().catch(() => {});
  cover.addEventListener("click", () => {
    watching = true;
    video.pause();
    openPlayer(project, () => {
      watching = false;
      loop();
    });
  });
  playCursor(cover);
  loop();
  return {
    stop: () => {
      under = true;
      video.pause();
    },
    goOn: () => {
      under = false;
      loop();
    },
  };
}

// The pointer over the cover, with a mouse: its own hidden there (case.css)
// and, in its place, a cream circle with a play in it and "Play" up at its
// right, following the pointer (CS_PLAY_LERP of the way left each frame: the
// same feel at any frame rate). It grows in where the cover itself is under
// the pointer — not the cream come up over it, the nav's links or the video
// open on the whole screen — and shrinks away where it is not, the
// pointer's own there (case.css). Never on a screen that is only touched.
function playCursor(cover) {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const cursor = element("div", "cs-play-cursor");
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML = `<span class="cs-play-cursor-ball">${ICON_PLAY}</span><span class="cs-play-cursor-label">Play</span>`;
  document.body.appendChild(cursor);
  cover.classList.add("has-play-cursor");
  const pointer = { x: 0, y: 0 };
  const at = { x: 0, y: 0 };
  let known = false; // (where the pointer is: once it has moved on the page)
  let over = false;
  let frame = 0;
  let then = 0;
  const place = () => (cursor.style.transform = `translate3d(${at.x.toFixed(2)}px, ${at.y.toFixed(2)}px, 0)`);
  const show = (on) => {
    // (coming in where the pointer is, not from where it was left)
    if (on && !over) Object.assign(at, pointer), place();
    over = on;
    cursor.classList.toggle("is-on", on);
  };
  const look = () => {
    if (!known) return;
    const under = document.elementFromPoint(pointer.x, pointer.y);
    show(Boolean(under) && cover.contains(under));
  };
  const tick = (now) => {
    const frames = then ? Math.min((now - then) / (1000 / 60), 30) : 1;
    then = now;
    const ease = 1 - (1 - CS_PLAY_LERP) ** frames;
    at.x += (pointer.x - at.x) * ease;
    at.y += (pointer.y - at.y) * ease;
    const still = Math.hypot(pointer.x - at.x, pointer.y - at.y) < 0.1;
    if (still) Object.assign(at, pointer);
    place();
    frame = still ? 0 : requestAnimationFrame(tick);
  };
  const signal = scope.abort.signal;
  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    known = true;
    look();
    if (!frame) then = 0, (frame = requestAnimationFrame(tick));
  }, { signal });
  document.documentElement.addEventListener("pointerleave", () => {
    known = false;
    show(false);
  }, { signal });
  // (the page moved under a still pointer, or changed under it: looked at again)
  window.addEventListener("scroll", look, { passive: true, signal });
  window.addEventListener("click", () => setTimeout(look), { capture: true, signal });
  scope.undo.push(() => {
    cancelAnimationFrame(frame);
    cursor.remove();
  });
}

// The project's video on the whole screen: a layer of the page's black over
// everything (and the browser's full screen, where it has one), the video in
// it from its start, with its sound — its file the one the screen's size
// asks for —, and at its foot a bar of its own, fine, in cream: play / pause,
// where it is and how long it is, the line of where it is (dragged or
// pressed: there; 2px, 4px under the pointer, filled with the web's
// gradient), its sound, and close. The bar hides once the pointer has been
// still CS_PLAYER_IDLE_MS (and the pointer with it), and comes back as it
// moves. Esc closes it (or leaving the browser's full screen); `closed` is
// told then. No controls of the browser's own.
function openPlayer(project, closed) {
  const layer = element("div", "cs-player");
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-label", plainTitle(project.title));
  const video = element("video", "cs-player-video");
  video.playsInline = true;
  setSource(video, project, Math.round(window.screen.width * window.devicePixelRatio));
  const bar = element("div", "cs-player-bar");
  const button = (text, name) => {
    const one = element("button", `cs-player-button ${name}`, text);
    one.type = "button";
    return one;
  };
  const toggle = button("Pause", "cs-player-toggle");
  const time = element("span", "cs-player-time", "0:00 / 0:00");
  const track = element("div", "cs-player-track");
  const fill = element("span", "cs-player-fill");
  track.appendChild(fill);
  track.setAttribute("role", "slider");
  track.setAttribute("aria-label", "Where the video is");
  track.tabIndex = 0;
  const sound = button("Sound off", "cs-player-sound");
  const close = button("Close", "cs-player-close");
  bar.append(toggle, time, track, sound, close);
  layer.append(video, bar);
  document.body.appendChild(layer);
  const clock = (seconds) => {
    const whole = Math.floor(seconds || 0);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  };
  const draw = () => {
    toggle.textContent = video.paused ? "Play" : "Pause";
    sound.textContent = video.muted ? "Sound on" : "Sound off";
    time.textContent = `${clock(video.currentTime)} / ${clock(video.duration)}`;
    fill.style.transform = `scaleX(${video.duration ? (video.currentTime / video.duration).toFixed(4) : 0})`;
    track.setAttribute("aria-valuenow", String(Math.round(video.currentTime)));
  };
  ["play", "pause", "volumechange", "timeupdate", "loadedmetadata"].forEach((name) => video.addEventListener(name, draw));
  const playPause = () => (video.paused ? video.play().catch(() => {}) : video.pause());
  toggle.addEventListener("click", playPause);
  video.addEventListener("click", playPause);
  sound.addEventListener("click", () => (video.muted = !video.muted));
  const seekTo = (event) => {
    const r = track.getBoundingClientRect();
    if (video.duration) video.currentTime = Math.min(Math.max((event.clientX - r.left) / r.width, 0), 1) * video.duration;
  };
  track.addEventListener("pointerdown", (event) => {
    track.setPointerCapture(event.pointerId);
    seekTo(event);
    const move = (e) => seekTo(e);
    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", () => track.removeEventListener("pointermove", move), { once: true });
  });
  track.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 5, ArrowLeft: -5 }[event.key];
    if (step && video.duration) video.currentTime = Math.min(Math.max(video.currentTime + step, 0), video.duration);
  });
  // (the bar, while the pointer moves; and for a while after)
  let idle = 0;
  const wake = () => {
    layer.classList.remove("is-idle");
    clearTimeout(idle);
    idle = setTimeout(() => layer.classList.add("is-idle"), CS_PLAYER_IDLE_MS);
  };
  layer.addEventListener("pointermove", wake);
  const listen = new AbortController();
  let open = true;
  const shut = () => {
    if (!open) return;
    open = false;
    listen.abort();
    clearTimeout(idle);
    if (document.fullscreenElement === layer) document.exitFullscreen().catch(() => {});
    video.pause();
    video.removeAttribute("src");
    video.load();
    layer.remove();
    closed();
  };
  close.addEventListener("click", shut);
  window.addEventListener("keydown", (event) => event.key === "Escape" && shut(), { signal: listen.signal });
  let full = false;
  document.addEventListener(
    "fullscreenchange",
    () => {
      if (document.fullscreenElement === layer) full = true;
      else if (full) shut();
    },
    { signal: listen.signal }
  );
  scope.undo.push(shut);
  video.currentTime = 0;
  video.play().catch(() => {});
  if (layer.requestFullscreen) layer.requestFullscreen().catch(() => {}); // (none: the layer is the whole window)
  wake();
  draw();
}

// The cover held from its top while it is alone (CS_COVER_HOLD_VH: the cream
// starts that far under it) and while the cream comes up over it
// (CS_STACK_VH); its video stops as the cream starts to come, and goes on
// when it goes back down.
function holdCover(cover, intro, player) {
  cover.style.zIndex = "1";
  intro.style.zIndex = "2";
  intro.style.marginTop = `${CS_COVER_HOLD_VH}svh`;
  ScrollTrigger.create({
    trigger: cover,
    start: "top top",
    end: () => `+=${(window.innerHeight * (CS_COVER_HOLD_VH + CS_STACK_VH)) / 100}`,
    pin: true,
    pinSpacing: false,
    // (not anticipated: measured frame by frame under a wheel, 1 made the
    // sections jump 72 to 104px as they were pinned; 0, none)
    anticipatePin: 0,
    invalidateOnRefresh: true,
  });
  ScrollTrigger.create({
    trigger: intro,
    start: "top bottom",
    onEnter: player.stop,
    onLeaveBack: player.goOn,
  });
}

// The cream held once its picture is in the screen's middle, on one
// timeline: its mask opens from its middle — CS_REVEAL_FROM of the frame,
// its shape: the same share off each side — to the whole screen (the frame
// is the screen's size, case.css; CS_HOLD_WIDEN_VH of scroll) — the picture
// inside it going from CS_REVEAL_ZOOM down to 1 meanwhile — and stays whole
// and still (CS_HOLD_STILL_VH); the page is that much longer (the pin's
// spacing), and then the cream goes up with the rest, `next` (the next
// section) right under it. As it does, the picture's foot goes to the page's
// black — no line where it ends —, from nothing to all of it in the first
// CS_WIDE_FADE_VH of scroll, right with the scroll as the picture is (both
// ways; no scrub: a damped one, scrolled back past it fast, can stop short
// of nothing): never while it is held. Made again on a new size.
function holdPicture(intro, wide, next) {
  const image = wide.querySelector(".cs-picture");
  const fade = wide.querySelector(".cs-wide-fade");
  const set = (off) => (wide.style.clipPath = `inset(${off.toFixed(3)}% ${off.toFixed(3)}%)`);
  const darken = (self) => (fade.style.opacity = self.progress.toFixed(4));
  let timeline = null;
  let fadeIn = null;
  const make = () => {
    if (timeline) timeline.scrollTrigger.kill(true), timeline.kill();
    if (fadeIn) fadeIn.kill();
    // (the whole screen: its width without the scroll bar — case.css)
    intro.closest(".pj").style.setProperty("--cs-screen", `${document.documentElement.clientWidth}px`);
    if (reducedMotion) return set(0), gsap.set(image, { scale: 1 }), gsap.set(fade, { opacity: 1 });
    const vh = window.innerHeight / 100;
    const widenPx = CS_HOLD_WIDEN_VH * vh;
    const stillPx = CS_HOLD_STILL_VH * vh;
    // (where the mask starts: the same share off each side)
    const from = ((1 - (phone() ? CS_REVEAL_FROM_PHONE : CS_REVEAL_FROM)) / 2) * 100;
    const state = { off: from };
    set(from);
    gsap.set(image, { scale: CS_REVEAL_ZOOM });
    timeline = gsap.timeline({
      scrollTrigger: { trigger: wide, start: "center center", end: `+=${widenPx + stillPx}`, scrub: CS_SCRUB, pin: intro, anticipatePin: 0 },
    });
    timeline
      .to(state, { off: 0, ease: "none", duration: widenPx, onUpdate: () => set(state.off) })
      .to(image, { scale: 1, ease: "none", duration: widenPx }, 0)
      .to({}, { duration: stillPx });
    // (made after the pin: where `next` is counts its spacing)
    fadeIn = ScrollTrigger.create({ trigger: next, start: "top bottom", end: `+=${CS_WIDE_FADE_VH * vh}`, onUpdate: darken, onRefresh: darken });
  };
  make();
  onView(make);
}

// A big sentence's words, from CS_LIT_FROM to whole, one after another, as it
// crosses the screen (with the scroll, both ways).
function lightUp(big) {
  const words = big.querySelectorAll(".cs-word");
  if (reducedMotion) return;
  gsap.set(words, { opacity: CS_LIT_FROM });
  gsap.to(words, { opacity: 1, ease: "none", duration: 1, stagger: 1, scrollTrigger: { trigger: big, start: "top 85%", end: "bottom 35%", scrub: CS_SCRUB } });
}

// What ground is under the bar (the last box over its line: the ones after
// are over the ones before), and so its colours; hidden over the cover and
// over the end (`end`).
function watchTones(boxes, end, bar) {
  let queued = false;
  const look = () => {
    queued = false;
    const y = window.innerHeight - bar.offsetHeight / 2;
    let top = null;
    for (const box of boxes) {
      const r = box.getBoundingClientRect();
      if (r.top <= y && r.bottom >= y) top = box;
    }
    const tone = top ? top.dataset.tone : "dark";
    bar.classList.toggle("is-hidden", !top || top === boxes[0] || end.getBoundingClientRect().top <= y);
    bar.classList.toggle("is-light", tone === "light");
  };
  const ask = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(look);
  };
  window.addEventListener("scroll", ask, { passive: true, signal: scope.abort.signal });
  ScrollTrigger.addEventListener("refresh", ask);
  scope.undo.push(() => ScrollTrigger.removeEventListener("refresh", ask));
  look();
}

// Coming in, once: labels, texts, tags, facts and the end's parts fading
// and rising, one after another in their block.
function comeIn(page) {
  if (reducedMotion) return;
  const from = { opacity: 0, y: CS_REVEAL_RISE_PX, duration: CS_REVEAL_S, ease: "power3.out" };
  page.querySelectorAll(".cs-aside, .cs-tags, .cs-facts, .cs-final-head").forEach((block) => {
    gsap.from(Array.from(block.children), { ...from, stagger: CS_REVEAL_STAGGER_S, scrollTrigger: { trigger: block, start: CS_REVEAL_START, once: true } });
  });
}

// A video played: the play / pause button (play-button.js) in `playHost` —
// it, or the video, pressed: from its start, in a loop, with its sound and
// controls of its own (play / pause, where it is, sound, full screen: of
// `box`), `watchHost` marked .is-watching; a bigger file in full screen
// (video-source.js).
function playable(project, { box, video: first, playHost, watchHost }) {
  let video = first;
  const { button: play } = playButton(playHost, () => video, () => {
    watchHost.classList.add("is-watching");
    video.loop = true;
    video.currentTime = 0;
    video.muted = false;
    video.play().catch(() => {});
  });
  const controls = element("div", "pj-controls cs-controls");
  const toggle = element("button", "pj-control", "Pause");
  const bar = element("div", "pj-bar");
  const fill = element("span", "pj-bar-fill");
  bar.appendChild(fill);
  bar.setAttribute("role", "slider");
  bar.setAttribute("aria-label", "Where the video is");
  bar.tabIndex = 0;
  const sound = element("button", "pj-control", "Sound off");
  const full = element("button", "pj-control", "Full screen");
  [toggle, sound, full].forEach((button) => (button.type = "button"));
  controls.append(toggle, bar, sound, full);
  box.appendChild(controls);
  playHost.appendChild(play);
  // (what the one playing says — a bigger file takes over: video-source.js —,
  // heard at the box: a video's events come through it on their way down)
  const mine = (event) => event.target === video;
  box.addEventListener("play", (event) => mine(event) && (toggle.textContent = "Pause"), true);
  box.addEventListener("pause", (event) => mine(event) && (toggle.textContent = "Play"), true);
  box.addEventListener("volumechange", (event) => mine(event) && (sound.textContent = video.muted ? "Sound on" : "Sound off"), true);
  box.addEventListener("timeupdate", (event) => mine(event) && video.duration && (fill.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`), true);
  toggle.addEventListener("click", () => (video.paused ? video.play().catch(() => {}) : video.pause()));
  sound.addEventListener("click", () => (video.muted = !video.muted));
  const seekTo = (event) => {
    const r = bar.getBoundingClientRect();
    if (video.duration) video.currentTime = Math.min(Math.max((event.clientX - r.left) / r.width, 0), 1) * video.duration;
  };
  bar.addEventListener("pointerdown", (event) => {
    bar.setPointerCapture(event.pointerId);
    seekTo(event);
    const move = (e) => seekTo(e);
    bar.addEventListener("pointermove", move);
    bar.addEventListener("pointerup", () => bar.removeEventListener("pointermove", move), { once: true });
  });
  if (document.fullscreenEnabled) {
    full.addEventListener("click", () => (document.fullscreenElement ? document.exitFullscreen() : box.requestFullscreen()));
    document.addEventListener(
      "fullscreenchange",
      () => {
        full.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
        if (document.fullscreenElement === box) upgrade(video, project, Math.round(window.screen.width * window.devicePixelRatio), (next) => (video = next));
      },
      { signal: scope.abort.signal }
    );
  } else full.hidden = true;
}

// The pieces (case.final): its label and title (coming in as the others);
// its square videos (each its files, its poster and a line) in a grid in the
// column (three a row, the last row centered; two on a tablet, one on a
// phone), one playing at a time; each still — a sharp frame of it and a
// round "Play" in its middle — until it, or the video, is pressed: then from
// its start, with its sound, its controls (playable()), in a loop. Only what
// it needs to start is loaded until then (preload "metadata"); off the
// screen it stops; a line under it. What it gives back: the block.
function finalBlock(project, { label: text, title, videos }) {
  const block = element("div", "cs-final");
  const head = element("div", "cs-final-head");
  const heading = element("h2", "cs-final-title");
  heading.append(...phrase(title, "title-gradient"));
  head.append(element("p", "cs-label", text), heading);
  const list = element("div", "cs-final-grid");
  block.append(head, list);
  videos.forEach((one) => {
    const files = { title: project.title, video: one.video, videoSizes: one.videoSizes };
    const item = element("figure", "cs-final-item");
    const wrap = element("div", "cs-final-wrap");
    const box = element("div", "cs-final-box");
    const video = element("video", "cs-final-video");
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = encodeURI(one.poster);
    video.setAttribute("aria-label", `${plainTitle(project.title)}: ${one.line}`);
    // (its file by its width on the screen: a cell's, or a phone's)
    setSource(video, files, Math.round(window.innerWidth * (phone() ? 0.92 : 0.25) * window.devicePixelRatio));
    box.appendChild(video);
    wrap.appendChild(box);
    playable(files, { box, video, playHost: wrap, watchHost: wrap });
    const foot = element("div", "cs-final-line");
    foot.appendChild(element("p", "cs-caption", one.line));
    item.append(wrap, foot);
    list.appendChild(item);
    observe(([entry]) => entry.isIntersecting || box.querySelector(".cs-final-video:last-of-type").pause(), box);
  });
  // (one at a time: one starting stops the others, whichever file each plays)
  list.addEventListener(
    "play",
    (event) => list.querySelectorAll(".cs-final-video").forEach((video) => video === event.target || video.pause()),
    true
  );
  return block;
}

// The end's carousel, over its aura (endAura()): the other projects, all of them (the Works
// page's order, from the one after this) — the card in the
// middle big (CS_MORE_ACTIVE_VW, 16:9), its name over its picture, the ones
// at its sides smaller (CS_MORE_SIDE_VW) on the same foot, showing at the
// edges; round and round, sliding and growing softly; dragged or swiped, a
// sideways wheel, the arrow keys while it is seen. The one in the middle:
// its picture a little bigger with the pointer over it; pressed, its page.
// One at the side, pressed: it comes to the middle. Under it a line for
// each (the one in the middle's cream) — both in `box`, under "Watch more
// projects"; the page's foot, under them, is renderCase()'s.
function endBlock(project, box) {
  const others = nextProjects(project, PROJECTS.length - 1);
  const stage = element("div", "cs-more-stage");
  const lines = element("div", "cs-more-lines");
  let at = 0;
  let dx = 0;
  let dragged = false;
  const last = [];
  const cards = others.map((next, index) => {
    const card = element("a", "cs-more-card");
    card.href = projectUrl(next);
    // (dragged, it moves the carousel: never the browser's own drag of a link)
    card.draggable = false;
    const image = element("img", "cs-more-picture");
    image.src = encodeURI(next.poster);
    image.alt = "";
    image.loading = "lazy";
    image.draggable = false;
    const name = element("span", "cs-more-name");
    // (its words in one line of text: the spaces between them kept)
    const words = element("span", "cs-more-words");
    words.append(...phrase(next.title, "title-display"));
    name.appendChild(words);
    card.append(image, name);
    card.addEventListener("click", (event) => {
      if (dragged || index !== at) event.preventDefault();
      if (!dragged && index !== at) go(index);
    });
    stage.appendChild(card);
    const line = element("button", "cs-more-line");
    line.type = "button";
    line.setAttribute("aria-label", `Go to ${plainTitle(next.title)}`);
    line.addEventListener("click", () => go(index));
    lines.appendChild(line);
    return card;
  });
  const count = cards.length;
  const place = () => {
    const screen = document.documentElement.clientWidth;
    const big = ((phone() ? CS_MORE_ACTIVE_PHONE_VW : CS_MORE_ACTIVE_VW) * screen) / 100;
    const small = ((phone() ? CS_MORE_SIDE_PHONE_VW : CS_MORE_SIDE_VW) * screen) / 100;
    const gap = (CS_MORE_GAP_VW * screen) / 100;
    stage.style.setProperty("--cs-more-w", `${big}px`);
    cards.forEach((card, index) => {
      let d = (((index - at) % count) + count) % count;
      if (d > count / 2) d -= count;
      const far = Math.abs(d);
      const x = d ? Math.sign(d) * (big / 2 + gap + small / 2 + (Math.min(far, 3) - 1) * (small + gap)) : 0;
      // (one going round from one side to the other: there at once, unseen)
      card.classList.toggle("is-jump", last[index] !== undefined && Math.abs(last[index] - d) > 1);
      last[index] = d;
      card.style.transform = `translateX(${(x + dx).toFixed(1)}px) scale(${d ? small / big : 1})`;
      card.classList.toggle("is-active", !d);
      card.classList.toggle("is-far", far > 2);
      card.tabIndex = d ? -1 : 0;
    });
    Array.from(lines.children).forEach((line, index) => line.classList.toggle("is-on", index === at));
  };
  function go(index) {
    at = ((index % count) + count) % count;
    place();
  }
  stage.addEventListener("dragstart", (event) => event.preventDefault());
  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const from = event.clientX;
    dx = 0;
    dragged = false;
    const move = (e) => {
      dx = e.clientX - from;
      if (Math.abs(dx) > 6) dragged = true;
      if (dragged) stage.classList.add("is-dragging"), place();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      stage.classList.remove("is-dragging");
      const step = Math.abs(dx) > CS_DRAG_PX ? -Math.sign(dx) : 0;
      dx = 0;
      go(at + step);
      // (the press it ends in is not a press on a card)
      setTimeout(() => (dragged = false), 0);
    };
    window.addEventListener("pointermove", move, { signal: scope.abort.signal });
    window.addEventListener("pointerup", up, { signal: scope.abort.signal });
    window.addEventListener("pointercancel", up, { signal: scope.abort.signal });
  });
  let wheel = 0;
  let still = 0;
  stage.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      wheel += event.deltaX;
      if (Math.abs(wheel) < CS_WHEEL_STEP_PX || performance.now() < still) return;
      go(at + Math.sign(wheel));
      wheel = 0;
      still = performance.now() + 500;
    },
    { passive: false }
  );
  let seen = false;
  observe(([entry]) => (seen = entry.isIntersecting), stage);
  window.addEventListener(
    "keydown",
    (event) => {
      if (!seen || event.target.closest("input, textarea")) return;
      if (event.key === "ArrowRight") go(at + 1);
      else if (event.key === "ArrowLeft") go(at - 1);
    },
    { signal: scope.abort.signal }
  );
  onView(place);
  box.append(stage, lines);
  go(0);
}

// The end's background: Contact's aura (contact.js), its circle, colours,
// rim and grain (aura.js) — its yellow middle just under the end's foot,
// gone to the page's black upwards — on a canvas as big as the end's last
// screen (case.css: not in the stretch of black over it): where the screen
// is so wide that the circle would go over that screen's top, it is made
// only as big as reaches it, CS_END_AURA_PAD_PX under it (no line where it
// begins, on the black before it). As that screen comes up, from its top
// at the screen's foot to its foot there, the aura
// brightens with the scroll as Contact's does (from
// CONTACT_AURA_FROM_INTENSITY to CONTACT_AURA_INTENSITY, quickly at first;
// scrub: CS_SCRUB, both ways).
function endAura(end) {
  const canvas = element("canvas", "cs-end-aura");
  canvas.setAttribute("aria-hidden", "true");
  end.prepend(canvas);
  const aura = createAuraCanvas(canvas, CS_BLACK);
  scope.undo.push(() => aura.dispose());
  const state = { up: reducedMotion ? 1 : 0 };
  const draw = () => {
    aura.uniforms.uAlpha.value = CONTACT_AURA_FROM_INTENSITY + (CONTACT_AURA_INTENSITY - CONTACT_AURA_FROM_INTENSITY) * (1 - (1 - state.up) ** 3);
    aura.draw();
  };
  const size = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const shape = auraFinalShape(width, height);
    aura.size(width, height);
    aura.uniforms.uCenter.value.set(shape.cx, height - shape.cy);
    aura.uniforms.uRadius.value = Math.min(shape.r, height - shape.cy - CS_END_AURA_PAD_PX);
    draw();
  };
  size();
  onView(size);
  if (!reducedMotion) gsap.to(state, { up: 1, ease: "none", onUpdate: draw, scrollTrigger: { trigger: canvas, start: "top bottom", end: "bottom bottom", scrub: CS_SCRUB } });
}

// The bar at the screen's foot.
function barBlock(project) {
  const bar = element("nav", "cs-bar is-hidden");
  bar.setAttribute("aria-label", "This project");
  const back = element("a", "cs-bar-back", "← Back");
  back.href = "works.html";
  const name = element("span", "cs-bar-name", plainTitle(project.title));
  const left = element("div", "cs-bar-left");
  left.append(back, element("span", "cs-bar-sep", "|"), name);
  bar.append(left);
  return bar;
}

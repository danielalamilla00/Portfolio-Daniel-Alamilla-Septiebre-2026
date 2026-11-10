import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyGrain } from "./grain.js";
import { onViewportChange, MOBILE_MAX_PX } from "./viewport.js";
import { plainTitle } from "./title.js";
import { nextProjects, projectUrl } from "./data/projects.js";
import { projectEnd } from "./project-end.js";
import { setSource, upgrade } from "./video-source.js";
import { playButton } from "./play-button.js";

gsap.registerPlugin(ScrollTrigger);

// ---- A project's page, as a case study (projects.js: layout: "case") ---------------
// The third template for a project's page (work.html), in sections that take
// turns on two grounds — dark (the page's black, words in cream) and light
// (cream, words in #141414), each with the web's grain — and that come up
// over the one before as the page is scrolled, a straight edge: each held
// (pinned) while the next comes up over it and covers it. In order:
//   - the cover (dark): the video, the whole screen, muted, in a loop, clean
//     (a soft shade at the bottom left only); the name at the bottom left,
//     small over it the client and the city; nothing to press (the whole
//     video, with its sound, is the final result's). Held (from its top,
//     CS_STACK_VH of scroll), the next section covers it; nothing on it
//     moves by itself;
//   - the statement (light): a big sentence whose words light up one after
//     another as it crosses the screen; on the right, lower, "(About the
//     project)" and its text; its tags and its facts; a picture, at
//     CS_WIDEN_FROM of the width, held once in the screen's middle — one
//     timeline on that hold: its mask opens to the whole screen, edge to
//     edge (CS_HOLD_WIDEN_VH of scroll), the picture in it growing to
//     CS_HOLD_ZOOM, stays whole and still (CS_HOLD_STILL_VH), and only then
//   - one dark layer, to the end, comes up over it: the creative response (a
//     big sentence lighting up the same way; the concept and the result; two
//     pictures out of line, each moving at its own pace, if it has any); the
//     final result (its videos, still — a poster and a round "Play" — until
//     one is pressed); its cut-downs for social media, if it has them
//     (vertical videos in a row, played one at a time); a carousel of its
//     pictures
//     (CS_CAROUSEL_MAX at the most, none under two: arrows, dragged, swiped);
//     and at its end the aura of the home's Contact, growing up from its
//     foot, with the related projects over it (three, in a row scrolled
//     sideways, dots) and the page's foot (project-end.js) — all one black,
//     no edge in it.
// Over all of it but the cover, the aura and the foot, a bar fixed at the
// screen's foot:
// back, the project's name, the related projects, "Contact us" — in the
// colours of the ground under it. Labels, texts and facts come in fading and
// rising; pictures fading in from a little bigger, moving gently inside their
// frame with the scroll.
//   CS_STACK_VH          how long a section is held while the next one comes
//                        up over it, in hundredths of the screen's height
//   CS_LIT_FROM          how lit a big sentence's words are before the scroll
//                        lights them up (their opacity)
//   CS_WIDEN_FROM        how much of the column's width the held picture's
//                        mask shows at first
//   CS_HOLD_WIDEN_VH     the scroll the held picture widens over, and
//   CS_HOLD_STILL_VH     ...the scroll it then stays whole and still, before
//                        the dark layer comes up (hundredths of the screen)
//   CS_HOLD_ZOOM         how big the held picture grows inside its frame as
//                        it widens (from 1; then it stays so)
//   CS_REVEAL_*          how words and pictures come in (once, at
//                        CS_REVEAL_START): from CS_REVEAL_RISE_PX lower, in
//                        CS_REVEAL_S, one CS_REVEAL_STAGGER_S after another;
//                        pictures from CS_REVEAL_SCALE
//   CS_INNER_PARALLAX    how far a picture moves inside its frame (% of it)
//   CS_PAIR_PARALLAX_VH  how far the two pictures out of line move, each
//   CS_SCRUB             the scroll-driven moves' damping (the web's: scrub 1)
//   CS_DRAG_PX           how far a drag goes to change the carousel's picture
//   CS_CAROUSEL_MAX      how many pictures the carousel has at the most
const CS_STACK_VH = 100;
const CS_LIT_FROM = 0.15;
const CS_WIDEN_FROM = 0.6;
const CS_HOLD_WIDEN_VH = 70;
const CS_HOLD_STILL_VH = 30;
const CS_HOLD_ZOOM = 1.12;
const CS_REVEAL_START = "top 85%";
const CS_REVEAL_S = 0.9;
const CS_REVEAL_STAGGER_S = 0.08;
const CS_REVEAL_RISE_PX = 40;
const CS_REVEAL_SCALE = 1.04;
const CS_INNER_PARALLAX = 5;
const CS_PAIR_PARALLAX_VH = [6, 18];
const CS_SCRUB = 1;
const CS_DRAG_PX = 60;
const CS_CAROUSEL_MAX = 3;
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

// A picture of the project's (its two sizes: <base>-1280.webp, -2400.webp),
// `size` its [width, height], from which its box is made before it comes in.
function picture({ src, alt }, sizes, className, size) {
  const image = element("img", className);
  image.src = encodeURI(`${src}-1280.webp`);
  image.srcset = `${encodeURI(`${src}-1280.webp`)} 1280w, ${encodeURI(`${src}-2400.webp`)} 2400w`;
  image.sizes = sizes;
  image.alt = alt;
  [image.width, image.height] = size;
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

// A sentence in the web's two letters, a word at a time (so that its words
// can light up one by one): its *words between asterisks* in Catavalo
// (`displayClass`: in the gradient on the dark, .title-display on the light),
// the rest in Inter Tight.
function phrase(text, displayClass) {
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
const highlight = (tone) => (tone === "dark" ? "title-gradient" : "title-display");

// What it gives back: what takes the page down again (project.js, another
// project shown in its place).
export function renderCase(project) {
  const data = project.case;
  // (never another template in its place: a project with no case is a mistake in projects.js)
  if (!data) throw new Error(`projects.js: "${project.slug}" has no case`);
  const mine = (scope = { abort: new AbortController(), undo: [] });
  const context = gsap.context(() => {});
  const size = data.pictureSize;
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
  // (the one column of the cream and the dark sections: case.css, .cs-col)
  const column = (...parts) => {
    const box = element("div", "cs-col");
    box.append(...parts);
    return box;
  };
  const statement = (text, tone) => {
    const big = element("p", "cs-statement");
    big.append(...phrase(text, highlight(tone)));
    return big;
  };
  // (its shape: the pictures' — `shape` another [width, height], or null:
  // the stylesheet's —; what of the picture it shows: its focus, if it says)
  const frame = (one, sizes, className = "", shape = size) => {
    const box = element("figure", `cs-frame ${className}`);
    if (shape) box.style.aspectRatio = `${shape[0]} / ${shape[1]}`;
    const image = picture(one, sizes, "cs-picture", size);
    if (one.focus) image.style.objectPosition = one.focus;
    box.appendChild(image);
    return box;
  };

  // -- the cover
  const cover = section("dark", "cover");
  const coverVideo = element("video", "cs-cover-video");
  coverVideo.muted = true;
  coverVideo.defaultMuted = true;
  coverVideo.loop = true;
  coverVideo.playsInline = true;
  coverVideo.autoplay = true;
  coverVideo.poster = encodeURI(project.poster);
  coverVideo.setAttribute("aria-hidden", "true");
  // (its own video, or the one the project gives its cover)
  setSource(coverVideo, data.coverVideo || project, Math.round(window.innerWidth * window.devicePixelRatio));
  const heading = element("div", "cs-cover-heading");
  const name = element("h1", "cs-cover-title");
  data.coverTitle.forEach((line) => {
    const one = element("span", "cs-cover-line");
    one.append(...phrase(line, "title-gradient"));
    name.appendChild(one);
  });
  heading.append(element("p", "cs-kicker", data.coverKicker), name);
  cover.append(coverVideo, element("div", "cs-cover-shade"), heading);

  // -- the statement
  const intro = section("light", "intro");
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
  // (always its 2400 file, a phone's too: it grows to CS_HOLD_ZOOM in its frame — holdPicture())
  const wide = frame(data.picture, "1400px", "cs-wide", null);
  intro.appendChild(column(statement(data.statement, "light"), about, meta, wide));

  // -- the dark layer, to the end: the creative response and the result…
  const creative = section("dark", "creative");
  const concept = element("div", "cs-aside");
  concept.append(label("(Creative response)"), ...data.creative.paragraphs.map((text) => element("p", "cs-copy", text)));
  (data.creative.more || []).forEach(({ label: name, text }) => concept.append(label(name), element("p", "cs-copy", text)));
  const darkColumn = column(statement(data.creative.statement, "dark"), concept);
  creative.appendChild(darkColumn);
  // …its two pictures out of line, if it has them…
  const pairFrames = (data.creative.pictures || []).map((one, index) => frame(one, phone() ? "92vw" : "48vw", `cs-pair-${index + 1}`, [1, 1]));
  if (pairFrames.length) {
    const pair = element("div", "cs-pair");
    pair.append(...pairFrames);
    darkColumn.appendChild(pair);
  }
  // …the final result…
  const final = finalBlock(project, data.final);
  darkColumn.appendChild(final.block);
  // …its cut-downs for social media, if it has them…
  if (data.social && data.social.videos.length) darkColumn.appendChild(socialBlock(project, data.social));

  // …the carousel (two pictures at the least)…
  const carouselPictures = data.carousel.slice(0, CS_CAROUSEL_MAX);
  if (carouselPictures.length >= 2) darkColumn.appendChild(carouselBlock(carouselPictures, size).box);
  // (room under the statement, where its picture widens and stays: the dark
  // layer comes after it — holdPicture())
  const room = element("div", "cs-hold-room");
  room.setAttribute("aria-hidden", "true");
  page.append(cover, intro, room, creative);
  // …and the aura, with the page's foot, at its end (in it: no edge) — and
  // over it, the related projects
  const ending = projectEnd(creative);
  const end = ending.end;
  const related = relatedBlock(project);
  related.id = "related";
  end.insertBefore(related, end.querySelector(".pj-foot"));

  const bar = barBlock(project);
  document.body.appendChild(bar);

  applyGrain();
  context.add(() => stack(sections));
  watchTones(sections, end, bar);
  playWhileSeen(coverVideo, cover);
  document.fonts.ready.then(() => {
    if (mine.dead) return;
    context.add(() => {
      page.querySelectorAll(".cs-statement").forEach(lightUp);
      holdPicture(intro, wide, room, size);
      comeIn(page);
      drift(pairFrames);
    });
    ScrollTrigger.refresh();
  });
  // (measured again once the videos and pictures are in)
  let soon = 0;
  const later = () => {
    clearTimeout(soon);
    soon = setTimeout(() => ScrollTrigger.refresh(), 200);
  };
  page.querySelectorAll("img").forEach((image) => image.addEventListener("load", later, { once: true }));
  page.querySelectorAll("video").forEach((video) => video.addEventListener("loadedmetadata", later, { once: true }));
  onView(() => ScrollTrigger.refresh());

  return () => {
    mine.dead = true;
    clearTimeout(soon);
    mine.abort.abort();
    mine.undo.forEach((undo) => undo());
    context.revert();
    // (and what was made later, on a new size: holdPicture())
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    page.querySelectorAll("video").forEach((video) => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
    if (document.fullscreenElement) document.exitFullscreen();
    ending.destroy();
    page.replaceChildren();
    page.classList.remove("cs");
    bar.remove();
    document.body.classList.remove("is-case");
  };
}

// The cover held from its top, for CS_STACK_VH of scroll, while the
// statement — over it — comes up and covers it.
function stack(boxes) {
  boxes.forEach((box, index) => (box.style.zIndex = String(index + 1)));
  ScrollTrigger.create({
    trigger: boxes[0],
    start: "top top",
    end: () => `+=${(window.innerHeight * CS_STACK_VH) / 100}`,
    pin: true,
    pinSpacing: false,
    // (not anticipated: measured frame by frame under a wheel, 1 made the
    // sections jump 72 to 104px as they were pinned; 0, none)
    anticipatePin: 0,
    invalidateOnRefresh: true,
  });
}

// The statement held once its picture is in the screen's middle, on one
// timeline: its mask opens from CS_WIDEN_FROM of the column's width to the
// whole screen — the frame is the screen's size, case.css — (CS_HOLD_WIDEN_VH
// of scroll) — the picture inside its frame growing from 1
// to CS_HOLD_ZOOM meanwhile —, stays whole and still (CS_HOLD_STILL_VH),
// and the dark layer — after the room those two take (`room`) — comes up
// over it until its top gets to the screen's. Made again on a new size.
function holdPicture(statement, picture, room, [width, height]) {
  const image = picture.querySelector(".cs-picture");
  const set = (x, y) => (picture.style.clipPath = `inset(${y.toFixed(2)}px ${x.toFixed(2)}px)`);
  let timeline = null;
  const make = () => {
    if (timeline) timeline.scrollTrigger.kill(true), timeline.kill();
    // (the whole screen: its width without the scroll bar — case.css)
    statement.closest(".pj").style.setProperty("--cs-screen", `${document.documentElement.clientWidth}px`);
    const vh = window.innerHeight / 100;
    const widenPx = CS_HOLD_WIDEN_VH * vh;
    const stillPx = CS_HOLD_STILL_VH * vh;
    room.style.height = `${widenPx + stillPx}px`;
    if (reducedMotion) return set(0, 0), gsap.set(image, { scale: CS_HOLD_ZOOM });
    // (where the mask starts: CS_WIDEN_FROM of the column's width, as tall as
    // the picture is at the column's — no taller than the screen —, in the
    // middle of the frame)
    const column = picture.parentElement.clientWidth;
    const from = { x: (picture.offsetWidth - CS_WIDEN_FROM * column) / 2, y: Math.max((picture.offsetHeight - (column * height) / width) / 2, 0) };
    // (the dark layer's way up: from under the statement's foot, after the
    // room, to the screen's top — measured with the picture in the middle)
    const coverPx = statement.offsetHeight - (picture.offsetTop + picture.offsetHeight / 2) + window.innerHeight / 2;
    const state = { ...from };
    set(from.x, from.y);
    gsap.set(image, { scale: 1 });
    timeline = gsap.timeline({
      scrollTrigger: {
        trigger: picture,
        start: "center center",
        end: `+=${widenPx + stillPx + coverPx}`,
        pin: statement,
        pinSpacing: false,
        anticipatePin: 0,
        scrub: CS_SCRUB,
      },
    });
    timeline
      .to(state, { x: 0, y: 0, ease: "none", duration: widenPx, onUpdate: () => set(state.x, state.y) })
      .to(image, { scale: CS_HOLD_ZOOM, ease: "none", duration: widenPx }, 0)
      .to({}, { duration: stillPx + coverPx });
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
// are over the ones before), and so its colours; hidden over the cover, and
// over the aura and the foot (`end`).
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

// A muted loop moving only while `box` is seen.
function playWhileSeen(video, box) {
  observe(([entry]) => (entry.isIntersecting ? video.play().catch(() => {}) : video.pause()), box);
}

// Coming in, once: labels, texts, tags, facts and cards fading and rising,
// one after another in their block; pictures fading in from a little bigger,
// and moving inside their frame with the scroll.
function comeIn(page) {
  if (reducedMotion) return;
  const from = { opacity: 0, y: CS_REVEAL_RISE_PX, duration: CS_REVEAL_S, ease: "power3.out" };
  page.querySelectorAll(".cs-aside, .cs-tags, .cs-facts, .cs-related-row, .cs-final-head, .cs-social-head").forEach((block) => {
    gsap.from(Array.from(block.children), { ...from, stagger: CS_REVEAL_STAGGER_S, scrollTrigger: { trigger: block, start: CS_REVEAL_START, once: true } });
  });
  // (the vertical videos: fading in only, nothing else moving them)
  page.querySelectorAll(".cs-social-row").forEach((row) => {
    gsap.from(Array.from(row.children), { opacity: 0, duration: CS_REVEAL_S, ease: "power3.out", stagger: CS_REVEAL_STAGGER_S, scrollTrigger: { trigger: row, start: CS_REVEAL_START, once: true } });
  });
  page.querySelectorAll(".cs-frame").forEach((frame) => {
    const image = frame.querySelector(".cs-picture");
    gsap.from(frame, { opacity: 0, duration: CS_REVEAL_S, ease: "power3.out", scrollTrigger: { trigger: frame, start: CS_REVEAL_START, once: true } });
    if (frame.classList.contains("cs-wide")) return;
    gsap.from(image, { scale: CS_REVEAL_SCALE, duration: CS_REVEAL_S * 1.4, ease: "power3.out", scrollTrigger: { trigger: frame, start: CS_REVEAL_START, once: true } });
    if (!frame.closest(".cs-carousel")) gsap.fromTo(image, { yPercent: -CS_INNER_PARALLAX }, { yPercent: CS_INNER_PARALLAX, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: CS_SCRUB } });
  });
}

// The two pictures out of line, each moving up at its own pace.
function drift(frames) {
  if (reducedMotion || phone()) return;
  frames.forEach((frame, index) => {
    const vh = CS_PAIR_PARALLAX_VH[index] || CS_PAIR_PARALLAX_VH[0];
    gsap.fromTo(frame, { y: () => (window.innerHeight * vh) / 100 }, { y: () => (-window.innerHeight * vh) / 100, ease: "none", scrollTrigger: { trigger: frame.parentElement, start: "top bottom", end: "bottom top", scrub: CS_SCRUB, invalidateOnRefresh: true } });
  });
}

// A video played: the play / pause button (play-button.js) in `playHost` —
// it, or the video, pressed: from its start, in a loop, with its sound and
// controls of its own (play / pause, where it is, sound, full screen: of
// `box`), `watchHost` marked .is-watching; a bigger file in full screen
// (video-source.js).
function playable(project, { box: cover, video: first, playHost, watchHost }) {
  let video = first;
  const play = playButton(playHost, () => video, () => {
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
  cover.appendChild(controls);
  playHost.appendChild(play);
  // (what the one playing says — a bigger file takes over: video-source.js —,
  // heard at the cover: a video's events come through it on their way down)
  const mine = (event) => event.target === video;
  cover.addEventListener("play", (event) => mine(event) && (toggle.textContent = "Pause"), true);
  cover.addEventListener("pause", (event) => mine(event) && (toggle.textContent = "Play"), true);
  cover.addEventListener("volumechange", (event) => mine(event) && (sound.textContent = video.muted ? "Sound on" : "Sound off"), true);
  cover.addEventListener("timeupdate", (event) => mine(event) && video.duration && (fill.style.transform = `scaleX(${(video.currentTime / video.duration).toFixed(4)})`), true);
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
    full.addEventListener("click", () => (document.fullscreenElement ? document.exitFullscreen() : cover.requestFullscreen()));
    document.addEventListener(
      "fullscreenchange",
      () => {
        full.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
        if (document.fullscreenElement === cover) upgrade(video, project, Math.round(window.screen.width * window.devicePixelRatio), (next) => (video = next));
      },
      { signal: scope.abort.signal }
    );
  } else full.hidden = true;
}

// The final result: its label and title (coming in as the others); its
// videos (case.final.videos: each its files — the project's, if it gives
// none — its poster and a line), one under another, each centered, as wide
// as case.css's --case-video-width at the most, 16:9 — or, `grid`, square
// ones in a grid in that width (three a row, the last row centered; two on
// a tablet, one on a phone), one playing at a time —; each still — a sharp
// frame of it and a round "Play" in its middle — until it, or the video, is
// pressed: then from its start, with its sound, its controls (playable()),
// in a loop. Only what it needs to start is loaded until then (preload
// "metadata"); off the screen it stops; a line under it. What it gives back:
// the block.
function finalBlock(project, { label: text, title, videos, grid = false }) {
  const block = element("div", "cs-final");
  const head = element("div", "cs-final-head");
  const heading = element("h2", "cs-final-title");
  heading.append(...phrase(title, "title-gradient"));
  head.append(element("p", "cs-label", text), heading);
  block.appendChild(head);
  const list = grid ? element("div", "cs-final-grid") : block;
  if (grid) block.appendChild(list);
  videos.forEach((one) => {
    const files = { title: project.title, video: one.video || project.video, videoSizes: one.videoSizes || project.videoSizes };
    const wrap = element("div", "cs-final-wrap");
    const box = element("div", "cs-final-box");
    const video = element("video", "cs-final-video");
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = encodeURI(one.poster || project.poster);
    video.setAttribute("aria-label", `${plainTitle(project.title)}: ${one.line}`);
    // (its file by its width on the screen: the column's, or a grid's cell)
    setSource(video, files, Math.round(window.innerWidth * (grid && !phone() ? 0.25 : 0.92) * window.devicePixelRatio));
    box.appendChild(video);
    wrap.appendChild(box);
    playable(files, { box, video, playHost: wrap, watchHost: wrap });
    const foot = element("div", "cs-final-line");
    foot.appendChild(element("p", "cs-caption", one.line));
    if (grid) {
      const item = element("figure", "cs-final-item");
      item.append(wrap, foot);
      list.appendChild(item);
    } else block.append(wrap, foot);
    observe(([entry]) => {
      if (entry.isIntersecting) return;
      const now = box.querySelector(".cs-final-video:last-of-type") || video;
      now.pause();
    }, box);
  });
  // (a grid: one at a time — one starting stops the others, whichever file each plays)
  if (grid)
    list.addEventListener(
      "play",
      (event) => list.querySelectorAll(".cs-final-video").forEach((video) => video === event.target || video.pause()),
      true
    );
  return { block };
}

// The cut-downs for social media: a label, a title and a line of text (coming
// in as the others); the vertical videos (case.social.videos: each its files,
// <video>-<width>.mp4: 1080 is 1080x1920, 720 is 720x1280 — its poster and a
// line), a row of them (a phone: scrolled sideways, snapping), each playing
// by itself, muted, in a loop, while it is on the screen — nothing to press,
// as the cover's. What it gives back: the block.
function socialBlock(project, { label: text, title, text: words, videos }) {
  const block = element("div", "cs-social");
  const head = element("div", "cs-social-head");
  const heading = element("h2", "cs-final-title");
  heading.append(...phrase(title, "title-gradient"));
  head.append(element("p", "cs-label", text), heading, element("p", "cs-copy cs-social-text", words));
  const row = element("div", "cs-social-row");
  videos.forEach((one) => {
    const item = element("figure", "cs-social-item");
    const box = element("div", "cs-social-box");
    const video = element("video", "cs-social-video");
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = encodeURI(one.poster);
    video.setAttribute("aria-label", `${plainTitle(project.title)}: ${one.line}`);
    // (its file by its width on the screen: a third of the row's, or most of a phone's)
    setSource(video, one, Math.round(window.innerWidth * (phone() ? 0.75 : 0.3) * window.devicePixelRatio));
    box.appendChild(video);
    item.append(box, element("figcaption", "cs-caption", one.line));
    row.appendChild(item);
    playWhileSeen(video, box);
  });
  block.append(head, row);
  return block;
}

// The carousel: one picture at a time, sliding; arrows at its foot, on the
// right; dragged with a mouse, swiped with a finger.
function carouselBlock(pictures, size) {
  const box = element("div", "cs-carousel");
  const view = element("div", "cs-carousel-view");
  const track = element("div", "cs-track");
  pictures.forEach((one) => {
    const slide = element("figure", "cs-frame cs-slide");
    slide.style.aspectRatio = `${size[0]} / ${size[1]}`;
    const image = picture(one, "92vw", "cs-picture", size);
    image.draggable = false;
    slide.appendChild(image);
    track.appendChild(slide);
  });
  view.appendChild(track);
  const arrows = element("div", "cs-arrows");
  const back = element("button", "cs-arrow", "←");
  const on = element("button", "cs-arrow", "→");
  back.type = on.type = "button";
  back.setAttribute("aria-label", "Previous picture");
  on.setAttribute("aria-label", "Next picture");
  arrows.append(back, on);
  box.append(view, arrows);
  let at = 0;
  const place = (dx = 0) => (track.style.transform = `translateX(calc(${-at} * (100% + var(--cs-slide-gap)) + ${dx}px))`);
  const go = (index) => {
    at = Math.min(Math.max(index, 0), pictures.length - 1);
    back.disabled = at === 0;
    on.disabled = at === pictures.length - 1;
    place();
  };
  back.addEventListener("click", () => go(at - 1));
  on.addEventListener("click", () => go(at + 1));
  let startX = null;
  let dx = 0;
  view.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    dx = 0;
    view.setPointerCapture(event.pointerId);
    track.classList.add("is-dragging");
  });
  view.addEventListener("pointermove", (event) => {
    if (startX === null) return;
    dx = event.clientX - startX;
    place(dx);
  });
  const release = () => {
    if (startX === null) return;
    startX = null;
    track.classList.remove("is-dragging");
    go(Math.abs(dx) > CS_DRAG_PX ? at - Math.sign(dx) : at);
  };
  view.addEventListener("pointerup", release);
  view.addEventListener("pointercancel", release);
  go(0);
  return { box };
}

// The related projects: the next three of the Works page, a row scrolled
// sideways, each its poster with its name over it; dots under them.
function relatedBlock(project) {
  const box = element("div", "cs-related");
  box.appendChild(element("p", "cs-label", "(Related projects)"));
  const row = element("div", "cs-related-row");
  const dots = element("div", "cs-dots");
  const cards = nextProjects(project, 3).map((next) => {
    const card = element("a", "cs-card");
    card.href = projectUrl(next);
    const image = element("img", "cs-card-picture");
    image.src = encodeURI(next.poster);
    image.alt = "";
    image.loading = "lazy";
    const name = element("span", "cs-card-name");
    name.append(...phrase(next.title, "title-display"));
    card.append(image, name);
    row.appendChild(card);
    const dot = element("button", "cs-dot");
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to ${plainTitle(next.title)}`);
    dot.addEventListener("click", () => row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: "smooth" }));
    dots.appendChild(dot);
    return card;
  });
  const mark = () => {
    const at = cards.reduce((best, card, k) => (Math.abs(card.offsetLeft - row.offsetLeft - row.scrollLeft) < Math.abs(cards[best].offsetLeft - row.offsetLeft - row.scrollLeft) ? k : best), 0);
    Array.from(dots.children).forEach((dot, k) => dot.classList.toggle("is-on", k === at));
  };
  row.addEventListener("scroll", mark, { passive: true });
  mark();
  box.append(row, dots);
  return box;
}

// The bar at the screen's foot.
function barBlock(project) {
  const bar = element("nav", "cs-bar is-hidden");
  bar.setAttribute("aria-label", "This project");
  const back = element("a", "cs-bar-back", "← Back");
  back.href = "works.html";
  const name = element("span", "cs-bar-name", plainTitle(project.title));
  const related = element("a", "cs-bar-related", "Related projects ⊡");
  related.href = "#related";
  related.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelector("#related").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  });
  const contact = element("a", "cs-bar-contact", "Contact us ↗");
  contact.href = "index.html#contact";
  const left = element("div", "cs-bar-left");
  left.append(back, element("span", "cs-bar-sep", "|"), name, element("span", "cs-bar-sep", "|"), related);
  bar.append(left, contact);
  return bar;
}

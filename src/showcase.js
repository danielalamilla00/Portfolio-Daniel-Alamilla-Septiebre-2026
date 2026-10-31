import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyGrain } from "./grain.js";
import { onViewportChange, MOBILE_MAX_PX } from "./viewport.js";
import { plainTitle, titleParts } from "./title.js";
import { projectEnd } from "./project-end.js";
import { setSource, upgrade } from "./video-source.js";

// ---- A project's page, as a showcase (projects.js: layout: "showcase") ------------
// The other template for a project's page (work.html; the usual one is
// project.js's), in screens that go over one another as the page is scrolled:
//   - its cover: a picture of it in use, the whole screen; its name big at the
//     bottom left, over a shade; "← All works" at the top left, under the
//     nav. The cover stays (pinned) while
//   - the first sheet, black, comes up over it from below: "Details", what it
//     was for, and its facts (client, role, tools, year, event, venue);
//   - its video, playing muted in a loop, in the middle at SC_VIDEO_FROM_VW of
//     the screen's width, 16:9; held there (pinned), it grows with the scroll
//     (SC_VIDEO_GROW_VH) until it is the whole screen, and stays so for
//     SHOWCASE_VIDEO_HOLD_VH of scroll — its sound only if it was asked for
//     (its button, always on it);
//   - the second sheet comes up over the whole-screen video: the concept (a
//     title and a text), two pictures of it in use side by side, the
//     challenge, a third picture whole with its caption, the result;
//   - "Explore more", the next three projects, the way back to all of them,
//     the page's foot — over the aura coming up from below (project-end.js,
//     as the usual template's end), right after the result: the aura bigger
//     (SC_END_AURA_SCALE), the block in the middle of the page's last screen.
// The sheets' words and pictures, and the end's, come in once, one after
// another, as their block gets on the screen (comeIn). Every
// move is a transform or an opacity; the scroll-driven ones follow the scroll
// with the web's damping (the cover's: scrub 1, as the home's; the video's:
// SC_DAMPING, as the home's aura and Works).
//   SHOWCASE_VIDEO_HOLD_VH   how long the whole-screen video stays, in scroll
//                            (hundredths of the screen's height; a phone's:
//                            SC_VIDEO_HOLD_PHONE_VH)
//   SC_VIDEO_GROW_VH         how much scroll the video takes to grow
//   SC_VIDEO_FROM_VW         how wide the video is before it grows (a phone's:
//                            SC_VIDEO_FROM_PHONE_VW)
//   SC_PRELOAD_MARGIN        how far from the screen the video starts to load
//   SC_REVEAL_*              how words and pictures come in (comeIn)
//   SHOWCASE_INTRO_BG        the first sheet's colour, and the video's ground
//                            under it — one, with no edge between them (a
//                            colour of the palette's, palette.js: the words and
//                            lines over it in the dark, showcase.css)
//   SC_END_AURA_SCALE        the end's aura, in times the usual one's size
//   SC_END_AURA_INTENSITY    ...and its light (project-end.js: bigger, more
//                            of it is under the words — measured, WCAG AA)
//   SC_ANTICIPATE_PIN        GSAP's anticipatePin for the two pins (0:
//                            measured frame by frame under a wheel, 1 made
//                            the layers jump 90 to 150px going into a pin)
//   SC_DAMPING               how fast the video follows the scroll:
//                            1 - exp(-SC_DAMPING * seconds) of the way a frame
const SHOWCASE_VIDEO_HOLD_VH = 150;
const SC_VIDEO_HOLD_PHONE_VH = 80;
const SC_VIDEO_GROW_VH = 100;
const SC_VIDEO_FROM_VW = 70;
const SC_VIDEO_FROM_PHONE_VW = 90;
const SC_PRELOAD_MARGIN = "100% 0px";
const SC_ANTICIPATE_PIN = 0;
const SC_DAMPING = 5;
const SC_REVEAL_START = "top 85%";
const SC_REVEAL_S = 0.9;
const SC_REVEAL_STAGGER_S = 0.08;
const SC_REVEAL_RISE_PX = 40;
const SC_REVEAL_SCALE = 1.04;
const SHOWCASE_INTRO_BG = "#0a0a0a"; // (the page's black; tried: var(--c-orange))
const SC_END_AURA_SCALE = 1.4;
const SC_END_AURA_INTENSITY = 0.42;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}
const phone = () => window.innerWidth <= MOBILE_MAX_PX;

// A picture of the project's (its two sizes: <base>-1280.webp, -2400.webp).
function picture({ src, alt }, sizes, className, eager) {
  const image = element("img", className);
  image.src = encodeURI(`${src}-1280.webp`);
  image.srcset = `${encodeURI(`${src}-1280.webp`)} 1280w, ${encodeURI(`${src}-2400.webp`)} 2400w`;
  image.sizes = sizes;
  image.alt = alt;
  image.width = 2400;
  image.height = 1340;
  if (eager) image.fetchPriority = "high";
  else image.loading = "lazy";
  image.decoding = "async";
  return image;
}

export function renderShowcase(project) {
  const data = project.showcase;
  document.title = `alamilla | ${plainTitle(project.title)}`;
  document.body.classList.add("is-showcase");
  const page = document.querySelector(".pj");
  page.classList.add("sc");
  // (the first sheet's colour, and the video's under it: one ground, before
  // their grain is made of it)
  page.style.setProperty("--sc-intro-bg", SHOWCASE_INTRO_BG);

  // -- the cover
  const cover = element("section", "sc-cover");
  cover.appendChild(picture(data.cover, "100vw", "sc-cover-picture", true));
  cover.appendChild(element("div", "sc-cover-shade"));
  const back = element("a", "sc-back", "← All works");
  back.href = "works.html";
  const name = element("h1", "sc-title");
  name.append(...titleParts(project.title, "title-gradient"));
  cover.append(back, name);

  // -- the first sheet: details
  const intro = element("section", "sc-sheet sc-intro grain");
  const introRow = row("Details");
  const facts = element("dl", "pj-facts sc-facts");
  [
    ["Client", project.client],
    ["Role", project.role],
    ["Tools", project.tools],
    ["Year", project.year],
    ["Event", project.event],
    ["Venue", project.venue],
  ].forEach(([key, value]) => {
    if (!value) return;
    const item = element("div", "pj-fact");
    item.append(element("dt", "pj-fact-name", key), element("dd", "pj-fact-value", value));
    facts.appendChild(item);
  });
  introRow.content.append(element("p", "sc-lead", project.idea), facts);
  intro.appendChild(introRow.row);

  // -- the video
  const film = filmBlock(project);

  // -- the second sheet: the project
  const sheet = element("section", "sc-sheet sc-project grain");
  // (its blocks: a title and a text each — the challenge's own, if a block has none)
  const blocks = data.blocks.map(({ label, title, text }) => {
    const block = row(label);
    const heading = element("h2", "sc-heading");
    heading.append(...titleParts(title, "title-gradient"));
    block.content.append(heading, element("p", "sc-copy", text || project.challenge));
    return block.row;
  });
  // (its pictures in two: the first two side by side after the first block,
  // the third whole, with the caption, after the second)
  const gallery = (pictures, caption) => {
    const figure = element("figure", "sc-gallery");
    const grid = element("div", "sc-gallery-grid");
    pictures.forEach((one) => grid.appendChild(picture(one, pictures.length > 1 && !phone() ? "45vw" : "92vw", `sc-gallery-picture${pictures.length > 1 ? "" : " is-wide"}`)));
    figure.appendChild(grid);
    if (caption) figure.appendChild(element("figcaption", "sc-caption", caption));
    return figure;
  };
  const pair = gallery(data.gallery.slice(0, 2));
  const wide = gallery(data.gallery.slice(2), data.caption);
  const result = row("Result");
  result.content.appendChild(element("p", "sc-copy", data.result));
  sheet.append(blocks[0], pair, ...blocks.slice(1), wide, result.row);


  page.append(cover, intro, film.hold, sheet);
  // -- the end: the next three projects, over the aura (bigger here, and on
  // a screen of its own)
  const end = projectEnd(project, page, "Explore *more*", { auraScale: SC_END_AURA_SCALE, auraIntensity: SC_END_AURA_INTENSITY, screen: true });
  applyGrain();
  move(cover, film);
  // (after the pins: what comes in is measured with their room in the page)
  const parts = (box) => [box.querySelector(".sc-label"), ...box.querySelector(".sc-row-content").children].flatMap((el) => (el.classList.contains("sc-facts") ? Array.from(el.children) : [el]));
  comeIn([
    [introRow.row, parts(introRow.row)],
    ...blocks.map((block) => [block, parts(block)]),
    ...[pair, wide].map((figure) => [figure, [...figure.querySelector(".sc-gallery-grid").children, ...figure.querySelectorAll(".sc-caption")]]),
    [result.row, parts(result.row)],
    [end.heading, [end.heading, ...end.cards, end.back]],
  ]);
}

// A sheet's row: its small label on the left, what it says on the right.
function row(label) {
  const box = element("div", "sc-row");
  const content = element("div", "sc-row-content");
  box.append(element("p", "sc-label", label), content);
  return { row: box, content };
}

// Words and pictures come in, once, when their block's top gets to
// SC_REVEAL_START: each from nothing and SC_REVEAL_RISE_PX lower, in
// SC_REVEAL_S (power3.out), one SC_REVEAL_STAGGER_S after the other; a
// picture, from SC_REVEAL_SCALE too. `groups`: [block, its parts].
function comeIn(groups) {
  if (reducedMotion) return;
  groups.forEach(([trigger, items]) =>
    gsap.from(items, {
      opacity: 0,
      y: SC_REVEAL_RISE_PX,
      scale: (index, item) => (item.tagName === "IMG" ? SC_REVEAL_SCALE : 1),
      duration: SC_REVEAL_S,
      ease: "power3.out",
      stagger: SC_REVEAL_STAGGER_S,
      scrollTrigger: { trigger, start: SC_REVEAL_START, once: true },
    })
  );
}

// The video: the project's own MP4, muted, in a loop — the file its size
// before it grows asks for (video-source.js), and, as soon as it starts to
// grow, the one the whole screen asks for, put in its place without a stop
// (grow()); loaded from a screen away, moving only while it is seen and not
// under the second sheet; its sound button ("Sound on" / "Sound off": what
// pressing it does) plays its sound from then on. What it gives back: its
// holder (the pin's spacer), the screen, the frame that grows, the button,
// cover(on) and grow().
function filmBlock(project) {
  const hold = element("div", "sc-film-hold");
  const screen = element("section", "sc-film grain");
  const frame = element("div", "sc-frame");
  let video = element("video", "sc-video");
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "none";
  video.poster = encodeURI(project.poster);
  video.setAttribute("aria-label", `${plainTitle(project.title)}: the video`);
  frame.appendChild(video);
  const sound = element("button", "sc-sound", "Sound on");
  sound.type = "button";
  let soundWanted = false;
  sound.addEventListener("click", () => {
    soundWanted = !soundWanted;
    video.muted = !soundWanted;
    sound.textContent = soundWanted ? "Sound off" : "Sound on";
  });
  screen.append(frame, sound);
  hold.appendChild(screen);

  const fromWidth = () => Math.round(((window.innerWidth * (phone() ? SC_VIDEO_FROM_PHONE_VW : SC_VIDEO_FROM_VW)) / 100) * window.devicePixelRatio);
  let sourced = false;
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return;
      sourced = true;
      video.preload = "auto";
      setSource(video, project, fromWidth());
      video.addEventListener("loadedmetadata", () => ScrollTrigger.refresh(), { once: true });
      observer.disconnect();
    },
    { rootMargin: SC_PRELOAD_MARGIN }
  ).observe(hold);
  let onScreen = false;
  let covered = false;
  const run = () => (onScreen && !covered ? video.play().catch(() => {}) : video.pause());
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    run();
  }).observe(screen);
  const cover = (on) => {
    covered = on;
    run();
  };
  const grow = () => sourced && upgrade(video, project, Math.round(window.innerWidth * window.devicePixelRatio), (next) => (video = next));
  return { hold, screen, frame, sound, cover, grow };
}

// The scroll's moves: the cover held while the first sheet comes up over it
// (and going a little back and dark under it); the video held while it grows
// to the whole screen, stays, and the second sheet comes up over it.
function move(cover, film) {
  const screenHeight = () => window.innerHeight;
  // (the second sheet starts a screen higher, over the held video: --sc-screen)
  const measure = () => document.documentElement.style.setProperty("--sc-screen", `${screenHeight()}px`);
  measure();
  ScrollTrigger.create({
    trigger: cover,
    start: "top top",
    end: () => `+=${screenHeight()}`,
    pin: true,
    pinSpacing: false,
    anticipatePin: SC_ANTICIPATE_PIN,
  });
  gsap.to(cover.querySelector(".sc-cover-picture"), {
    scale: 1.06,
    opacity: 0.35,
    ease: "none",
    scrollTrigger: { trigger: cover, start: "top top", end: () => `+=${screenHeight()}`, scrub: 1, invalidateOnRefresh: true },
  });

  const grow = () => (screenHeight() * SC_VIDEO_GROW_VH) / 100;
  const stay = () => (screenHeight() * (phone() ? SC_VIDEO_HOLD_PHONE_VH : SHOWCASE_VIDEO_HOLD_VH)) / 100;
  ScrollTrigger.create({
    trigger: film.hold,
    start: "top top",
    // (grows, stays, and a screen more while the second sheet comes up)
    end: () => `+=${grow() + stay() + screenHeight()}`,
    pin: film.screen,
    pinSpacer: film.hold,
    pinSpacing: true,
    anticipatePin: SC_ANTICIPATE_PIN,
    invalidateOnRefresh: true,
    onLeave: () => film.cover(true),
    onEnterBack: () => film.cover(false),
  });
  // The frame is the whole screen, the video covering it; before it grows it
  // is cut (clip-path) to the biggest 16:9 that fits the screen and made
  // smaller (scale) to SC_VIDEO_FROM_VW of the screen's width. Its button sits
  // inside its bottom right corner, all the way.
  const lerp = (a, b, t) => a + (b - a) * t;
  let grown = 0; // 0..1, eased
  const place = () => {
    const width = window.innerWidth;
    const height = screenHeight();
    const fitWidth = Math.min(width, (height * 16) / 9);
    const fitHeight = (fitWidth * 9) / 16;
    const fromScale = ((phone() ? SC_VIDEO_FROM_PHONE_VW : SC_VIDEO_FROM_VW) / 100) * (width / fitWidth);
    const t = grown < 0.5 ? 2 * grown * grown : 1 - (2 - 2 * grown) ** 2 / 2; // (in and out)
    const insetX = lerp((width - fitWidth) / 2, 0, t);
    const insetY = lerp((height - fitHeight) / 2, 0, t);
    const scale = lerp(fromScale, 1, t);
    film.frame.style.clipPath = `inset(${insetY}px ${insetX}px)`;
    film.frame.style.transform = `scale(${scale})`;
    const seenWidth = (width - 2 * insetX) * scale;
    const seenHeight = (height - 2 * insetY) * scale;
    film.sound.style.transform = `translate(${-(width - seenWidth) / 2}px, ${-(height - seenHeight) / 2}px)`;
  };
  // (how far it has grown follows how far through its growing the scroll is,
  // damped — and always gets there: a scrub jumped past its end once stopped
  // short of it, a line of black left round the video)
  let target = 0;
  let last = 0;
  let running = false;
  const tick = (now) => {
    const seconds = Math.min((now - last) / 1000, 0.1);
    last = now;
    grown = reducedMotion ? target : grown + (target - grown) * (1 - Math.exp(-SC_DAMPING * seconds));
    if (Math.abs(target - grown) < 0.0005) grown = target;
    place();
    running = grown !== target;
    if (running) requestAnimationFrame(tick);
  };
  const follow = (self) => {
    target = self.progress;
    if (target > 0) film.grow(); // (the whole screen's file, loaded as it starts to grow)
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  };
  ScrollTrigger.create({ trigger: film.hold, start: "top top", end: () => `+=${grow()}`, onUpdate: follow, onRefresh: follow });
  place();
  onViewportChange(() => {
    measure();
    place();
    ScrollTrigger.refresh();
  });
  // (again once its pictures are in: one refresh for all of them)
  let soon = 0;
  document.querySelectorAll(".sc img").forEach((image) =>
    image.addEventListener("load", () => {
      clearTimeout(soon);
      soon = setTimeout(() => ScrollTrigger.refresh(), 200);
    }, { once: true })
  );
}

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyGrain } from "./grain.js";
import { onViewportChange, MOBILE_MAX_PX } from "./viewport.js";
import { plainTitle } from "./title.js";
import { PROJECTS, nextProjects, projectUrl } from "./data/projects.js";
import { setSource, upgrade } from "./video-source.js";
import { playButton } from "./play-button.js";

gsap.registerPlugin(ScrollTrigger);

// ---- A project's page, as a case study (projects.js: layout: "case") ---------------
// A project's page (work.html), in sections that take turns on two grounds —
// dark (the page's black, words in cream) and light (cream, words in
// #141414), each with the web's grain — and that come up over the one
// before as the page is scrolled, a straight edge: each held (pinned) while
// the next comes up over it and covers it. In order:
//   - the cover (dark): the video, the whole screen, muted, in a loop, clean
//     (a soft shade at the bottom left only); the name at the bottom left,
//     small over it the client and the city; nothing to press (the whole
//     video, with its sound, is the final result's). Held (from its top,
//     CS_STACK_VH of scroll), the next section covers it; nothing on it
//     moves by itself;
//   - the statement (light): a big sentence whose words light up one after
//     another as it crosses the screen; on the right, lower, "(About the
//     project)" and its text; its tags and its facts; a picture, held once
//     in the screen's middle — one timeline on that hold: its mask opens from
//     its middle to the whole screen, edge to edge (CS_HOLD_WIDEN_VH of
//     scroll), the picture in it going from
//     CS_REVEAL_ZOOM down to 1, stays whole and still (CS_HOLD_STILL_VH), and
//     only then
//   - one dark layer, to the end, comes up over it: the creative response (a
//     big sentence lighting up the same way; the concept and the challenge;
//     two pictures out of line, if it has any, each coming in through a mask
//     that opens with the scroll: reveal()); the final result — its videos,
//     each the whole screen, clean, held (pinned) one after another, the next
//     coming up over the one before (fullFinals()); or square ones in a grid
//     (finalBlock()); its cut-downs for social media, if it has them; a
//     carousel of its pictures (CS_CAROUSEL_MAX at the most, none under two);
//     the last video fading to black at its foot, and from that black the
//     other projects, a carousel of them, and the page's foot (endBlock()).
// Over all of it but the cover and the end, a bar fixed at the screen's
// foot: back, the project's name, the related projects — in the
// colours of the ground under it. Labels, texts and facts come in fading and
// rising.
//   CS_STACK_VH          how long a section is held while the next one comes
//                        up over it, in hundredths of the screen's height
//   CS_LIT_FROM          how lit a big sentence's words are before the scroll
//                        lights them up (their opacity)
//   CS_HOLD_WIDEN_VH     the scroll the held picture widens over, and
//   CS_HOLD_STILL_VH     ...the scroll it then stays whole and still, before
//                        the dark layer comes up (hundredths of the screen)
//   CS_REVEAL_FROM(_PHONE)  how much of its own size a picture coming in
//                        through its mask shows at first, in its middle, its
//                        shape (a phone's) — the held one too
//   CS_REVEAL_ZOOM       how big the picture is inside its mask as it starts
//                        to open (it is 1 when the mask is open)
//   CS_REVEAL_*          how words come in (once, at CS_REVEAL_START): from
//                        CS_REVEAL_RISE_PX lower, in CS_REVEAL_S, one
//                        CS_REVEAL_STAGGER_S after another
//   CS_PAIR_PARALLAX_VH  how far the two pictures out of line move, each
//   CS_SCRUB             the scroll-driven moves' damping (the web's: scrub 1)
//   CS_DRAG_PX           how far a drag goes to change a carousel's card
//   CS_CAROUSEL_MAX      how many pictures the carousel has at the most
//   FINAL_VIDEO_HOLD_VH  how long each full-screen final video is held — a
//                        project's own: case.final.holdVh — (a phone, at
//                        the most: FINAL_VIDEO_HOLD_PHONE_VH), and
//   CS_FINAL_RISE_VH     ...how long the next takes to come up over it
//   CS_FINAL_FADE_VH     the last one's fade to black, at its foot: its
//                        height and the scroll it takes
//   CS_CURSOR_FOLLOW_S   how long the "Play" cursor takes to catch up with the
//   CS_CURSOR_HALO_S     pointer (gsap.quickTo), and its halo, a little later
//                        (its words: the video's own, projects.js: cursorLabel
//                        — or the project's name)
//   CS_MORE_*_VW         the other projects' carousel: the card in the middle
//                        and the ones at its sides, wide (a phone's), the
//                        room between them
//   CS_WHEEL_STEP_PX     how far a sideways wheel goes to change its card
const CS_STACK_VH = 100;
const CS_LIT_FROM = 0.15;
const CS_HOLD_WIDEN_VH = 70;
const CS_HOLD_STILL_VH = 30;
const CS_REVEAL_FROM = 0.35;
const CS_REVEAL_FROM_PHONE = 0.6;
const CS_REVEAL_ZOOM = 1.35;
const CS_REVEAL_START = "top 85%";
const CS_REVEAL_S = 0.9;
const CS_REVEAL_STAGGER_S = 0.08;
const CS_REVEAL_RISE_PX = 40;
const CS_PAIR_PARALLAX_VH = [6, 18];
const CS_SCRUB = 1;
const CS_DRAG_PX = 60;
const CS_CAROUSEL_MAX = 3;
const FINAL_VIDEO_HOLD_VH = 150;
const FINAL_VIDEO_HOLD_PHONE_VH = 80;
const CS_FINAL_RISE_VH = 100;
const CS_FINAL_FADE_VH = 40;
const CS_CURSOR_FOLLOW_S = 0.35;
const CS_CURSOR_HALO_S = 0.7;
const CS_MORE_ACTIVE_VW = 45;
const CS_MORE_SIDE_VW = 22;
const CS_MORE_ACTIVE_PHONE_VW = 80;
const CS_MORE_SIDE_PHONE_VW = 40;
const CS_MORE_GAP_VW = 2;
const CS_WHEEL_STEP_PX = 50;
const ICON_PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5.8 5.2v13.6a.8.8 0 0 0 1.2.7l10.9-6.8a.8.8 0 0 0 0-1.4L7 4.5A.8.8 0 0 0 5.8 5.2Z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
// (a mouse: the "Play" cursor; a finger: the round button)
const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
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
  // (always its 2400 file, a phone's too: it is CS_REVEAL_ZOOM in its frame at first — holdPicture())
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
  // …the final result: its videos, each the whole screen, held one after
  // another — or square ones, in a grid in the column…
  const finals = data.final.grid ? null : fullFinals(project, data.final);
  if (finals) creative.appendChild(finals.box);
  const after = column();
  if (data.final.grid) after.appendChild(finalBlock(project, data.final).block);
  // …its cut-downs for social media, if it has them…
  if (data.social && data.social.videos.length) after.appendChild(socialBlock(project, data.social));
  // …the carousel (two pictures at the least)…
  const carouselPictures = data.carousel.slice(0, CS_CAROUSEL_MAX);
  if (carouselPictures.length >= 2) after.appendChild(carouselBlock(carouselPictures, size).box);
  if (after.children.length) creative.appendChild(after);
  // (room under the statement, where its picture widens and stays: the dark
  // layer comes after it — holdPicture())
  const room = element("div", "cs-hold-room");
  room.setAttribute("aria-hidden", "true");
  page.append(cover, intro, room, creative);
  // …and at its end, from the black the last video fades to, the other
  // projects and the page's foot
  const ending = endBlock(project);
  const end = ending.box;
  creative.appendChild(end);

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
      holdPicture(intro, wide, room);
      comeIn(page);
      reveal(pairFrames);
      drift(pairFrames);
      if (finals) finals.make();
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
// timeline: its mask opens from its middle — CS_REVEAL_FROM of the frame,
// its shape: the same share off each side — to the whole screen (the frame
// is the screen's size, case.css; CS_HOLD_WIDEN_VH of scroll) — the picture
// inside it going from CS_REVEAL_ZOOM down to 1 meanwhile —, stays whole and
// still (CS_HOLD_STILL_VH),
// and the dark layer — after the room those two take (`room`) — comes up
// over it until its top gets to the screen's. Made again on a new size.
function holdPicture(statement, picture, room) {
  const image = picture.querySelector(".cs-picture");
  const set = (off) => (picture.style.clipPath = `inset(${off.toFixed(3)}% ${off.toFixed(3)}%)`);
  let timeline = null;
  const make = () => {
    if (timeline) timeline.scrollTrigger.kill(true), timeline.kill();
    // (the whole screen: its width without the scroll bar — case.css)
    statement.closest(".pj").style.setProperty("--cs-screen", `${document.documentElement.clientWidth}px`);
    const vh = window.innerHeight / 100;
    const widenPx = CS_HOLD_WIDEN_VH * vh;
    const stillPx = CS_HOLD_STILL_VH * vh;
    room.style.height = `${widenPx + stillPx}px`;
    if (reducedMotion) return set(0), gsap.set(image, { scale: 1 });
    // (where the mask starts: the same share off each side)
    const from = ((1 - (phone() ? CS_REVEAL_FROM_PHONE : CS_REVEAL_FROM)) / 2) * 100;
    // (the dark layer's way up: from under the statement's foot, after the
    // room, to the screen's top — measured with the picture in the middle)
    const coverPx = statement.offsetHeight - (picture.offsetTop + picture.offsetHeight / 2) + window.innerHeight / 2;
    const state = { off: from };
    set(from);
    gsap.set(image, { scale: CS_REVEAL_ZOOM });
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
      .to(state, { off: 0, ease: "none", duration: widenPx, onUpdate: () => set(state.off) })
      .to(image, { scale: 1, ease: "none", duration: widenPx }, 0)
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

// Coming in, once: labels, texts, tags, facts and the end's parts fading
// and rising, one after another in their block.
function comeIn(page) {
  if (reducedMotion) return;
  const from = { opacity: 0, y: CS_REVEAL_RISE_PX, duration: CS_REVEAL_S, ease: "power3.out" };
  page.querySelectorAll(".cs-aside, .cs-tags, .cs-facts, .cs-final-head, .cs-social-head, .cs-end").forEach((block) => {
    gsap.from(Array.from(block.children), { ...from, stagger: CS_REVEAL_STAGGER_S, scrollTrigger: { trigger: block, start: CS_REVEAL_START, once: true } });
  });
  // (the vertical videos: fading in only, nothing else moving them)
  page.querySelectorAll(".cs-social-row").forEach((row) => {
    gsap.from(Array.from(row.children), { opacity: 0, duration: CS_REVEAL_S, ease: "power3.out", stagger: CS_REVEAL_STAGGER_S, scrollTrigger: { trigger: row, start: CS_REVEAL_START, once: true } });
  });
}

// Pictures coming in through a mask, with the scroll as they cross the
// screen (from their top at its foot to their middle at its middle): at
// first a box in their middle, CS_REVEAL_FROM of their size (a phone's:
// CS_REVEAL_FROM_PHONE) — the same share off each side, so always their
// shape —, growing to all four sides; open, all of the frame. The picture inside does the other way at once: from CS_REVEAL_ZOOM
// down to 1 as the mask opens. Only clip-path and transform move (will-change
// while they do).
function reveal(frames) {
  if (reducedMotion) return;
  frames.forEach((frame) => {
    const image = frame.querySelector(".cs-picture");
    const shut = () => {
      const off = ((1 - (phone() ? CS_REVEAL_FROM_PHONE : CS_REVEAL_FROM)) / 2) * 100;
      return `inset(${off}% ${off}% ${off}% ${off}%)`;
    };
    gsap
      .timeline({
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "center center",
          scrub: CS_SCRUB,
          invalidateOnRefresh: true,
          onToggle: (self) => frame.classList.toggle("is-revealing", self.isActive),
        },
      })
      .fromTo(frame, { clipPath: shut }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
      .fromTo(image, { scale: CS_REVEAL_ZOOM }, { scale: 1, ease: "none" }, 0);
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

// The final result as a grid (case.final.grid): its label and title (coming
// in as the others); its square videos (case.final.videos: each its files,
// its poster and a line) in a grid in the column (three a row, the last row
// centered; two on a tablet, one on a phone), one playing at a time; each
// still — a sharp frame of it and a round "Play" in its middle — until it,
// or the video, is pressed: then from its start, with its sound, its
// controls (playable()), in a loop. Only what it needs to start is loaded
// until then (preload "metadata"); off the screen it stops; a line under
// it. What it gives back: the block.
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
  return { block };
}

// The final result, the whole screen (case.final.videos; not a grid): each
// video the whole screen, edge to edge, all of them held (pinned) as one:
// the first for FINAL_VIDEO_HOLD_VH of scroll; then the next comes up over
// it from below (CS_FINAL_RISE_VH, a straight edge, with the scroll) and is
// held as long; and so on — clean, no words over them. Each is its own
// preview first: muted, in a loop, while it is seen — of all of it, or only
// of one.preview ([from, to] in seconds: the part it shows best, never its
// intro), from there and back to there —; the one covered stops.
// With a mouse, over them, the pointer is a round "Play" that follows it,
// with the name of the one on the screen by it (one.cursorLabel, or the
// project's: playCursor()): pressed, that one plays from its start
// with its sound (the cursor a "Pause"), pressed again it stops; Esc,
// leaving them, or another coming over it, and it is a preview again. With
// a finger, the round button in its middle does the same (play-button.js),
// those words small under it.
// After the last one's hold, its foot fades to black (CS_FINAL_FADE_VH), the
// black the end comes in from. What it gives back: the block, and what makes
// its scroll-driven moves (again on a new size).
function fullFinals(project, { videos, holdVh = FINAL_VIDEO_HOLD_VH }) {
  const box = element("div", "cs-finals");
  const mouse = fine.matches;
  box.classList.toggle("is-mouse", mouse);
  const slides = videos.map((one, index) => {
    const files = { title: project.title, video: one.video || project.video, videoSizes: one.videoSizes || project.videoSizes };
    const slide = element("figure", "cs-full");
    slide.style.zIndex = String(index + 1);
    const video = element("video", "cs-full-video");
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = encodeURI(one.poster || project.poster);
    video.setAttribute("aria-label", `${plainTitle(project.title)}: ${one.line}`);
    setSource(video, files, Math.round(window.innerWidth * window.devicePixelRatio));
    slide.appendChild(video);
    box.appendChild(slide);
    const entry = { slide, video, words: one.cursorLabel || plainTitle(project.title), watching: false, reset: null, hint: null };
    // (a preview of only a part: it starts there, and goes round in it)
    if (one.preview) {
      const [from, to] = one.preview;
      const back = () => (video.currentTime = from);
      video.addEventListener("loadedmetadata", () => entry.watching || back());
      video.addEventListener("timeupdate", () => !entry.watching && (video.currentTime >= to || video.currentTime < from - 0.5) && back());
      entry.back = back;
    }
    if (!mouse) {
      const { button, reset } = playButton(slide, () => video, () => watch(entry));
      entry.hint = element("p", "cs-full-hint", entry.words);
      entry.hint.setAttribute("aria-hidden", "true");
      slide.append(button, entry.hint);
      entry.reset = reset;
    }
    return entry;
  });
  const fade = element("div", "cs-finals-fade");
  fade.setAttribute("aria-hidden", "true");
  box.appendChild(fade);
  let onScreen = false;
  let rises = slides.map((_, index) => (index ? 0 : 1)); // how far each has come up, 0..1
  let current = 0; // the one on the screen (the last more than half up)
  const cursor = mouse ? playCursor() : null;
  // (the cursor's words, or the button's: the one on the screen's, or "Pause" while it plays)
  const draw = () => {
    const playing = (one) => one.watching && !one.video.paused;
    if (cursor) cursor.set(playing(slides[current]), slides[current].words);
    slides.forEach((one) => one.hint && one.hint.classList.toggle("is-hidden", playing(one)));
  };
  function watch(one) {
    one.watching = true;
    one.video.currentTime = 0;
    one.video.muted = false;
    one.video.play().catch(() => {});
    draw();
  }
  const preview = (one) => {
    if (!one.watching) return;
    one.watching = false;
    one.video.muted = true;
    if (one.back) one.back();
    if (one.reset) one.reset();
  };
  // (which plays: the ones seen, as previews, but the one watched as it was)
  const refresh = () => {
    current = rises.reduce((at, rise, index) => (rise > 0.5 ? index : at), 0);
    slides.forEach((one, index) => {
      const covered = index < slides.length - 1 && rises[index + 1] >= 0.999;
      if (covered) preview(one);
      const seen = onScreen && rises[index] > 0 && !covered;
      if (!seen) one.video.pause();
      else if (!one.watching && one.video.paused) one.video.play().catch(() => {});
    });
    draw();
  };
  observe(([entry]) => {
    onScreen = entry.isIntersecting;
    refresh();
  }, box);
  const leave = () => {
    slides.forEach(preview);
    refresh();
  };
  box.addEventListener("play", draw, true);
  box.addEventListener("pause", draw, true);
  if (mouse) {
    box.addEventListener("pointerenter", (event) => cursor.show(event));
    box.addEventListener("pointermove", (event) => cursor.move(event));
    box.addEventListener("pointerleave", () => cursor.hide());
    // (the page scrolled under a still pointer: no pointer event says it left them, or came)
    window.addEventListener("scroll", () => cursor.check(box), { passive: true, signal: scope.abort.signal });
    box.addEventListener("click", () => {
      const one = slides[current];
      if (!one.watching) watch(one);
      else if (one.video.paused) one.video.play().catch(() => {});
      else one.video.pause();
    });
    window.addEventListener("keydown", (event) => event.key === "Escape" && leave(), { signal: scope.abort.signal });
  }
  let timeline = null;
  const make = () => {
    if (timeline) timeline.scrollTrigger.kill(true), timeline.kill();
    const vh = window.innerHeight / 100;
    const hold = (phone() ? Math.min(FINAL_VIDEO_HOLD_PHONE_VH, holdVh) : holdVh) * vh;
    const rise = CS_FINAL_RISE_VH * vh;
    const fadePx = CS_FINAL_FADE_VH * vh;
    // (the scroll they are held for: each its hold, each but the first its way up, the fade)
    const total = slides.length * hold + (slides.length - 1) * rise + fadePx;
    const read = () => {
      rises = slides.map((one, index) => (index ? 1 - gsap.getProperty(one.slide, "yPercent") / 100 : 1));
      refresh();
    };
    slides.forEach((one, index) => gsap.set(one.slide, { yPercent: index ? 100 : 0 }));
    gsap.set(fade, { opacity: 0 });
    timeline = gsap.timeline({
      onUpdate: read,
      scrollTrigger: { trigger: box, start: "top top", end: `+=${total}`, pin: true, anticipatePin: 0, scrub: reducedMotion ? true : CS_SCRUB, onLeave: leave, onLeaveBack: leave },
    });
    timeline.to({}, { duration: hold });
    slides.slice(1).forEach((one) => timeline.to(one.slide, { yPercent: 0, ease: "none", duration: rise }).to({}, { duration: hold }));
    timeline.to(fade, { opacity: 1, ease: "none", duration: fadePx });
    read();
  };
  onView(() => fine.matches === mouse && make());
  return { box, make };
}

// The "Play" cursor over the full-screen videos, three pieces hung right
// from the body, each fixed on its own (nothing over them makes a stacking
// context): a small circle filled with an iridescent gradient, a fine
// see-through rim and a soft shadow (it reads on white too), a dark play in
// it (a pause while one plays); behind it a soft purple halo that follows a
// little later; and by its right side the name of the video on the screen
// ("Pause" while it plays), in white, mix-blend-mode: difference — dark on a
// light picture, light on a dark one. They follow the pointer softly
// (gsap.quickTo: CS_CURSOR_FOLLOW_S, the halo CS_CURSOR_HALO_S), coming and
// going growing and fading. The pointer's own is hidden there (case.css).
function playCursor() {
  const piece = (className) => {
    const outer = element("div", `cs-cursor ${className}`);
    outer.setAttribute("aria-hidden", "true");
    const inner = element("span", "cs-cursor-inner");
    outer.appendChild(inner);
    document.body.appendChild(outer);
    return { outer, inner };
  };
  const halo = piece("cs-cursor-halo");
  const ring = piece("cs-cursor-ring");
  const word = piece("cs-cursor-word");
  const pieces = [halo, ring, word];
  const follow = (one, duration) => ({ x: gsap.quickTo(one.outer, "x", { duration, ease: "power3" }), y: gsap.quickTo(one.outer, "y", { duration, ease: "power3" }) });
  const movers = [follow(halo, CS_CURSOR_HALO_S), follow(ring, CS_CURSOR_FOLLOW_S), follow(word, CS_CURSOR_FOLLOW_S)];
  let toX = 0;
  let toY = 0;
  let on = false;
  const to = (x, y, at) => {
    toX = x;
    toY = y;
    movers.forEach((m, k) => {
      if (at) gsap.set(pieces[k].outer, { x, y });
      else m.x(x), m.y(y);
    });
  };
  const turn = (now) => {
    on = now;
    pieces.forEach((one) => one.outer.classList.toggle("is-on", now));
  };
  let shown = "";
  const set = (playing, words) => {
    const now = playing ? "Pause" : words;
    if (now === shown) return;
    if (playing !== (shown === "Pause") || !shown) ring.inner.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    shown = now;
    word.inner.textContent = now;
  };
  set(false, "");
  scope.undo.push(() => pieces.forEach((one) => (gsap.killTweensOf(one.outer), one.outer.remove())));
  return {
    show(event) {
      to(event.clientX, event.clientY, !on);
      turn(true);
    },
    move(event) {
      to(event.clientX, event.clientY, false);
    },
    hide() {
      turn(false);
    },
    // (shown only while the pointer, where it last was, is over `box`)
    check(box) {
      const over = box.contains(document.elementFromPoint(toX, toY));
      if (over !== on) turn(over);
    },
    set,
  };
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

// The end, on the page's black: the other projects, all of them (the Works
// page's order, from the one after this), as a carousel — the card in the
// middle big (CS_MORE_ACTIVE_VW, 16:9), its name over its picture, the ones
// at its sides smaller (CS_MORE_SIDE_VW) on the same foot, showing at the
// edges; round and round, sliding and growing softly; dragged or swiped, a
// sideways wheel, the arrow keys while it is seen. The one in the middle:
// its picture a little bigger with the pointer over it; pressed, its page.
// One at the side, pressed: it comes to the middle. Under it, "(Latest
// projects)", a line for each (the one in the middle's cream) and "Explore
// all cases"; then the page's foot (work.html's .pj-foot). What it gives
// back: the block, and what gives the foot back to the page (it left).
function endBlock(project) {
  const box = element("section", "cs-end");
  box.id = "related";
  const others = nextProjects(project, PROJECTS.filter((entry) => entry.slug).length - 1);
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
  const row = element("div", "cs-more-row");
  const all = element("a", "cs-more-all", "Explore all cases ↗");
  all.href = "works.html";
  row.append(element("p", "cs-label", "(Latest projects)"), lines, all);
  const foot = document.querySelector(".pj-foot");
  const home = foot.parentNode;
  const after = foot.nextSibling;
  box.append(stage, row, foot);
  go(0);
  return { box, destroy: () => home.insertBefore(foot, after) };
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
  const left = element("div", "cs-bar-left");
  left.append(back, element("span", "cs-bar-sep", "|"), name, element("span", "cs-bar-sep", "|"), related);
  bar.append(left);
  return bar;
}

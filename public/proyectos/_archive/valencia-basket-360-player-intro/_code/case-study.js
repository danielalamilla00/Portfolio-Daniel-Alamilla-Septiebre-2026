import { titleParts } from "./title.js";

// ---- A project's case study ---------------------------------------------------------
// The sections of a bigger project (projects.js: caseStudy), between its video
// and "Next project", each about a screen at most. Each: a small numbered
// label ("01 — Videowall"), its title in a line (its keyword in Catavalo, in
// the palette's gradient: .title-gradient), a
// line of text, and what it shows — built here by its kind (see
// VALENCIA_BASKET_CASE in projects.js). Each section comes in once (fading and
// rising: case-study.css) as it gets on the screen. Its videos loop, muted and
// with no controls, and move only while they are on the screen; they are
// loaded from CS_LOAD_MARGIN away.
//   CS_LOAD_MARGIN   how far from the screen a section's video starts to load
//   CS_REVEAL_MARGIN where on the screen a section comes in (how far up from
//                    its foot)
const CS_LOAD_MARGIN = "50% 0px";
const CS_REVEAL_MARGIN = "0px 0px -12% 0px";

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}
const pad = (n) => String(n).padStart(2, "0");

// What it gives back: the sections, in a block of their own.
export function caseStudy(sections) {
  const root = element("div", "cs");
  sections.forEach((section, index) => {
    const box = element("section", "cs-section");
    // (its keyword in the palette's gradient, the rest in cream)
    const title = element("h2", "cs-title");
    title.append(...titleParts(section.title, "title-gradient"));
    box.append(element("p", "cs-label", `${pad(index + 1)} — ${section.label}`), title, element("p", "cs-text", section.text));
    BUILD[section.kind](box, section);
    root.appendChild(box);
  });
  const comeIn = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        comeIn.unobserve(entry.target);
      }),
    { rootMargin: CS_REVEAL_MARGIN }
  );
  root.querySelectorAll(".cs-section").forEach((box) => comeIn.observe(box));
  return root;
}

// A video of a section: muted, in a loop, no controls; its file asked for
// once it is CS_LOAD_MARGIN from the screen, and moving only while it is on it.
const near = new IntersectionObserver(
  (entries) =>
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const video = entry.target;
      video.src = encodeURI(video.dataset.src);
      near.unobserve(video);
    }),
  { rootMargin: CS_LOAD_MARGIN }
);
const seen = new IntersectionObserver((entries) =>
  entries.forEach(({ target, isIntersecting }) => (isIntersecting ? target.play().catch(() => {}) : target.pause()))
);
function loop(src, className, label) {
  const video = element("video", className);
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = "auto";
  video.dataset.src = src;
  video.setAttribute("aria-label", label);
  near.observe(video);
  seen.observe(video);
  return video;
}

const BUILD = {
  // Three figures in a row, small (in cream); under them the
  // whole canvas, as wide as the page's content (the lighter one where fewer
  // pixels are shown).
  canvas(box, { figures, video, videoSmall, size }) {
    const list = element("dl", "cs-figures");
    figures.forEach(({ value, label }) => {
      const item = element("div", "cs-figure");
      item.append(element("dt", "cs-figure-value title-display", value), element("dd", "cs-figure-label", label));
      list.appendChild(item);
    });
    const wide = window.innerWidth * window.devicePixelRatio > 1400;
    const film = loop(wide ? video : videoSmall, "cs-canvas", "The full 360° canvas, playing");
    [film.width, film.height] = size;
    box.append(list, film);
  },

  // One player: its name, and the steps from its photo to the design —
  // Photo, Prompt, AI clip, Final —, small, the same height, joined by arrows.
  ai(box, { player: { name, photo, clip, final } }) {
    const image = element("img", "cs-step-media");
    image.src = encodeURI(photo);
    image.alt = `${name}: the official studio photo, on chroma`;
    image.loading = "lazy";
    image.decoding = "async";
    const prompt = element("blockquote", "cs-step-media cs-prompt");
    prompt.append(element("p", "cs-prompt-text", `“${clip.prompt}”`), element("span", "cs-pill", clip.tool));
    const steps = element("ol", "cs-steps");
    [
      ["Photo", image],
      ["Prompt", prompt],
      ["AI clip", loop(clip.src, "cs-step-media", `${name}: the AI clip on chroma, ${clip.pose.toLowerCase()}`)],
      ["Final", loop(final, "cs-step-media", `${name} in the final design`)],
    ].forEach(([title, media], index) => {
      const step = element("li", "cs-step");
      const head = element("p", "cs-step-name");
      head.append(element("span", "cs-step-number", pad(index + 1)), title);
      step.append(media, head);
      steps.appendChild(step);
    });
    box.append(element("p", "cs-player-name", name), steps);
  },
};

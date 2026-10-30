// Valencia Basket 360° Player Intro, as it was in src/data/projects.js (removed 2026-10-30): its case study and its
// entry (first in PROJECTS). Its files: this folder (_archive); its page's code: case-study.js / .css here, and in
// src/project.js the autoplay video (playingBlock) and the case study after the held block.

// ---- Valencia Basket 360° Player Intro: its case study ----------------------
// Two sections, in order. Each: its short name (the small label), its title
// (*keyword* in Catavalo), a line of text, and what it shows (kind):
//   canvas   three figures (value, label) and the whole panoramic video
//   ai       one player: its photo, the clip made from it (its pose, the
//            prompt it was made with and the tool) and the player in the
//            final design
// Everything in it is from the project's presentation (the PDF) and its files.
// (The player: TJ Shorts — the only one whose prompt the presentation gives,
// cut short as it is there; it says the poses were made "with Veo and Kling",
// not which one made which.)
const VB = "/proyectos/valencia-basket-360-player-intro";
const VALENCIA_BASKET_CASE = [
  {
    label: "Videowall",
    title: "*360°* Videowall",
    text: "Designed for the Roig Arena's LG videoboard, the highest-resolution in Europe: one continuous 11,088 × 2,268 px canvas wrapping a four-sided cube.",
    kind: "canvas",
    figures: [
      { value: "11,088 × 2,268 px", label: "Full canvas" },
      { value: "4 faces", label: "No cuts" },
      { value: "4s", label: "Per player · 60 fps" },
    ],
    video: `${VB}/canvas-2000.mp4`,
    videoSmall: `${VB}/canvas-1400.mp4`,
    size: [2000, 408],
  },
  {
    label: "AI",
    title: "Players *Animated* with AI",
    text: "No motion shoot: one studio photo per player was turned into posed clips on chroma with Veo and Kling, then composited and animated in After Effects.",
    kind: "ai",
    player: {
      name: "TJ Shorts",
      photo: `${VB}/ai/tj-shorts/photo.webp`,
      clip: {
        pose: "Crossed arms",
        src: `${VB}/ai/tj-shorts/crossed-arms.mp4`,
        prompt: "The player slowly crosses his arms… locked static camera, solid chroma green background, keep identity and jersey exactly as in the image.",
        tool: "Veo & Kling",
      },
      final: `${VB}/ai/tj-shorts/final.mp4`,
    },
  },
];

  {
    slug: "valencia-basket-360-player-intro",
    title: "*Valencia Basket* 360° Player Intro",
    description: "A creative concept and animation to introduce Valencia Basket's roster on the Roig Arena's 360° LG videowall — players built from blocks over a liquid basketball skin, animated with AI.",
    tagline: "Player introductions for the 360° videowall of Valencia Basket's Roig Arena.",
    category: CATEGORY,
    idea: "Each player enters the scene built from blocks over a living background: the skin of a basketball turned into liquid. Every player owns a 4-second block, designed as one continuous piece that wraps around the whole arena.",
    challenge: "Designing for the highest-resolution videoboard in Europe — a four-sided cube with curved corners — as a single 11,088 × 2,268 px canvas, and bringing static studio photos to life without a new shoot.",
    client: "Valencia Basket",
    industry: "Sports / Live Events",
    display: "LG videowall · Roig Arena (360°)",
    role: "Motion Designer & Creative Concept",
    tools: "Cinema 4D, After Effects, Veo, Kling",
    year: "2026",
    duration: "16s (4s per player)",
    credits: null,
    // (the render of the arena: it has no sound, so it plays by itself)
    autoplay: true,
    video: `${VB}/valencia-basket-360-player-intro-1080.mp4`,
    videoSmall: `${VB}/valencia-basket-360-player-intro-720.mp4`,
    poster: `${VB}/poster.webp`,
    cover: `${VB}/poster.webp`,
    preview: `${VB}/preview.mp4`,
    caseStudy: VALENCIA_BASKET_CASE,
  },

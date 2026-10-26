// ---- The projects ---------------------------------------------------------------------
// One entry per folder of public/proyectos (all but Reel), in the order of the
// Works page (works.html, src/works.js), which lists them all. Those that have
// a page of their own (work.html#<slug>: one template for all of them,
// src/project.js) carry what that page shows; those that do not are "Coming
// soon" on the Works page, and have no link.
//
// On the Works page:
//   shortTitle   the title of its row
//   cover        the picture of its row: a frame of its cover video
//                (public/works/covers)
//   preview      what plays, muted and in a loop, while its row is the one in
//                the middle (optional: without it the cover stays)
// On its page (only the projects with a slug):
//   slug         its address: work.html#<slug>
//   category     a word or two over its name
//   title        its name, giant, at the top
//   idea         what it was for: 2 or 3 lines
//   challenge    what was hard about it: 2 to 4 lines
//   client, industry, role, tools, year   the table of facts (a
//                null one is not shown)
//   credits      who else made it: [{ role, name }], or null
//   video        the project itself: a Vimeo or YouTube address, or an MP4
//   poster       what shows until it plays (public/works/posters: the video's
//                own thumbnail, or its first frame)
//   original     the video the clips are cut from: its path in the folder of
//                originals (scripts/clips.mjs: Desktop/Portfolio/Motion)
//   frames       4 to 6 clips cut from it, one under another under the video,
//                silent and in a loop: { video, start, duration } — where it
//                is (public/proyectos/<folder>/clips/clip-NN.mp4, its poster
//                the .webp of the same name) and the stretch of the original
//                it is (in seconds). Change those and run "npm run clips
//                <slug>" to cut them again. One cut from another video than
//                the project's says which (original).
//   extraFrames  after the clips: other pictures or clips of it (the
//                process, a styleframe) — { image } or { video }, and where
//                to look in it if it is not 16:9 and its middle is not what
//                matters (focus: a CSS object-position, "50% 20%")
// (The three projects at the end of the page are the next three of this list
// that have a page — after the last, the first ones again.)
// Texts marked LONG are over those lengths, and are left as they were: to be
// chosen. TO FILL IN: industry (none is known), credits, and year (a
// placeholder, the same in all).
const CATEGORY = "Motion Design"; // the same in all, as on the Works page
const YEAR = "2025"; // placeholder

export const PROJECTS = [
  {
    slug: "bizlunch",
    shortTitle: "Bizlunch",
    title: "BizLunch",
    category: CATEGORY,
    idea: "A promo spot for BizLunch, an app that matches professionals for business lunches, cutting between a real meetup and the screens that make it happen.",
    challenge: "Nobody's used an app like this before, so the video had to sell the idea itself — going from lunch alone at your desk to a matched meeting — and still show enough of the app (matching, booking, ratings) to make it feel real, not just a concept trailer.",
    client: "Bizlunch",
    industry: null,
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=DGfPLogHelQ",
    poster: "/works/posters/bizlunch.jpg",
    original: "Autonomo/Bizluch/Bizlunch_5.mp4",
    frames: [
      { video: "/proyectos/Bizlunch/clips/clip-01.mp4", start: 9.2, duration: 5 },
      { video: "/proyectos/Bizlunch/clips/clip-02.mp4", start: 17.7, duration: 5 },
      { video: "/proyectos/Bizlunch/clips/clip-03.mp4", start: 36.95, duration: 5 },
      { video: "/proyectos/Bizlunch/clips/clip-04.mp4", start: 52.95, duration: 5 },
      { video: "/proyectos/Bizlunch/clips/clip-05.mp4", start: 71.2, duration: 5 },
      { video: "/proyectos/Bizlunch/clips/clip-06.mp4", start: 84, duration: 5 },
    ],
    extraFrames: [],
    cover: "/works/covers/bizlunch.jpg",
    preview: "/proyectos/Bizlunch/Portada_thumb.mp4",
  },
  {
    slug: "caprabo",
    shortTitle: "Caprabo",
    title: "Caprabo",
    category: CATEGORY,
    idea: "Holographic 3D animations with a realistic floating effect.",
    challenge: "Supermarkets aren't built for excitement, and animating offers for in-store screens could easily have stayed that way. The one piece worth pushing further was the holographic display — a chance to make products stand out in a way a flat screen just can't.",
    client: "Caprabo",
    industry: null,
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects",
    year: YEAR,
    credits: null,
    video: "/projects/caprabo-tienda-1.mp4",
    poster: "/works/posters/caprabo.jpg",
    frames: [
      { video: "/proyectos/Caprabo/clips/clip-01.mp4", start: 0.6, duration: 5, original: "Caprabo/Caprabo Ventilador_Globos.mp4" },
      { video: "/proyectos/Caprabo/clips/clip-02.mp4", start: 3, duration: 5, original: "Caprabo/Caprabo Ventilador_Cafe Així de bo.mp4" },
      { video: "/proyectos/Caprabo/clips/clip-03.mp4", start: 1.7, duration: 5, original: "Caprabo/Caprabo Ventilador_Halloween.mp4" },
      { video: "/proyectos/Caprabo/clips/clip-04.mp4", start: 1.95, duration: 5, original: "Caprabo/Caprabo Ventilador_Santa.mp4" },
      { video: "/proyectos/Caprabo/clips/clip-05.mp4", start: 3, duration: 5, original: "Caprabo/Caprabo Ventilador_Tarjeta Soc del Club.mp4" },
    ],
    extraFrames: [],
    cover: "/works/covers/caprabo.jpg",
    preview: "/proyectos/Caprabo/Tienda/Tienda 1.mp4",
  },
  {
    slug: "ron-barcelo",
    shortTitle: "Estiu TMM",
    title: "Barceló",
    category: CATEGORY,
    idea: "A short promotional spot for Ron Barceló, capturing a vibrant, sun-soaked summer atmosphere through bold color and energetic motion.",
    challenge: "Ron Barceló wanted something that feels like summer the second it starts playing — colour, movement, heat, no slow build-up.",
    client: "TMM Group",
    industry: null,
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=tjCd8-RYuJ4",
    poster: "/works/posters/ron-barcelo.jpg",
    original: "Barceló/Barceló carpeta/Barceló_4K_1.mp4",
    frames: [
      { video: "/proyectos/Estiu TMM/clips/clip-01.mp4", start: 0.2, duration: 3 },
      { video: "/proyectos/Estiu TMM/clips/clip-02.mp4", start: 3.2, duration: 3 },
      { video: "/proyectos/Estiu TMM/clips/clip-03.mp4", start: 6.2, duration: 3 },
      { video: "/proyectos/Estiu TMM/clips/clip-04.mp4", start: 9.2, duration: 3 },
      { video: "/proyectos/Estiu TMM/clips/clip-05.mp4", start: 12.2, duration: 3 },
    ],
    extraFrames: [],
    cover: "/works/covers/estiu-tmm.jpg",
    preview: "/proyectos/Estiu TMM/Portada_Estiu TMM.mp4",
  },
  {
    slug: "fallas-valencia",
    shortTitle: "Fallas",
    title: "Fallas Valencia",
    category: CATEGORY,
    idea: "2D animation recreating the Ofrenda, the Mascletà, and the Cremà in motion.",
    challenge: "Fallas is fire, music, colour and the whole city out in the street every March — it's not a subtle thing to animate. The challenge was turning key moments like the Ofrenda, the Mascletà and the Cremà into 2D animation without flattening them into decoration.",
    client: "Fallas",
    industry: null,
    role: "Motion Designer",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "https://vimeo.com/926805770",
    poster: "/works/posters/fallas-valencia.jpg",
    original: "Fallas Valencia/Proyectos Fallas Valencia.mp4",
    frames: [
      { video: "/proyectos/Fallas/clips/clip-01.mp4", start: 7.45, duration: 5 },
      { video: "/proyectos/Fallas/clips/clip-02.mp4", start: 20.2, duration: 5 },
      { video: "/proyectos/Fallas/clips/clip-03.mp4", start: 27.95, duration: 5 },
      { video: "/proyectos/Fallas/clips/clip-04.mp4", start: 36.95, duration: 5 },
      { video: "/proyectos/Fallas/clips/clip-05.mp4", start: 42.45, duration: 5 },
      { video: "/proyectos/Fallas/clips/clip-06.mp4", start: 48.2, duration: 5 },
    ],
    extraFrames: [],
    cover: "/works/covers/fallas.jpg",
    preview: "/proyectos/Fallas/Styleframes/Styleframes_5_1.mp4",
  },
  {
    slug: "gemini-3",
    shortTitle: "Gemini",
    title: "Gemini 3",
    category: CATEGORY,
    idea: "A concept spot imagining how Gemini 3 could be introduced — blending real product UI with AI-generated payoff.",
    challenge: "An open-ended one: what would a Gemini 3 launch film even look like, starting from the product's own interface instead of a script?",
    client: "Gemini",
    industry: null,
    role: "Concept, Motion Design, Editing",
    tools: "Gemini, After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=WInNSqUsuc8",
    poster: "/works/posters/gemini-3.jpg",
    original: "Capsulas SAAS/Gemini/Gemini_1.mp4",
    frames: [
      { video: "/proyectos/Gemini/clips/clip-01.mp4", start: 1.8, duration: 3.5 },
      { video: "/proyectos/Gemini/clips/clip-02.mp4", start: 5.57, duration: 3.5 },
      { video: "/proyectos/Gemini/clips/clip-03.mp4", start: 10.31, duration: 3.5 },
      { video: "/proyectos/Gemini/clips/clip-04.mp4", start: 14.8, duration: 3.5 },
      { video: "/proyectos/Gemini/clips/clip-05.mp4", start: 18.4, duration: 3.5 },
    ],
    extraFrames: [],
    cover: "/works/covers/gemini.jpg",
    preview: "/proyectos/Gemini/Styleframes/Gemini_Styleframes 1.mp4",
  },
  {
    slug: "hummel-betis",
    shortTitle: "Hummel Betis",
    title: "Hummel x Betis",
    category: CATEGORY,
    idea: "A paid advertising campaign celebrating Hummel's kit sponsorship of Real Betis, created as a matchday launch ad for the club's football fanbase, generated with Veo and composited in After Effects.",
    challenge: "Same brief as the Valencia Basket kit, different club: a matchday launch ad for Real Betis's new Hummel kit, built without a shoot, and needing to feel unmistakably verdiblanco.",
    client: "Hummel",
    industry: null,
    role: "Motion Designer",
    tools: "Veo, After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=ZtjXZlHdD70",
    poster: "/works/posters/hummel-betis.jpg",
    original: "Hummel/Animacion 3D Camiseta/Hummel_Camisetas 4K.mp4",
    frames: [
      { video: "/proyectos/Hummel Betis/clips/clip-01.mp4", start: 0.2, duration: 3 },
      { video: "/proyectos/Hummel Betis/clips/clip-02.mp4", start: 3.2, duration: 3 },
      { video: "/proyectos/Hummel Betis/clips/clip-03.mp4", start: 6.2, duration: 3 },
      { video: "/proyectos/Hummel Betis/clips/clip-04.mp4", start: 9.2, duration: 3 },
      { video: "/proyectos/Hummel Betis/clips/clip-05.mp4", start: 0.95, duration: 3, original: "Hummel/Animacion 3D Camiseta/Hummel_Camisetas 4K_Modificado.mp4" },
    ],
    extraFrames: [],
    cover: "/works/covers/hummel-betis.jpg",
    preview: "/proyectos/Hummel Betis/Hummel Betis_Tarjeta_thumb.mp4",
  },
  {
    slug: "hummel-valencia-basket",
    shortTitle: "Hummel Valencia Basket",
    title: "Hummel x Valencia Basket",
    category: CATEGORY,
    idea: "A paid advertising campaign for Hummel's kit sponsorship of Valencia Basket, created to launch the new season kit to the club's basketball fanbase, generated with Veo and composited in After Effects.",
    challenge: "A new kit launch, no shoot scheduled, and a basketball audience that would spot anything generic instantly. The ad had to land on release day and feel as physical as the game itself.",
    client: "Hummel",
    industry: null,
    role: "Motion Designer",
    tools: "Veo, After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=1ZPffRVrTAU",
    poster: "/works/posters/hummel-valencia-basket.jpg",
    // (only 3: all there is of it here — the film itself is on YouTube)
    original: "Hummel/Animacion 3D Camiseta/Hummel_Camisetas 4K.mp4",
    frames: [
      { video: "/proyectos/Hummel Valencia Baket/clips/clip-01.mp4", start: 13.5, duration: 3 },
      { video: "/proyectos/Hummel Valencia Baket/clips/clip-02.mp4", start: 17, duration: 3 },
      { video: "/proyectos/Hummel Valencia Baket/clips/clip-03.mp4", start: 6.78, duration: 3, original: "Hummel/Animacion 3D Camiseta/Hummel_Camisetas 4K_Modificado.mp4" },
      { video: "/proyectos/Hummel Valencia Baket/clips/clip-04.mp4", start: 10.13, duration: 3, original: "Hummel/Animacion 3D Camiseta/Hummel_Camisetas 4K_Modificado.mp4" },
    ],
    extraFrames: [],
    cover: "/works/covers/hummel-valencia-basket.jpg",
    preview: "/proyectos/Hummel Valencia Baket/Hummel Valencia Basket_Tarjeta_thumb.mp4",
  },
  {
    slug: "waapiti",
    shortTitle: "Waapiti",
    title: "Waapiti",
    category: CATEGORY,
    idea: "A kinetic typography spot explaining Waapiti's CMS platform for digital signage, built to communicate what it does in seconds.",
    challenge: "Waapiti's CMS does a lot — automated content, full player control, different access levels for clients and integrators — and none of it is easy to show without a screen recording and a voiceover. The brief was to explain it fast, visually, with neither.",
    client: "Waapiti",
    industry: null,
    role: "Motion Designer, Art Director",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=ARgKpomcNoU",
    poster: "/works/posters/waapiti.jpg",
    original: "Capsulas SAAS/Waapiti/Waapiti_Kinetic/Stand/ISE 2026_Final.mp4",
    frames: [
      { video: "/proyectos/ISE/clips/clip-01.mp4", start: 0.57, duration: 3 },
      { video: "/proyectos/ISE/clips/clip-02.mp4", start: 4.31, duration: 3 },
      { video: "/proyectos/ISE/clips/clip-03.mp4", start: 8.06, duration: 3 },
      { video: "/proyectos/ISE/clips/clip-04.mp4", start: 11.8, duration: 3 },
      { video: "/proyectos/ISE/clips/clip-05.mp4", start: 15.54, duration: 3 },
    ],
    extraFrames: [],
    cover: "/works/covers/ise.jpg",
    preview: "/proyectos/ISE/Portada_thumb.mp4",
  },
  {
    shortTitle: "Otoño TMM",
    cover: "/works/covers/otono-tmm.jpg",
    preview: "/proyectos/Otoño TMM/Portada_Tardor TMM.mp4",
  },
  {
    slug: "sensory-sync",
    shortTitle: "Sensory",
    title: "Sensory Sync",
    category: CATEGORY,
    idea: "Immersive screen content blending narrative, environment, and AI.",
    challenge: "Sensory Sync hosts international clients, and every screen in the room is a different shape — curved panels, projectors, odd aspect ratios. The content had to look premium and consistent across all of them, and still flex for seasonal campaigns like Christmas or Sant Jordi.",
    client: "Sensory",
    industry: null,
    role: "Motion Designer, Art Director",
    tools: "Veo, Kling, Sora, After Effects",
    year: YEAR,
    credits: null,
    video: "/projects/Proyector.mp4",
    poster: "/works/posters/sensory-sync.jpg",
    frames: [
      { video: "/proyectos/Sensory/clips/clip-01.mp4", start: 0.2, duration: 4, original: "Sensory/VIdeo Resumen Sensory.mp4" },
      { video: "/proyectos/Sensory/clips/clip-02.mp4", start: 2.2, duration: 5, original: "Sensory/Proyector_Full HD.mp4" },
      { video: "/proyectos/Sensory/clips/clip-03.mp4", start: 5, duration: 5, original: "Sensory/Leaf & Soil.mp4" },
      { video: "/proyectos/Sensory/clips/clip-04.mp4", start: 4.5, duration: 5, original: "Sensory/Queen Rose.mp4" },
      { video: "/proyectos/Sensory/clips/clip-05.mp4", start: 2.95, duration: 5, original: "Sensory/Proyectos Media Columna LED/Sant Jordi_Media Columna LED_Portfolio.mp4" },
      { video: "/proyectos/Sensory/clips/clip-06.mp4", start: 2.45, duration: 5, original: "Sensory/Proyectos Media Columna LED/Flor_Media Column LED_Portfolio.mp4" },
    ],
    extraFrames: [],
    cover: "/works/covers/sensory.jpg",
    preview: "/proyectos/Sensory/Pantallas/Proyector.mp4",
  },
  {
    slug: "sitges-film-festival",
    shortTitle: "Sitges",
    title: "Sitges Film Festival",
    category: CATEGORY,
    idea: "2D animations celebrating the cult community that defines the spirit of Sitges.",
    challenge: "Sitges wanted Freaks reinterpreted as a mirror for its own audience — people who wear being different as a badge of honour. The piece needed a character that felt like it belonged to that crowd, screened in 2024 ahead of the film's restoration.",
    client: "Sitges",
    industry: null,
    role: "2D Animator & Rigger",
    tools: "After Effects, Duik Angela",
    year: YEAR,
    credits: null,
    video: "https://vimeo.com/978951441",
    poster: "/works/posters/sitges-film-festival.jpg",
    original: "Sitges/SITGES FILM FESTIVAL.mp4",
    frames: [
      { video: "/proyectos/Sitges/clips/clip-01.mp4", start: 1, duration: 3 },
      { video: "/proyectos/Sitges/clips/clip-02.mp4", start: 5.7, duration: 4 },
      { video: "/proyectos/Sitges/clips/clip-03.mp4", start: 10.7, duration: 4 },
      { video: "/proyectos/Sitges/clips/clip-04.mp4", start: 15.95, duration: 4 },
      { video: "/proyectos/Sitges/clips/clip-05.mp4", start: 22.2, duration: 3 },
      { video: "/proyectos/Sitges/clips/clip-06.mp4", start: 25.3, duration: 4 },
    ],
    extraFrames: [],
    cover: "/works/covers/sitges.jpg",
    preview: "/proyectos/Sitges/Styleframes/Styleframes_SItges_1.2.mp4",
  },
  {
    slug: "spotify-daylist",
    shortTitle: "Spotify",
    title: "Spotify Daylist",
    category: CATEGORY,
    idea: "A paid advertising campaign for Spotify's Daylist feature, translating its ever-changing, personalized playlists into a bold, mobile-first ad designed for social media promotion.",
    challenge: "Daylist is a playlist that rewrites itself throughout the day, so the ad needed to move the same way — quick, mood-driven, never quite the same twice. It had to run as sponsored content and blend into the feed rather than announce itself as an ad.",
    client: "Spotify",
    industry: null,
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "https://www.youtube.com/watch?v=IXRR8XM6_7k",
    poster: "/works/posters/spotify-daylist.jpg",
    original: "Spotify Daylist/SPOTIFY DAYLIST_1.mp4",
    frames: [
      { video: "/proyectos/Spotify/clips/clip-01.mp4", start: 0.51, duration: 3 },
      { video: "/proyectos/Spotify/clips/clip-02.mp4", start: 4.13, duration: 3 },
      { video: "/proyectos/Spotify/clips/clip-03.mp4", start: 7.75, duration: 3 },
      { video: "/proyectos/Spotify/clips/clip-04.mp4", start: 11.37, duration: 3 },
    ],
    extraFrames: [],
    cover: "/works/covers/spotify.jpg",
    preview: "/proyectos/Spotify/Portada_Spotify Daylist_thumb.mp4",
  },
  {
    shortTitle: "TMM Esferas",
    cover: "/works/covers/tmm-esferas.jpg",
    preview: "/proyectos/TMM Esferas/Portada_TMM Esferas.mp4",
  },
];

// A project's page (work.html#<slug>), or null: it has none ("Coming soon").
export const projectUrl = (project) => (project.slug ? `work.html#${project.slug}` : null);
// The `count` projects after `project` on the Works page that have a page,
// starting again from the first after the last.
export function nextProjects(project, count) {
  const pages = PROJECTS.filter((entry) => entry.slug);
  const at = pages.indexOf(project);
  return Array.from({ length: count }, (_, k) => pages[(at + 1 + k) % pages.length]);
}

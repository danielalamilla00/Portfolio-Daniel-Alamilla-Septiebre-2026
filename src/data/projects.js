// ---- The projects ---------------------------------------------------------------------
// One entry per project, in the order of the Works page (works.html,
// src/works.js), which lists them all. Those that have a page of their own
// (work.html#<slug>: one template for all of them, src/project.js) carry what
// that page shows; one that does not would be "Coming soon" on the Works page,
// with no link. Each one's files are in public/proyectos/<slug>/ (Caprabo's,
// in its old folder); the old projects', in public/proyectos/_archive/.
//
//   title        its name: on its page (giant, at the top), its row on the
//                Works page and its card at the end of the others. In the
//                web's two letters, both in cream: its *brand, between
//                asterisks*, in Catavalo, the rest in Inter Tight
//                (src/title.js)
// On the Works page:
//   description  what it is, in about three lines, under its title (not its
//                page's tagline)
//   cover        the picture of its row
//   preview      what plays, muted and in a loop, while its row is the one in
//                the middle (optional: without it the cover stays):
//                preview.mp4, a few seconds of its video (Fallas's, 8 s to
//                16 s; BizLunch's, 57 s to 1:10; its first frame,
//                preview.webp, their cover)
// On its page (only the projects with a slug):
//   slug         its address: work.html#<slug> (no spaces, accents or
//                capitals); an old one that has changed: MOVED, below
//   tagline      what it is, in one line, under its name (optional)
//   category     a word or two over its name
//   idea         what it was for: 2 or 3 lines
//   challenge    what was hard about it: 2 to 4 lines
//   client, industry, display, role, tools, year   the table of facts (a
//                null or missing one is not shown); display: the screens it
//                was made for
//   credits      who else made it: [{ role, name }], or null
//   video        the project itself: a YouTube address, or an MP4 (its web
//                version: <slug>-1080.mp4)
//   videoSmall   (an MP4's) a lighter one of it for a phone (<slug>-720.mp4)
//   poster       what shows until it plays (poster.webp: a frame of it)
// (The three projects at the end of the page are the next three of this list
// that have a page — after the last, the first ones again.)
// TO FILL IN: industry (none is known but Hummel's), credits, and the year
// of those that have YEAR (a placeholder). Texts marked DRAFT were written
// from what their video shows: to be checked.
const CATEGORY = "Motion Design"; // the same in all but those that say another
const YEAR = "2025"; // placeholder

export const PROJECTS = [
  {
    slug: "waapiti-ai-3d-logo-reveal",
    title: "*Waapiti AI* 3D Logo Reveal",
    description: "A 3D logo reveal for Waapiti AI where thousands of glowing filaments pull the camera into the void before the brand appears.",
    tagline: "Particle-driven 3D animation for Waapiti AI's brand reveal.",
    category: CATEGORY,
    // DRAFT (idea, challenge): written from what the video shows — to be checked
    idea: "A logo reveal for Waapiti AI built from particles: streaks of violet and pink light pull into a glowing ring, and the Waapiti logo appears at its centre.",
    challenge: "Making a field of particles read as one controlled move in under ten seconds — light that gathers rather than scatters — so the logo lands as the payoff instead of getting lost in the effect.",
    client: "Waapiti AI",
    industry: null,
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    video: "https://youtu.be/DWOTVQwR6N8",
    poster: "/proyectos/waapiti-ai-3d-logo-reveal/poster.webp",
    cover: "/proyectos/waapiti-ai-3d-logo-reveal/poster.webp",
    preview: "/proyectos/waapiti-ai-3d-logo-reveal/preview.mp4",
  },
  {
    slug: "hummel-kit-launch-campaign",
    title: "*Hummel* Kit Launch Campaign",
    description: "A joint campaign for Hummel uniting Valencia Basket and Real Betis, presenting both new kits under one shared visual story.",
    tagline: "Joint campaign uniting Valencia Basket and Real Betis under one brand.",
    category: "Sports Campaign",
    // DRAFT (idea, challenge): written from what the video shows — to be checked
    idea: "A Hummel sports campaign that brings two of its clubs into one piece: Real Betis's green-and-white football shirt and Valencia Basket's orange jersey, ending on one line — Two clubs, one brand.",
    challenge: "Two clubs, two sports and two colour worlds in thirteen seconds. Each kit needed its own moment — the stripes and \"Somos Balompié\" for Betis, \"Taronja\" for Valencia Basket — while the whole still read as one Hummel campaign.",
    client: "Hummel",
    industry: "Sportswear",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    video: "https://youtu.be/FabgEQtwm-Y",
    poster: "/proyectos/hummel-kit-launch-campaign/poster.webp",
    cover: "/proyectos/hummel-kit-launch-campaign/poster.webp",
    preview: "/proyectos/hummel-kit-launch-campaign/preview.mp4",
  },
  {
    slug: "tmm-3d-brand-reveal",
    title: "*TMM* 3D Brand Reveal",
    description: "A 3D brand reveal for The Multisensory Makers where glowing spheres gather and settle into the TMM logo, for TMM's Sensory Sync showroom screens.",
    tagline: "Glowing spheres that gather to form The Multisensory Makers' logo.",
    category: CATEGORY,
    // DRAFT (idea, challenge): written from what the video shows — to be checked
    idea: "A 3D brand reveal for The Multisensory Makers: glowing spheres drift out of the dark, pile into one mass and gather into the TMM letters, which settle into the logo. Created for Sensory Sync, the immersive screens of TMM's showroom.",
    challenge: "A crowd of soft, glowing spheres had to move as one — loose enough to feel alive, ordered enough that the letters read clearly before they resolve into the flat logo.",
    client: "TMM",
    industry: null,
    display: "Sensory Sync · TMM showroom screens",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    video: "https://youtu.be/7pxdlWAiUOQ",
    poster: "/proyectos/tmm-3d-brand-reveal/poster.webp",
    cover: "/proyectos/tmm-3d-brand-reveal/poster.webp",
    preview: "/proyectos/tmm-3d-brand-reveal/preview.mp4",
  },
  {
    slug: "tmm-halloween-spot",
    title: "*TMM* Halloween Spot",
    description: "A seasonal spot for TMM with an animated jack-o'-lantern and melting type announcing spooky season, for TMM's Sensory Sync showroom screens.",
    tagline: "Animated jack-o'-lantern and melting type for TMM's spooky season.",
    category: CATEGORY,
    // DRAFT (idea, challenge): written from what the video shows — to be checked
    idea: "A Halloween spot for TMM: a carved jack-o'-lantern turns to face the camera in a misty forest, then the scene gives way to dripping orange type — \"Spooky season at TMM!\". Designed to play on Sensory Sync, the screens of TMM's showroom.",
    challenge: "Keeping a seasonal piece playful rather than gory: the pumpkin's expression and the melting letters carry the mood, while the brand's name stays readable through the drips.",
    client: "TMM",
    industry: null,
    display: "Sensory Sync · TMM showroom screens",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    video: "https://youtu.be/-u5k984d138",
    poster: "/proyectos/tmm-halloween-spot/poster.webp",
    cover: "/proyectos/tmm-halloween-spot/poster.webp",
    preview: "/proyectos/tmm-halloween-spot/preview.mp4",
  },
  {
    slug: "spotify-daylist-social-campaign",
    title: "*Spotify* Daylist Social Campaign",
    description: "Motion pieces for Spotify Daylist, turning moods like 'musical karaoke evening' into short, playful animated visuals for social.",
    tagline: "Motion pieces for daylists like 'musical karaoke evening' and more.",
    category: CATEGORY,
    idea: "A paid advertising campaign for Spotify's Daylist feature, translating its ever-changing, personalized playlists into a bold, mobile-first ad designed for social media promotion.",
    challenge: "Daylist is a playlist that rewrites itself throughout the day, so the ad needed to move the same way — quick, mood-driven, never quite the same twice. It had to run as sponsored content and blend into the feed rather than announce itself as an ad.",
    client: "Spotify",
    industry: null,
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "/proyectos/spotify-daylist-social-campaign/spotify-daylist-social-campaign-1080.mp4",
    videoSmall: "/proyectos/spotify-daylist-social-campaign/spotify-daylist-social-campaign-720.mp4",
    poster: "/proyectos/spotify-daylist-social-campaign/poster.webp",
    cover: "/proyectos/spotify-daylist-social-campaign/poster.webp",
    preview: "/proyectos/spotify-daylist-social-campaign/preview.mp4",
  },
  {
    slug: "tmm-autumn-3d-visual",
    title: "*TMM* Autumn 3D Visual",
    description: "A seasonal 3D visual for TMM where a still carpet of autumn leaves is lifted by the wind and swirls towards the camera, for TMM's Sensory Sync showroom screens.",
    tagline: "Seasonal 3D piece where a carpet of leaves rises into the air.",
    category: CATEGORY,
    // DRAFT (idea, challenge): written from what the video shows — to be checked
    idea: "A seasonal 3D visual for TMM: a still carpet of autumn leaves lifts off the ground, flies towards the camera and gathers into the TMM logo — \"La tardor ja està aquí\". Made for Sensory Sync, the immersive screens of TMM's showroom.",
    challenge: "Making a whole carpet of leaves move as one: heavy and still on the ground before the wind takes it, then a swirl that stays readable enough for the leaves to settle into the logo.",
    client: "TMM",
    industry: null,
    display: "Sensory Sync · TMM showroom screens",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    video: "https://youtu.be/Xlqg8Qoa9NY",
    poster: "/proyectos/tmm-autumn-3d-visual/poster.webp",
    cover: "/proyectos/tmm-autumn-3d-visual/poster.webp",
    preview: "/proyectos/tmm-autumn-3d-visual/preview.mp4",
  },
  {
    slug: "sitges-festival-motion-spot",
    title: "*Sitges* Festival Motion Spot",
    description: "A motion spot for the Sitges film festival, built around bold characters, colour and a cinematic tone.",
    tagline: "Motion piece for the Sitges film festival.",
    category: CATEGORY,
    idea: "2D animations celebrating the cult community that defines the spirit of Sitges.",
    challenge: "Sitges wanted Freaks reinterpreted as a mirror for its own audience — people who wear being different as a badge of honour. The piece needed a character that felt like it belonged to that crowd, screened in 2024 ahead of the film's restoration.",
    client: "Sitges Film Festival",
    industry: null,
    role: "2D Animator & Rigger",
    tools: "After Effects, Duik Angela",
    year: YEAR,
    credits: null,
    video: "/proyectos/sitges-festival-motion-spot/sitges-festival-motion-spot-1080.mp4",
    videoSmall: "/proyectos/sitges-festival-motion-spot/sitges-festival-motion-spot-720.mp4",
    poster: "/proyectos/sitges-festival-motion-spot/poster.webp",
    cover: "/proyectos/sitges-festival-motion-spot/poster.webp",
    preview: "/proyectos/sitges-festival-motion-spot/preview.mp4",
  },
  {
    slug: "caprabo",
    title: "*Caprabo*",
    description: "Motion content designed for the screens inside Caprabo supermarkets, bringing fresh products and offers to life in store.",
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
    cover: "/works/covers/caprabo.jpg",
    preview: "/proyectos/Caprabo/Tienda/Tienda 1.mp4",
  },
  {
    slug: "fallas-festival-motion-visuals",
    title: "*Fallas* Festival Motion Visuals",
    description: "A motion piece celebrating Valencia's Fallas, mixing fire, colour and craft into a festive visual rhythm.",
    tagline: "Motion piece celebrating Valencia's festival of fire.",
    category: CATEGORY,
    idea: "2D animation recreating the Ofrenda, the Mascletà, and the Cremà in motion.",
    challenge: "Fallas is fire, music, colour and the whole city out in the street every March — it's not a subtle thing to animate. The challenge was turning key moments like the Ofrenda, the Mascletà and the Cremà into 2D animation without flattening them into decoration.",
    client: "Fallas",
    industry: null,
    role: "Motion Designer",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "/proyectos/fallas-festival-motion-visuals/fallas-festival-motion-visuals-1080.mp4",
    videoSmall: "/proyectos/fallas-festival-motion-visuals/fallas-festival-motion-visuals-720.mp4",
    poster: "/proyectos/fallas-festival-motion-visuals/poster.webp",
    cover: "/proyectos/fallas-festival-motion-visuals/preview.webp",
    preview: "/proyectos/fallas-festival-motion-visuals/preview.mp4",
  },
  {
    slug: "ron-barcelo-summer-spot",
    title: "*Ron Barceló* Summer Spot",
    description: "A summer spot for Ron Barceló designed to feel like heat, colour and movement from the very first frame.",
    tagline: "A burst of colour, movement and heat built to feel like summer from the first frame.",
    category: CATEGORY,
    idea: "A short promotional spot for Ron Barceló, capturing a vibrant, sun-soaked summer atmosphere through bold color and energetic motion.",
    challenge: "Ron Barceló wanted something that feels like summer the second it starts playing — colour, movement, heat, no slow build-up.",
    client: "Ron Barceló",
    industry: null,
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "/proyectos/ron-barcelo-summer-spot/ron-barcelo-summer-spot-1080.mp4",
    videoSmall: "/proyectos/ron-barcelo-summer-spot/ron-barcelo-summer-spot-720.mp4",
    poster: "/proyectos/ron-barcelo-summer-spot/poster.webp",
    cover: "/proyectos/ron-barcelo-summer-spot/poster.webp",
    preview: "/proyectos/ron-barcelo-summer-spot/preview.mp4",
  },
  {
    slug: "bizlunch-app-promo-spot",
    title: "*BizLunch* App Promo Spot",
    description: "A promo film for BizLunch, an app that matches professionals for business lunches, mixing live action and app screens.",
    tagline: "Promo film for an app that matches professionals for business lunches.",
    category: CATEGORY,
    idea: "A promo spot for BizLunch, an app that matches professionals for business lunches, cutting between a real meetup and the screens that make it happen.",
    challenge: "Nobody's used an app like this before, so the video had to sell the idea itself — going from lunch alone at your desk to a matched meeting — and still show enough of the app (matching, booking, ratings) to make it feel real, not just a concept trailer.",
    client: "BizLunch",
    industry: null,
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    credits: null,
    video: "/proyectos/bizlunch-app-promo-spot/bizlunch-app-promo-spot-1080.mp4",
    videoSmall: "/proyectos/bizlunch-app-promo-spot/bizlunch-app-promo-spot-720.mp4",
    poster: "/proyectos/bizlunch-app-promo-spot/poster.webp",
    cover: "/proyectos/bizlunch-app-promo-spot/preview.webp",
    preview: "/proyectos/bizlunch-app-promo-spot/preview.mp4",
  },
];

// The old addresses of the projects that have a new one (work.html#<old>
// goes on to work.html#<new>); one of a project that is gone, to the Works
// page.
export const MOVED = {
  hummel: "hummel-kit-launch-campaign",
  "hummel-betis": "hummel-kit-launch-campaign",
  "hummel-valencia-basket": "hummel-kit-launch-campaign",
  "spotify-daylist": "spotify-daylist-social-campaign",
  spotify: "spotify-daylist-social-campaign",
  "sitges-film-festival": "sitges-festival-motion-spot",
  sitges: "sitges-festival-motion-spot",
  waapiti: "waapiti-ai-3d-logo-reveal",
  "ron-barcelo": "ron-barcelo-summer-spot",
  "estiu-tmm": "ron-barcelo-summer-spot",
  "fallas-valencia": "fallas-festival-motion-visuals",
  bizlunch: "bizlunch-app-promo-spot",
  "tmm-esferas": "tmm-3d-brand-reveal",
  "otono-tmm": "tmm-autumn-3d-visual",
};

// A project's page (work.html#<slug>), or null: it has none ("Coming soon").
export const projectUrl = (project) => (project.slug ? `work.html#${project.slug}` : null);
// The `count` projects after `project` on the Works page that have a page,
// starting again from the first after the last.
export function nextProjects(project, count) {
  const pages = PROJECTS.filter((entry) => entry.slug);
  const at = pages.indexOf(project);
  return Array.from({ length: count }, (_, k) => pages[(at + 1 + k) % pages.length]);
}

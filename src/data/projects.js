// ---- The projects ---------------------------------------------------------------------
// One entry per project, in the order of the Works page (works.html,
// src/works.js: two columns, the first of each pair on the left) — one per
// video for Waapiti's product videos and the contents of TMM's Sensory Sync;
// Caprabo's holograms, one project with all its pieces. Each one has a page
// of its own (work.html#<slug>: one template for all of them, src/case.js).
// Their files are in public/proyectos/ (a series' projects — Waapiti's
// product videos, TMM's showroom — share their series' folder); the old
// projects' and old versions, in archive/ at the project's root (not
// published, not in git).
//
//   slug         its address: work.html#<slug> (no spaces, accents or
//                capitals); an old one that has changed: MOVED, below
//   title        its name, in the web's two letters, both in cream: its
//                *brand, between asterisks*, in Catavalo, the rest in Inter
//                Tight (src/title.js)
//   description  what it is, in a line or two (Works: under its name)
//   type         its kind, one of the same few for all: "Digital signage",
//                "Product animation", "3D logo reveal", "Brand campaign",
//                "Social media", "Holographic content", "Seasonal content",
//                "App promo" (Works: under its description)
//   idea         what it was for: 2 or 3 lines ("(About the project)")
//   client, display, role, tools, year   the table of facts (a null or
//                missing one is not shown); display (optional): the screens
//                it was made for
//   video        the project itself, its web version: the path of its files
//                up to their size (src/video-source.js: <video>-<size>.mp4,
//                H.264, made from its original in source-videos/)
//   videoSizes   the heights it is in (1440, 1080, 720: none bigger than its
//                original's); the one played is the one the size it is shown
//                at asks for
//   poster       what shows until it plays (a frame of it): also its
//                card's picture on the Works page, where its video's 720 file
//                plays over it under the pointer
//   youtube, event, venue (optional) where it is / was shown (kept for
//                reference)
//   case         what its page shows:
//                  pictureSize    its picture's [width, height]
//                  statement      the big sentence on the cream
//                  tags           under it
//                  picture        the held picture ({ src, alt }: src without
//                                 its "-1280.webp" / "-2400.webp"): a frame
//                                 of its video, or a mockup of its own
//                  creative       (optional) the dark layer after it: its big
//                                 sentence (*keyword*), paragraphs (the
//                                 creative response) and more ([{ label,
//                                 text }]: its challenge)
//                  final          (optional, with creative) its pieces, in a
//                                 grid in that layer: { label, title,
//                                 videos: [{ line, video, videoSizes,
//                                 poster }] } — square, each played with its
//                                 sound when pressed
// TO FILL IN: the year of those that have YEAR (a placeholder). Texts marked
// DRAFT were written from what their video shows: to be checked.
const YEAR = "2025"; // placeholder

// Waapiti's product videos: one each, the same facts.
const WAAPITI = {
  type: "Product animation",
  client: "Waapiti",
  role: "Motion Designer",
  tools: "After Effects",
  year: "2026",
};
const waapiti = (name, rest, { video, picture, alt, statement, tags, ...texts }) => ({
  slug: `waapiti-${name}`,
  title: `*Waapiti* ${rest}`,
  ...WAAPITI,
  ...texts,
  // (no 1440: the originals are 1080p)
  video: `/proyectos/waapiti-product-videos/videos/${video}`,
  videoSizes: [1080, 720],
  poster: `/proyectos/waapiti-product-videos/videos/${video}-poster.webp`,
  case: {
    pictureSize: [1920, 1080],
    statement,
    tags,
    picture: { src: `/proyectos/waapiti-product-videos/mockups/${picture}`, alt },
  },
});

// TMM's showroom, Sensory Sync: one per video, the same facts.
const TMM = {
  client: "TMM",
  role: "Motion Designer",
  tools: "Cinema 4D, After Effects, Kling",
  year: "2026",
};

export const PROJECTS = [
  // -- 1
  {
    slug: "waapiti-ai-3d-logo-reveal",
    title: "*Waapiti AI* 3D Logo Reveal",
    type: "3D logo reveal",
    description: "A 3D logo reveal for Waapiti AI at AfterISE 2026: a technological eye made of light filaments, designed to play across every screen of TMM's Sensory Sync showroom.",
    idea: "During ISE 2026, TMM hosted an AfterISE at Sensory Sync, its showroom in Barcelona. Waapiti AI, a digital signage company, wanted a brand moment that worked on every screen in the room, from the main LED wall to the columns and meeting-room displays.",
    client: "Waapiti AI",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    event: "AfterISE · ISE 2026, Barcelona",
    venue: "Sensory Sync · TMM showroom",
    video: "/proyectos/waapiti-ai-3d-logo-reveal/waapiti-ai-3d-logo-reveal",
    videoSizes: [1440, 1080, 720],
    youtube: "https://youtu.be/hiAC1CUjSS0",
    poster: "/proyectos/waapiti-ai-3d-logo-reveal/poster-v2.webp",
    case: {
      pictureSize: [2752, 1536],
      statement: "A 3D logo reveal for Waapiti AI, shown at TMM's showroom during AfterISE 2026.",
      tags: ["Waapiti AI", "ISE 2026", "Sensory Sync", "3D Logo Reveal"],
      picture: { src: "/proyectos/waapiti-ai-3d-logo-reveal/mockups/mockup-01", alt: "The Waapiti AI reveal on a large screen at an evening event" },
    },
  },
  {
    slug: "caprabo-holographic-content",
    title: "*Caprabo* – Holographic content",
    type: "Holographic content",
    description: "3D animations for the holographic fans of Caprabo L'Illa, Barcelona — seasonal campaigns and in-store promos floating in mid-air above the aisles.",
    idea: "The Caprabo store at L'Illa Diagonal has holographic fans hanging from the ceiling. I made a series of short 3D loops for them, from coffee and loyalty-card promos to Christmas and Three Kings' Day campaigns.",
    client: "Caprabo",
    display: "Holographic fans · Caprabo L'Illa, Barcelona",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects",
    year: "2026",
    // (the holograms' compilation, 10s: its mockups, one after another; no 1440 — its original is 1080p)
    video: "/proyectos/caprabo-3d-hologram-content/caprabo-3d-hologram-content",
    videoSizes: [1080, 720],
    poster: "/proyectos/caprabo-3d-hologram-content/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      statement: "3D animations for the holographic fans hanging above the aisles of Caprabo L'Illa, in Barcelona.",
      tags: ["Caprabo", "Holographic fans", "3D animation", "Retail"],
      // (the compilation at 1.492s: "Super Caprabo" on a fan hanging from the ceiling)
      picture: { src: "/proyectos/caprabo-3d-hologram-content/mockups/frame-1.49s", alt: "\"Super Caprabo\" in 3D, floating on a holographic fan hanging from the ceiling of Caprabo L'Illa" },
      creative: {
        statement: "Designed for *black*: every piece lives on a dark canvas, so only the product and the message appear to float in the store.",
        paragraphs: ["On a holographic fan, black is transparent, so only the product appears to float. Each piece is built around one object (a coffee cup, a loyalty card, a tortell, Santa's sleigh) with bold 3D type and particles."],
        more: [{ label: "(Challenge)", text: "Content for a round, see-through display in a bright supermarket: no backgrounds, strong silhouettes, high contrast and loops short enough to read in passing." }],
      },
      // (the five square animations, 1080x1080 / 720x720 — Reis and Santa with their sound)
      final: {
        label: "(Final result)",
        title: "The final *animations*",
        videos: [
          ["cafe", "Coffee — Així de bo"],
          ["globos", "Super Caprabo"],
          ["reis", "Three Kings — Tortell"],
          ["santa", "Christmas — Santa"],
          ["soc-del-club", "Loyalty card — Soc del Club"],
        ].map(([name, line]) => ({ line, video: `/proyectos/caprabo-3d-hologram-content/animations/${name}`, videoSizes: [1080, 720], poster: `/proyectos/caprabo-3d-hologram-content/animations/${name}-poster.webp` })),
      },
    },
  },
  // -- 2
  {
    slug: "hummel-kit-launch-campaign",
    title: "*Hummel* Kit Launch Campaign",
    type: "Brand campaign",
    description: "A joint campaign for Hummel uniting Valencia Basket and Real Betis, presenting both new kits under one shared visual story.",
    idea: "Hummel makes the kits for Valencia Basket and Real Betis. For the new season, the brand wanted a single campaign that presented both shirts together while keeping each club's identity.",
    client: "Hummel",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    video: "/proyectos/hummel-kit-launch-campaign/hummel-kit-launch-campaign",
    videoSizes: [1080, 720],
    youtube: "https://youtu.be/FabgEQtwm-Y",
    poster: "/proyectos/hummel-kit-launch-campaign/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      statement: "One campaign to launch the new Hummel kits of Valencia Basket and Real Betis.",
      tags: ["Hummel", "Valencia Basket", "Real Betis", "Kit Launch"],
      // (the main video's frame at 0:06, exactly: mid-shot, sharp)
      picture: { src: "/proyectos/hummel-kit-launch-campaign/mockups/frame-6s", alt: "Real Betis's new Hummel shirt, its crest and stripes under a hard light" },
    },
  },
  waapiti("ai", "AI", {
    // DRAFT (description)
    description: "A product video launching Waapiti AI, which tags and sorts every piece of content on the digital signage platform.",
    video: "waapiti-ai",
    // DRAFT (statement, idea)
    statement: "A product video for Waapiti AI, the assistant that tags and sorts every piece of content on the platform.",
    idea: "Waapiti is a digital signage platform for managing the content on all of a company's screens. This video launches Waapiti AI, which tags the media library by itself, so the right content is always easy to find and to schedule.",
    tags: ["Waapiti", "Digital signage", "Product video", "AI"],
    // (at 16.6s: the platform — Media Content, its tagged contents — and Waapiti AI's panel)
    picture: "frame-16.6s",
    alt: "The Waapiti platform's Media Content page, four contents tagged \"promotion\" by Waapiti AI in its side panel",
  }),
  // -- 3
  {
    slug: "tmm-3d-brand-reveal",
    title: "*TMM* 3D Brand Reveal",
    type: "Digital signage",
    // DRAFT (description)
    description: "A 3D brand reveal for TMM's Sensory Sync showroom: a single light turns into glowing spheres that gather into the logo.",
    ...TMM,
    // DRAFT (statement, idea: from the old TMM Sensory Sync Content's)
    idea: "Sensory Sync is TMM's showroom in Barcelona, where clients see screens, light and sound working together before taking them to their own stores and events. The brand reveal opens every visit, on the main LED wall, the curved column and the window screens at once.",
    video: "/proyectos/tmm-sensory-sync-content/spheres",
    videoSizes: [1440, 1080, 720],
    youtube: "https://youtu.be/7pxdlWAiUOQ",
    poster: "/proyectos/tmm-sensory-sync-content/spheres-final-poster.webp",
    case: {
      pictureSize: [2400, 1350],
      statement: "A 3D brand reveal for TMM: a single light turns into glowing spheres that gather into the logo.",
      tags: ["TMM", "Sensory Sync", "3D", "Brand reveal"],
      picture: { src: "/proyectos/tmm-sensory-sync-content/mockups/spheres-04", alt: "The spheres on the main LED wall of TMM's Sensory Sync showroom, a meeting at the round table in front of it" },
    },
  },
  {
    slug: "spotify-daylist-social-campaign",
    title: "*Spotify* Daylist Social Campaign",
    type: "Social media",
    description: "Motion pieces for Spotify Daylist, turning moods like 'musical karaoke evening' into short, playful animated visuals for social.",
    idea: "A paid advertising campaign for Spotify's Daylist feature, translating its ever-changing, personalized playlists into a bold, mobile-first ad designed for social media promotion.",
    client: "Spotify",
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    video: "/proyectos/spotify-daylist-social-campaign/spotify-daylist-social-campaign",
    videoSizes: [1080, 720],
    poster: "/proyectos/spotify-daylist-social-campaign/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      // DRAFT (statement)
      statement: "A mobile-first social ad that turns Spotify's ever-changing Daylist into bold, mood-driven motion.",
      tags: ["Spotify", "Daylist", "Social Ads", "Motion Design"],
      // (the main video's frame at 5.19s: sharp, mid-shot)
      picture: { src: "/proyectos/spotify-daylist-social-campaign/mockups/frame-5.19s", alt: "A phone reading \"electro dance afternoon\", surrounded by decks, headphones and pixel sunglasses" },
    },
  },
  // -- 4
  waapiti("mcp", "MCP", {
    // DRAFT (description)
    description: "A product video for Waapiti MCP: running every screen from the AI assistant you already use, from a single chat.",
    video: "mcp",
    // DRAFT (statement, idea)
    statement: "A product video for Waapiti MCP: run your screens from the AI assistant you already use.",
    idea: "MCP connects Waapiti to assistants like Claude, ChatGPT or Copilot. The video shows one chat publishing a campaign on every screen, automations with no custom code, and each user keeping their own permissions.",
    tags: ["Waapiti", "Digital signage", "Product video", "MCP"],
    // (at 12.5s: Claude, ChatGPT and Copilot, through MCP, to the platform)
    picture: "mcp-frame-12.5s",
    alt: "Claude, ChatGPT and Copilot connected through MCP to the Waapiti platform",
  }),
  {
    slug: "tmm-autumn-3d-visual",
    title: "*TMM* Autumn 3D Visual",
    type: "Seasonal content",
    // DRAFT (description)
    description: "A seasonal 3D piece for TMM's Sensory Sync: a carpet of leaves, lifted by the wind and swirled into the logo.",
    ...TMM,
    // DRAFT (statement, idea: from the old TMM Sensory Sync Content's)
    idea: "A seasonal piece for the screens of Sensory Sync, TMM's showroom in Barcelona. The leaves rise and swirl into the TMM logo, with copy about colour and sound: 'Es veu en cada color. S'escolta en cada fulla.'",
    video: "/proyectos/tmm-sensory-sync-content/autumn",
    videoSizes: [1440, 1080, 720],
    poster: "/proyectos/tmm-sensory-sync-content/autumn-final-poster.webp",
    case: {
      pictureSize: [2400, 1350],
      statement: "Autumn for every sense: a carpet of 3D leaves, lifted by the wind into the TMM logo.",
      tags: ["TMM", "Sensory Sync", "3D", "Seasonal"],
      picture: { src: "/proyectos/tmm-sensory-sync-content/mockups/autumn-02", alt: "The autumn leaves on a window display facing the street" },
    },
  },
  // -- 5
  {
    slug: "sitges-festival-motion-spot",
    title: "*Sitges* Festival Motion Spot",
    type: "Brand campaign",
    description: "A motion spot for the Sitges film festival, built around bold characters, colour and a cinematic tone.",
    idea: "2D animations celebrating the cult community that defines the spirit of Sitges.",
    client: "Sitges Film Festival",
    role: "2D Animator & Rigger",
    tools: "After Effects, Duik Angela",
    year: YEAR,
    video: "/proyectos/sitges-festival-motion-spot/sitges-festival-motion-spot",
    videoSizes: [1080, 720],
    poster: "/proyectos/sitges-festival-motion-spot/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      // DRAFT (statement)
      statement: "A 2D character spot for Sitges, reinterpreting Freaks as a mirror for the festival's own cult audience.",
      tags: ["Sitges", "Film Festival", "2D Animation", "Rigging"],
      // (the main video's frame at 11.74s: sharp, mid-shot)
      picture: { src: "/proyectos/sitges-festival-motion-spot/mockups/frame-11.74s", alt: "The spot's character, a close-up of his frowning face against red" },
    },
  },
  waapiti("iptv-multicast", "IPTV Multicast", {
    // DRAFT (description)
    description: "A product video for Waapiti IPTV Multicast: live TV, IP cameras or set-top boxes sent to every screen as one single stream.",
    video: "iptv",
    // DRAFT (statement, idea)
    statement: "A product video for Waapiti IPTV Multicast: any source, one stream, every screen.",
    idea: "IPTV Multicast takes live TV channels, IP cameras or set-top boxes to every screen of a network while sending a single stream. The video follows one signal from its source to dozens of screens: more screens, same traffic.",
    tags: ["Waapiti", "Digital signage", "Product video", "IPTV"],
    // (at 21s: one source, one stream, every screen)
    picture: "iptv-frame-21s",
    alt: "One TV channel sent as a single stream to a grid of screens on the Waapiti platform",
  }),
  // -- 6
  {
    slug: "tmm-halloween-spot",
    title: "*TMM* Halloween Spot",
    type: "Seasonal content",
    description: "A seasonal spot for TMM with an animated jack-o'-lantern and melting type announcing spooky season, for TMM's Sensory Sync showroom screens.",
    // DRAFT (idea): written from what the video shows — to be checked
    idea: "A Halloween spot for TMM: a carved jack-o'-lantern turns to face the camera in a misty forest, then the scene gives way to dripping orange type — \"Spooky season at TMM!\". Designed to play on Sensory Sync, the screens of TMM's showroom.",
    client: "TMM",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    video: "/proyectos/tmm-halloween-spot/tmm-halloween-spot",
    videoSizes: [1440, 1080, 720],
    youtube: "https://youtu.be/-u5k984d138",
    poster: "/proyectos/tmm-halloween-spot/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      // DRAFT (statement)
      statement: "A Halloween spot for TMM: a carved pumpkin, a misty forest and type that melts into the season.",
      tags: ["TMM", "Halloween", "Sensory Sync", "3D"],
      // (the main video's frame at 3.95s: sharp, mid-shot)
      picture: { src: "/proyectos/tmm-halloween-spot/mockups/frame-3.95s", alt: "The carved jack-o'-lantern grinning in a misty forest" },
    },
  },
  {
    slug: "fallas-festival-motion-visuals",
    title: "*Fallas* Festival Motion Visuals",
    type: "Seasonal content",
    description: "A motion piece celebrating Valencia's Fallas, mixing fire, colour and craft into a festive visual rhythm.",
    idea: "2D animation recreating the Ofrenda, the Mascletà, and the Cremà in motion.",
    client: "Fallas",
    role: "Motion Designer",
    tools: "After Effects",
    year: YEAR,
    video: "/proyectos/fallas-festival-motion-visuals/fallas-festival-motion-visuals",
    videoSizes: [1080, 720],
    poster: "/proyectos/fallas-festival-motion-visuals/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      // DRAFT (statement)
      statement: "Valencia's festival of fire in 2D: the Ofrenda, the Mascletà and the Cremà, set in motion.",
      tags: ["Fallas", "Valencia", "2D Animation", "Motion Design"],
      // (the main video's frame at 21s: sharp, mid-shot)
      picture: { src: "/proyectos/fallas-festival-motion-visuals/mockups/frame-21s", alt: "Two figures resting by a falla in flames as a third climbs the steps above" },
    },
  },
  // -- 7
  {
    slug: "ron-barcelo-summer-spot",
    title: "*Ron Barceló* Summer Spot",
    type: "Brand campaign",
    description: "A summer spot for Ron Barceló designed to feel like heat, colour and movement from the very first frame.",
    idea: "A short promotional spot for Ron Barceló, capturing a vibrant, sun-soaked summer atmosphere through bold color and energetic motion.",
    client: "Ron Barceló",
    role: "Motion Design, Editing",
    tools: "After Effects",
    year: YEAR,
    video: "/proyectos/ron-barcelo-summer-spot/ron-barcelo-summer-spot",
    videoSizes: [720],
    poster: "/proyectos/ron-barcelo-summer-spot/poster.webp",
    case: {
      pictureSize: [1920, 1080],
      // DRAFT (statement)
      statement: "A short summer spot for Ron Barceló: bold colour and energetic motion from the very first frame.",
      tags: ["Ron Barceló", "Summer", "Motion Design", "Editing"],
      // (the main video's frame at 5.5s: sharp, mid-shot)
      picture: { src: "/proyectos/ron-barcelo-summer-spot/mockups/frame-5.5s", alt: "A sun-drawn circle framed by jungle leaves, in the spot's flat illustrated style" },
    },
  },
  waapiti("interactive-screensaver", "Interactive Screensaver", {
    // DRAFT (description)
    description: "A product video for Waapiti's interactive screensaver: screens that play the company's channel and open any website at a touch.",
    video: "screensaver",
    // DRAFT (statement, idea)
    statement: "A product video for Waapiti's interactive screensaver: screens that play your channel and wake up at a touch.",
    idea: "When nobody is using it, the screen plays the company's channel; one touch opens any website full screen, with an on-screen keyboard when it's needed, and after a while it goes back by itself. The video tells it through a customer exploring a shop's collection.",
    tags: ["Waapiti", "Digital signage", "Product video", "Interactive"],
    // (at 17s: a customer exploring a shop's collection on a kiosk)
    picture: "screensaver-frame-17s",
    alt: "A customer browsing a shop's collection on an interactive Waapiti kiosk",
  }),
];

// The old addresses of the projects that have a new one (work.html#<old>
// goes on to work.html#<new>): a series split into one project per video,
// to its first; Caprabo's holograms, one by one for a while, to the one
// project. (One of a project that is gone, BizLunch's or Waapiti Sync
// Displays': not here — the Works page.)
export const MOVED = {
  caprabo: "caprabo-holographic-content",
  "caprabo-3d-hologram-content": "caprabo-holographic-content",
  hummel: "hummel-kit-launch-campaign",
  "hummel-betis": "hummel-kit-launch-campaign",
  "hummel-valencia-basket": "hummel-kit-launch-campaign",
  "spotify-daylist": "spotify-daylist-social-campaign",
  spotify: "spotify-daylist-social-campaign",
  "sitges-film-festival": "sitges-festival-motion-spot",
  sitges: "sitges-festival-motion-spot",
  waapiti: "waapiti-ai-3d-logo-reveal",
  "waapiti-product-videos": "waapiti-ai",
  "ron-barcelo": "ron-barcelo-summer-spot",
  "estiu-tmm": "ron-barcelo-summer-spot",
  "fallas-valencia": "fallas-festival-motion-visuals",
  "tmm-sensory-sync-content": "tmm-3d-brand-reveal",
  "tmm-esferas": "tmm-3d-brand-reveal",
  "otono-tmm": "tmm-autumn-3d-visual",
  "caprabo-super-caprabo": "caprabo-holographic-content",
  "caprabo-soc-del-club": "caprabo-holographic-content",
  "caprabo-santa": "caprabo-holographic-content",
  "caprabo-tortell": "caprabo-holographic-content",
  "caprabo-coffee": "caprabo-holographic-content",
};

// A project's page.
export const projectUrl = (project) => `work.html#${project.slug}`;
// The `count` projects after `project` on the Works page, starting again from
// the first after the last (its page's carousel of the others).
export function nextProjects(project, count) {
  const at = PROJECTS.indexOf(project);
  return Array.from({ length: count }, (_, k) => PROJECTS[(at + 1 + k) % PROJECTS.length]);
}

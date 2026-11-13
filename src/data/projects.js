// ---- The projects ---------------------------------------------------------------------
// One entry per project, in the order of the Works page (works.html,
// src/works.js), which lists them all. Those that have a page of their own
// (work.html#<slug>: one template for all of them, src/case.js) carry what
// that page shows; one that does not would be "Coming soon" on the Works page,
// with no link. Each one's files are in public/proyectos/<slug>/; the old
// projects' and old versions, in archive/ at the project's root (not
// published, not in git).
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
//   video        the project itself, its web version: the path of its files
//                up to their size (src/video-source.js: <video>-<size>.mp4,
//                H.264, made from its original in source-videos/) — or, with
//                no videoSizes, one MP4 of the web's own
//   videoSizes   the heights it is in (1440, 1080, 720: none bigger than its
//                original's); the one played is the one the size it is shown
//                at asks for
//   youtube      where it is on YouTube: kept for reference; the page plays
//                it from there only if it has no video
//   poster       what shows until it plays (poster.webp: a frame of it)
//   layout       "case": every page is a case study (src/case.js), with
//                what it needs in `case` (a project without it: an error,
//                never another template):
//                  pictureSize    its pictures' [width, height]
//                  coverTitle     its name on the cover, a line each
//                  coverKicker    small over it: "Client · context"
//                  coverVideo     (optional) the cover's video ({ video,
//                                 videoSizes }), if not the project's own
//                  statement      the big sentence on the cream
//                  tags           under it
//                  picture        the held picture ({ src, alt }: src without
//                                 its "-1280.webp" / "-2400.webp"): a frame
//                                 of its video, or a mockup of its own
//                  creative       the dark layer's big sentence (*keyword*),
//                                 paragraphs (the creative response), more
//                                 ([{ label, text }]: its challenge) and
//                                 pictures (optional: two out of line, square; focus:
//                                 the part kept, an object-position)
//                  final          { videos: [{ line, poster, video?,
//                                 videoSizes?, cursorLabel?, preview?
//                                 ([from, to]: its muted preview's part) }],
//                                 holdVh? (each
//                                 one's hold: 150 if none) }: each video
//                                 the whole screen, one after another, the
//                                 cursor's words its cursorLabel (the
//                                 project's name if none) — or { label,
//                                 title, grid: true, videos }: square ones in
//                                 a grid, under that label and title
//                  social         (optional) its vertical cut-downs
//                  carousel       its pictures (none under two: none shown)
//   event, venue (optional) where it was shown (kept for reference)
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
    description: "A 3D logo reveal for Waapiti AI at AfterISE 2026: a technological eye made of light filaments, designed to play across every screen of TMM's Sensory Sync showroom.",
    tagline: "A technological eye for Waapiti AI, created for AfterISE at TMM's Sensory Sync showroom.",
    category: CATEGORY,
    idea: "During ISE 2026 in Barcelona, TMM hosted an AfterISE at Sensory Sync, its immersive showroom. For the night, Waapiti AI — a digital signage company — needed a brand moment that could live across every screen in the space, from the main LED wall to columns and meeting-room displays.",
    challenge: "The piece had to work on very different displays in the same room — a large LED wall, a curved LED column and standard screens — and hold attention in a busy networking event. That meant a strong, centred composition that reads at any size or shape, and a loop short enough to catch people as they walk past.",
    client: "Waapiti AI",
    industry: null,
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    event: "AfterISE · ISE 2026, Barcelona",
    venue: "Sensory Sync · TMM showroom",
    credits: null,
    video: "/proyectos/waapiti-ai-3d-logo-reveal/waapiti-ai-3d-logo-reveal",
    videoSizes: [1440, 1080, 720],
    youtube: "https://youtu.be/hiAC1CUjSS0",
    layout: "case",
    case: {
      pictureSize: [2752, 1536],
      coverTitle: ["*Waapiti AI*", "3D Logo Reveal"],
      coverKicker: "Waapiti AI · Barcelona",
      statement: "A technological eye for Waapiti AI, created for AfterISE 2026 at TMM's Sensory Sync showroom.",
      tags: ["Waapiti AI", "ISE 2026", "Sensory Sync", "3D Logo Reveal"],
      picture: { src: "/proyectos/waapiti-ai-3d-logo-reveal/mockups/mockup-01", alt: "The Waapiti AI reveal on a large screen at an evening event" },
      creative: {
        statement: "*Thousands of light filaments* open like an iris and reveal the brand at its centre — a screen that looks back at you.",
        paragraphs: [
          "Digital signage is, above all, about being seen. The idea was to turn the brand into a technological eye: thousands of filaments of violet and pink light pull towards a single point, open like an iris and reveal Waapiti AI at its centre. A screen that looks back at you.",
          "A ten-second loop that turned the whole showroom into Waapiti AI's stage for the night — one visual identity, adapted to every screen in the space.",
        ],
        pictures: [
          { src: "/proyectos/waapiti-ai-3d-logo-reveal/mockups/mockup-02", alt: "Guests in front of the reveal on an event screen", focus: "70% 50%" },
          { src: "/proyectos/waapiti-ai-3d-logo-reveal/mockups/mockup-04", alt: "The reveal on a vertical screen in the showroom's window, seen from the street", focus: "80% 50%" },
        ],
      },
      final: {
        videos: [{ line: "10s loop · Sensory Sync, AfterISE 2026", poster: "/proyectos/waapiti-ai-3d-logo-reveal/final-poster.webp" }],
      },
      carousel: [
        { src: "/proyectos/waapiti-ai-3d-logo-reveal/mockups/mockup-02", alt: "Guests in front of the reveal on an event screen" },
      ],
    },
    poster: "/proyectos/waapiti-ai-3d-logo-reveal/poster-v2.webp",
    cover: "/proyectos/waapiti-ai-3d-logo-reveal/poster-v2.webp",
    preview: "/proyectos/waapiti-ai-3d-logo-reveal/preview-v2.mp4",
  },
  {
    slug: "waapiti-product-videos",
    title: "*Waapiti* Product Videos",
    description: "A series of motion videos explaining Waapiti's key features — from AI tagging and MCP to IPTV and interactive screensavers — in one shared visual language.",
    tagline: "A series of product videos for Waapiti, the digital signage platform.",
    category: CATEGORY,
    idea: "Waapiti is a digital signage platform that lets businesses manage the content on all their screens from one place. I created a series of product videos to launch and explain its key features — Waapiti AI, the MCP connection, IPTV multicast and the interactive screensaver — turning technical tools into short, clear stories for clients and social media.",
    challenge: "Explaining technical features — AI tagging, MCP, IPTV — to a non-technical audience in under a minute, while keeping each piece simple, readable and on brand.",
    client: "Waapiti",
    industry: "Digital signage",
    role: "Motion Designer",
    tools: "After Effects",
    year: "2026",
    credits: null,
    // (the teaser: a dry-cut shot of each video's platform — AI 14.0-16.5s, MCP 16.0-18.1s, IPTV 20.8-22.4s,
    // Screensaver 16.5-19.4s —; no 1440: the originals are 1080p)
    video: "/proyectos/waapiti-product-videos/waapiti-product-videos-teaser",
    videoSizes: [1080, 720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Waapiti*", "Product Videos"],
      coverKicker: "Waapiti · Digital signage",
      statement: "Four features, one visual language: product videos that make digital signage simple to understand.",
      tags: ["Waapiti", "Digital signage", "Product video", "UI motion"],
      // (Waapiti AI at 16.6s: the platform — Media Content, its tagged contents — and Waapiti AI's panel)
      picture: { src: "/proyectos/waapiti-product-videos/mockups/frame-16.6s", alt: "The Waapiti platform's Media Content page, four contents tagged \"promotion\" by Waapiti AI in its side panel" },
      creative: {
        statement: "Every feature told in seconds: kinetic type, clean UI and the brand's warm palette.",
        paragraphs: ["Each video follows the same system: a short question or claim in bold kinetic typography, highlighted keywords in Waapiti's coral, UI animated step by step and a clean brand close. The look stays consistent across the series, so every new feature feels part of the same family."],
        more: [{ label: "(Challenge)", text: "Explaining technical features — AI tagging, MCP, IPTV — to a non-technical audience in under a minute, while keeping each piece simple, readable and on brand." }],
      },
      // (the four videos, the whole screen one after another; a shorter hold than the others': four of them;
      // each one's preview, a part of its platform — not its intro —, but IPTV's: its first 4s)
      final: {
        holdVh: 100,
        videos: [
          ["waapiti-ai", "Waapiti AI", "Waapiti AI", [14.0, 17.3]],
          ["mcp", "MCP", "MCP", [14.4, 18.2]],
          ["iptv", "IPTV multicast", "IPTV", [0, 4.0]],
          ["screensaver", "Interactive screensaver", "Screensaver", [15.8, 20.8]],
        ].map(([name, line, cursorLabel, preview]) => ({ line, cursorLabel, preview, video: `/proyectos/waapiti-product-videos/videos/${name}`, videoSizes: [1080, 720], poster: `/proyectos/waapiti-product-videos/videos/${name}-poster.webp` })),
      },
      carousel: [],
    },
    poster: "/proyectos/waapiti-product-videos/waapiti-product-videos-teaser-poster.webp",
    cover: "/proyectos/waapiti-product-videos/waapiti-product-videos-teaser-poster.webp",
    preview: "/proyectos/waapiti-product-videos/waapiti-product-videos-teaser-720.mp4",
  },
  {
    slug: "caprabo-3d-hologram-content",
    title: "*Caprabo* 3D Hologram Content",
    description: "3D animations for the holographic fans of Caprabo L'Illa, Barcelona — seasonal campaigns and in-store promos floating in mid-air above the aisles.",
    tagline: "3D animations for the holographic fans of Caprabo L'Illa in Barcelona.",
    category: CATEGORY,
    idea: "Caprabo's store at L'Illa Diagonal, in Barcelona, features holographic fans hanging from the ceiling across the shop floor. I created a series of 3D animations designed specifically for them: short, looping pieces that appear to float in the air and catch shoppers' attention as they walk the aisles — from coffee and loyalty-card promotions to seasonal campaigns for Christmas and Three Kings' Day.",
    challenge: "Creating content that works on a round, see-through display: no backgrounds, strong silhouettes, high contrast and short loops that stay readable from a distance in a busy, brightly lit supermarket.",
    client: "Caprabo",
    industry: null,
    display: "Holographic fans · Caprabo L'Illa, Barcelona",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects",
    year: "2026",
    credits: null,
    // (the mockups' compilation, 10s: the cover's; no 1440 — its original is 1080p)
    video: "/proyectos/caprabo-3d-hologram-content/caprabo-3d-hologram-content",
    videoSizes: [1080, 720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Caprabo*", "3D Hologram Content"],
      coverKicker: "Caprabo · L'Illa, Barcelona",
      statement: "3D animations that float in mid-air above the aisles of Caprabo L'Illa, in Barcelona.",
      tags: ["Caprabo", "Holographic fans", "3D animation", "Retail"],
      // (the mockups' compilation at 1.492s: "Super Caprabo" on a fan hanging from the ceiling)
      picture: { src: "/proyectos/caprabo-3d-hologram-content/mockups/frame-1.49s", alt: "\"Super Caprabo\" in 3D, floating on a holographic fan hanging from the ceiling of Caprabo L'Illa" },
      creative: {
        statement: "Designed for *black*: every piece lives on a dark canvas, so only the product and the message appear to float in the store.",
        paragraphs: ["On a holographic fan, black is transparent. Each animation was built around a single hero object — a coffee cup, a loyalty card, a tortell, Santa's sleigh — with bold 3D type and particles, centred and moving in a circle so it reads from any angle below."],
        more: [{ label: "(Challenge)", text: "Creating content that works on a round, see-through display: no backgrounds, strong silhouettes, high contrast and short loops that stay readable from a distance in a busy, brightly lit supermarket." }],
      },
      // (the five square animations, 1080x1080 / 720x720 — Reis and Santa with their sound)
      final: {
        label: "(Final result)",
        title: "The final *animations*",
        grid: true,
        videos: [
          ["cafe", "Coffee — Així de bo"],
          ["globos", "Super Caprabo"],
          ["reis", "Three Kings — Tortell"],
          ["santa", "Christmas — Santa"],
          ["soc-del-club", "Loyalty card — Soc del Club"],
        ].map(([name, line]) => ({ line, video: `/proyectos/caprabo-3d-hologram-content/animations/${name}`, videoSizes: [1080, 720], poster: `/proyectos/caprabo-3d-hologram-content/animations/${name}-poster.webp` })),
      },
      carousel: [],
    },
    poster: "/proyectos/caprabo-3d-hologram-content/poster.webp",
    cover: "/proyectos/caprabo-3d-hologram-content/poster.webp",
    preview: "/proyectos/caprabo-3d-hologram-content/caprabo-3d-hologram-content-720.mp4",
  },
  {
    slug: "hummel-kit-launch-campaign",
    title: "*Hummel* Kit Launch Campaign",
    description: "A joint campaign for Hummel uniting Valencia Basket and Real Betis, presenting both new kits under one shared visual story.",
    tagline: "Joint campaign uniting Valencia Basket and Real Betis under one brand.",
    category: "Sports Campaign",
    idea: "Hummel dresses two of Spain's most passionate clubs: Valencia Basket and Real Betis. For the launch of their new kits, the brand needed a single campaign that could present both shirts together, with a shared visual language that respected each club's identity.",
    challenge: "Telling two clubs — and two different sports — in a single piece, giving each team its own moment without losing a common campaign look.",
    client: "Hummel",
    industry: "Sportswear",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    video: "/proyectos/hummel-kit-launch-campaign/hummel-kit-launch-campaign",
    videoSizes: [1080, 720],
    youtube: "https://youtu.be/FabgEQtwm-Y",
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Hummel*", "Kit Launch Campaign"],
      coverKicker: "Hummel · Valencia Basket × Real Betis",
      statement: "One brand, two clubs: a joint campaign presenting the new Hummel kits of Valencia Basket and Real Betis.",
      tags: ["Hummel", "Valencia Basket", "Real Betis", "Kit Launch"],
      // (the main video's frame at 0:06, exactly: mid-shot, sharp)
      picture: { src: "/proyectos/hummel-kit-launch-campaign/mockups/frame-6s", alt: "Real Betis's new Hummel shirt, its crest and stripes under a hard light" },
      creative: {
        statement: "Two shirts, one *story*: the kits take the stage as the hero of every shot.",
        paragraphs: ["The campaign puts the kits at the centre: dramatic light, close-up details of fabric and crest, and bold Hummel typography that ties both clubs together in one rhythm."],
        more: [{ label: "(Challenge)", text: "Telling two clubs — and two different sports — in a single piece, giving each team its own moment without losing a common campaign look." }],
      },
      final: {
        videos: [{ line: "Kit launch spot · Valencia Basket × Real Betis", poster: "/proyectos/hummel-kit-launch-campaign/poster.webp" }],
      },
      // (the three 9:16 cuts: videoSizes by width — 1080x1920, 720x1280; posters at 6.35s, 2.267s, 2.1s)
      social: {
        label: "(Vertical cuts)",
        title: "Made for *vertical*",
        text: "The campaign was adapted into three vertical 9:16 pieces for social media, keeping the same look and rhythm as the main spot.",
        videos: [1, 2, 3].map((n) => ({
          line: `Vertical cut 0${n}`,
          video: `/proyectos/hummel-kit-launch-campaign/vertical/hummel-vertical-0${n}`,
          videoSizes: [1080, 720],
          poster: `/proyectos/hummel-kit-launch-campaign/vertical/hummel-vertical-0${n}-poster.webp`,
        })),
      },
      carousel: [],
    },
    poster: "/proyectos/hummel-kit-launch-campaign/poster.webp",
    cover: "/proyectos/hummel-kit-launch-campaign/poster.webp",
    preview: "/proyectos/hummel-kit-launch-campaign/preview.mp4",
  },
  {
    slug: "tmm-sensory-sync-content",
    title: "*TMM* Sensory Sync Content",
    description: "3D videos created for every screen of TMM's Sensory Sync showroom — a brand reveal made of glowing spheres and a seasonal autumn piece.",
    tagline: "Videos for TMM's Sensory Sync immersive showroom.",
    category: CATEGORY,
    idea: "Sensory Sync is TMM's immersive showroom in Barcelona, where clients experience screens, light and sound before they reach their own stores and events. I create the videos that bring the space to life — from TMM's own brand reveal to seasonal pieces that keep the showroom changing through the year — designed to play across the main LED wall, the curved LED column and the window displays facing the street.",
    challenge: "Every video had to work at once on a wide LED wall, a curved column and vertical window screens, and fit a space where people work and meet: calm enough for the room, striking enough to stop people walking past the window.",
    client: "TMM",
    industry: null,
    display: "Sensory Sync",
    role: "Motion Designer",
    tools: "Cinema 4D, After Effects, Kling",
    year: "2026",
    credits: null,
    // (the spheres' video: the cover's; the autumn one, in the final result)
    video: "/proyectos/tmm-sensory-sync-content/spheres",
    videoSizes: [1440, 1080, 720],
    youtube: "https://youtu.be/7pxdlWAiUOQ",
    layout: "case",
    case: {
      pictureSize: [2730, 1536],
      coverTitle: ["*TMM*", "Sensory Sync Content"],
      coverKicker: "TMM · Barcelona",
      // (the cover's video: a teaser of the two, not the project's own)
      coverVideo: { video: "/proyectos/tmm-sensory-sync-content/tmm-sensory-sync-teaser", videoSizes: [1440, 1080, 720] },
      statement: "Videos created for Sensory Sync, TMM's immersive showroom, where every screen in the space tells the same story.",
      tags: ["TMM", "Sensory Sync", "3D", "Digital Signage"],
      picture: { src: "/proyectos/tmm-sensory-sync-content/mockups/spheres-04", alt: "The spheres on the main LED wall of TMM's Sensory Sync showroom, a meeting at the round table in front of it" },
      creative: {
        statement: "One brand, many senses: light that gathers into a logo, and leaves that rise with the wind.",
        paragraphs: [
          "The Multisensory Makers bring many senses together into one experience. The brand reveal tells exactly that: a single point of light multiplies into soft, glowing spheres that drift and gather into the TMM letters.",
          "For autumn, the same idea turns seasonal: a carpet of 3D leaves is lifted by the wind and swirls into the logo, while the copy speaks to the senses — 'Es veu en cada color. S'escolta en cada fulla.'",
        ],
        more: [{ label: "(Challenge)", text: "Every video had to work at once on a wide LED wall, a curved column and vertical window screens, and fit a space where people work and meet: calm enough for the room, striking enough to stop people walking past the window." }],
        // (there is no picture of the autumn piece on the LED column: its window display)
        pictures: [
          { src: "/proyectos/tmm-sensory-sync-content/mockups/spheres-02", alt: "The spheres on the curved LED column of the showroom" },
          { src: "/proyectos/tmm-sensory-sync-content/mockups/autumn-02", alt: "The autumn leaves on a window display facing the street", focus: "85% 50%" },
        ],
      },
      final: {
        videos: [
          { cursorLabel: "Brand reveal", line: "Brand reveal — Born from light", poster: "/proyectos/tmm-sensory-sync-content/spheres-final-poster.webp" },
          { cursorLabel: "Autumn", line: "Seasonal — Autumn for every sense", video: "/proyectos/tmm-sensory-sync-content/autumn", videoSizes: [1440, 1080, 720], poster: "/proyectos/tmm-sensory-sync-content/autumn-final-poster.webp" },
        ],
      },
      carousel: [],
    },
    poster: "/proyectos/tmm-sensory-sync-content/tmm-sensory-sync-teaser-poster.webp",
    cover: "/proyectos/tmm-sensory-sync-content/tmm-sensory-sync-teaser-poster.webp",
    preview: "/proyectos/tmm-sensory-sync-content/tmm-sensory-sync-teaser-720.mp4",
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
    video: "/proyectos/tmm-halloween-spot/tmm-halloween-spot",
    videoSizes: [1440, 1080, 720],
    youtube: "https://youtu.be/-u5k984d138",
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*TMM*", "Halloween Spot"],
      coverKicker: "TMM · Sensory Sync",
      // DRAFT (the statement and the creative response's statement and text: to be checked)
      statement: "A Halloween spot for TMM: a carved pumpkin, a misty forest and type that melts into the season.",
      tags: ["TMM", "Halloween", "Sensory Sync", "3D"],
      // (the main video's frame at 3.95s: sharp, mid-shot)
      picture: { src: "/proyectos/tmm-halloween-spot/mockups/frame-3.95s", alt: "The carved jack-o'-lantern grinning in a misty forest" },
      creative: {
        statement: "Playful, never gory: the pumpkin's *grin* and the dripping letters carry the whole mood.",
        paragraphs: ["A carved jack-o'-lantern turns to face the camera in a misty forest; then the scene gives way to dripping orange type — \"Spooky season at TMM!\" — made for the screens of Sensory Sync."],
        more: [{ label: "(Challenge)", text: "Keeping a seasonal piece playful rather than gory: the pumpkin's expression and the melting letters carry the mood, while the brand's name stays readable through the drips." }],
      },
      final: {
        videos: [{ line: "15s spot · Sensory Sync, TMM showroom screens" }],
      },
      carousel: [],
    },
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
    video: "/proyectos/spotify-daylist-social-campaign/spotify-daylist-social-campaign",
    videoSizes: [1080, 720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Spotify*", "Daylist Social Campaign"],
      coverKicker: "Spotify · Social campaign",
      // DRAFT (the statement and the creative response's statement and text: to be checked)
      statement: "A mobile-first social ad that turns Spotify's ever-changing Daylist into bold, mood-driven motion.",
      tags: ["Spotify", "Daylist", "Social Ads", "Motion Design"],
      // (the main video's frame at 5.19s: sharp, mid-shot)
      picture: { src: "/proyectos/spotify-daylist-social-campaign/mockups/frame-5.19s", alt: "A phone reading \"electro dance afternoon\", surrounded by decks, headphones and pixel sunglasses" },
      creative: {
        statement: "A playlist that rewrites itself, so the ad *keeps changing* too: quick, mood-driven and native to the feed.",
        paragraphs: ["Each daylist mood — like \"electro dance afternoon\" — gets its own burst of colour and objects around the phone, cut at the pace of the feed so the ad blends in instead of announcing itself."],
        more: [{ label: "(Challenge)", text: "Daylist is a playlist that rewrites itself throughout the day, so the ad needed to move the same way — quick, mood-driven, never quite the same twice. It had to run as sponsored content and blend into the feed rather than announce itself as an ad." }],
      },
      final: {
        videos: [{ line: "16s social ad · sponsored content" }],
      },
      carousel: [],
    },
    poster: "/proyectos/spotify-daylist-social-campaign/poster.webp",
    cover: "/proyectos/spotify-daylist-social-campaign/poster.webp",
    preview: "/proyectos/spotify-daylist-social-campaign/preview.mp4",
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
    video: "/proyectos/sitges-festival-motion-spot/sitges-festival-motion-spot",
    videoSizes: [1080, 720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Sitges*", "Festival Motion Spot"],
      coverKicker: "Sitges Film Festival · Freaks",
      // DRAFT (the statement and the creative response's statement and text: to be checked)
      statement: "A 2D character spot for Sitges, reinterpreting Freaks as a mirror for the festival's own cult audience.",
      tags: ["Sitges", "Film Festival", "2D Animation", "Rigging"],
      // (the main video's frame at 11.74s: sharp, mid-shot)
      picture: { src: "/proyectos/sitges-festival-motion-spot/mockups/frame-11.74s", alt: "The spot's character, a close-up of his frowning face against red" },
      creative: {
        statement: "A character who *belongs to the crowd*: different, proud of it, and right at home in Sitges.",
        paragraphs: ["2D animation and rigging bring a character to life at a retro desk — searching, failing, reacting — celebrating the cult community that defines the spirit of Sitges."],
        more: [{ label: "(Challenge)", text: "Sitges wanted Freaks reinterpreted as a mirror for its own audience — people who wear being different as a badge of honour. The piece needed a character that felt like it belonged to that crowd, screened in 2024 ahead of the film's restoration." }],
      },
      final: {
        videos: [{ line: "39s festival spot" }],
      },
      carousel: [],
    },
    poster: "/proyectos/sitges-festival-motion-spot/poster.webp",
    cover: "/proyectos/sitges-festival-motion-spot/poster.webp",
    preview: "/proyectos/sitges-festival-motion-spot/preview.mp4",
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
    video: "/proyectos/fallas-festival-motion-visuals/fallas-festival-motion-visuals",
    videoSizes: [1080, 720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Fallas*", "Festival Motion Visuals"],
      coverKicker: "Fallas · Valencia",
      // DRAFT (the statement and the creative response's statement and text: to be checked)
      statement: "Valencia's festival of fire in 2D: the Ofrenda, the Mascletà and the Cremà, set in motion.",
      tags: ["Fallas", "Valencia", "2D Animation", "Motion Design"],
      // (the main video's frame at 21s: sharp, mid-shot)
      picture: { src: "/proyectos/fallas-festival-motion-visuals/mockups/frame-21s", alt: "Two figures resting by a falla in flames as a third climbs the steps above" },
      creative: {
        statement: "Fire, music and colour, *drawn flat and bold*: the city's biggest moments, kept loud, never decorative.",
        paragraphs: ["Key moments of the festival — the Ofrenda, the Mascletà and the Cremà — become flat, bold 2D scenes, with their characters and their fire in the city's colours."],
        more: [{ label: "(Challenge)", text: "Fallas is fire, music, colour and the whole city out in the street every March — it's not a subtle thing to animate. The challenge was turning key moments like the Ofrenda, the Mascletà and the Cremà into 2D animation without flattening them into decoration." }],
      },
      final: {
        videos: [{ line: "60s motion piece" }],
      },
      carousel: [],
    },
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
    video: "/proyectos/ron-barcelo-summer-spot/ron-barcelo-summer-spot",
    videoSizes: [720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*Ron Barceló*", "Summer Spot"],
      coverKicker: "Ron Barceló · Summer",
      // DRAFT (the statement and the creative response's statement and text: to be checked)
      statement: "A short summer spot for Ron Barceló: bold colour and energetic motion from the very first frame.",
      tags: ["Ron Barceló", "Summer", "Motion Design", "Editing"],
      // (the main video's frame at 5.5s: sharp, mid-shot)
      picture: { src: "/proyectos/ron-barcelo-summer-spot/mockups/frame-5.5s", alt: "A sun-drawn circle framed by jungle leaves, in the spot's flat illustrated style" },
      creative: {
        statement: "No slow build-up: *summer* hits from the first frame, in colour, movement and heat.",
        paragraphs: ["A vibrant, sun-soaked atmosphere carried by bold colour and energetic motion — flowers, birds and jungle leaves opening onto the sun."],
        more: [{ label: "(Challenge)", text: "Ron Barceló wanted something that feels like summer the second it starts playing — colour, movement, heat, no slow build-up." }],
      },
      final: {
        videos: [{ line: "18s promotional spot" }],
      },
      carousel: [],
    },
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
    video: "/proyectos/bizlunch-app-promo-spot/bizlunch-app-promo-spot",
    videoSizes: [1080, 720],
    layout: "case",
    case: {
      pictureSize: [1920, 1080],
      coverTitle: ["*BizLunch*", "App Promo Spot"],
      coverKicker: "BizLunch · App launch",
      // DRAFT (the statement and the creative response's statement and text: to be checked)
      statement: "A promo film for BizLunch, the app that matches professionals for business lunches.",
      tags: ["BizLunch", "App", "Promo", "Motion Design"],
      // (the main video's frame at 33.45s: sharp, mid-shot)
      picture: { src: "/proyectos/bizlunch-app-promo-spot/mockups/frame-33.45s", alt: "The BizLunch app on a phone, a list of restaurants to book" },
      creative: {
        statement: "From lunch alone at your desk to a *matched meeting*: the app's promise, told in one film.",
        paragraphs: ["The spot cuts between a real meetup and the screens that make it happen — matching, booking and ratings — so the app feels real, not just a concept."],
        more: [{ label: "(Challenge)", text: "Nobody's used an app like this before, so the video had to sell the idea itself — going from lunch alone at your desk to a matched meeting — and still show enough of the app (matching, booking, ratings) to make it feel real, not just a concept trailer." }],
      },
      final: {
        videos: [{ line: "1:45 promo film" }],
      },
      carousel: [],
    },
    poster: "/proyectos/bizlunch-app-promo-spot/poster.webp",
    cover: "/proyectos/bizlunch-app-promo-spot/preview.webp",
    preview: "/proyectos/bizlunch-app-promo-spot/preview.mp4",
  },
];

// The old addresses of the projects that have a new one (work.html#<old>
// goes on to work.html#<new>); one of a project that is gone, to the Works
// page.
export const MOVED = {
  caprabo: "caprabo-3d-hologram-content",
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
  "tmm-esferas": "tmm-sensory-sync-content",
  "otono-tmm": "tmm-sensory-sync-content",
  "tmm-3d-brand-reveal": "tmm-sensory-sync-content",
  "tmm-autumn-3d-visual": "tmm-sensory-sync-content",
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

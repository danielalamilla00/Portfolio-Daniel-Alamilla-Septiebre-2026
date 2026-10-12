// ---- The projects, for the Works page (works.html, src/works.js) ---------------------
// One entry per folder of public/proyectos (all but Reel), in that order.
//   title      its name: the title at the top left of its row
//   client     who it was for                } not shown on the page.
//   category   what it is                    } category and year are
//   year       when                          } PLACEHOLDERS, the same in all
//   cover      the picture of its row: a frame of its cover video
//              (public/works/covers)
//   video      what plays, muted and in a loop, while its row is the one in
//              the middle (optional: without it the cover stays)
//   url        its page: the project's own in work.html, by the slug it has
//              there. null: it has none yet ("Coming soon")
const CATEGORY = "Motion Design"; // placeholder
const YEAR = "2025"; // placeholder

export const PROJECTS = [
  { title: "Bizlunch", url: "work.html#bizlunch", client: "Bizlunch", category: CATEGORY, year: YEAR, cover: "/works/covers/bizlunch.jpg", video: "/proyectos/Bizlunch/Portada_thumb.mp4" },
  { title: "Caprabo", url: "work.html#caprabo", client: "Caprabo", category: CATEGORY, year: YEAR, cover: "/works/covers/caprabo.jpg", video: "/proyectos/Caprabo/Tienda/Tienda 1.mp4" },
  { title: "Estiu TMM", url: "work.html#ron-barcelo", client: "TMM Group", category: CATEGORY, year: YEAR, cover: "/works/covers/estiu-tmm.jpg", video: "/proyectos/Estiu TMM/Portada_Estiu TMM.mp4" },
  { title: "Fallas", url: "work.html#fallas-valencia", client: "Fallas", category: CATEGORY, year: YEAR, cover: "/works/covers/fallas.jpg", video: "/proyectos/Fallas/Styleframes/Styleframes_5_1.mp4" },
  { title: "Gemini", url: "work.html#gemini-3", client: "Gemini", category: CATEGORY, year: YEAR, cover: "/works/covers/gemini.jpg", video: "/proyectos/Gemini/Styleframes/Gemini_Styleframes 1.mp4" },
  { title: "Hummel Betis", url: "work.html#hummel-betis", client: "Hummel", category: CATEGORY, year: YEAR, cover: "/works/covers/hummel-betis.jpg", video: "/proyectos/Hummel Betis/Hummel Betis_Tarjeta_thumb.mp4" },
  {
    title: "Hummel Valencia Basket",
    url: "work.html#hummel-valencia-basket",
    client: "Hummel",
    category: CATEGORY,
    year: YEAR,
    cover: "/works/covers/hummel-valencia-basket.jpg",
    video: "/proyectos/Hummel Valencia Baket/Hummel Valencia Basket_Tarjeta_thumb.mp4", // (the folder's name is spelt that way)
  },
  { title: "Waapiti", url: "work.html#waapiti", client: "Waapiti", category: CATEGORY, year: YEAR, cover: "/works/covers/ise.jpg", video: "/proyectos/ISE/Portada_thumb.mp4" },
  { title: "Otoño TMM", url: null, client: "TMM Group", category: CATEGORY, year: YEAR, cover: "/works/covers/otono-tmm.jpg", video: "/proyectos/Otoño TMM/Portada_Tardor TMM.mp4" },
  { title: "Sensory", url: "work.html#sensory-sync", client: "Sensory", category: CATEGORY, year: YEAR, cover: "/works/covers/sensory.jpg", video: "/proyectos/Sensory/Pantallas/Proyector.mp4" },
  { title: "Sitges", url: "work.html#sitges-film-festival", client: "Sitges", category: CATEGORY, year: YEAR, cover: "/works/covers/sitges.jpg", video: "/proyectos/Sitges/Styleframes/Styleframes_SItges_1.2.mp4" },
  { title: "Spotify", url: "work.html#spotify-daylist", client: "Spotify", category: CATEGORY, year: YEAR, cover: "/works/covers/spotify.jpg", video: "/proyectos/Spotify/Portada_Spotify Daylist_thumb.mp4" },
  { title: "TMM Esferas", url: null, client: "TMM Group", category: CATEGORY, year: YEAR, cover: "/works/covers/tmm-esferas.jpg", video: "/proyectos/TMM Esferas/Portada_TMM Esferas.mp4" },
];

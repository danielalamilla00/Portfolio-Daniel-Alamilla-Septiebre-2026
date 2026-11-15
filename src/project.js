import { ScrollTrigger } from "gsap/ScrollTrigger";
import { applyPalette } from "./palette.js";
import { startNavClock } from "./clock.js";
import { setupMenu } from "./menu.js";
import { PROJECTS, MOVED } from "./data/projects.js";
import { renderCase } from "./case.js";
import { setupTransition, transitionWithin } from "./transition.js";

// ---- A project's page --------------------------------------------------------------
// work.html#<slug>: the project of src/data/projects.js whose slug is in the
// address (an old one goes on to its new one: MOVED), as a case study
// (src/case.js) — every project's page is one. Another project's address
// (a related project, the browser's back) shows that one in its place, with
// no reload: the one shown is taken down whole — its scroll-driven moves,
// videos, listeners and the aura's GPU context (renderCase's destroy) —, the
// page goes back to its top and the new one is put up. An address of no
// project: the Works page. Coming from Works (or going back to it), and from
// a project to another — the links of its end's carousel —, the content
// blurs out and the next comes in (transition.js).
applyPalette();
startNavClock();
setupMenu();
// (a new project starts at its top, never where the last one was left —
// nor where the browser would put it back, going back to it: through
// ScrollTrigger, which otherwise sets the browser's own back at every refresh)
ScrollTrigger.clearScrollMemory("manual");

let destroy = null;
function show() {
  const asked = decodeURIComponent(window.location.hash.slice(1));
  const slug = MOVED[asked] || asked;
  if (slug !== asked) window.history.replaceState(null, "", `#${slug}`);
  const project = PROJECTS.find((entry) => entry.slug && entry.slug === slug);
  if (!project) return window.location.replace("works.html");
  if (destroy) destroy();
  window.scrollTo(0, 0);
  destroy = renderCase(project);
  ScrollTrigger.refresh();
}
show();
// (the browser's back or forward to another project: the same transition)
window.addEventListener("hashchange", () => transitionWithin(show));
// (back to it from the browser's memory, as it was left: from its top again)
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  window.scrollTo(0, 0);
  ScrollTrigger.refresh();
});
setupTransition();
document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='work.html#']");
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  transitionWithin(() => {
    window.history.pushState(null, "", link.getAttribute("href").slice("work.html".length));
    show();
  });
});
// (the foot's "Back to top": the page's, whichever project it shows)
document.querySelector(".pj-top").addEventListener("click", () =>
  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
);

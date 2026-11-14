import gsap from "gsap";

// ---- Between Works and a project's page -------------------------------------------
// The page's content blurs to PT_BLUR_PX and fades out (PT_OUT_S,
// power2.inOut), then the new one comes in the other way (PT_IN_S). Where the
// browser has its own view transitions between pages, page-transition.css
// does it all; where it has not, the same with GSAP on the content: a link to
// the other page is held until its content is gone (PT_KEY, for the next one,
// which html.pt-in hides from its first frame: the inline script in its
// head), and the next page brings its own in. From a project to another (the
// same page, its address's #): transitionWithin().
const PT_OUT_S = 0.6;
const PT_IN_S = 0.7;
const PT_BLUR_PX = 12;
const PT_EASE = "power2.inOut";
const PT_KEY = "pt-arriving";
const crossDocument = "onpagereveal" in window;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const out = (content, onComplete) => gsap.to(content, { filter: `blur(${PT_BLUR_PX}px)`, opacity: 0, duration: PT_OUT_S, ease: PT_EASE, onComplete });
const come = (content) => gsap.fromTo(content, { filter: `blur(${PT_BLUR_PX}px)`, opacity: 0 }, { filter: "blur(0px)", opacity: 1, duration: PT_IN_S, ease: PT_EASE, clearProps: "filter,opacity" });

export function setupPageTransition(content) {
  const root = document.documentElement;
  if (root.classList.contains("pt-in")) {
    root.classList.remove("pt-in");
    if (!reducedMotion) come(content);
  }
  if (crossDocument || reducedMotion) return;
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const url = new URL(link.href, window.location.href);
    // (to Works or to a project's page, from the other one)
    if (url.origin !== window.location.origin || !/\/works?\.html$/.test(url.pathname) || url.pathname === window.location.pathname) return;
    event.preventDefault();
    try {
      sessionStorage.setItem(PT_KEY, "1");
    } catch {
      // (no storage: the next page comes in at once)
    }
    out(content, () => window.location.assign(url.href));
  });
  // (back to a page left that way, from the browser's memory: as it was)
  window.addEventListener("pageshow", (event) => event.persisted && gsap.set(content, { clearProps: "filter,opacity" }));
}

// Another project in this one's place, on the same page: `update` puts it up
// — between the two halves of the transition (the browser's own, where it
// has it: page-transition.css; GSAP's otherwise).
export function transitionWithin(content, update) {
  if (reducedMotion) return update();
  if (document.startViewTransition) return document.startViewTransition(update);
  out(content, () => {
    update();
    come(content);
  });
}

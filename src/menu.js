import { applyGrain } from "./grain.js";
import { onViewportChange, TABLET_MAX_PX } from "./viewport.js";

// ---- The menu, on a tablet and a phone ---------------------------------------------
// Up to TABLET_MAX_PX wide the nav's links do not fit in the bar: they are
// hidden (style.css) and a "menu" button takes their place. It opens a
// screen of the panel's black, with its grain, and the same links on it, big,
// one under the other, coming in one after the other. The one of the section
// that is on screen (or of this page) is the one set in the titles' Catavalo
// and gradient; under a cursor, the one it is on. "close" (the same button),
// Escape or a link closes it; a link to a section of this page then scrolls
// there. Built here from the nav's own links, so the two never differ.
//   MENU_STAGGER_MS   from one link coming in to the next
const MENU_STAGGER_MS = 60;
export function setupMenu() {
  const nav = document.querySelector("#site-nav");
  const button = nav.querySelector(".nav-menu");
  const menu = document.createElement("div");
  menu.id = "site-menu";
  menu.className = "site-menu grain";
  menu.setAttribute("role", "dialog");
  menu.setAttribute("aria-modal", "true");
  menu.setAttribute("aria-label", "Menu");
  menu.inert = true;
  const list = document.createElement("ul");
  const links = Array.from(nav.querySelectorAll(".nav-links a"), (link, index) => {
    const item = document.createElement("li");
    item.style.setProperty("--menu-delay", `${index * MENU_STAGGER_MS}ms`);
    const copy = link.cloneNode(true);
    copy.className = "site-menu-link";
    item.appendChild(copy);
    list.appendChild(item);
    return copy;
  });
  menu.appendChild(list);
  nav.after(menu);
  applyGrain();

  // Everything else of the page, which is out of reach while it is open.
  const rest = Array.from(document.body.children).filter((el) => el !== nav && el !== menu && !/^(SCRIPT|STYLE)$/.test(el.tagName));
  // Where a link goes, if it is on this page.
  const sectionOf = (link) => (link.hash && link.pathname === window.location.pathname ? document.querySelector(link.hash) : null);
  // The link of this page, or of the last section the scroll has reached.
  function markCurrent() {
    let current = links.find((link) => link.getAttribute("aria-current") === "page");
    links.forEach((link) => {
      const section = sectionOf(link);
      if (section && section.getBoundingClientRect().top <= 2) current = link;
    });
    links.forEach((link) => link.classList.toggle("is-current", link === current));
  }

  let open = false;
  function setOpen(value) {
    if (value === open) return;
    open = value;
    if (open) markCurrent();
    nav.classList.toggle("is-menu-open", open);
    menu.classList.toggle("is-open", open);
    menu.inert = !open;
    rest.forEach((el) => (el.inert = open));
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "close" : "menu";
  }
  button.addEventListener("click", () => setOpen(!open));
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    button.focus();
  });
  menu.addEventListener("wheel", (event) => event.preventDefault(), { passive: false }); // (the page under it stays where it is)
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  links.forEach((link) =>
    link.addEventListener("click", (event) => {
      const section = sectionOf(link);
      setOpen(false);
      if (!section) return; // another page: the link is followed
      event.preventDefault();
      window.scrollTo({ top: section.getBoundingClientRect().top + window.scrollY, behavior: reducedMotion ? "auto" : "smooth" });
    })
  );
  // The window made wide again with it open: the links are back in the bar.
  onViewportChange(() => {
    if (window.innerWidth > TABLET_MAX_PX) setOpen(false);
  });
}

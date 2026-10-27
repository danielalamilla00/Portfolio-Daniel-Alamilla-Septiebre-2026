// ---- A project's title, in the web's two letters ---------------------------------------
// Written in src/data/projects.js with its brand between asterisks
// ("*Hummel* Kit Launch Campaign"): the brand in Catavalo (.title-display),
// the rest in Inter Tight (.title-sans), both in cream, on one baseline and
// read as one size (type.css). The brand is never broken between two lines.
// One with no asterisks is all Catavalo.
export const plainTitle = (title) => title.replace(/\*/g, "");

// Its parts, as spans to put in its place.
export function titleParts(title) {
  return (title.includes("*") ? title : `*${title}*`)
    .split("*")
    .map((text, index) => {
      if (!text) return null;
      const span = document.createElement("span");
      span.className = index % 2 ? "title-display" : "title-sans";
      span.textContent = text;
      return span;
    })
    .filter(Boolean);
}

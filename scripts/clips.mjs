// ---- npm run clips [slug ...] --------------------------------------------------------
// Makes the clips of the projects' pages (src/data/projects.js: frames) from
// their originals: for each clip, its stretch of its original (start,
// duration) as an MP4 — H.264, 1280x720 (the middle 16:9 of it, if it is
// another shape), no sound, at most 30 frames a second, ready to play while
// it loads — and its first frame as a WebP next to it, its poster. All the
// projects', or only those named.
// The originals are not in the site (they are big, and public/ is published):
// they stay in their folders, under ORIGINALS — by default the portfolio's
// own, Desktop/Portfolio/Motion; another with ORIGINALS=<folder>. (One that
// is a path of the site's — it starts with "/" — is the site's own, under
// public/: a project's web version of its video.)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { PROJECTS } from "../src/data/projects.js";

const ORIGINALS = process.env.ORIGINALS || "../../Portfolio/Motion";
const CRF = 26;

const only = process.argv.slice(2);
const projects = PROJECTS.filter((project) => project.slug && (!only.length || only.includes(project.slug)));
if (only.length && projects.length !== only.length) throw new Error(`Unknown project: ${only.filter((slug) => !projects.some((p) => p.slug === slug)).join(", ")}`);

const ffmpeg = (...args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const kb = (file) => Math.round(statSync(file).size / 1024);

for (const project of projects) {
  for (const clip of project.frames) {
    const original = clip.original || project.original;
    const source = original.startsWith("/") ? join("public", original) : join(ORIGINALS, original);
    if (!existsSync(source)) throw new Error(`${project.slug}: no original at ${source}`);
    const out = join("public", clip.video);
    const poster = out.replace(/\.mp4$/, ".webp");
    mkdirSync(dirname(out), { recursive: true });
    ffmpeg(
      "-ss", String(clip.start), "-i", source, "-t", String(clip.duration), "-an",
      "-vf", "scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,format=yuv420p",
      "-fpsmax", "30", "-c:v", "libx264", "-preset", "slow", "-crf", String(CRF), "-profile:v", "high",
      "-movflags", "+faststart", out
    );
    ffmpeg("-i", out, "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", poster);
    console.log(`${project.slug}  ${clip.video}  ${clip.start}s +${clip.duration}s  ${kb(out)} KB (+ poster ${kb(poster)} KB)`);
  }
}

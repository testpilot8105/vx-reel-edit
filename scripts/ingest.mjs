// Brings footage into a new video folder: media/videos/<DD.MM.YYYY>-<name>/. Each file is copied (never moved) to
// raw/<letter>.<ext> in the order given, probed, and its sound pulled to work/<letter>-16k.wav for transcription.
// Writes probe.json, a poster frame per clip (work/<letter>-poster.jpg, to read where the face sits), and an edit.json
// with the clips and no cut yet. Running it again on the same folder adds clips.
// Usage: node scripts/ingest.mjs <name> <file> [file...] [--style <profile>] [--format 9:16|1:1|16:9] [--fps 30]
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';
import { ffmpeg, MEDIA, probe, readJson, writeJson } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (k, d) => {
  const i = args.indexOf(`--${k}`);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const style = flag('style', 'papaya-light');
const format = flag('format', null);
const fps = Number(flag('fps', 30));
const [name, ...files] = args;
if (!name || !files.length) {
  console.error('Usage: node scripts/ingest.mjs <name> <file> [file...] [--style <profile>] [--format 9:16|1:1|16:9]');
  process.exit(1);
}
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const d = new Date();
const date = [d.getDate(), d.getMonth() + 1].map((x) => String(x).padStart(2, '0')).join('.') + `.${d.getFullYear()}`;
const existing = existsSync(join(MEDIA, 'videos')) ? readdirSync(join(MEDIA, 'videos')).find((f) => f.endsWith(`-${slug}`)) : null;
const folder = existing ?? `${date}-${slug}`;
const dir = join(MEDIA, 'videos', folder);
for (const sub of ['raw', 'work', 'refs', 'out']) mkdirSync(join(dir, sub), { recursive: true });

const editPath = join(dir, 'edit.json');
const probePath = join(dir, 'probe.json');
const edit = existsSync(editPath)
  ? readJson(editPath)
  : { id: folder.replace(/\./g, '-'), title: name, style, format: null, fps, clips: {}, segments: [], cuts: [], keyWords: [], overlays: [], sfx: [] };
const probes = existsSync(probePath) ? readJson(probePath) : {};

for (const file of files) {
  if (!existsSync(file)) throw new Error(`No file at ${file}`);
  const letter = String.fromCharCode(97 + Object.keys(edit.clips).length);
  const dest = join(dir, 'raw', `${letter}${extname(file).toLowerCase()}`);
  copyFileSync(file, dest);
  const p = probe(dest);
  if (!p.audio) console.warn(`clip ${letter} has no sound; it can be b-roll but not a talking take`);
  else ffmpeg(['-y', '-i', dest, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', join(dir, 'work', `${letter}-16k.wav`)]);
  // A poster frame to read where the face sits (edit.json "focus"), a third of the way in.
  ffmpeg(['-y', '-loglevel', 'error', '-ss', String(p.duration / 3), '-i', dest, '-frames:v', '1', '-vf', 'scale=360:-2', join(dir, 'work', `${letter}-poster.jpg`)]);
  edit.clips[letter] = relative(MEDIA, dest).split('\\').join('/');
  probes[letter] = { source: basename(file), ...p };
  console.log(`${letter}: ${basename(file)}  ${p.width}x${p.height}  ${p.fps} fps  ${p.duration.toFixed(2)} s`);
}

if (!edit.format) {
  const first = probes.a;
  const r = first.width / first.height;
  edit.format = format ?? (r < 0.8 ? '9:16' : r < 1.25 ? '1:1' : '16:9');
}
writeJson(probePath, probes);
writeJson(editPath, edit);
console.log(`\n${relative(MEDIA, dir)}  (format ${edit.format}, style ${edit.style})\nNext: node scripts/transcribe.mjs ${folder}`);

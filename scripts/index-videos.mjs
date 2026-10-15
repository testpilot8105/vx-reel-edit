// Writes src/gen.ts: every style profile (the json block in styles/<name>.md) and every video
// (media/videos/<folder>/edit.json plus words.json). Run after any change to a profile or an edit; render.mjs runs it
// first. A video that is not ready yet (no segments, a missing clip, an unknown style) is skipped with the reason.
// It also bakes each video's voice when the cut changed (scripts/voice.mjs), finds the hook's cutout frames
// (scripts/matte.mjs) and makes the film grain tiles once (media/library/grain).
// Usage: node scripts/index-videos.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ffmpeg, hookFramesOf, MEDIA, readJson, ROOT } from './lib.mjs';
import { bakeVoice } from './voice.mjs';

export const readStyles = () => {
  const dir = join(ROOT, 'styles');
  const out = {};
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
    const name = f.replace(/\.md$/, '');
    const m = readFileSync(join(dir, f), 'utf8').match(/```json\n([\s\S]*?)\n```/);
    if (!m) {
      console.warn(`skip style ${name}: no json block`);
      continue;
    }
    try {
      out[name] = { name, ...JSON.parse(m[1]) };
    } catch (err) {
      console.warn(`skip style ${name}: the json block does not parse (${err.message})`);
    }
  }
  return out;
};

export const readEdits = (styles) => {
  const dir = join(MEDIA, 'videos');
  const out = [];
  if (!existsSync(dir)) return out;
  for (const folder of readdirSync(dir).sort()) {
    const editPath = join(dir, folder, 'edit.json');
    if (!existsSync(editPath)) continue;
    const edit = readJson(editPath);
    const why = [];
    if (!/^[a-zA-Z0-9-]+$/.test(edit.id ?? '')) why.push(`id "${edit.id}" must be letters, digits and hyphens`);
    if (!styles[edit.style]) why.push(`style "${edit.style}" is not in styles/`);
    if (!edit.segments?.length) why.push('no segments yet (run cut-pauses)');
    for (const [c, p] of Object.entries(edit.clips ?? {})) if (!existsSync(join(MEDIA, p))) why.push(`clip ${c} missing at media/${p}`);
    if (why.length) {
      console.warn(`skip ${folder}: ${why.join('; ')}`);
      continue;
    }
    const wordsPath = join(dir, folder, 'words.json');
    const entry = { edit, words: existsSync(wordsPath) ? readJson(wordsPath) : [] };
    try {
      entry.voice = bakeVoice(join(dir, folder), edit);
    } catch (err) {
      console.warn(`${folder}: the voice could not be baked, each cut plays its own audio (${err.message.split('\n')[0]})`);
    }
    if (edit.hook?.cutout) {
      const h = hookFramesOf(join(dir, folder), edit);
      if (h.ready) entry.hookFrames = h.frames;
      else console.warn(`${folder}: the hook's cutout frames are missing or out of date; run node scripts/matte.mjs ${folder}`);
    }
    out.push(entry);
  }
  return out;
};

/** Eight tileable grey noise frames for the grain, made once. */
const grainTiles = () => {
  const g = join(MEDIA, 'library', 'grain');
  if (existsSync(join(g, '7.png'))) return;
  mkdirSync(g, { recursive: true });
  ffmpeg(['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=gray:s=512x512:r=8', '-vf', 'format=gray,noise=alls=48:allf=t', '-frames:v', '8', '-pix_fmt', 'gray', '-start_number', '0', join(g, '%d.png')]);
};

grainTiles();
const styles = readStyles();
const edits = readEdits(styles);
const body = `// Written by scripts/index-videos.mjs. Do not edit by hand: change styles/*.md or media/videos/*/edit.json and run it again.
import type { Edit, Style, Word } from './types';

export const STYLES: Record<string, Style> = ${JSON.stringify(styles, null, 2)};

export const EDITS: { edit: Edit; words: Word[]; voice?: string; hookFrames?: { plate: string; matte: string; count: number } }[] = ${JSON.stringify(edits)};
`;
writeFileSync(join(ROOT, 'src/gen.ts'), body);
console.log(`src/gen.ts: ${Object.keys(styles).length} style(s), ${edits.length} video(s)`);

// The rough cut: writes edit.json "segments" from words.json, the approved cuts, and the style's feel.
//
// Rules (the feel scales them):
//  - Only real pauses are cut: gaps of minGap or more between words (expressive 0.3 s, balanced 0.45 s, minimal 0.7 s).
//  - Every cut keeps a breath: 0.24 s after a long pause (2 s or more), 0.20 s after a sentence, 0.14 s otherwise,
//    six tenths of it after the last word and four tenths before the next.
//  - The video opens 0.22 s before the first word and closes 0.34 s after the last one.
//  - Never inside a phrase, never faster: pieces are only ever cut between words, and play at normal speed.
//  - Framing changes land at the start of a piece, where they hide the jump: balanced alternates 100% and 108%,
//    expressive 100% and 112% and also reframes long pieces at phrase starts; minimal keeps one framing.
// The previous edit.json is kept in work/ before it is rewritten.
// Usage: node scripts/cut-pauses.mjs <video> [--feel expressive|balanced|minimal]
import { copyFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, ROOT, videoDir, writeJson } from './lib.mjs';

const args = process.argv.slice(2);
const fi = args.indexOf('--feel');
const dir = videoDir(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--feel'));
const edit = readJson(join(dir, 'edit.json'));
const styleMd = readFileSync(join(ROOT, 'styles', `${edit.style}.md`), 'utf8');
const feel = fi >= 0 ? args[fi + 1] : JSON.parse(styleMd.match(/```json\n([\s\S]*?)\n```/)[1]).feel;
const probes = readJson(join(dir, 'probe.json'));
const MIN_GAP = { expressive: 0.3, balanced: 0.45, minimal: 0.7 }[feel];
const PUNCH = { expressive: 1.12, balanced: 1.08, minimal: 1 }[feel];
if (!MIN_GAP) throw new Error(`Unknown feel "${feel}"`);

const cuts = edit.cuts ?? [];
const cutHere = (clip, t) => cuts.some((c) => c.clip === clip && t >= c.from && t <= c.to);
const cutBetween = (a, b) => a.clip === b.clip && cuts.some((c) => c.clip === a.clip && c.from < b.start && c.to > a.end);
const words = readJson(join(dir, 'words.json')).filter((w) => !cutHere(w.clip, (w.start + w.end) / 2));

// Runs of words with no real pause and no approved cut inside them.
const runs = [];
for (const w of words) {
  const run = runs[runs.length - 1];
  const prev = run?.[run.length - 1];
  if (prev && prev.clip === w.clip && w.start - prev.end < MIN_GAP && !cutBetween(prev, w)) run.push(w);
  else runs.push([w]);
}

const breath = (prev, next) => {
  if (!prev || !next || prev[0].clip !== next[0].clip) return null;
  const gap = next[0].start - prev[prev.length - 1].end;
  return gap >= 2 ? 0.24 : /[.?!]$/.test(prev[prev.length - 1].text) ? 0.2 : 0.14;
};

const segments = runs.map((run, i) => {
  const prev = runs[i - 1];
  const next = runs[i + 1];
  const before = breath(prev, run);
  const after = breath(run, next);
  const first = run[0];
  const last = run[run.length - 1];
  const lead = i === 0 ? 0.22 : before === null ? 0.1 : before * 0.4;
  const tail = i === runs.length - 1 ? 0.34 : after === null ? 0.14 : after * 0.6;
  const len = probes[first.clip]?.duration ?? Infinity;
  return { clip: first.clip, in: +Math.max(0, first.start - lead).toFixed(3), out: +Math.min(len, last.end + tail).toFixed(3), words: run };
});

// Pieces that would overlap (two short gaps in a row) become one.
const merged = [];
for (const s of segments) {
  const p = merged[merged.length - 1];
  if (p && p.clip === s.clip && s.in <= p.out) {
    p.out = Math.max(p.out, s.out);
    p.words.push(...s.words);
  } else merged.push({ ...s, words: [...s.words] });
}

let flip = false;
const out = merged.map((s) => {
  flip = !flip;
  const z = PUNCH === 1 ? 1 : flip ? 1 : PUNCH;
  const zoom = [[s.in, z]];
  if (feel === 'expressive') {
    let last = s.in;
    let cur = z;
    s.words.forEach((w, k) => {
      const gap = k > 0 ? w.start - s.words[k - 1].end : 0;
      if (k > 0 && gap >= 0.15 && w.start - last >= 1.6) {
        cur = cur === 1 ? PUNCH : 1;
        zoom.push([+(w.start - 0.03).toFixed(3), cur]);
        last = w.start;
      }
    });
  }
  return { clip: s.clip, in: s.in, out: s.out, zoom };
});

copyFileSync(join(dir, 'edit.json'), join(dir, 'work', `edit-before-cut-${Date.now()}.json`));
edit.segments = out;
writeJson(join(dir, 'edit.json'), edit);

const raw = Object.values(probes).reduce((t, p) => t + p.duration, 0);
const kept = out.reduce((t, s) => t + (s.out - s.in), 0);
console.log(`${out.length} pieces, feel ${feel}: ${raw.toFixed(1)} s of footage to ${kept.toFixed(1)} s (${Math.round((1 - kept / raw) * 100)}% removed).`);
for (const s of out) console.log(`  ${s.clip} ${s.in.toFixed(2)}-${s.out.toFixed(2)}  ${s.zoom.map(([, z]) => `${Math.round(z * 100)}%`).join(' ')}`);
console.log(`Next: node scripts/index-videos.mjs, then preview in Studio or node scripts/render.mjs ${dir.split('/').pop()} --draft`);

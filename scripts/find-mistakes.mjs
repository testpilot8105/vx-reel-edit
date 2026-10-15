// Lists what might be a mistake, for the owner to approve before anything is cut. Nothing is cut here.
//  - restart: a short burst, a pause, then the same words again (the burst goes)
//  - retake: a sentence said again later, nearly the same (the earlier take goes; the last clean take stays)
//  - stutter: the same word or words twice in a row (the first goes). Deliberate emphasis ("never, never") looks
//    exactly like this, so every one is shown in context.
// Writes mistakes.json. Approve some with --approve 1,3 (or --approve all): they are copied into edit.json "cuts".
// Usage: node scripts/find-mistakes.mjs <video> [--approve 1,2,...|all]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, videoDir, writeJson } from './lib.mjs';

const args = process.argv.slice(2);
const ai = args.indexOf('--approve');
const approve = ai >= 0 ? args[ai + 1] : null;
const dir = videoDir(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--approve'));
const words = readJson(join(dir, 'words.json'));
const edit = readJson(join(dir, 'edit.json'));
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const say = (ws) => ws.map((w) => w.text).join(' ');
const found = [];
const add = (clip, from, to, ws, reason, context) => found.push({ id: found.length + 1, clip, from: +from.toFixed(2), to: +to.toFixed(2), words: say(ws), reason, context });

for (const clip of Object.keys(edit.clips)) {
  const mine = words.filter((w) => w.clip === clip);
  const regionsPath = join(dir, 'work', `${clip}-regions.json`);
  const regions = existsSync(regionsPath) ? readJson(regionsPath) : [];
  const inRegion = (r) => mine.filter((w) => w.start >= regions[r][0] - 0.01 && w.start <= regions[r][1]);

  // Restarts.
  for (let r = 0; r < regions.length - 1; r++) {
    const a = inRegion(r);
    const b = inRegion(r + 1);
    if (!a.length || !b.length || regions[r][1] - regions[r][0] > 1.5) continue;
    if (a.every((w, k) => b[k] && norm(b[k].text) === norm(w.text))) {
      add(clip, regions[r][0], regions[r + 1][0] - 0.05, a, 'restart', `"${say(a)}" … then "${say(b.slice(0, a.length + 3))}…"`);
    }
  }

  // Stutters: one to three words said twice in a row inside one stretch of speech.
  for (let i = 0; i < mine.length; i++) {
    for (const n of [3, 2, 1]) {
      const x = mine.slice(i, i + n);
      const y = mine.slice(i + n, i + 2 * n);
      if (y.length < n || y[0].start - x[n - 1].end > 0.6) continue;
      if (x.every((w, k) => norm(w.text) === norm(y[k].text) && norm(w.text))) {
        add(clip, x[0].start, y[0].start - 0.02, x, n === 1 ? 'stutter (or emphasis)' : 'repeat (or emphasis)', say(mine.slice(Math.max(0, i - 4), i + 2 * n + 4)));
        i += n - 1;
        break;
      }
    }
  }
}

// Retakes across the whole video: sentences, compared by their words.
const sentences = [];
let cur = [];
for (const w of words) {
  if (cur.length && cur[cur.length - 1].clip !== w.clip) {
    sentences.push(cur);
    cur = [];
  }
  cur.push(w);
  if (/[.?!]$/.test(w.text)) {
    sentences.push(cur);
    cur = [];
  }
}
if (cur.length) sentences.push(cur);
const bag = (s) => new Set(s.map((w) => norm(w.text)).filter(Boolean));
for (let i = 0; i < sentences.length; i++) {
  const a = sentences[i];
  if (a.length < 4) continue;
  for (let j = i + 1; j < sentences.length; j++) {
    const b = sentences[j];
    if (b.length < 4) continue;
    const A = bag(a);
    const B = bag(b);
    const shared = [...A].filter((t) => B.has(t)).length;
    const jaccard = shared / new Set([...A, ...B]).size;
    if (jaccard >= 0.6) {
      add(a[0].clip, a[0].start, a[a.length - 1].end, a, `retake (said again in clip ${b[0].clip} at ${b[0].start.toFixed(1)} s, ${Math.round(jaccard * 100)}% the same)`, `later: "${say(b)}"`);
      break;
    }
  }
}

found.sort((x, y) => x.clip.localeCompare(y.clip) || x.from - y.from).forEach((m, i) => (m.id = i + 1));
writeJson(join(dir, 'mistakes.json'), found);
if (!found.length) console.log('No mistakes found.');
for (const m of found) console.log(`${m.id}. [${m.clip} ${m.from}-${m.to}] ${m.reason}: "${m.words}"\n   ${m.context}`);

if (approve) {
  const ids = approve === 'all' ? found.map((m) => m.id) : approve.split(',').map(Number);
  const cuts = edit.cuts ?? [];
  for (const m of found.filter((x) => ids.includes(x.id))) {
    if (!cuts.some((c) => c.clip === m.clip && c.from === m.from && c.to === m.to)) cuts.push({ clip: m.clip, from: m.from, to: m.to, reason: `${m.reason}: ${m.words}` });
  }
  edit.cuts = cuts;
  writeJson(join(dir, 'edit.json'), edit);
  console.log(`\nApproved ${ids.join(', ')} into edit.json cuts (${cuts.length} in all). Next: node scripts/cut-pauses.mjs ${dir.split(/[\\/]/).pop()}`);
}

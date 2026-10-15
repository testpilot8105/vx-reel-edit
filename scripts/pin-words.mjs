// Turns transcript.json into words.json, the words the captions and the cut are built on.
//
// Whisper's word times drift into pauses, and on Taglish it can hear the wrong language. So:
// 1. Speech is measured from each clip's loudness into regions, against that clip's own noise floor.
// 2. When the owner gives their own words (script.txt in the video folder), those words win. They are lined up
//    against Whisper's by edit distance; a word marked *like-this is a key word for the captions, and a line [b]
//    says the words after it are in clip b.
// 3. Each word is pinned into the speech region it belongs to. Inside a region the Whisper times are kept when they
//    hold up; when they do not (drifted, squeezed, or the words were replaced by the script), the region's words are
//    spread across it by syllable count.
// Usage: node scripts/pin-words.mjs <video> [--noise <dB>]   (the threshold is measured per clip unless given)
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hear, readJson, speechRegions, videoDir, writeJson } from './lib.mjs';

const args = process.argv.slice(2);
const ni = args.indexOf('--noise');
const noise = ni >= 0 ? Number(args[ni + 1]) : null;
const dir = videoDir(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--noise'));
const heard = readJson(join(dir, 'transcript.json'));
const edit = readJson(join(dir, 'edit.json'));

const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const syl = (w) => Math.max(1, (norm(w).replace(/e$/, '').match(/[aeiouy]+/g) || []).length);

/** The owner's words lined up against Whisper's. Each script word takes the time of the Whisper word it matched or
 *  replaced; a script word with no partner sits between its neighbours. Whisper words the script leaves out go. */
const align = (script, whisper) => {
  const n = script.length;
  const m = whisper.length;
  const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const same = norm(script[i - 1].text) === norm(whisper[j - 1].text) ? 0 : 1;
      D[i][j] = Math.min(D[i - 1][j - 1] + same, D[i - 1][j] + 1, D[i][j - 1] + 1);
    }
  const pairs = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const same = i > 0 && j > 0 && norm(script[i - 1].text) === norm(whisper[j - 1].text) ? 0 : 1;
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + same) {
      pairs.unshift([i - 1, j - 1, same === 0]);
      i--;
      j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      pairs.unshift([i - 1, null, false]);
      i--;
    } else j--;
  }
  const out = pairs.map(([si, wj, exact]) => {
    const s = script[si];
    if (wj === null) return { ...s, clip: null, start: null, end: null, exact: false };
    const w = whisper[wj];
    return { ...s, clip: w.clip, start: w.start, end: w.end, exact };
  });
  // Unpartnered script words borrow their place from the neighbours.
  out.forEach((w, k) => {
    if (w.start !== null) return;
    const prev = out.slice(0, k).reverse().find((x) => x.start !== null);
    const next = out.slice(k + 1).find((x) => x.start !== null);
    w.clip = (prev ?? next).clip;
    w.start = prev && prev.clip === w.clip ? prev.end : next ? next.start - 0.1 : prev.end;
    w.end = w.start + 0.1;
  });
  return out;
};

const scriptPath = join(dir, 'script.txt');
let words;
if (existsSync(scriptPath)) {
  // A line [b] switches to clip b: the words after it are lined up against that clip only.
  const parts = [];
  let clip = null;
  for (const t of readFileSync(scriptPath, 'utf8').split(/\s+/).filter(Boolean)) {
    const m = t.match(/^\[([a-z])\]$/);
    if (m) {
      clip = m[1];
      continue;
    }
    if (!parts.length || parts[parts.length - 1].clip !== clip) parts.push({ clip, words: [] });
    parts[parts.length - 1].words.push({ text: t.replace(/^\*/, ''), key: t.startsWith('*') });
  }
  const script = parts.flatMap((p) => p.words);
  words = parts.flatMap((p) => align(p.words, p.clip ? heard.filter((w) => w.clip === p.clip) : heard));
  const exact = words.filter((w) => w.exact).length;
  console.log(`script.txt: ${script.length} words, ${exact} heard the same by Whisper, ${script.length - exact} taken from the script`);
} else {
  words = heard.map((w) => ({ ...w, key: false, exact: true }));
}

const out = [];
for (const clip of Object.keys(edit.clips)) {
  const wav = join(dir, 'work', `${clip}-16k.wav`);
  const mine = words.filter((w) => w.clip === clip);
  if (!mine.length || !existsSync(wav)) continue;
  const regions = speechRegions(wav, { noise });
  writeJson(join(dir, 'work', `${clip}-regions.json`), regions);

  // Words to regions, in order, as runs: each region takes a run of consecutive words (or none, if it was a breath or a
  // noise). The best split is the one where
  //  - every region holds about as many syllables as the speaker's pace allows for its length,
  //  - Whisper's own times sit close to their region (its starts drift early into pauses, so early counts half), and
  //  - a sentence that ended does not carry on in the same region (worth about three syllables of pace), and
  //  - a region ends on punctuation more often than not (people pause at commas).
  const dist = (w, [a, b]) => 0.5 * Math.max(0, a - w.start) + Math.max(0, w.end - b);
  const sylls = mine.map((w) => syl(w.text));
  const speechTime = regions.reduce((t, [a, b]) => t + (b - a), 0);
  const rate = sylls.reduce((x, y) => x + y, 0) / speechTime;
  const N = mine.length;
  const R = regions.length;
  const runCost = (i, j, r) => {
    const [a, b] = regions[r];
    const expected = rate * (b - a);
    if (i === j) return Math.min(expected, 4);
    let syl = 0;
    let d = 0;
    let ends = 0;
    for (let k = i; k < j; k++) {
      syl += sylls[k];
      d += dist(mine[k], regions[r]);
      if (k < j - 1 && /[.?!]$/.test(mine[k].text)) ends += 1;
    }
    const open = /[,.?!;:]$/.test(mine[j - 1].text) ? 0 : 0.6;
    return ((syl - expected) ** 2) / Math.max(expected, 2) + d + 1.5 * ends + open;
  };
  const dp = Array.from({ length: R + 1 }, () => new Array(N + 1).fill(Infinity));
  const cut = Array.from({ length: R + 1 }, () => new Array(N + 1).fill(0));
  dp[0][0] = 0;
  for (let r = 1; r <= R; r++)
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= j; i++) {
        if (dp[r - 1][i] === Infinity) continue;
        const c = dp[r - 1][i] + runCost(i, j, r - 1);
        if (c < dp[r][j]) {
          dp[r][j] = c;
          cut[r][j] = i;
        }
      }
  const pick = new Array(N);
  for (let r = R, j = N; r > 0; r--) {
    const i = cut[r][j];
    for (let k = i; k < j; k++) pick[k] = r - 1;
    j = i;
  }
  const assigned = mine.map((w, i) => ({ w, r: pick[i] }));

  const groups = regions.map((_, r) => assigned.filter((x) => x.r === r).map((x) => x.w));

  // A restart: a short burst, a long pause, then the same words again. Whisper hears the repeat once and keeps it on
  // the burst, so the second take comes out missing its first words. Those spots are heard again on their own, and
  // the burst's words are put back at the start of the take that follows when that is what was said.
  for (let r = 1; r < regions.length; r++) {
    const prev = groups[r - 1];
    const [pa, pb] = regions[r - 1];
    if (!prev.length || pb - pa > 1.5 || regions[r][0] - pb < 0.8 || !groups[r].length) continue;
    const alone = (await hear(wav, regions[r][0], regions[r][1])).map(norm);
    const lead = prev.map((w) => norm(w.text));
    const first = norm(groups[r][0].text);
    const starts = lead.every((t, k) => alone[k] === t) && alone[lead.length] === first;
    if (starts) {
      groups[r] = [...prev.map((w) => ({ ...w, exact: false })), ...groups[r]];
      console.log(`${clip}: restart at ${regions[r][0]} s, "${prev.map((w) => w.text).join(' ')}" said again`);
    }
  }

  for (let r = 0; r < regions.length; r++) {
    const group = groups[r];
    if (!group.length) continue;
    const [a, b] = regions[r];
    const clamped = group.map((w) => ({ ...w, start: Math.min(Math.max(w.start, a), b - 0.05), end: Math.min(Math.max(w.end, a + 0.05), b) }));
    const ordered = clamped.every((w, k) => k === 0 || w.start >= clamped[k - 1].end - 0.02);
    const sane = clamped.every((w) => w.end - w.start >= 0.05 && w.end - w.start <= 1.3);
    const replaced = group.filter((w) => !w.exact).length / group.length;
    const covered = (clamped[clamped.length - 1].end - clamped[0].start) / (b - a);
    const spread = !ordered || !sane || replaced > 0.3 || covered < 0.5;
    if (spread) {
      const weights = group.map((w) => syl(w.text) + 0.35);
      const sum = weights.reduce((x, y) => x + y, 0);
      let t = a;
      group.forEach((w, k) => {
        const d = ((b - a) * weights[k]) / sum;
        out.push({ clip, text: w.text, start: +t.toFixed(3), end: +(t + d).toFixed(3), key: !!w.key });
        t += d;
      });
    } else {
      for (const w of clamped) out.push({ clip, text: w.text, start: +w.start.toFixed(3), end: +w.end.toFixed(3), key: !!w.key });
    }
  }
  console.log(`${clip}: ${regions.length} speech regions (floor ${regions.floor.toFixed(0)} dB, speech ${regions.speech.toFixed(0)} dB, threshold ${regions.threshold.toFixed(0)} dB), ${mine.length} words pinned`);
}

writeJson(join(dir, 'words.json'), out);
console.log(`words.json: ${out.length} words. Next: node scripts/find-mistakes.mjs ${dir.split(/[\\/]/).pop()}`);

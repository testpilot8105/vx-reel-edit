// Checks a render before the owner sees it, and writes VERIFY.md next to it.
//  - length: the file is as long as the cut list says
//  - cuts: one contact sheet with the frames either side of every cut (out/<name>-cuts.jpg)
//  - hook: one contact sheet of the first 2.5 s, every 5 frames (out/<name>-hook.jpg), for captions over the face
//  - words: the render is heard again; words the cut should have kept but that are missing are listed, every line is
//    checked as heard and in order, the last word as whole (not clipped by the end of the voice), and every pause
//    over 0.3 s is listed with its time
//  - card scan: every frame is decoded at 10% and its outer edge tested against the canvas colour, so each frame
//    inside a full-frame scene or the end card is fully card, the hard cuts land on the exact frame, and no frame is
//    half one thing and half another (a dissolve, a sliding sheet, an empty frame where footage should be)
//  - loudness: integrated LUFS and true peak of the file as encoded
// Look at both sheets with the Read tool; a number on a page is not a look.
// Usage: node scripts/verify.mjs <video> [file in out/, default the newest]
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { atOf, durationOf, ffmpeg, ffmpegTool, hear, probe, readJson, ROOT, sizeOf, speechRegions, videoDir, voiceEndOf } from './lib.mjs';

const args = process.argv.slice(2);
const dir = videoDir(args[0]);
const outDir = join(dir, 'out');
const name =
  args[1] ??
  readdirSync(outDir)
    .filter((f) => /\.mp4$/.test(f) && !f.startsWith('.'))
    .sort((a, b) => statSync(join(outDir, b)).mtimeMs - statSync(join(outDir, a)).mtimeMs)[0];
const file = join(outDir, name);
const edit = readJson(join(dir, 'edit.json'));
const fps = edit.fps;
const base = name.replace(/\.mp4$/, '');
const lines = [`# Verify ${name}`, ''];

// Length (speed included).
const cutsAt = [];
{
  let start = 0;
  for (const s of edit.segments) {
    if (start > 0) cutsAt.push(start);
    start += Math.max(1, Math.round((Math.round(s.out * fps) - Math.round(s.in * fps)) / (edit.speed ?? 1)));
  }
}
const expected = durationOf(edit) / fps;
const voiceEnd = voiceEndOf(edit);
const got = probe(file).duration;
const lengthOk = Math.abs(got - expected) < 0.15;
lines.push(`- Length: ${got.toFixed(2)} s, cut list says ${expected.toFixed(2)} s. ${lengthOk ? 'OK' : 'MISMATCH'}`);

// Contact sheets.
const sheet = (frames, cols, out) => {
  const sel = frames.map((f) => `eq(n\\,${Math.max(0, f)})`).join('+');
  const rows = Math.ceil(frames.length / cols);
  ffmpeg(['-y', '-loglevel', 'error', '-i', file, '-vf', `select='${sel}',scale=240:-2,tile=${cols}x${rows}:padding=4`, '-frames:v', '1', '-fps_mode', 'passthrough', join(outDir, out)]);
};
const around = cutsAt.flatMap((f) => [f - 6, f - 1, f, f + 4]);
if (around.length) sheet(around, 8, `${base}-cuts.jpg`);
sheet(Array.from({ length: Math.ceil((2.5 * fps) / 5) }, (_, i) => i * 5), 8, `${base}-hook.jpg`);
lines.push(`- Cuts: ${cutsAt.length}, sheet out/${base}-cuts.jpg (four frames per cut: 6 and 1 before, the cut, 4 after)`);
lines.push(`- Hook: out/${base}-hook.jpg (first 2.5 s, every 5 frames)`);

// Words.
const norm = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const wav = join(dir, 'work', `${base}-16k.wav`);
ffmpeg(['-y', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', wav]);
const heardWords = (await hear(wav, 0, got)).map(norm).filter(Boolean);
const cuts = edit.cuts ?? [];
const words = readJson(join(dir, 'words.json')).filter(
  (w) =>
    !cuts.some((c) => c.clip === w.clip && (w.start + w.end) / 2 >= c.from && (w.start + w.end) / 2 <= c.to) &&
    edit.segments.some((s) => s.clip === w.clip && w.start >= s.in - 0.02 && w.end <= s.out + 0.02),
);
const want = words.map((w) => norm(w.text)).filter(Boolean);
// Words the cut kept that the render does not say (edit distance alignment; Whisper's own slips show up too).
const D = Array.from({ length: want.length + 1 }, (_, i) => Array.from({ length: heardWords.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
for (let i = 1; i <= want.length; i++)
  for (let j = 1; j <= heardWords.length; j++)
    D[i][j] = Math.min(D[i - 1][j - 1] + (want[i - 1] === heardWords[j - 1] ? 0 : 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
const missing = [];
const heard = new Array(want.length).fill(false);
for (let i = want.length, j = heardWords.length; i > 0; ) {
  if (j > 0 && D[i][j] === D[i - 1][j - 1] + (want[i - 1] === heardWords[j - 1] ? 0 : 1)) {
    heard[i - 1] = want[i - 1] === heardWords[j - 1];
    if (!heard[i - 1]) missing.unshift(words[i - 1].text);
    i--;
    j--;
  } else if (D[i][j] === D[i - 1][j] + 1) missing.unshift(words[--i].text);
  else j--;
}
const share = 1 - D[want.length][heardWords.length] / Math.max(want.length, 1);
lines.push(`- Words: ${want.length} kept, heard back ${heardWords.length}, ${Math.round(share * 100)}% the same.${missing.length ? ` Not heard: ${missing.join(', ')}. Listen at those words; a Taglish word Whisper mishears is not a cut problem.` : ''}`);

// Lines: the kept words split at the end of each sentence. A line counts as heard when most of its words are; the
// alignment runs in order, so a line heard is a line in its place.
const sentences = [];
{
  let cur = [];
  words.forEach((w, i) => {
    cur.push(i);
    if (/[.?!]$/.test(w.text) || i === words.length - 1) {
      sentences.push(cur);
      cur = [];
    }
  });
}
const lineHeard = sentences.map((ix) => ix.filter((i) => heard[i]).length / ix.length >= 0.6);
// Whisper hears Tagalog as English on the whole file; a line it missed gets a second listen on its own, in Tagalog.
const inOrder = (a, b) => {
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) L[i][j] = a[i - 1] === b[j - 1] ? L[i - 1][j - 1] + 1 : Math.max(L[i - 1][j], L[i][j - 1]);
  return L[a.length][b.length];
};
const relistened = [];
for (const [k, ix] of sentences.entries()) {
  if (lineHeard[k]) continue;
  const first = words[ix[0]];
  const last = words[ix[ix.length - 1]];
  const a = Math.max(0, atOf(edit, { clip: first.clip, t: first.start }) / fps - 0.2);
  const b = Math.min(got, atOf(edit, { clip: last.clip, t: last.end }) / fps + 0.3);
  const again = (await hear(wav, a, b, 'tl')).map(norm).filter(Boolean);
  const lineWords = ix.map((i) => want[i]);
  if (inOrder(lineWords, again) / lineWords.length >= 0.6) {
    lineHeard[k] = true;
    relistened.push(k + 1);
  }
}
const lost = sentences.filter((_, k) => !lineHeard[k]).map((ix) => `"${ix.map((i) => words[i].text).join(' ')}"`);
const linesOk = lost.length === 0;
lines.push(
  `- Lines: ${lineHeard.filter(Boolean).length} of ${sentences.length} heard, in order${relistened.length ? ` (line ${relistened.join(', ')} on a second listen in Tagalog)` : ''}. ${linesOk ? 'OK' : `CHECK, not heard: ${lost.join('; ')}`}`,
);

// The last word whole: heard back, and the voice's last sound ends before the voice does (not cut off mid-word).
const regions = speechRegions(wav, { minSilence: 0.3 });
const voiced = regions.filter(([a]) => a < voiceEnd / fps);
const lastSound = voiced.length ? voiced[voiced.length - 1][1] : 0;
const tail = voiceEnd / fps - lastSound;
const lastOk = heard[heard.length - 1] && tail >= 0.04;
lines.push(
  `- Last word: "${words[words.length - 1]?.text}" ${heard[heard.length - 1] ? 'heard' : 'NOT heard'}; the voice's last sound ends at ${lastSound.toFixed(2)} s, ${tail.toFixed(2)} s before the voice ends at ${(voiceEnd / fps).toFixed(2)} s. ${lastOk ? 'OK' : 'CHECK'}`,
);

// Pauses over 0.3 s inside the voice, from the render's own loudness.
const pauses = [];
for (let k = 1; k < voiced.length; k++) {
  const gap = voiced[k][0] - voiced[k - 1][1];
  if (gap > 0.3) pauses.push(`${voiced[k - 1][1].toFixed(2)} s (${gap.toFixed(2)} s)`);
}
lines.push(`- Pauses over 0.3 s: ${pauses.length ? `${pauses.length}: ${pauses.join(', ')}` : 'none'}`);

// Card scan: every frame at 10%, its outer edge (two pixels deep) tested against the canvas colour.
const styleMd = readFileSync(join(ROOT, 'styles', `${edit.style}.md`), 'utf8');
const canvas = JSON.parse(styleMd.match(/```json\n([\s\S]*?)\n```/)[1]).colors.background;
const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(canvas.slice(i, i + 2), 16));
const [CW, CH] = sizeOf(edit);
const sw = Math.round(CW / 10);
const sh = Math.round(CH / 10);
const spans = [
  ...(edit.overlays ?? []).filter((o) => o.kind === 'scene').map((o) => [atOf(edit, o.from), atOf(edit, o.to), `scene "${o.title.replace(/\n/g, ' ')}"`]),
  ...(edit.end ? [[voiceEnd, durationOf(edit), 'end card']] : []),
];
const inCard = (f) => spans.some(([a, b]) => f >= a && f < b);
const shares = await new Promise((resolve, reject) => {
  const out = [];
  const [cmd, pre] = ffmpegTool();
  const p = spawn(cmd, [...pre, '-v', 'error', '-i', file, '-vf', `scale=${sw}:${sh}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const size = sw * sh * 3;
  let buf = Buffer.alloc(0);
  p.stdout.on('data', (d) => {
    buf = Buffer.concat([buf, d]);
    while (buf.length >= size) {
      const fr = buf.subarray(0, size);
      buf = buf.subarray(size);
      let n = 0;
      let hit = 0;
      for (let y = 0; y < sh; y++)
        for (let x = 0; x < sw; x++) {
          if (x >= 2 && x < sw - 2 && y >= 2 && y < sh - 2) continue;
          const k = (y * sw + x) * 3;
          n++;
          if (Math.max(Math.abs(fr[k] - cr), Math.abs(fr[k + 1] - cg), Math.abs(fr[k + 2] - cb)) <= 14) hit++;
        }
      out.push(hit / n);
    }
  });
  p.on('error', reject);
  p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`ffmpeg exited ${code} decoding ${file}`))));
});
const notCard = [];
const half = [];
for (let f = 0; f < shares.length; f++) {
  const v = shares[f];
  if (inCard(f) && v < 0.95) notCard.push(f);
  else if (!inCard(f) && v >= 0.5) half.push(f);
}
const landings = spans.map(([a, b, name]) => {
  const before = a > 0 && !inCard(a - 1) ? shares[a - 1] : null;
  const after = b < shares.length && !inCard(b) ? shares[b] : null;
  const ok = shares[a] >= 0.95 && shares[b - 1] >= 0.95 && (before === null || before < 0.5) && (after === null || after < 0.5);
  return { name, ok, text: `${name} ${a} to ${b}${ok ? '' : ` (edge match: before ${before?.toFixed(2) ?? '-'}, first ${shares[a]?.toFixed(2)}, last ${shares[b - 1]?.toFixed(2)}, after ${after?.toFixed(2) ?? '-'})`}` };
});
const cardFrames = shares.filter((_, f) => inCard(f));
const minCard = cardFrames.length ? Math.min(...cardFrames) : 1;
const footFrames = shares.filter((_, f) => !inCard(f));
const maxFoot = footFrames.length ? Math.max(...footFrames) : 0;
const fr = (xs) => (xs.length > 12 ? `${xs.slice(0, 12).join(', ')} and ${xs.length - 12} more` : xs.join(', '));
const scanOk = notCard.length === 0 && half.length === 0 && landings.every((l) => l.ok) && shares.length === Math.round(expected * fps);
lines.push(
  `- Card scan: ${shares.length} frames at ${sw}x${sh}. ${spans.length} card spans, ${cardFrames.length} frames, ${cardFrames.length - notCard.length} fully card (lowest edge match ${Math.round(minCard * 100)}%); ` +
    `${footFrames.length} other frames, highest edge match ${Math.round(maxFoot * 100)}%. Hard cuts: ${landings.filter((l) => l.ok).length} of ${landings.length} land on the frame. ${scanOk ? 'OK' : 'CHECK'}`,
);
if (notCard.length) lines.push(`  - Not fully card inside a card: frames ${fr(notCard)}`);
if (half.length) lines.push(`  - Canvas showing outside a card (a half frame or missing footage): frames ${fr(half)}`);
for (const l of landings.filter((x) => !x.ok)) lines.push(`  - ${l.text}`);

// Loudness of the file as encoded.
const { err } = ffmpeg(['-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const summary = err.slice(err.lastIndexOf('Summary:'));
const I = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
const TP = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
const loudOk = Math.abs(I + 14) <= 1 && TP <= -1;
lines.push(`- Loudness: ${I} LUFS, true peak ${TP} dBTP (target about -14 LUFS, at or under -1.5 dBTP). ${loudOk ? 'OK' : 'CHECK'}`);

writeFileSync(join(dir, 'VERIFY.md'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));

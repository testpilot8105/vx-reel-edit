// Transcribes every talking clip of a video on this machine with whisper.cpp (large-v3-turbo, word times from DTW).
// Nothing leaves the computer. Writes transcript.json: [{clip, text, start, end, p}] in each clip's own seconds.
// whisper-cli is used from the PATH when it is there (Homebrew on a Mac); otherwise Remotion's installer builds it
// into whisper/. The model is whisper/ggml-large-v3-turbo*.bin, downloaded once if missing (about 1.6 GB).
// Usage: node scripts/transcribe.mjs <video> [--lang auto|en|tl|...]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, run, videoDir, whisperBinary, whisperModel, writeJson } from './lib.mjs';

const args = process.argv.slice(2);
const li = args.indexOf('--lang');
const lang = li >= 0 ? args[li + 1] : 'auto';
const dir = videoDir(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--lang'));
/** Whisper tokens to words: a token that starts with a space starts a word. Special tokens ([_BEG_], [_TT_n]) are
 *  dropped. A word starts at its first token's DTW time and ends where the next word starts or its last token ends. */
const toWords = (json, clip) => {
  const toks = [];
  for (const seg of json.transcription) for (const t of seg.tokens ?? []) if (!/^\[_.*\]$/.test(t.text) && t.text !== '') toks.push(t);
  const words = [];
  for (const t of toks) {
    const at = t.t_dtw > -1 ? t.t_dtw / 100 : t.offsets.from / 1000;
    if (/^\s/.test(t.text) || !words.length) words.push({ clip, text: t.text.trim(), start: at, end: t.offsets.to / 1000, p: [t.p] });
    else {
      const w = words[words.length - 1];
      w.text += t.text;
      w.end = t.offsets.to / 1000;
      w.p.push(t.p);
    }
  }
  return words
    .filter((w) => w.text)
    .map((w, i, all) => {
      const next = all[i + 1];
      const end = next && next.start > w.start ? Math.min(w.end, next.start) : w.end;
      return { ...w, end: Math.max(end, w.start + 0.05), p: Math.round((w.p.reduce((a, b) => a + b, 0) / w.p.length) * 100) / 100 };
    });
};

const bin = await whisperBinary();
const m = await whisperModel();
const edit = readJson(join(dir, 'edit.json'));
const all = [];
for (const clip of Object.keys(edit.clips)) {
  const wav = join(dir, 'work', `${clip}-16k.wav`);
  if (!existsSync(wav)) {
    console.log(`${clip}: no sound, skipped`);
    continue;
  }
  const out = join(dir, 'work', `${clip}-whisper`);
  console.log(`${clip}: transcribing...`);
  run(bin, ['-m', m, '-f', wav, '-l', lang, '-ojf', '-of', out, '--dtw', 'large.v3.turbo', '-np']);
  const words = toWords(readJson(`${out}.json`), clip);
  all.push(...words);
  console.log(`${clip}: ${words.length} words: ${words.map((w) => w.text).join(' ').slice(0, 160)}...`);
}
writeJson(join(dir, 'transcript.json'), all);
console.log(`\ntranscript.json: ${all.length} words. Next: node scripts/pin-words.mjs ${dir.split(/[\\/]/).pop()}`);

// Renders a video. First the hook's cutout frames when they are missing or out of date (scripts/matte.mjs), then the
// index, which bakes the voice into one track when the cut changed (scripts/voice.mjs). A draft is half size (fast, fine on a phone) and numbered v1, v2...; the final is full size.
// Then the sound is mastered to about -14 LUFS with peaks at or under -1.5 dBTP (two-pass loudnorm aimed at -2, since
// AAC adds a little on encode; picture copied untouched), and a copy goes to iCloud Drive/VX Reel Edit so it shows up on the phone.
// Usage: node scripts/render.mjs <video> [--draft|--final]
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ffmpeg, hookFramesOf, readJson, ROOT, run, videoDir } from './lib.mjs';

const args = process.argv.slice(2);
const final = args.includes('--final');
const dir = videoDir(args.find((a) => !a.startsWith('--')));
const edit = readJson(join(dir, 'edit.json'));
const outDir = join(dir, 'out');
mkdirSync(outDir, { recursive: true });

if (edit.hook?.cutout && !hookFramesOf(dir, edit).ready) {
  console.log('Making the hook cutout...');
  run('node', [join(ROOT, 'scripts/matte.mjs'), dir.split(/[\\/]/).pop()], { cwd: ROOT, stdio: ['ignore', 'inherit', 'pipe'] });
}
process.stderr.write(run('node', [join(ROOT, 'scripts/index-videos.mjs')], { cwd: ROOT, stdio: ['ignore', 'inherit', 'pipe'] }).err ?? '');

const n = readdirSync(outDir).filter((f) => /^v\d+\.mp4$/.test(f)).length + 1;
const name = final ? 'final.mp4' : `v${n}.mp4`;
const target = join(outDir, name);
const rawRender = join(outDir, `.render-${name}`);
console.log(`Rendering ${edit.id} to out/${name}${final ? '' : ' (half size draft)'}...`);
run('npx', ['remotion', 'render', 'src/index.ts', edit.id, rawRender, `--scale=${final ? 1 : 0.5}`, '--log=error'], { cwd: ROOT, stdio: ['ignore', 'inherit', 'pipe'] });

// Master: measure, then normalise with the measured values so the result lands on target in one go.
const { err } = ffmpeg(['-i', rawRender, '-af', 'loudnorm=I=-14:TP=-2:LRA=11:print_format=json', '-f', 'null', '-']);
const m = JSON.parse(err.slice(err.lastIndexOf('{'), err.lastIndexOf('}') + 1));
ffmpeg([
  '-y', '-loglevel', 'error', '-i', rawRender, '-c:v', 'copy',
  '-af', `loudnorm=I=-14:TP=-2:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`,
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', target,
]);
renameSync(rawRender, join(outDir, `.unmastered-${name}`));

const icloud = join(homedir(), 'Library/Mobile Documents/com~apple~CloudDocs');
let phone = null;
if (existsSync(icloud)) {
  mkdirSync(join(icloud, 'VX Reel Edit'), { recursive: true });
  phone = join(icloud, 'VX Reel Edit', `${edit.id}-${name}`);
  copyFileSync(target, phone);
}
console.log(`Done: ${target}\nLoudness before mastering ${m.input_i} LUFS, peak ${m.input_tp} dBTP.`);
console.log(phone ? `On your phone: Files > iCloud Drive > VX Reel Edit > ${edit.id}-${name}` : 'No iCloud Drive on this computer; send the file to your phone yourself.');
console.log(`Next: node scripts/verify.mjs ${dir.split('/').pop()} ${name}`);

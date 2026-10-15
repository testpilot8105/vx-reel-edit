// One contact sheet of chosen frames from a render, to look at graphics where they land. Frames are output frame
// numbers (seconds times fps), or seconds with an s: 8.2s. Writes out/<file>-frames.jpg.
// Usage: node scripts/frames.mjs <video> <file in out/> <frame|seconds>[,<frame|seconds>...]
import { join } from 'node:path';
import { ffmpeg, readJson, videoDir } from './lib.mjs';

const [name, file, list] = process.argv.slice(2);
const dir = videoDir(name);
const { fps } = readJson(join(dir, 'edit.json'));
const frames = list.split(',').map((x) => (x.endsWith('s') ? Math.round(Number(x.slice(0, -1)) * fps) : Number(x)));
const out = join(dir, 'out', `${file.replace(/\.mp4$/, '')}-frames.jpg`);
const sel = frames.map((f) => `eq(n\\,${f})`).join('+');
const cols = Math.min(8, frames.length);
ffmpeg(['-y', '-loglevel', 'error', '-i', join(dir, 'out', file), '-vf', `select='${sel}',scale=240:-2,tile=${cols}x${Math.ceil(frames.length / cols)}:padding=4`, '-frames:v', '1', '-fps_mode', 'passthrough', out]);
console.log(out);

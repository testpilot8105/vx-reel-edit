// Shared by the scripts: paths, running ffmpeg and friends, reading a video's folder.
import { execFileSync, spawnSync } from 'node:child_process';
import whisper from '@remotion/install-whisper-cpp';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const MEDIA = join(ROOT, 'media');

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const writeJson = (p, v) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

/** Runs a tool and returns stdout; throws with its stderr when it fails. */
export const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, ...opts });
  if (r.error) throw new Error(`${cmd} could not start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')}\n${(r.stderr || r.stdout || '').slice(-3000)}`);
  return { out: r.stdout, err: r.stderr };
};

/** ffmpeg and ffprobe: a full install is needed (Remotion's own build lacks the filters these scripts use). Found on
 *  the PATH, or where Homebrew (Mac) and winget (Windows) put it, for a terminal opened before the install. */
const which = (bin) => {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [bin], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
const toolCache = {};
const tool = (bin) => {
  if (toolCache[bin]) return toolCache[bin];
  const exe = process.platform === 'win32' ? `${bin}.exe` : bin;
  const places =
    process.platform === 'win32'
      ? [join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Links', exe), join(process.env.ProgramFiles ?? 'C:\\Program Files', 'ffmpeg', 'bin', exe)]
      : [join('/opt/homebrew/bin', exe), join('/usr/local/bin', exe)];
  const found = which(bin) ? bin : places.find((p) => existsSync(p));
  if (!found)
    throw new Error(
      `${bin} is not installed. On a Mac: brew install ffmpeg. On Windows: winget install --id Gyan.FFmpeg -e (then open a new terminal).`,
    );
  toolCache[bin] = [found, []];
  return toolCache[bin];
};
/** The ffmpeg command and its leading arguments, for streaming its output yourself. */
export const ffmpegTool = () => tool('ffmpeg');
export const ffmpeg = (args) => {
  const [cmd, pre] = tool('ffmpeg');
  return run(cmd, [...pre, '-hide_banner', ...args]);
};
export const ffprobe = (args) => {
  const [cmd, pre] = tool('ffprobe');
  return run(cmd, [...pre, ...args]);
};

/** Remotion's command line, run with this same Node (no npx, so it works the same on Windows, Mac and Linux). */
export const REMOTION_CLI = join(ROOT, 'node_modules', '@remotion', 'cli', 'remotion-cli.js');
export const remotion = (args, opts = {}) => run(process.execPath, [REMOTION_CLI, ...args], opts);

/** The folder of one video, found by its full name or by a unique part of it. */
export const videoDir = (name) => {
  if (!name) throw new Error('Name the video: its folder under media/videos, or a unique part of it.');
  const base = join(MEDIA, 'videos');
  if (existsSync(join(base, name))) return join(base, name);
  const hits = readdirSync(base).filter((d) => d.includes(name));
  if (hits.length === 1) return join(base, hits[0]);
  throw new Error(hits.length ? `"${name}" matches ${hits.join(', ')}; be more specific.` : `No video folder matches "${name}".`);
};

export const probe = (file) => {
  const { out } = ffprobe(['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate:stream_side_data=rotation', '-of', 'json', file]);
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const rot = Math.abs(Number(v?.side_data_list?.find((d) => 'rotation' in d)?.rotation ?? 0));
  const [n, d] = (v?.r_frame_rate ?? '30/1').split('/').map(Number);
  const swap = rot === 90 || rot === 270;
  return {
    duration: Number(j.format.duration),
    width: swap ? v?.height : v?.width,
    height: swap ? v?.width : v?.height,
    fps: Math.round((n / (d || 1)) * 100) / 100,
    audio: j.streams.some((s) => s.codec_type === 'audio'),
  };
};

/** Loudness of a 16 kHz mono wav in 20 ms steps, in dB. */
export const levels = (wav) => {
  const { out } = ffmpeg(['-i', wav, '-af', 'asetnsamples=n=320:p=0,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-', '-f', 'null', '-']);
  return out
    .split('\n')
    .filter((l) => l.startsWith('lavfi.astats.Overall.RMS_level='))
    .map((l) => {
      const v = Number(l.split('=')[1]);
      return Number.isFinite(v) ? v : -120;
    });
};

/** Speech regions from loudness: [start, end] in seconds. The threshold sits between the clip's own noise floor
 *  (10th percentile) and its speech level (90th), so a noisy room and a quiet one both work. Pauses shorter than
 *  minSilence are not pauses. Pass `noise` (dB) to set the threshold by hand. */
export const speechRegions = (wav, { noise = null, minSilence = 0.25 } = {}) => {
  const db = levels(wav);
  const step = 0.02;
  const sorted = [...db].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const floor = pct(0.1);
  const speech = pct(0.9);
  const threshold = noise ?? floor + 0.3 * (speech - floor);
  const raw = [];
  let open = null;
  db.forEach((v, i) => {
    if (v > threshold && open === null) open = i;
    if (v <= threshold && open !== null) {
      raw.push([open * step, i * step]);
      open = null;
    }
  });
  if (open !== null) raw.push([open * step, db.length * step]);
  const merged = [];
  for (const r of raw) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] < minSilence) last[1] = r[1];
    else merged.push([...r]);
  }
  const regions = merged.filter(([a, b]) => b - a >= 0.08).map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)]);
  regions.threshold = threshold;
  regions.floor = floor;
  regions.speech = speech;
  return regions;
};

/** whisper-cli from the PATH (Homebrew on a Mac), else Remotion's installer puts it in whisper/: built from source on a
 *  Mac or Linux, unzipped from the release on Windows (where it lands in Release\\, not where the installer looks). */
export const WHISPER = join(ROOT, 'whisper');
const CPP_VERSION = '1.7.6';

const findFile = (dir, name) => {
  if (!existsSync(dir)) return null;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isFile() && e.name === name) return p;
    if (e.isDirectory()) {
      const hit = findFile(p, name);
      if (hit) return hit;
    }
  }
  return null;
};

export const whisperBinary = async () => {
  if (which('whisper-cli')) return 'whisper-cli';
  for (const p of ['/opt/homebrew/bin/whisper-cli', '/usr/local/bin/whisper-cli']) if (process.platform !== 'win32' && existsSync(p)) return p;
  const to = join(WHISPER, 'whisper.cpp');
  const name = process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli';
  const have = findFile(to, name);
  if (have) return have;
  if (!existsSync(to)) await whisper.installWhisperCpp({ version: CPP_VERSION, to, printOutput: true });
  const made = findFile(to, name);
  if (!made) throw new Error(`whisper-cli was not found under ${to}. Delete that folder and run this again.`);
  return made;
};

export const whisperModel = async () => {
  const found = existsSync(WHISPER) && readdirSync(WHISPER).filter((f) => /^ggml-large-v3-turbo.*\.bin$/.test(f)).sort();
  if (found?.length) return join(WHISPER, found[0]);
  await whisper.downloadWhisperModel({ model: 'large-v3-turbo', folder: WHISPER, printOutput: true });
  return join(WHISPER, 'ggml-large-v3-turbo.bin');
};


/** What whisper hears in one stretch of a wav, on its own: a list of words. */
export const hear = async (wav, from, to, lang = 'auto') => {
  const slice = `${wav.replace(/\.wav$/, '')}-${from.toFixed(2)}-${to.toFixed(2)}.wav`;
  ffmpeg(['-y', '-loglevel', 'error', '-i', wav, '-ss', String(Math.max(0, from - 0.1)), '-to', String(to + 0.1), slice]);
  const { out } = run(await whisperBinary(), ['-m', await whisperModel(), '-f', slice, '-l', lang, '-np', '-nt']);
  return out.trim().split(/\s+/).filter(Boolean);
};

// The cut list in output frames, the same math as src/timeline.ts (speed included): keep the two in step.
export const speedOf = (e) => e.speed ?? 1;
export const piecesOf = (e) => {
  let start = 0;
  return e.segments.map((s) => {
    const from = Math.round(s.in * e.fps);
    const src = Math.max(1, Math.round(s.out * e.fps) - from);
    const len = Math.max(1, Math.round(src / speedOf(e)));
    const p = { ...s, from, src, len, start };
    start += len;
    return p;
  });
};
export const voiceEndOf = (e) => {
  const ps = piecesOf(e);
  const last = ps[ps.length - 1];
  return last ? last.start + last.len : 0;
};
export const durationOf = (e) => voiceEndOf(e) + Math.round((e.end?.seconds ?? 0) * e.fps);
/** Output frame for a moment in a source clip. A moment inside a cut lands on the next kept frame. */
export const atOf = (e, a) => {
  const f = a.t * e.fps;
  let after = null;
  for (const p of piecesOf(e)) {
    if (p.clip !== a.clip) continue;
    if (f >= p.from && f < p.from + p.src) return Math.min(p.start + p.len - 1, p.start + Math.round((f - p.from) / speedOf(e)));
    if (f < p.from && after === null) after = p.start;
  }
  return after ?? voiceEndOf(e);
};
const FORMATS = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] };
export const sizeOf = (e) => FORMATS[e.format];

/** A short fingerprint of anything (the cut, the clips' files), for file names that change when their source does,
 *  so Studio never keeps serving an old file. */
export const fingerprint = (v) => createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 8);
const fileStamp = (p) => {
  const st = statSync(join(MEDIA, p));
  return [p, st.size, Math.round(st.mtimeMs)];
};

/** Where the baked voice for this cut lives (scripts/voice.mjs), under the video's work/ folder. */
export const voicePath = (dir, e) => {
  const key = fingerprint({ fps: e.fps, speed: speedOf(e), clips: Object.values(e.clips).map(fileStamp), pieces: piecesOf(e).map((p) => [p.clip, p.from, p.src, p.len]) });
  return { abs: join(dir, 'work', `voice-${key}.wav`), rel: relative(MEDIA, join(dir, 'work', `voice-${key}.wav`)).split('\\').join('/') };
};

/** Where the hook's plate and cutout frames for this cut live (scripts/matte.mjs), and whether they are all there. */
export const hookFramesOf = (dir, e) => {
  if (!e.hook) return null;
  const len = atOf(e, e.hook.to);
  const [W, H] = sizeOf(e);
  const ps = piecesOf(e).filter((p) => p.start < len);
  const key = fingerprint({ len, W, H, fps: e.fps, speed: speedOf(e), clips: [...new Set(ps.map((p) => e.clips[p.clip]))].map(fileStamp), pieces: ps.map((p) => [p.clip, p.from, p.start]) });
  const abs = join(dir, 'work', `hook-${key}`);
  const count = existsSync(join(abs, 'matte')) ? readdirSync(join(abs, 'matte')).filter((f) => f.endsWith('.webp')).length : 0;
  const rel = relative(MEDIA, abs).split('\\').join('/');
  return { abs, len, ready: count >= len, frames: { plate: `${rel}/plate`, matte: `${rel}/matte`, count } };
};

/** The newest Playwright headless shell on this computer (Remotion's own browser crashes on this Mac), or none. */
export const headlessShell = () => {
  const cache =
    process.platform === 'darwin'
      ? join(homedir(), 'Library/Caches/ms-playwright')
      : process.platform === 'win32'
        ? join(homedir(), 'AppData/Local/ms-playwright')
        : join(homedir(), '.cache/ms-playwright');
  if (!existsSync(cache)) return undefined;
  const sub = { darwin: `chrome-headless-shell-mac-${process.arch}`, win32: 'chrome-headless-shell-win64', linux: 'chrome-headless-shell-linux64' }[process.platform];
  const exe = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell';
  return readdirSync(cache)
    .filter((d) => d.startsWith('chromium_headless_shell-'))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
    .map((d) => join(cache, d, sub, exe))
    .find((p) => existsSync(p));
};

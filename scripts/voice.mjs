// Bakes the cut voice into one continuous WAV (work/voice-<fingerprint>.wav) that the video plays as a single track,
// so no cut can restart or chop it (per-cut audio restarts at every cut in Studio). Each piece is trimmed to exactly
// its frames, sped up with the pitch kept when the edit has a speed, and faded over 3 frames at both edges so room
// noise never clicks. The name changes whenever the cut does, so Studio never plays an old voice; older bakes are
// removed. index-videos.mjs runs this by itself when the cut changed.
// Usage: node scripts/voice.mjs <video>
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpeg, MEDIA, piecesOf, readJson, speedOf, videoDir, voicePath } from './lib.mjs';

/** Makes the voice for this edit if it is not there yet; returns its path under media/. */
export const bakeVoice = (dir, e) => {
  const { abs, rel } = voicePath(dir, e);
  if (existsSync(abs)) return rel;
  mkdirSync(join(dir, 'work'), { recursive: true });
  const ps = piecesOf(e);
  const speed = speedOf(e);
  const fade = (3 / e.fps).toFixed(4);
  const chains = ps.map((p, i) => {
    const len = p.len / e.fps;
    return [
      `[${i}:a]atrim=start=${(p.from / e.fps).toFixed(4)}:end=${((p.from + p.src) / e.fps).toFixed(4)}`,
      'asetpts=PTS-STARTPTS',
      'aresample=48000',
      'aformat=sample_fmts=fltp:channel_layouts=stereo',
      ...(speed !== 1 ? [`atempo=${speed}`] : []),
      // Exactly the piece's length on the output, so the voice stays on the picture to the frame across every cut.
      'apad',
      `atrim=end=${len.toFixed(4)}`,
      `afade=t=in:d=${fade}`,
      `afade=t=out:st=${(len - 3 / e.fps).toFixed(4)}:d=${fade}`,
      `asetpts=PTS-STARTPTS[v${i}]`,
    ].join(',');
  });
  const graph = `${chains.join(';')};${ps.map((_, i) => `[v${i}]`).join('')}concat=n=${ps.length}:v=0:a=1[out]`;
  const tmp = `${abs}.part.wav`;
  ffmpeg(['-y', '-loglevel', 'error', ...ps.flatMap((p) => ['-i', join(MEDIA, e.clips[p.clip])]), '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_s16le', tmp]);
  rmSync(abs, { force: true });
  ffmpeg(['-y', '-loglevel', 'error', '-i', tmp, '-c', 'copy', abs]);
  rmSync(tmp, { force: true });
  for (const f of readdirSync(join(dir, 'work'))) if (/^voice-[0-9a-f]{8}\.wav$/.test(f) && join(dir, 'work', f) !== abs) rmSync(join(dir, 'work', f));
  return rel;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = videoDir(process.argv[2]);
  const rel = bakeVoice(dir, readJson(join(dir, 'edit.json')));
  console.log(`Voice: media/${rel}`);
}

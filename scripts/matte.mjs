// The hook's cutout: the person in front of the hook's type, so the hair crosses the letters. Writes the plate (the
// footage frames under the type) and a cutout of the person from those very frames, so the two can never drift apart
// (a cutout laid over separately decoded video slipped a frame and showed a second layer). Both go in
// work/hook-<fingerprint>/, whose name changes whenever the cut, the speed or the hook's length does: run this again
// after any of those (render.mjs does it by itself). Also measures where the head sits and prints the framing and focus
// that centre it.
// The cutout is MediaPipe's selfie segmenter (Google) in a hidden browser; the model and its runtime load from Google's
// and jsDelivr's servers, and no frame leaves this computer.
// Usage: node scripts/matte.mjs <video>
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { ffmpeg, headlessShell, hookFramesOf, MEDIA, piecesOf, readJson, sizeOf, speedOf, videoDir, writeJson } from './lib.mjs';

const dir = videoDir(process.argv[2]);
const e = readJson(join(dir, 'edit.json'));
const h = hookFramesOf(dir, e);
if (!h) throw new Error('This edit has no hook.');
const [W, H] = sizeOf(e);
const plate = join(h.abs, 'plate');
const matte = join(h.abs, 'matte');
rmSync(h.abs, { recursive: true, force: true });
mkdirSync(plate, { recursive: true });
mkdirSync(matte, { recursive: true });

// The plate: output frame i shows the same source moment the cut shows (speed included), cropped to fill the frame
// the way the video does, numbered by output frame.
for (const p of piecesOf(e).filter((x) => x.start < h.len)) {
  const n = Math.min(p.len, h.len - p.start);
  ffmpeg([
    '-y', '-loglevel', 'error', '-ss', (p.from / e.fps).toFixed(4), '-i', join(MEDIA, e.clips[p.clip]),
    '-vf', `setpts=(PTS-STARTPTS)/${speedOf(e)},fps=${e.fps},scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`,
    '-frames:v', String(n), '-start_number', String(p.start), '-q:v', '2', join(plate, '%03d.jpg'),
  ]);
}
const frames = readdirSync(plate).filter((f) => f.endsWith('.jpg')).sort();
if (frames.length < h.len) throw new Error(`Only ${frames.length} of ${h.len} plate frames came out.`);

// Playwright's headless shell when there is one, else the one Remotion downloads for rendering (any system).
let executablePath = headlessShell();
if (!executablePath) {
  const { ensureBrowser } = await import('@remotion/renderer');
  const status = await ensureBrowser();
  if ('path' in status) executablePath = status.path;
}
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('page:', m.text()));
await page.goto('about:blank');
await page.evaluate(async () => {
  const v = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
  const fileset = await v.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
  window.seg = await v.ImageSegmenter.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
      delegate: 'CPU',
    },
    runningMode: 'IMAGE',
    outputConfidenceMasks: true,
    outputCategoryMask: false,
  });
});

const heads = [];
for (const f of frames) {
  const data = `data:image/jpeg;base64,${readFileSync(join(plate, f)).toString('base64')}`;
  const { webp, head } = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const res = window.seg.segment(img);
    // Class 0 is background; the person is everything else.
    const bg = res.confidenceMasks[0];
    const mw = bg.width;
    const mh = bg.height;
    const conf = bg.getAsFloat32Array();
    const m = document.createElement('canvas');
    m.width = mw;
    m.height = mh;
    const mx = m.getContext('2d');
    const md = mx.createImageData(mw, mh);
    const a = new Float32Array(conf.length);
    for (let k = 0; k < conf.length; k++) {
      // Tighten the soft edge a little so the wall does not halo around the hair.
      a[k] = Math.min(1, Math.max(0, (1 - conf[k] - 0.35) / 0.4));
      md.data[k * 4 + 3] = Math.round(a[k] * 255);
    }
    mx.putImageData(md, 0, 0);
    res.close();
    // The head: the person's top 12% of the frame height, weighted by the cutout.
    let top = -1;
    for (let y = 0; y < mh && top < 0; y++) {
      let n = 0;
      for (let x = 0; x < mw; x++) n += a[y * mw + x] > 0.5 ? 1 : 0;
      if (n > mw * 0.02) top = y;
    }
    let sx = 0;
    let sy = 0;
    let sw = 0;
    for (let y = Math.max(0, top); y < Math.min(mh, top + mh * 0.12); y++)
      for (let x = 0; x < mw; x++) {
        const v = a[y * mw + x];
        sx += v * x;
        sy += v * y;
        sw += v;
      }
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(m, 0, 0, img.width, img.height);
    x.globalCompositeOperation = 'source-in';
    x.drawImage(img, 0, 0);
    return { webp: c.toDataURL('image/webp', 0.9), head: sw > 0 ? [(sx / sw / mw) * 100, (sy / sw / mh) * 100] : null };
  }, data);
  writeFileSync(join(matte, f.replace(/\.jpg$/, '.webp')), Buffer.from(webp.split(',')[1], 'base64'));
  if (head) heads.push(head);
}
await browser.close();

// Older hook frames for this video are out of date.
for (const d of readdirSync(join(dir, 'work'))) if (/^hook-[0-9a-f]{8}$/.test(d) && join(dir, 'work', d) !== h.abs) rmSync(join(dir, 'work', d), { recursive: true, force: true });

const med = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const hx = heads.length ? +med(heads.map((p) => p[0])).toFixed(1) : null;
const hy = heads.length ? +med(heads.map((p) => p[1])).toFixed(1) : null;
writeJson(join(h.abs, 'head.json'), { x: hx, y: hy, frames: heads.length });
console.log(`${frames.length} plate frames and cutouts in ${h.abs.slice(MEDIA.length + 1)}`);
if (hx !== null) {
  const shift = +(50 - hx).toFixed(1);
  const least = +Math.max(1, 1 + shift / hx, 1 - shift / (100 - hx)).toFixed(3);
  console.log(`Head at ${hx}% across, ${hy}% down (median of ${heads.length} frames).`);
  console.log(Math.abs(shift) < 1 ? 'The head is centred; no framing needed.' : `To centre it: "focus": [${hx}, ${hy}], "framing": { "shift": ${shift} } (least zoom ${least}).`);
}

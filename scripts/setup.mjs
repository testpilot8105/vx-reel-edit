// Gets this folder ready to edit on a Mac or a Windows PC (Linux too), and checks each step: Node, ffmpeg, the
// headless browser, the speech engine and its model, the video list, and one test render. Safe to run again; it only
// fetches what is missing. Run it after `pnpm install`.
// Usage: node scripts/setup.mjs
import { mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ffmpeg, ffprobe, remotion, ROOT, run, whisperBinary, whisperModel } from './lib.mjs';

const step = (n, text) => console.log(`\n[${n}/6] ${text}`);
const fail = (msg) => {
  console.error(`\nSetup stopped: ${msg}`);
  process.exit(1);
};

step(1, 'Node');
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) fail(`Node ${process.versions.node} is too old; install Node 20 or newer from nodejs.org.`);
console.log(`Node ${process.versions.node}, ${process.platform} ${process.arch}`);

step(2, 'ffmpeg');
try {
  console.log(ffmpeg(['-version']).out.split('\n')[0]);
  ffprobe(['-version']);
} catch (err) {
  fail(err.message);
}

step(3, 'Headless browser (renders the video and makes the hook cutout)');
run(process.execPath, [join(ROOT, 'node_modules', 'playwright-core', 'cli.js'), 'install', 'chromium-headless-shell'], {
  stdio: 'inherit',
  // Never clean up other browser versions on this computer; other projects may use them.
  env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_GC: '1' },
});

step(4, 'Speech engine and model (runs on this computer; the model is about 1.6 GB, downloaded once)');
try {
  console.log(`Engine: ${await whisperBinary()}`);
  const model = await whisperModel();
  console.log(`Model: ${model} (${Math.round(statSync(model).size / 1e6)} MB)`);
} catch (err) {
  fail(`${err.message}\nOn a Mac, installing it with Homebrew is the easy way: brew install whisper-cpp`);
}

step(5, 'Video list');
process.stdout.write(run(process.execPath, [join(ROOT, 'scripts', 'index-videos.mjs')], { cwd: ROOT }).out);

step(6, 'Test render');
const dir = join(ROOT, 'media', 'videos', '.setup-check');
mkdirSync(dir, { recursive: true });
const png = join(dir, 'style.png');
try {
  remotion(['still', 'src/index.ts', 'style-papaya-light', png, '--scale=0.25', '--log=error'], { cwd: ROOT });
  if (statSync(png).size < 1000) throw new Error('the test frame came out empty');
} catch (err) {
  fail(`the test render did not work: ${err.message.split('\n').slice(0, 6).join('\n')}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log('\nReady. Open Claude Code in this folder, drag in a video you filmed, and say: edit this into a reel.');
console.log('Remotion Studio (the live preview): pnpm studio');

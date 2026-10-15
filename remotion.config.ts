import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Config } from '@remotion/cli/config';

// Footage, the asset library and each video's edit live under media/, which Remotion serves as its public folder.
Config.setPublicDir('./media');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);

// Remotion's own downloaded headless browser crashed on start on one Mac ("Target closed"); Playwright's works. Use the
// newest Playwright headless shell when there is one (any system), else let Remotion use its own.
const cache =
  process.platform === 'darwin'
    ? join(homedir(), 'Library/Caches/ms-playwright')
    : process.platform === 'win32'
      ? join(homedir(), 'AppData/Local/ms-playwright')
      : join(homedir(), '.cache/ms-playwright');
const sub =
  process.platform === 'darwin' ? `chrome-headless-shell-mac-${process.arch}` : process.platform === 'win32' ? 'chrome-headless-shell-win64' : 'chrome-headless-shell-linux64';
const exe = process.platform === 'win32' ? 'chrome-headless-shell.exe' : 'chrome-headless-shell';
const shell = existsSync(cache)
  ? readdirSync(cache)
      .filter((d) => d.startsWith('chromium_headless_shell-'))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
      .map((d) => join(cache, d, sub, exe))
      .find((p) => existsSync(p))
  : undefined;
if (shell) Config.setBrowserExecutable(shell);

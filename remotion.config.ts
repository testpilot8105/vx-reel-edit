import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Config } from '@remotion/cli/config';

// Footage, the asset library and each video's edit live under media/, which Remotion serves as its public folder.
Config.setPublicDir('./media');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);

// Remotion's own downloaded headless browser crashes on start on this Mac ("Target closed"); Playwright's works.
// Use the newest Playwright headless shell when there is one, else let Remotion use its own.
const cache = join(homedir(), 'Library/Caches/ms-playwright');
const shell = existsSync(cache)
  ? readdirSync(cache)
      .filter((d) => d.startsWith('chromium_headless_shell-'))
      .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]))
      .map((d) => join(cache, d, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'))
      .find((p) => existsSync(p))
  : undefined;
if (shell) Config.setBrowserExecutable(shell);

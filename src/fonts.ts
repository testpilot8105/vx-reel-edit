import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import { STYLES } from './gen';

// Every face every style profile names, loaded once. A profile's fonts live in media/library/fonts.
const seen = new Set<string>();
for (const s of Object.values(STYLES)) {
  for (const f of s.fonts) {
    const key = `${f.family}|${f.weight}|${f.style ?? 'normal'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    loadFont({ family: f.family, url: staticFile(f.src), weight: f.weight, style: f.style ?? 'normal' });
  }
}

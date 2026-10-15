import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { useStyle } from './context';

/** Fine film grain over everything: eight grey noise tiles (media/library/grain, made by scripts/index-videos.mjs),
 *  a new one every two frames, at the profile's strength. */
export const Grain: React.FC = () => {
  const s = useStyle();
  const f = useCurrentFrame();
  if (!s.grain) return null;
  const i = Math.floor(f / 2) % 8;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        backgroundImage: `url(${staticFile(`library/grain/${i}.png`)})`,
        backgroundSize: '512px 512px',
        backgroundPosition: `${(f * 97) % 512}px ${(f * 61) % 512}px`,
        mixBlendMode: 'overlay',
        opacity: s.grain * 2.4,
      }}
    />
  );
};

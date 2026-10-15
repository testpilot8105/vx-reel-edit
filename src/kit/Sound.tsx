import { Audio, interpolate, Sequence, staticFile } from 'remotion';
import { clamp } from './context';

/** A sound effect on a visible move. */
export const SfxAt: React.FC<{ at: number; src: string; volume: number; len: number }> = ({ at, src, volume, len }) => (
  <Sequence from={Math.max(0, at)} durationInFrames={len} layout="none" name={`sfx ${src.split('/').pop()}`}>
    <Audio src={staticFile(src)} volume={volume} />
  </Sequence>
);

/** The music bed: `base` while someone talks (about 11 dB under the voice), lifted in the gaps and the outro,
 *  faded in and out at the ends. */
export const MusicBed: React.FC<{ src: string; base: number; total: number; voiceEnd: number; talking: (f: number) => boolean }> = ({
  src,
  base,
  total,
  voiceEnd,
  talking,
}) => (
  <Audio
    src={staticFile(src)}
    loop
    volume={(f) => {
      // Talk share over a third of a second either side, so the bed glides instead of stepping.
      let on = 0;
      for (let d = -5; d <= 5; d++) on += talking(f + d) ? 1 : 0;
      const gap = 1 + 0.6 * (1 - on / 11);
      const lift = interpolate(f, [voiceEnd, voiceEnd + 12], [gap, 3.2], clamp);
      return base * lift * interpolate(f, [0, 8, total - 16, total], [0, 1, 1, 0], clamp);
    }}
  />
);

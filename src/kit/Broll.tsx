import { AbsoluteFill, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, useStyle } from './context';

const isImage = (src: string) => /\.(png|jpe?g|webp|avif)$/i.test(src);

/** B-roll over the talking head. Full covers the frame; split takes the top part and leaves the face below.
 *  Every shot moves: a slow push so a still never sits dead. B-roll is muted; the voice carries on underneath. */
export const Broll: React.FC<{ src: string; layout?: 'full' | 'split'; startAt?: number; len: number }> = ({ src, layout = 'full', startAt = 0, len }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const drift = interpolate(f, [0, len], [1.04, 1.12], clamp);
  const fade = interpolate(f, [0, 3, len - 3, len], [0, 1, 1, 0], clamp);
  const box: React.CSSProperties =
    layout === 'split' ? { top: 0, height: height * 0.46, borderBottom: `4px solid ${s.colors.accent}` } : {};
  const media: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${drift})` };
  return (
    <AbsoluteFill style={{ ...box, overflow: 'hidden', opacity: fade }}>
      {isImage(src) ? (
        <Img src={staticFile(src)} style={media} />
      ) : (
        <OffthreadVideo src={staticFile(src)} startFrom={Math.round(startAt * fps)} muted style={media} />
      )}
    </AbsoluteFill>
  );
};

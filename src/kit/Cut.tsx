import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { pieces, speedOf, type Piece } from '../timeline';
import { clamp, useEdit, useStyle } from './context';
import { frameStyle, gradeFilter, zoomAt } from './Footage';

/** One piece of the cut list, framed and graded. Framing changes are hard and land at phrase starts; pushes ease in on
 *  a key moment and snap back. The picture is muted when the voice plays as one baked track (scripts/voice.mjs); only
 *  without one does each piece play its own audio, with a two-frame fade at both ends. */
const PieceView: React.FC<{ p: Piece; voiced: boolean }> = ({ p, voiced }) => {
  const e = useEdit();
  const s = useStyle();
  const f = useCurrentFrame() + p.start;
  return (
    <AbsoluteFill style={frameStyle(e, zoomAt(e, f))}>
      <OffthreadVideo
        src={staticFile(e.clips[p.clip])}
        startFrom={p.from}
        playbackRate={speedOf(e)}
        muted={voiced}
        volume={voiced ? undefined : (v) => interpolate(v, [0, 2, p.len - 2, p.len], [0, 1, 1, 0], clamp)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: gradeFilter(e, s) }}
      />
    </AbsoluteFill>
  );
};

export const Cut: React.FC<{ voiced: boolean }> = ({ voiced }) => {
  const e = useEdit();
  return (
    <>
      {pieces(e).map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.len} name={`${p.clip} ${p.in.toFixed(2)}-${p.out.toFixed(2)}`}>
          <PieceView p={p} voiced={voiced} />
        </Sequence>
      ))}
    </>
  );
};

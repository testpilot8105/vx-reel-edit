import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { cased, clamp, face, useEdit, useStyle } from './context';

const useIn = (delay = 0) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping: 15, stiffness: 220 } });
};

/** Out over the last `n` frames of a Sequence of length `len`. */
const useOut = (len: number, n = 6) => interpolate(useCurrentFrame(), [len - n, len], [1, 0], clamp);

const leftOf = (edge: number, width: number) => (edge > 0 ? edge * width : width * 0.08);

/** The hook: a headline band at the top for the first seconds, so the scroll stops. */
export const HookTitle: React.FC<{ text: string; len: number }> = ({ text, len }) => {
  const s = useStyle();
  const { width, height } = useVideoConfig();
  const f = useCurrentFrame();
  const k = useIn();
  const out = useOut(len);
  const lines = text.split('\n');
  return (
    <AbsoluteFill style={{ top: height * 0.09, left: leftOf(s.edge, width), right: leftOf(s.edge, width), width: 'auto', height: 'auto', opacity: out }}>
      {lines.map((l, i) => {
        const ki = k * interpolate(f - i * 3, [0, 8], [0, 1], clamp);
        return (
          <div key={i} style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontFamily: face(s.headline.family),
                fontWeight: s.headline.weight,
                fontSize: s.headline.size,
                lineHeight: 1.02,
                color: i === lines.length - 1 ? s.colors.accent : s.colors.ink,
                textShadow: `0 4px 24px ${s.colors.plate}`,
                transform: `translateY(${interpolate(ki, [0, 1], [100, 0])}%)`,
              }}
            >
              {cased(l, s.headline.case)}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** A card that slides in on a key line: optional badge, a title, an optional line under it. */
export const MotionCard: React.FC<{ title: string; body?: string; badge?: string; y?: number; len: number }> = ({ title, body, badge, y, len }) => {
  const s = useStyle();
  const e = useEdit();
  const { width, height } = useVideoConfig();
  const k = useIn();
  const out = useOut(len);
  // Clear of the face: above the head when the face sits low in the frame, under the chin when it sits high.
  // The edit's focus says where the face is (Claude reads it off a poster frame at ingest).
  const faceY = (e.focus?.[1] ?? 30) / 100;
  const top = y ?? (faceY >= 0.35 ? 0.07 : Math.min(0.5, faceY + 0.16));
  return (
    <AbsoluteFill style={{ top: height * top, left: leftOf(s.edge, width), height: 'auto', width: width * 0.76, opacity: out }}>
      <div
        style={{
          background: s.colors.plate,
          border: `1px solid ${s.colors.line}`,
          borderRadius: s.radius * 4,
          padding: '28px 36px 32px',
          transform: `perspective(1400px) rotateY(${interpolate(k, [0, 1], [32, 0])}deg) translateX(${interpolate(k, [0, 1], [-60, 0])}px)`,
          transformOrigin: 'left center',
          opacity: interpolate(k, [0, 0.4], [0, 1], clamp),
        }}
      >
        {badge ? (
          <div
            style={{
              display: 'inline-block',
              fontFamily: face(s.body.family),
              fontWeight: 600,
              fontSize: 30,
              color: s.colors.plate,
              background: s.colors.accent,
              borderRadius: s.radius * 2,
              padding: '4px 14px',
              marginBottom: 18,
            }}
          >
            {badge}
          </div>
        ) : null}
        <div style={{ fontFamily: face(s.headline.family), fontWeight: s.headline.weight, fontSize: s.headline.size * 0.78, lineHeight: 1.04, color: s.colors.ink }}>
          {cased(title, s.headline.case)}
        </div>
        {body ? (
          <div style={{ fontFamily: face(s.body.family), fontWeight: s.body.weight, fontSize: 40, lineHeight: 1.3, color: s.colors.soft, marginTop: 14 }}>{body}</div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/** Big kinetic type over a dimmed picture: each word rises in on its own beat. */
export const Title: React.FC<{ text: string; len: number }> = ({ text, len }) => {
  const s = useStyle();
  const { width } = useVideoConfig();
  const f = useCurrentFrame();
  const out = useOut(len);
  const words = text.split(' ');
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: `0 ${leftOf(s.edge, width)}px`, opacity: out }}>
      <AbsoluteFill style={{ background: s.colors.background, opacity: 0.7 }} />
      <div style={{ position: 'relative', fontFamily: face(s.headline.family), fontWeight: s.headline.weight, fontSize: s.headline.size * 1.25, lineHeight: 1.02, color: s.colors.ink }}>
        {words.map((w, i) => {
          const k = interpolate(f - i * 3, [0, 9], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          return (
            <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', marginRight: '0.25em' }}>
              <span style={{ display: 'inline-block', transform: `translateY(${(1 - k) * 100}%)` }}>{cased(w, s.headline.case)}</span>
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** Name and a line under it, low on the frame. */
export const LowerThird: React.FC<{ title: string; line?: string; len: number }> = ({ title, line, len }) => {
  const s = useStyle();
  const { width, height } = useVideoConfig();
  const k = useIn();
  const out = useOut(len);
  return (
    <AbsoluteFill style={{ top: height * 0.76, left: leftOf(s.edge, width), height: 'auto', opacity: out }}>
      <div style={{ transform: `translateX(${interpolate(k, [0, 1], [-40, 0])}px)`, opacity: interpolate(k, [0, 0.5], [0, 1], clamp) }}>
        <div style={{ fontFamily: face(s.headline.family), fontWeight: s.headline.weight, fontSize: 56, color: s.colors.ink }}>{cased(title, s.headline.case)}</div>
        <div style={{ height: 4, width: interpolate(k, [0, 1], [0, 120]), background: s.colors.accent, margin: '10px 0' }} />
        {line ? <div style={{ fontFamily: face(s.body.family), fontWeight: s.body.weight, fontSize: 36, color: s.colors.soft }}>{line}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

/** The close: the title and an optional line on the style's background. */
export const EndCard: React.FC<{ title: string; line?: string }> = ({ title, line }) => {
  const s = useStyle();
  const { width } = useVideoConfig();
  const a = useIn(4);
  const b = useIn(10);
  const rise = (k: number): React.CSSProperties => ({ transform: `translateY(${interpolate(k, [0, 1], [40, 0])}px)`, opacity: interpolate(k, [0, 0.4], [0, 1], clamp) });
  return (
    <AbsoluteFill style={{ background: s.colors.background, justifyContent: 'center', padding: `0 ${leftOf(s.edge, width)}px` }}>
      <div style={{ fontFamily: face(s.headline.family), fontWeight: s.headline.weight, fontSize: s.headline.size * 1.1, lineHeight: 1.02, color: s.colors.ink, ...rise(a) }}>
        {cased(title, s.headline.case)}
      </div>
      {line ? (
        <div style={{ fontFamily: face(s.body.family), fontWeight: s.body.weight, fontSize: 44, color: s.colors.soft, marginTop: 24, ...rise(b) }}>{line}</div>
      ) : null}
    </AbsoluteFill>
  );
};

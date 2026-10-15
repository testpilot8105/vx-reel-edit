import { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { chunks, type Chunk, type Placed } from '../timeline';
import { alpha, cased, clamp, face, useEdit, useStyle } from './context';
import { ease } from './Light';

const clean = (t: string) => t.replace(/[.,!?;:]+$/, '');

const Frame: React.FC<{ y: number; children: React.ReactNode }> = ({ y, children }) => {
  const s = useStyle();
  const { width, height } = useVideoConfig();
  const left = s.edge > 0 ? s.edge * width : 0;
  return (
    <AbsoluteFill
      style={{
        top: y * height - height * 0.06,
        height: height * 0.12,
        left,
        right: s.edge > 0 ? undefined : 0,
        // AbsoluteFill carries width 100%: with left and right set it would shift instead of narrowing.
        width: 'auto',
        alignItems: s.edge > 0 ? 'flex-start' : 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Words land as they are said, on a plate; a key word takes the accent and an underline as it lands. */
const Reveal: React.FC<{ c: Chunk; cont: boolean }> = ({ c, cont }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  // The plate fades in only after a gap; back to back, it stays up and only the words change.
  const plateIn = cont ? 1 : interpolate(f - c.from, [0, 3], [0, 1], clamp);
  const said = c.words.filter((w) => f >= w.f - 2);
  return (
    <div
      style={{
        fontFamily: face(s.caption.family),
        fontWeight: s.caption.weight,
        fontSize: s.caption.size,
        lineHeight: 1.15,
        color: s.colors.ink,
        whiteSpace: 'nowrap',
        background: s.caption.plate ? s.colors.plate : undefined,
        borderRadius: s.radius,
        padding: s.caption.plate ? '8px 22px 10px' : 0,
        opacity: plateIn,
      }}
    >
      {said.map((w, i) => {
        const on = interpolate(f - w.f + 2, [0, 3], [0, 1], clamp);
        const bar = interpolate(f - w.f, [1, 7], [0, 1], clamp);
        return (
          <span key={i}>
            <span style={{ position: 'relative', display: 'inline-block', opacity: on, color: w.key ? s.colors.accent : s.colors.ink }}>
              {cased(clean(w.text), s.caption.case)}
              {w.key ? <span style={{ position: 'absolute', left: 0, bottom: -4, height: 4, width: `${bar * 100}%`, background: s.colors.accent }} /> : null}
            </span>
            {i < said.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </div>
  );
};

/** One to three words at a time, hard swap, a small pop on arrival. */
const Punch: React.FC<{ c: Chunk; cont: boolean }> = ({ c }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - c.from, fps, config: { damping: 15, stiffness: 320 } });
  const key = c.words.some((w) => w.key);
  return (
    <div
      style={{
        fontFamily: face(s.caption.family),
        fontWeight: s.caption.weight,
        fontSize: s.caption.size * 1.2,
        lineHeight: 1.05,
        color: key ? s.colors.accent : s.colors.ink,
        background: s.caption.plate ? s.colors.plate : undefined,
        borderRadius: s.radius,
        padding: s.caption.plate ? '10px 24px 12px' : 0,
        whiteSpace: 'nowrap',
        transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])})`,
        textShadow: s.caption.plate ? undefined : `0 2px 10px ${s.colors.plate}`,
      }}
    >
      {cased(c.words.map((w) => clean(w.text)).join(' '), s.caption.case)}
    </div>
  );
};

/** The whole phrase at once, quiet, for minimal edits. */
const Line: React.FC<{ c: Chunk; cont: boolean }> = ({ c, cont }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: face(s.caption.family),
        fontWeight: s.caption.weight,
        fontSize: s.caption.size * 0.8,
        lineHeight: 1.25,
        color: s.colors.ink,
        background: s.caption.plate ? s.colors.plate : undefined,
        borderRadius: s.radius,
        padding: s.caption.plate ? '8px 18px' : 0,
        maxWidth: '84%',
        textAlign: s.edge > 0 ? 'left' : 'center',
        opacity: cont ? 1 : interpolate(f - c.from, [0, 4], [0, 1], clamp),
      }}
    >
      {cased(c.words.map((w) => w.text).join(' '), s.caption.case)}
    </div>
  );
};

/** Centred, in the caption colour, sentence case as spoken; each word lifts out of a soft blur as it is said and the
 *  key word takes the accent. Wraps inside the frame, first line centred on the caption height. */
const Lift: React.FC<{ c: Chunk; big: boolean }> = ({ c, big }) => {
  const s = useStyle();
  const e = useEdit();
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const size = s.caption.size * (big ? 1.55 : 1) * (width / 1080);
  const y = (e.captions?.y ?? s.caption.y) * height;
  const side = 90 * (width / 1080);
  return (
    <AbsoluteFill
      style={{
        top: y - size * 0.6,
        left: side,
        right: side,
        width: 'auto',
        height: size * 5,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'flex-start',
        columnGap: size * 0.24,
      }}
    >
      {c.words
        .filter((w) => f >= w.f - 2)
        .map((w, i) => {
          const p = ease(f, w.f - 2, 12);
          return (
            <span
              key={i}
              style={{
                fontFamily: face(s.caption.family),
                fontWeight: s.caption.weight,
                fontSize: size,
                lineHeight: 1.08,
                letterSpacing: '-0.035em',
                whiteSpace: 'nowrap',
                color: w.key ? s.colors.accent : (s.caption.color ?? s.colors.ink),
                opacity: p,
                transform: `translateY(${(1 - p) * 26}px)`,
                filter: `blur(${(1 - p) * 8}px)`,
                textShadow: `0 4px 24px ${alpha(s.colors.plate, 0.45)}, 0 1px 3px ${alpha(s.colors.plate, 0.35)}`,
              }}
            >
              {cased(w.text.replace(/,+$/, ''), s.caption.case)}
            </span>
          );
        })}
    </AbsoluteFill>
  );
};

type Span = [number, number];
const within = (f: number, spans: Span[]) => spans.some(([a, b]) => f >= a && f < b);

/** Captions for the whole voice. They hide while a full-frame graphic (the hook, a scene, the end card) covers their
 *  line, and a line that started under one never flashes back after it leaves. `big` spans get the bigger size. */
export const Captions: React.FC<{ words: Placed[]; hide?: Span[]; big?: Span[] }> = ({ words, hide = [], big = [] }) => {
  const s = useStyle();
  const e = useEdit();
  const f = useCurrentFrame();
  const style = e.captions?.style ?? s.caption.style;
  const maxWords = style === 'line' ? 12 : style === 'punch' ? Math.min(3, s.caption.maxWords) : s.caption.maxWords;
  const maxChars = style === 'line' ? 48 : s.caption.maxChars;
  const all = useMemo(() => chunks(e, words, maxWords, maxChars), [e, words, maxWords, maxChars]);
  const i = all.findIndex((x) => f >= x.from && f < x.to);
  const c = all[i];
  const cont = i > 0 && all[i - 1].to >= c.from - 1;
  if (style === 'none' || !c) return null;
  if (within(f, hide) || within(c.from, hide)) return null;
  if (style === 'lift') return <Lift c={c} big={within(f, big)} />;
  const View = style === 'punch' ? Punch : style === 'line' ? Line : Reveal;
  return (
    <Frame y={e.captions?.y ?? s.caption.y}>
      <View c={c} cont={cont} />
    </Frame>
  );
};

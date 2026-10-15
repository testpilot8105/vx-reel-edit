import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Placed } from '../timeline';
import { norm } from '../timeline';
import type { SceneBody, Style } from '../types';
import { alpha, clamp, face, useEdit, useStyle } from './context';
import { Footage, FootageStill, zoomAt } from './Footage';

// The light kinetic look: an off-white canvas with a faint grid, kinetic type in mixed weights (light soft words beside
// bold ink), floating cards with deep soft shadows, one smooth no-bounce ease. Every colour and face comes from the
// style profile; the sizes and moves are the ones the owner signed off on the New Reel (15.10.2026), at 1080 wide.

/** The ease for everything: quick start, long soft landing. */
export const SMOOTH = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 to 1 over `len` frames from `from`, on the smooth ease. */
export const ease = (f: number, from: number, len = 18) => interpolate(f - from, [0, len], [0, 1], { ...clamp, easing: SMOOTH });

const shadowOf = (s: Style) => `0 50px 100px ${alpha(s.colors.ink, 0.16)}, 0 14px 30px ${alpha(s.colors.ink, 0.08)}`;
const weights = (s: Style) => s.kinetic ?? { light: s.body.weight, bold: s.headline.weight, lead: s.headline.weight };
const cardOf = (s: Style) => s.colors.card ?? s.colors.background;

/** Width of a line of text in px, measured with the real face (fonts are loaded before a frame renders). */
let ctx: CanvasRenderingContext2D | null = null;
export const measure = (text: string, family: string, weight: number, size: number, tracking = -0.04) => {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * size * 0.5;
  ctx.font = `${weight} ${size}px ${face(family)}`;
  return ctx.measureText(text).width + tracking * size * text.length;
};

/** The largest size up to `max` at which the line fits in `width`. */
export const fit = (text: string, family: string, weight: number, max: number, width: number) =>
  Math.min(max, Math.floor((max * width) / Math.max(1, measure(text, family, weight, max))));

/** The canvas: the profile's background with a faint grid in its line colour, fading out towards the edges. */
export const Canvas: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const s = useStyle();
  const { width } = useVideoConfig();
  const cell = Math.round((72 * width) / 1080);
  return (
    <AbsoluteFill style={{ background: s.colors.background }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${s.colors.line} 1.5px, transparent 1.5px), linear-gradient(90deg, ${s.colors.line} 1.5px, transparent 1.5px)`,
          backgroundSize: `${cell}px ${cell}px`,
          backgroundPosition: '-1px -1px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 100%)',
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

export type Tone = 'ink' | 'soft' | 'accent';
export type KWord = { t: string; at: number; tone: Tone; weight: number; size?: number };

/** One centred line of kinetic type: each word lifts 40 px out of a soft blur into place on its own frame. */
export const KLine: React.FC<{ words: KWord[]; size: number; gap?: number; shadow?: string; family?: string }> = ({ words, size, gap = 0.26, shadow, family }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  const color = (t: Tone) => (t === 'soft' ? s.colors.soft : t === 'accent' ? s.colors.accent : s.colors.ink);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'baseline', columnGap: `${gap}em`, fontSize: size, lineHeight: 1.04 }}>
      {words.map((w, i) => {
        const p = ease(f, w.at, 16);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              fontFamily: face(family ?? s.headline.family),
              fontWeight: w.weight,
              fontSize: w.size ?? size,
              letterSpacing: '-0.04em',
              color: color(w.tone),
              opacity: p,
              transform: `translateY(${(1 - p) * 40}px)`,
              filter: `blur(${(1 - p) * 10}px)`,
              textShadow: shadow,
            }}
          >
            {w.t}
          </span>
        );
      })}
    </div>
  );
};

/** A kinetic title from edit.json text: "\n" stacks lines; "*word" is bold ink, "**word" bold accent, the rest light
 *  and soft. With no marks, the last line is bold and the lines above it light ("Custom" over "animations"); a single
 *  line is all bold. Words enter one every `step` frames from `at`. */
export const titleLines = (s: Style, text: string, at = 2, step = 3): KWord[][] => {
  const w = weights(s);
  const lines = text.split('\n').map((l) => l.split(' ').filter(Boolean));
  const marked = /(^|\s)\*/.test(text);
  let n = 0;
  return lines.map((line, li) =>
    line.map((raw) => {
      const accent = raw.startsWith('**');
      const bold = accent || raw.startsWith('*') || (!marked && (lines.length === 1 || li === lines.length - 1));
      const t = raw.replace(/^\*+/, '');
      return { t, at: at + step * n++, tone: accent ? 'accent' : bold ? 'ink' : 'soft', weight: bold ? w.bold : w.light } as KWord;
    }),
  );
};

/** A title on the canvas, centred, each line fitted to the frame. */
export const Title2: React.FC<{ text: string; size: number; top: number; at?: number }> = ({ text, size, top, at = 2 }) => {
  const s = useStyle();
  const { width } = useVideoConfig();
  const u = width / 1080;
  const lines = titleLines(s, text, at);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: top * u }}>
      {lines.map((l, i) => {
        const bold = Math.max(...l.map((w) => w.weight));
        return <KLine key={i} words={l} size={fit(l.map((w) => w.t).join(' '), s.headline.family, bold, size * u, width * 0.88)} />;
      })}
    </div>
  );
};

/** A scene that hard-cuts in over the talking head and hard-cuts out: no fade, no slide, so no paused frame is ever
 *  half one thing and half another. A slight 8-frame settle in scale keeps the cut alive; its content animates in
 *  after the cut. */
export const Sheet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const settle = interpolate(f, [0, 8], [1.025, 1], { ...clamp, easing: SMOOTH });
  return <AbsoluteFill style={{ transform: `scale(${settle})` }}>{children}</AbsoluteFill>;
};

/** A floating card: rounded, deep soft shadow, tilted in 3D, settling flat-ish as it lands, with a slow drift. */
export const Float: React.FC<{
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  tilt?: [number, number];
  bg?: string;
  children?: React.ReactNode;
}> = ({ at, x, y, w, h, radius, tilt = [8, -12], bg, children }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  const p = ease(f, at, 24);
  const drift = Math.sin((f - at) / 22) * 6;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, perspective: 2200 }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: radius ?? s.radius,
          background: bg ?? cardOf(s),
          boxShadow: shadowOf(s),
          overflow: 'hidden',
          opacity: interpolate(p, [0, 0.3], [0, 1], clamp),
          transform: `translateY(${(1 - p) * 160 + drift}px) rotateX(${tilt[0] * (0.4 + 0.6 * (1 - p))}deg) rotateY(${tilt[1] * (0.5 + 0.5 * (1 - p))}deg) scale(${0.9 + 0.1 * p})`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Four-point sparkle in the accent, the list bullet. */
export const Spark: React.FC<{ size: number }> = ({ size }) => {
  const s = useStyle();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 0c.8 6.4 4.6 10.6 12 12-7.4 1.4-11.2 5.6-12 12-.8-6.4-4.6-10.6-12-12C7.4 10.6 11.2 6.4 12 0z" fill={s.colors.accent} />
    </svg>
  );
};

/** A full-frame scene: the canvas, a kinetic title and one body (list, footage, image or a stack of cards). */
export const Scene: React.FC<{ title: string } & SceneBody> = ({ title, list, footage, image, imageFrame = 'card', cards }) => {
  const s = useStyle();
  const e = useEdit();
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const u = width / 1080;
  const w = weights(s);
  const two = title.includes('\n');

  if (image && imageFrame === 'none') {
    const icon = ease(f, 2, 22);
    return (
      <Canvas>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', paddingBottom: 160 * u }}>
          <Img
            src={staticFile(image)}
            style={{ maxWidth: 300 * u, maxHeight: 300 * u, opacity: icon, transform: `translateY(${(1 - icon) * 60}px) scale(${0.8 + 0.2 * icon})`, filter: `blur(${(1 - icon) * 10}px)` }}
          />
          <div style={{ height: 70 * u }} />
          <div style={{ position: 'relative', width: '100%' }}>
            {titleLines(s, title, 8, 4).map((l, i, all) => (
              <KLine key={i} words={l} size={fit(l.map((x) => x.t).join(' '), s.headline.family, w.bold, (i === all.length - 1 ? 190 : 88) * u, width * 0.88)} />
            ))}
          </div>
        </AbsoluteFill>
      </Canvas>
    );
  }

  return (
    <Canvas>
      {list ? (
        <>
          <Title2 text={title} size={two ? 176 : 124} top={150} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 620 * u, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 38 * u }}>
              {list.map((t, i) => {
                const p = ease(f, 8 + i * 5, 16);
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 34 * u, opacity: p, transform: `translateX(${(1 - p) * -60}px)`, filter: `blur(${(1 - p) * 8}px)` }}>
                    <div style={{ transform: `rotate(${(1 - p) * -90}deg) scale(${0.4 + 0.6 * p})` }}>
                      <Spark size={64 * u} />
                    </div>
                    <span style={{ fontFamily: face(s.headline.family), fontWeight: w.bold, fontSize: 104 * u, letterSpacing: '-0.04em', whiteSpace: 'nowrap', color: s.colors.ink }}>{t}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
      {footage && footage.frame === 'phone' ? (
        <>
          <Title2 text={title} size={two ? 150 : 116} top={180} />
          <Float at={4} x={((1080 - 540) / 2) * u} y={430 * u} w={540 * u} h={1100 * u} radius={78 * u} tilt={[6, -14]} bg={s.colors.plate}>
            <div style={{ position: 'absolute', inset: 16 * u, borderRadius: 64 * u, overflow: 'hidden' }}>
              <Footage clip={footage.clip} from={Math.round(footage.t * e.fps)} />
            </div>
          </Float>
        </>
      ) : footage ? (
        <>
          <Title2 text={title} size={two ? 176 : 124} top={150} />
          <Float at={2} x={((1080 - 760) / 2) * u} y={580 * u} w={760 * u} h={940 * u} radius={44 * u} tilt={[6, -8]} bg={s.colors.plate}>
            <Footage clip={footage.clip} from={Math.round(footage.t * e.fps)} />
          </Float>
        </>
      ) : null}
      {image && imageFrame === 'card' ? (
        <>
          <Title2 text={title} size={two ? 150 : 124} top={250} />
          <Float at={0} x={40 * u} y={600 * u} w={1000 * u} h={700 * u} radius={40 * u} tilt={[10, -8]}>
            <Img src={staticFile(image)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </Float>
        </>
      ) : null}
      {cards ? (
        <>
          <Title2 text={title} size={two ? 150 : 116} top={200} />
          {cards.map((c, i, all) => {
            // With previews the cards are tall and overlap like a fanned stack; without, they are name bars.
            const tall = all.some((x) => x.image);
            return (
            <Float key={c.title} at={8 + i * 7} x={150 * u} y={(tall ? 470 + i * 220 : 520 + i * 200) * u} w={780 * u} h={(tall ? 440 : 150) * u} radius={34 * u} tilt={[8, -12 + i * 6]}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 * u, height: (tall ? 84 : 150) * u, padding: `0 ${(tall ? 32 : 44) * u}px`, fontFamily: face(s.headline.family), fontWeight: w.bold, fontSize: (tall ? 42 : 60) * u, letterSpacing: '-0.03em', color: s.colors.ink }}>
                <Spark size={(tall ? 30 : 44) * u} />
                {c.title}
              </div>
              {tall ? (
                <div style={{ height: 336 * u, margin: `0 ${14 * u}px`, borderRadius: 24 * u, background: s.colors.plate, overflow: 'hidden' }}>
                  {c.image ? <Img src={staticFile(c.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </div>
              ) : null}
            </Float>
            );
          })}
        </>
      ) : null}
      {!list && !footage && !image && !cards ? <Title2 text={title} size={two ? 176 : 150} top={two ? 700 : 820} /> : null}
    </Canvas>
  );
};

/** The close: a kinetic line ("Follow for more") over a button in the accent that gets one tap and turns to ink. */
export const FollowCard: React.FC<{ title: string; button: string; done: string }> = ({ title, button, done }) => {
  const s = useStyle();
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const u = width / 1080;
  const w = weights(s);
  const btn = ease(f, 10, 18);
  const tap = f >= 38 && f < 48 ? 1 - Math.sin(((f - 38) / 10) * Math.PI) * 0.08 : 1;
  const tapped = f >= 43;
  const light = cardOf(s);
  // Unmarked, the first word is bold and the rest light: "Follow" over "for more".
  const text = /(^|\s)\*/.test(title) ? title : title.replace(/^(\S+)/, '*$1');
  return (
    <Canvas>
      <Title2 text={text} size={130} top={700} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 920 * u, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18 * u,
            padding: `${30 * u}px ${64 * u}px`,
            borderRadius: 999,
            background: tapped ? s.colors.ink : s.colors.accent,
            boxShadow: shadowOf(s),
            opacity: btn,
            transform: `translateY(${(1 - btn) * 50}px) scale(${(0.9 + 0.1 * btn) * tap})`,
            fontFamily: face(s.headline.family),
            fontWeight: w.bold,
            fontSize: 64 * u,
            letterSpacing: '-0.03em',
            whiteSpace: 'nowrap',
            color: light,
          }}
        >
          <svg width={52 * u} height={52 * u} viewBox="0 0 24 24" fill="none" stroke={light} strokeWidth={3} strokeLinecap="round">
            {tapped ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
          {tapped ? done : button}
        </div>
      </div>
    </Canvas>
  );
};

export type HookPart = { text: string; from: number };
export type HookFrames = { plate: string; matte: string; count: number };

/** The hook: kinetic type set on the wall, the lead line light beside a big last line in the accent, with the person
 *  cut out in front so the hair crosses the letters. The plate under the type is the very frames the cutout was made
 *  from (scripts/matte.mjs), so the two can never drift apart. Without cutout frames the type sits over the live cut.
 *  Words of the last line land as they are said; the lead words enter one every three frames. */
export const HookStage: React.FC<{ parts: HookPart[]; words: Placed[]; frames?: HookFrames }> = ({ parts, words, frames }) => {
  const s = useStyle();
  const e = useEdit();
  const f = useCurrentFrame();
  const { width } = useVideoConfig();
  const u = width / 1080;
  const w = weights(s);
  const i = parts.reduce((k, p, j) => (f >= p.from ? j : k), 0);
  const part = parts[i];
  const end = parts[i + 1]?.from ?? Infinity;
  const shadow = `0 10px 40px ${alpha(s.colors.plate, 0.28)}, 0 2px 6px ${alpha(s.colors.plate, 0.22)}`;
  const light = cardOf(s);
  const lines = part.text.split('\n');
  let cursor = 0;
  const said = (t: string, fallback: number) => {
    const k = words.findIndex((x, j) => j >= cursor && x.f >= part.from - 2 && x.f < end && norm(x.text) === norm(t));
    if (k < 0) return fallback;
    cursor = k + 1;
    return Math.max(part.from + 4, words[k].f - 2);
  };
  let n = 0;
  const idx = frames ? Math.min(frames.count - 1, f) : 0;
  const pad = String(idx).padStart(3, '0');
  return (
    <AbsoluteFill>
      {frames ? <FootageStill src={`${frames.plate}/${pad}.jpg`} extra={zoomAt(e, f)} /> : null}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${alpha(light, 0.55)} 0%, ${alpha(light, 0.32)} 14%, ${alpha(light, 0.12)} 24%, transparent 34%)`,
        }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 170 * u }}>
        {lines.map((l, li) => {
          const last = li === lines.length - 1;
          const weight = last ? s.headline.weight : w.lead;
          const max = last ? s.headline.size * u : s.headline.size * 0.77 * u;
          const size = fit(l, s.headline.family, weight, max, width * (last ? 0.9 : 0.72));
          const kw: KWord[] = l
            .split(' ')
            .filter(Boolean)
            .map((t) => ({ t, at: last ? said(t, part.from + 3 * n++) : part.from + 3 * n++, tone: last ? 'accent' : 'ink', weight }));
          return <KLine key={`${i}-${li}`} words={kw} size={size} shadow={shadow} />;
        })}
      </div>
      {frames ? <FootageStill src={`${frames.matte}/${pad}.webp`} extra={zoomAt(e, f)} /> : null}
    </AbsoluteFill>
  );
};

import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, staticFile } from 'remotion';
import { at, pieces, speedOf } from '../timeline';
import type { Edit, Style } from '../types';
import { alpha, clamp, useEdit, useStyle } from './context';

/** The edit's framing, with the least zoom that keeps every edge covered after the shift (scaled about the face). */
export const framingOf = (e: Edit) => {
  const shift = e.framing?.shift ?? 0;
  const [fx] = e.focus ?? [50, 30];
  const least = Math.max(1, 1 + shift / Math.max(1, fx), 1 - shift / Math.max(1, 100 - fx));
  return { shift, zoom: Math.max(e.framing?.zoom ?? 1, least) };
};

/** Transform for the owner's footage in a box of any size: the framing (shift in percent of the box width, so the
 *  head stays centred in a phone mockup too) times any extra zoom, about the face. */
export const frameStyle = (e: Edit, extra = 1): React.CSSProperties => {
  const { shift, zoom } = framingOf(e);
  const [fx, fy] = e.focus ?? [50, 30];
  return { transform: `translateX(${shift}%) scale(${zoom * extra})`, transformOrigin: `${fx}% ${fy}%` };
};

/** The grade's filter, when this edit uses the profile's grade. */
export const gradeFilter = (e: Edit, s: Style) => (e.grade !== false && s.grade ? s.grade.filter : undefined);

type Push = { from: number; to: number; amount: number };

const pushesOf = (e: Edit): Push[] =>
  (e.overlays ?? []).flatMap((o) => (o.kind === 'push' ? [{ from: at(e, o.from), to: at(e, o.to), amount: o.amount ?? 0.12 }] : []));

/** The punch-in at an output frame: the piece's hard framing change (at phrase starts) plus any push easing in on a
 *  key moment. The hook's plate and cutout use it too, so they match the cut exactly. */
export const zoomAt = (e: Edit, f: number) => {
  const p = pieces(e).find((x) => f >= x.start && f < x.start + x.len);
  let zoom = 1;
  if (p) {
    const zooms = (p.zoom ?? [[p.in, 1]]).map(([t, z]) => [p.start + Math.round((Math.round(t * e.fps) - p.from) / speedOf(e)), z] as const);
    zoom = zooms[0][1];
    for (const [z0, z] of zooms) if (f >= z0) zoom = z;
  }
  const push = pushesOf(e).reduce(
    (sum, u) => sum + u.amount * interpolate(f, [u.from, u.from + 16, u.to, u.to + 1], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) }),
    0,
  );
  return zoom + push;
};

/** The owner's footage, framed and graded, muted (the voice is its own track). `from` is a source frame. */
export const Footage: React.FC<{ clip: string; from: number; extra?: number }> = ({ clip, from, extra = 1 }) => {
  const e = useEdit();
  const s = useStyle();
  return (
    <AbsoluteFill style={frameStyle(e, extra)}>
      <OffthreadVideo
        src={staticFile(e.clips[clip])}
        startFrom={from}
        playbackRate={speedOf(e)}
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: gradeFilter(e, s) }}
      />
    </AbsoluteFill>
  );
};

/** One still of the footage (a plate or cutout frame), framed and graded the same way. */
export const FootageStill: React.FC<{ src: string; extra?: number }> = ({ src, extra = 1 }) => {
  const e = useEdit();
  const s = useStyle();
  return (
    <AbsoluteFill style={frameStyle(e, extra)}>
      <Img src={staticFile(src)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: gradeFilter(e, s) }} />
    </AbsoluteFill>
  );
};

/** The grade laid over the talking-head footage: a cool tint in soft light, a soft lift on the face, a vignette. */
export const GradeOverlay: React.FC = () => {
  const e = useEdit();
  const s = useStyle();
  const g = s.grade;
  if (!g || e.grade === false) return null;
  const [fx, fy] = e.focus ?? [50, 30];
  const { shift } = framingOf(e);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${g.tint[0]} 0%, ${g.tint[1]} 40%, ${g.tint[2]} 100%)`, mixBlendMode: 'soft-light' }} />
      {g.lift > 0 ? (
        <AbsoluteFill
          style={{ background: `radial-gradient(ellipse 34% 20% at ${fx + shift}% ${fy}%, ${alpha(s.colors.card ?? '#FFFFFF', g.lift)}, transparent 100%)`, mixBlendMode: 'screen' }}
        />
      ) : null}
      {g.vignette > 0 ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 75% at 50% 42%, transparent 60%, ${alpha(s.colors.plate, g.vignette)} 100%)` }} />
      ) : null}
    </AbsoluteFill>
  );
};

/** A narrow soft dark band only behind the caption line, clear above and below so the shirt stays bright. */
export const CaptionBand: React.FC = () => {
  const s = useStyle();
  const e = useEdit();
  if (!s.caption.band) return null;
  const y = (e.captions?.y ?? s.caption.y) * 100;
  const dark = alpha(s.colors.plate, 0.3);
  return (
    <AbsoluteFill
      style={{ pointerEvents: 'none', background: `linear-gradient(180deg, transparent ${y - 10}%, ${dark} ${y - 2}%, ${dark} ${y + 4}%, transparent ${y + 14}%)` }}
    />
  );
};

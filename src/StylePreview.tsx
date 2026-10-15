import { AbsoluteFill } from 'remotion';
import { cased, face, StyleContext } from './kit/context';
import type { Style } from './types';

/** A still of one style profile, for the intake: headline, a caption with a key word, a card, the colours and the
 *  faces by name. Rendered with `npx remotion still style-<name>`. */
export const StylePreview: React.FC<{ style: Style }> = ({ style: s }) => {
  const left = (s.edge > 0 ? s.edge : 0.08) * 1080;
  const swatches = Object.entries(s.colors);
  return (
    <StyleContext.Provider value={s}>
      <AbsoluteFill style={{ background: s.colors.background, padding: `160px ${left}px`, gap: 64 }}>
        <div style={{ fontFamily: face(s.body.family), fontWeight: s.body.weight, fontSize: 34, color: s.colors.soft }}>Style profile: {s.name}</div>
        <div style={{ fontFamily: face(s.headline.family), fontWeight: s.headline.weight, fontSize: s.headline.size, lineHeight: 1.02, color: s.colors.ink }}>
          {cased('This is your hook.', s.headline.case)}
        </div>
        <div>
          <span
            style={{
              fontFamily: face(s.caption.family),
              fontWeight: s.caption.weight,
              fontSize: s.caption.size,
              color: s.colors.ink,
              background: s.caption.plate ? s.colors.plate : undefined,
              borderRadius: s.radius,
              padding: s.caption.plate ? '8px 22px 10px' : 0,
            }}
          >
            {cased('And this is a ', s.caption.case)}
            <span style={{ color: s.colors.accent, borderBottom: `4px solid ${s.colors.accent}` }}>{cased('caption', s.caption.case)}</span>
          </span>
        </div>
        <div style={{ background: s.colors.plate, border: `1px solid ${s.colors.line}`, borderRadius: s.radius * 4, padding: '28px 36px 32px', width: '80%' }}>
          <div style={{ fontFamily: face(s.headline.family), fontWeight: s.headline.weight, fontSize: s.headline.size * 0.6, color: s.colors.ink }}>
            {cased('A card on a key line', s.headline.case)}
          </div>
          <div style={{ fontFamily: face(s.body.family), fontWeight: s.body.weight, fontSize: 38, color: s.colors.soft, marginTop: 12 }}>
            Body text sits under it in the body face.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {swatches.map(([k, v]) => (
            <div key={k} style={{ width: 140 }}>
              <div style={{ height: 90, background: v, border: `1px solid ${s.colors.line}`, borderRadius: s.radius }} />
              <div style={{ fontFamily: face(s.body.family), fontSize: 26, color: s.colors.soft, marginTop: 8 }}>{k}</div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: face(s.body.family), fontWeight: s.body.weight, fontSize: 30, color: s.colors.soft, lineHeight: 1.5 }}>
          Headline: {s.headline.family} {s.headline.weight}
          <br />
          Captions: {s.caption.family} {s.caption.weight}, {s.caption.style}
          <br />
          Body: {s.body.family} {s.body.weight}
          <br />
          Feel: {s.feel}
        </div>
      </AbsoluteFill>
    </StyleContext.Provider>
  );
};

import { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { CUSTOM } from './custom';
import { Broll } from './kit/Broll';
import { Captions } from './kit/Captions';
import { EditContext, StyleContext } from './kit/context';
import { Cut } from './kit/Cut';
import { CaptionBand, GradeOverlay } from './kit/Footage';
import { Grain } from './kit/Grain';
import { EndCard, HookTitle, LowerThird, MotionCard, Title } from './kit/Graphics';
import { FollowCard, HookStage, Scene, Sheet, type HookFrames } from './kit/Light';
import { MusicBed, SfxAt } from './kit/Sound';
import { at, duration, keptWords, talking, voiceEnd } from './timeline';
import type { Edit, Style, Word } from './types';

/** `voice`: the cut voice baked into one file (scripts/voice.mjs), played as a single track so no cut restarts it.
 *  `hookFrames`: the hook's plate and cutout frames (scripts/matte.mjs). Both are found by scripts/index-videos.mjs. */
export type VideoProps = { edit: Edit; style: Style; words: Word[]; voice?: string; hookFrames?: HookFrames };

// A scene that hands straight over to the next one stays mounted this long under it, so nothing blinks through.
const HANDOFF = 20;

/** One VX Reel Edit video: the cut talking head, then b-roll, graphics and captions over it, then the end card; voice,
 *  sound effects and music underneath. Everything is read from the edit and its style profile. */
export const Video: React.FC<VideoProps> = ({ edit: e, style: s, words, voice, hookFrames }) => {
  const placed = useMemo(() => keptWords(e, words), [e, words]);
  const total = duration(e);
  const end = voiceEnd(e);
  const isTalking = useMemo(() => talking(e, placed), [e, placed]);
  const span = (from: number, to: number) => ({ from, durationInFrames: Math.max(1, to - from) });
  const overlays = (e.overlays ?? []).filter((o) => o.kind !== 'push' && o.kind !== 'big-captions');
  const hookEnd = e.hook ? at(e, e.hook.to) : 0;
  const light = Boolean(s.kinetic);
  const scenes = overlays.flatMap((o) => (o.kind === 'scene' ? [[at(e, o.from), at(e, o.to)] as [number, number]] : []));
  const hide: [number, number][] = [...(e.hook && light ? [[0, hookEnd] as [number, number]] : []), ...scenes, [end, total]];
  const big = (e.overlays ?? []).flatMap((o) => (o.kind === 'big-captions' ? [[at(e, o.from), at(e, o.to)] as [number, number]] : []));
  const hookParts = e.hook ? (e.hook.parts?.length ? e.hook.parts.map((p) => ({ text: p.text, from: at(e, p.at) })) : [{ text: e.hook.text, from: 0 }]) : [];

  return (
    <StyleContext.Provider value={s}>
      <EditContext.Provider value={e}>
        <AbsoluteFill style={{ background: s.colors.background }}>
          <Cut voiced={Boolean(voice)} />
          {e.hook && light ? (
            <Sequence {...span(0, hookEnd)} name="hook">
              <HookStage parts={hookParts} words={placed} frames={e.hook.cutout ? hookFrames : undefined} />
            </Sequence>
          ) : null}
          <Sequence {...span(0, end)} name="grade and caption band" layout="none">
            <GradeOverlay />
            <CaptionBand />
          </Sequence>
          {overlays
            .filter((o) => o.kind === 'broll')
            .map((o, i) => {
              const from = at(e, o.from);
              const to = at(e, o.to);
              return o.kind === 'broll' ? (
                <Sequence key={`b${i}`} {...span(from, to)} name={`b-roll ${o.src.split('/').pop()}`}>
                  <Broll src={o.src} layout={o.layout} startAt={o.startAt} len={to - from} />
                </Sequence>
              ) : null;
            })}
          {e.hook && !light ? (
            <Sequence {...span(0, hookEnd)} name="hook">
              <HookTitle text={e.hook.text} len={hookEnd} />
            </Sequence>
          ) : null}
          {overlays.map((o, i) => {
            if (o.kind === 'broll') return null;
            const from = at(e, o.from);
            const to = at(e, o.to);
            const len = to - from;
            if (o.kind === 'scene') {
              const handoff = scenes.some(([a]) => Math.abs(a - to) <= 1) ? HANDOFF : 0;
              const { kind, from: _f, to: _t, ...props } = o;
              return (
                <Sequence key={`o${i}`} {...span(from, to + handoff)} name={`scene ${o.title.replace(/\n/g, ' ')}`}>
                  <Sheet>
                    <Scene {...props} />
                  </Sheet>
                </Sequence>
              );
            }
            const body =
              o.kind === 'card' ? (
                <MotionCard title={o.title} body={o.body} badge={o.badge} y={o.y} len={len} />
              ) : o.kind === 'title' ? (
                <Title text={o.text} len={len} />
              ) : o.kind === 'lower-third' ? (
                <LowerThird title={o.title} line={o.line} len={len} />
              ) : o.kind === 'custom' ? (
                (() => {
                  const C = CUSTOM[o.component];
                  if (!C) throw new Error(`Custom graphic "${o.component}" is not in src/custom/index.ts.`);
                  return <C {...(o.props ?? {})} len={len} />;
                })()
              ) : null;
            return (
              <Sequence key={`o${i}`} {...span(from, to)} name={`${o.kind} ${'title' in o ? o.title : 'text' in o ? o.text : ''}`}>
                {body}
              </Sequence>
            );
          })}
          <Sequence {...span(0, end)} name="captions" layout="none">
            <Captions words={placed} hide={light ? hide : []} big={big} />
          </Sequence>
          {e.end ? (
            <Sequence {...span(end, total)} name="end card">
              {e.end.follow ? (
                <Sheet>
                  <FollowCard title={e.end.title} button={e.end.follow.button} done={e.end.follow.done} />
                </Sheet>
              ) : (
                <EndCard title={e.end.title} line={e.end.line} />
              )}
            </Sequence>
          ) : null}
          <Grain />
          {voice ? <Audio src={staticFile(voice)} name="voice" /> : null}
          {(e.sfx ?? []).map((x, i) => (
            <SfxAt key={`s${i}`} at={at(e, x.at)} src={x.src} volume={(x.volume ?? 0.6) * s.sound.sfx} len={Math.round((x.seconds ?? 1.5) * e.fps)} />
          ))}
          {e.music ? <MusicBed src={e.music.src} base={e.music.volume ?? s.sound.music} total={total} voiceEnd={end} talking={isTalking} /> : null}
        </AbsoluteFill>
      </EditContext.Provider>
    </StyleContext.Provider>
  );
};

import { Composition, Still } from 'remotion';
import { EDITS, STYLES } from './gen';
import { StylePreview } from './StylePreview';
import { duration, size } from './timeline';
import { Video } from './Video';

/** One composition per video under media/videos, and one still per style profile to show the look. src/gen.ts is
 *  written by scripts/index-videos.mjs; never edit it by hand. */
export const Root: React.FC = () => (
  <>
    {EDITS.map(({ edit, words, voice, hookFrames }) => (
      <Composition
        key={edit.id}
        id={edit.id}
        component={Video}
        defaultProps={{ edit, style: STYLES[edit.style], words, voice, hookFrames }}
        durationInFrames={Math.max(1, duration(edit))}
        fps={edit.fps}
        {...size(edit)}
      />
    ))}
    {Object.values(STYLES).map((s) => (
      <Still key={s.name} id={`style-${s.name}`} component={StylePreview} defaultProps={{ style: s }} width={1080} height={1920} />
    ))}
  </>
);

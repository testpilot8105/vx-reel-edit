# edit.json

One file per video, in `media/videos/<folder>/edit.json`. The types are in `src/types.ts`; this is the short version.
Times are always moments in a source clip: `{ "clip": "a", "t": 12.4 }`, in that clip's own seconds, read from
`words.json` (a word's `start`). Paths are under `media/`.

```json
{
  "id": "14-10-2026-new-reel",
  "title": "new reel",
  "style": "papaya-light",
  "format": "9:16",
  "fps": 30,
  "clips": { "a": "videos/14.10.2026-new-reel/raw/a.mov" },
  "segments": [{ "clip": "a", "in": 0.52, "out": 8.1, "zoom": [[0.52, 1], [5.06, 1.08]] }],
  "cuts": [{ "clip": "a", "from": 27.66, "to": 35.3, "reason": "retake" }],
  "focus": [50, 30],
  "captions": { "style": "reveal", "y": 0.66 },
  "keyWords": ["Remotion"],
  "hook": { "text": "Tinatamad\nmag-edit?", "to": { "clip": "a", "t": 4.32 } },
  "overlays": [
    { "kind": "card", "from": { "clip": "a", "t": 8.7 }, "to": { "clip": "a", "t": 10.2 }, "badge": "The secret", "title": "Remotion" },
    { "kind": "title", "from": { "clip": "a", "t": 21.82 }, "to": { "clip": "a", "t": 23.2 }, "text": "Zoom in on key moments" },
    { "kind": "lower-third", "from": { "clip": "a", "t": 1 }, "to": { "clip": "a", "t": 4 }, "title": "Name", "line": "What they do" },
    { "kind": "broll", "from": { "clip": "a", "t": 13.3 }, "to": { "clip": "a", "t": 15.2 }, "src": "library/broll/studio.mp4", "layout": "split" },
    { "kind": "push", "from": { "clip": "a", "t": 21.82 }, "to": { "clip": "a", "t": 23.2 }, "amount": 0.2 },
    { "kind": "custom", "from": { "clip": "a", "t": 17.6 }, "to": { "clip": "a", "t": 19.3 }, "component": "PromptBubble", "props": { "text": "add captions" } }
  ],
  "sfx": [{ "at": { "clip": "a", "t": 8.7 }, "src": "library/sfx/air-woosh.wav", "volume": 0.6 }],
  "music": { "src": "library/music/track.mp3", "volume": 0.065 },
  "end": { "title": "Made with VX Reel Edit", "line": "optional second line", "seconds": 2 }
}
```

| Field | What it does |
|---|---|
| `segments` | The cut list, written by cut-pauses. `in`/`out` in source seconds. `zoom`: framing changes inside the piece, hard, at phrase starts |
| `cuts` | Approved mistakes; cut-pauses leaves their words out |
| `focus` | Where the face is, in percent of the frame; punch-ins and pushes scale about it |
| `captions` | Overrides the profile for this video: `style` (reveal, punch, line, lift, none), `y` (fraction of the height) |
| `keyWords` | Words in the accent colour, matched without case or punctuation. `*word` in script.txt does the same |
| `hook` | Headline at the top from the start until `to`. `\n` breaks lines; the last line takes the accent |
| `overlays` | Graphics and b-roll, each from a moment to a moment. `push` is a slow zoom on a key moment |
| `sfx` | A sound at a moment. `seconds` is how long it may ring (default 1.5) |
| `music` | A bed under the whole video, about 11 dB under the voice, lifted in the gaps and the outro |
| `end` | An end card after the last word, `seconds` long. `follow: { "button": "Follow", "done": "Following" }` makes it the follow card: the title as a kinetic line over a button that gets tapped |
| `framing` | Centres the head everywhere the footage appears (talking shots, the hook plate and cutout, cards, phones): `shift` in percent of the width, `zoom` optional (the least zoom that keeps the edge covered is worked out). `scripts/matte.mjs` measures the head and prints `focus` and `framing` |
| `speed` | The whole video faster, voice included, pitch kept: `1.1` is 10% faster. Only when the owner asks. The voice and the hook cutout are re-made by themselves |
| `grade` | `false` turns off the profile's grade on the footage for this video |

## The light kinetic parts (profiles with a `kinetic` block, like papaya-light)

- `hook` gets `"cutout": true` for the type behind the person, and `parts` to change the words as they are said:
  `"parts": [{ "text": "Gusto mo ba gumawa ng\ncontent?", "at": { "clip": "a", "t": 0.52 } }, { "text": "Tinatamad\nmag-edit?", "at": { "clip": "a", "t": 2.42 } }]`.
  The lead line is light, the last line big in the accent, landing on the spoken word. `render.mjs` makes the cutout
  frames (`scripts/matte.mjs`) when they are missing or out of date.
- `{ "kind": "scene", "from", "to", "title": "Custom\nanimations", ... }`: a full-frame canvas card that hard-cuts in and
  out; captions hide under it. Title marks: `\n` stacks two lines; `*word` is bold ink, `**word` bold accent, the rest
  light. Unmarked, the last line is bold. One body, or none for a title alone:
  - `"list": ["Captions", "Zooms"]`: bullets that slide in one by one
  - `"footage": { "clip": "a", "t": 11, "frame": "card" }` (or `"phone"`): the owner's footage in a floating card or a phone
  - `"image": "library/brand/remotion/logo-on-white.svg", "imageFrame": "none"` (or `"card"`): a logo above the title, or an image in a floating card
  - `"cards": [{ "title": "Captions.tsx", "image": "optional" }]`: a stack of floating name cards, tall when they have previews
  Back-to-back scenes (one's `to` is the next one's `from`) keep the outgoing one under the incoming one.
- `{ "kind": "big-captions", "from", "to" }`: captions at the bigger size, for a line about captions.
- Caption style `lift`: centred, each word lifting out of a soft blur, in the caption colour, a narrow band behind the line.

The voice always plays as one baked track (`work/voice-<fingerprint>.wav`, made by `index-videos.mjs` whenever the cut
changes); the picture cuts are muted. The name changes with the cut, so Studio never plays an old voice (reload it).

After any change: `node scripts/index-videos.mjs`, then `npx tsc --noEmit`, then Studio (`pnpm studio`) or a draft.

# Craft: what landed with the owner and what did not

Written 15.10.2026 from the first full reel edited for the owner (the New Reel, built in `Reels/` before VX Reel Edit's kit
could do it). Every rule below cost a round of notes, most of them angry. Read this before the first build of a video.

## How the owner reviews

- They watch Remotion Studio live while you build, and pause on any frame. Every paused frame must be finished: no
  half-transparent frame, no empty panel, no frame where a graphic is missing. Point them at Studio only after you
  have verified the state, and say what to look at and at which time.
- Notes come short and in capitals when something is off. Fix exactly the thing named, measure it, and answer in a
  few lines with the number. "Should be fixed" without a measurement is how the same note came back three times.
- "Make the text more visible" means contrast (a shadow, a backdrop, a colour that stands off what is behind it). It
  does not mean new weights or sizes; changing those unasked was called out at once.
- They decide at a glance from pictures. A tiled sheet of stills beats a paragraph. A question with options they can
  click beats an open question, but when they are angry, do not ask: fix, then show.

## Footage and audio

- Transcribe every clip before asking anything about them, then describe each clip by its words. A short second clip
  is usually a retake of one line of the first (here: the last sentence, said tighter), not a separate video. Say which
  line it replaces and recommend clip 1 with that line swapped.
- Ask for the owner's own words at the start whenever the speech is not all English. Whisper turned "Gusto mo ba
  gumawa ng content" into English nonsense and "Claude" into "Cloud".
- A false start ("and since ... and since these animations") is a mistake to cut; check the seconds before a retake for
  a repeated phrase.
- The camera's first half second is an exposure fade: start after it. The last half second is the owner reaching for
  the stop button: end about 0.2 s after the last word and check the last frames.
- Cut only real pauses (measured against the clip's own noise floor), keep a short breath each side, and fade 2 to 3
  frames at every cut edge so room noise does not click.
- Never put silence inside a sentence to make room for a graphic. Graphics play over the voice. A voiceless beat only
  goes after the last word.
- Once the cut is approved, bake the voice into one continuous WAV and play it as a single audio layer; mute the
  picture cuts. Per-cut audio restarts at every cut in Studio and the owner hears it as chopped. Re-bake after any change
  to the cut and reload Studio (it keeps serving the old file).
- Speed: only when the owner asks ("crank the speed a bit" meant 1.1x). Whole video, pitch kept, then re-bake the voice
  and redo any cutouts.

## Picture

- Centre the person. Measure where the head sits from a person cutout over several frames (here it sat at 45% across);
  shift the footage to the middle and zoom by the least amount that keeps the edge covered (53 px needed 10%). Apply the
  same framing everywhere the footage appears: talking shots, the hook plate and cutout, phones, card previews and
  thumbnails. Missing the small ones was called out.
- Grade: ask before touching skin. A warm, contrasty grade made the owner look tired; a light cool-neutral grade with a
  small brightness lift and a soft vignette was kept. No blur, smoothing or glow on the face: two attempts were called
  ugly. If they want a retouch, they supply retouched clips; keep the grade on top of them.
- Fine moving grain over the whole video was kept.

## Type and captions

- Captions on footage: centred (measure equal gaps left and right), white, bold, sentence case as spoken, the key word
  in the accent. A narrow soft dark band only behind the caption line, clear above and below, so the shirt stays bright.
- The accent must stand off what is behind it: a light papaya washed out on the cream wall, a deep one sank into the
  papaya shirt. `#FF7D24` worked on both, with a soft dark shadow on the wall.
- Hook: big kinetic words set on the wall with the person cut out in front so the hair crosses the letters. Build the
  plate from the very frames the cutout was made from, or the two drift and the owner sees a second layer. A soft
  white gradient down from the top lifts the type off a busy wall.
- Nothing small on graphics: tiny tech labels, corner furniture and 22 px annotations were called ugly. Supporting text
  34 px and up; headlines big.

## Look and motion

- What landed: an off-white canvas with a faint grid, kinetic type in mixed weights (light grey regular beside bold
  black), each word lifting out of a short blur; floating rounded cards with deep soft shadows, tilted a little in 3D;
  one smooth no-bounce ease everywhere; one accent from the owner's shirt.
- What was rejected: slanted condensed motorsport type, halftone dots, hard papaya blocks, heavy wipes, Swiss block
  layouts, HUD labels. A mood board of stills (F1 graphics, VHS sleeves, a car poster) sent three looks the wrong way;
  the owner's real target was a video whose editing they wanted. Ask for that video.
- Full-frame cards hard-cut in and hard-cut out. Sliding sheets showed an empty panel and dissolves showed a ghost on
  any paused frame; both were called gaps. Back-to-back cards: keep the outgoing card mounted under the incoming one.
- Captions hide while a card covers their line, and a line that started under a card never flashes back after it.
- Two lines on one card read better stacked and big ("Custom" grey over "animations" black) than side by side.

## The beat plan

- Every concept the voice names gets its own picture. "Custom animations and motion graphics" needed two beats: a list,
  then graphics animating over a playing clip. A named product gets its official logo, taken from the maker's own brand
  page file, never redrawn.
- The Claude Code drop worked as a 1:1 mockup from the owner's own screenshot, framed in a floating dark window, with a
  short step line above it ("Drop your clip." / "Describe the edit." / "Hit send.").
- The end card is a follow call to action ("Follow for more" and a Follow button that gets tapped). A "Made with"
  lockup was removed.
- A timelapse of Studio recorded in a hidden browser was built and then removed at the owner's request. Offer it, do
  not assume it.

## Checks that caught what eyes missed

- Scan every frame: render the video as a 10% image sequence and test each frame, for example that every frame inside a
  card is fully card. One scan settled an argument that three screenshots did not.
- Transcribe the rendered audio back: every line present, in order, the last word complete; list every pause over
  0.3 s.
- Measure caption centring and text widths against the frame before saying they fit.

## Remotion traps

- Never click the Studio canvas or press arrow keys from an automated browser: a click selects a layer, the arrows
  nudge it, and Studio writes the nudge (`translate`) into the source. It slid a whole reel sideways.
- `AbsoluteFill` carries `width: 100%`. With `left` and `right` set it shifts instead of narrowing; add
  `width: 'auto'`.
- Words in a flex line need `white-space: nowrap`, or a heavy word wraps at its hyphen ("mag- / edit?").
- 1440p from a 1080x1920 composition: `--scale` 1.3333 gives 1440x2560; the 1080 footage is upscaled.

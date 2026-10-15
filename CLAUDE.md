# VX Reel Edit - an AI video editor for Claude Code: raw footage in, an edited video out, rendered with Remotion

The owner drops a video and says what they want; Claude edits it like a person would, renders it, checks it, puts it
on the owner's phone, and takes notes in plain words (Taglish included). The skill is `/vx-edit-video`
(`.claude/skills/vx-edit-video/SKILL.md`); start there for any editing work.

Open source (MIT, see `LICENSE`). Remotion has its own licence; see "Remotion licence" below.

## Plan mode

With plan mode on, an edit request always starts with the full intake in the skill (section 2), asked through
AskUserQuestion, before any plan is written; the edit plan (beats.md) is the plan, and approving it approves the edit.
The hook `.claude/hooks/plan-intake.mjs` says the same on every prompt sent in plan mode.

## How it works

| Path | What it is |
|---|---|
| `styles/<name>.md` | One style profile per brand: a json block the video reads (fonts, colours, caption style, feel, sound) plus "Rules learned" from the owner's notes. The video parts never hold a brand of their own |
| `media/` | Remotion's public folder. `library/` holds fonts, sfx, music, b-roll; `videos/<DD.MM.YYYY>-<name>/` holds one video: `raw/` footage, `edit.json`, `words.json`, `beats.md`, `out/` renders |
| `src/kit/` | The video parts: the cut and its framing (Footage), captions (reveal, punch, line, lift), hook, card, title, lower third, b-roll, end card, sound, grain; the light kinetic parts (Light: canvas scenes, kinetic titles, floating cards, the hook with the cutout, the follow card) |
| `src/custom/` | Graphics made for one video and kept for the next |
| `src/gen.ts` | Written by `scripts/index-videos.mjs`; never edit by hand |
| `scripts/` | ingest, transcribe, pin-words, find-mistakes, cut-pauses, index-videos, voice (one baked voice track), matte (the hook cutout and the head measure), render, verify. Each says its usage at the top |
| `whisper/` | The local speech model (not in git) |

`pnpm studio` opens Remotion Studio; the launchers do that and open Claude Code here.

## House rules

- Footage is copied in, never moved or deleted. Transcription stays on this computer.
- Only approved mistakes are cut. Never cut inside a phrase; never speed up the voice unless the owner asks (then the
  whole video, pitch kept).
- Fonts and colours come from the profile or the owner, never from Claude's taste. No generic font stacks.
- A draft is not shown before its contact sheets have been read (`scripts/verify.mjs`).
- No trace of any reference creator, course or brand anywhere in this folder.
- Commit by path, small and often.

## Known quirks (failed attempts, never cleared)

1. 14.10: Remotion's own downloaded headless browser crashes on start on this Mac ("Target closed").
   `remotion.config.ts` uses the newest Playwright headless shell when there is one.
2. 14.10: Whisper heard the Taglish opening as English and wrote "Cloud Code". The owner's own words (`script.txt`)
   win; pin-words lines them up.
3. 14.10: a fixed silence threshold (-35 dB) found no pauses in a take with room noise. Speech is now measured
   against each clip's own noise floor.
4. 14.10: Whisper merged a false start ("and sin..." then "And since these...") into one "And since". pin-words
   re-hears a short burst followed by a long pause on its own and puts the repeated words back.
5. 14.10: ffmpeg 8 dropped `-vsync`; verify uses `-fps_mode passthrough`.
6. 14.10: loudnorm aimed at -1.5 dBTP came out at -1.3 after AAC; it aims at -2 now.
7. 15.10 (New Reel, built in `Reels/`): a script drove Studio in a hidden browser with clicks and arrow keys; Studio
   wrote `translate: 660px` into the source and slid the reel sideways. Never click the canvas or press arrows in Studio
   from a script.
8. 15.10: `AbsoluteFill` carries `width: 100%`, so `left` plus `right` shifts it instead of narrowing it; captions sat
   off centre for hours. `src/kit/Graphics.tsx` has the same pattern on the hook (line 24): add `width: 'auto'`. Fixed 15.10 in the kit (Graphics hook, captions).
9. 15.10: per-cut audio (`src/kit/Cut.tsx` plays each piece's own audio) restarts at every cut in Studio, and the
   owner heard it as chopped. The fix that held: bake the cut voice into one WAV and play it as a single track. Fixed 15.10 in the kit: index-videos bakes `work/voice-<fingerprint>.wav` whenever the cut changes and the cuts are muted.
10. 15.10: a person cutout laid over video decoded separately drifted by a frame and showed a second layer; build the
    plate from the same frames the cutout came from, and re-cut after any timing or speed change.
11. 15.10: Studio keeps serving a replaced file in `media/` until the page reloads. The voice and the hook frames now get a new name whenever their source changes.
12. 15.10: words in a flex line wrap at a hyphen in heavy weights ("mag- / edit?"); give them `white-space: nowrap`.

## Remotion licence

Free for an individual and for companies of up to 3 people (Remotion AG, Zurich). Anyone using VX Reel Edit at a
company of 4 or more people needs Remotion's company licence (remotion.dev/license).

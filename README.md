# VX Reel Edit

Drop in the video you filmed, say what you want, and Claude Code edits it like a person would: cuts the pauses and the
mistakes, captions it, adds a hook, motion graphics, sound and an end card, renders it with Remotion, checks every
frame, and takes your notes in plain words. Taglish included.

## What you need

- [Node.js](https://nodejs.org) 20 or newer
- [Claude Code](https://claude.com/claude-code)
- About 2 GB free: the packages, and a speech model that is downloaded once and runs on your own computer

Built and tested on a Mac. The launchers for Windows and Linux are there, but those have not been tested yet.

## Start

1. Download or clone this folder.
2. Double-click the launcher for your system: `launch-vx-reel-edit (Mac).command`, `launch-vx-reel-edit (Windows).cmd`
   or `launch-vx-reel-edit (Linux).sh`. It installs what is missing, opens Remotion Studio in your browser (the live
   preview) and opens Claude Code in this folder.
3. Drag your video into Claude Code and say what you want, for example "edit this into a reel". Claude runs the
   `/vx-edit-video` skill: a few questions about the look, a plan, then a draft.

Your footage is copied in, never moved or changed. Edits land in `media/videos/<date>-<name>/`, renders in its `out/`.
On a Mac with iCloud Drive, each render is also copied to `iCloud Drive/VX Reel Edit` so it shows up on your phone.

## How it works

| Path | What it is |
|---|---|
| `.claude/skills/vx-edit-video/` | The editor's instructions: intake, cut, plan, build, check, notes. `references/craft.md` is what landed and what did not |
| `styles/<name>.md` | A style profile: fonts, colours, caption look, grade, and the rules learned from notes. `papaya-light` comes with it; the intake makes yours |
| `src/kit/` | The video parts, read from each video's `edit.json`: the cut, captions, the hook with the person cut out in front of the type, full-frame scenes, floating cards, the end card |
| `scripts/` | ingest, transcribe, find mistakes, cut pauses, bake the voice, make the hook cutout, render, verify. Each says its usage at the top |
| `media/library/` | Fonts, sound effects, music, b-roll. Add your own; only the Archivo font ships here |

## Privacy

Speech is transcribed on your computer with whisper.cpp. The hook cutout runs Google's MediaPipe person segmenter in a
hidden browser; its model and runtime are downloaded from Google and jsDelivr, and no frame of your video is uploaded.
Your videos, notes and the speech model are kept out of git by `.gitignore`.

## Licences

- VX Reel Edit: MIT (`LICENSE`).
- [Remotion](https://www.remotion.dev) has its own licence: free for individuals and companies of up to 3 people;
  larger companies need a Remotion company licence ([remotion.dev/license](https://www.remotion.dev/license)).
- Archivo: SIL Open Font License (`media/library/fonts/OFL-Archivo.txt`).
- whisper.cpp (MIT) and MediaPipe (Apache 2.0) are downloaded on first use.

Claude is an AI assistant made by Anthropic. VX Reel Edit is independent and not affiliated with or endorsed by
Anthropic or Remotion.

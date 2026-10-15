# VX Reel Edit

Drop in the video you filmed, say what you want, and Claude Code edits it like a person would: cuts the pauses and the
mistakes, captions it, adds a hook, motion graphics, sound and an end card, renders it with Remotion, checks every
frame, and takes your notes in plain words. Taglish included.

## Install with one prompt

Open Claude Code in the folder where you keep your projects and paste the prompt in
[INSTALL-PROMPT.md](INSTALL-PROMPT.md). Claude installs what is missing, clones this repo, sets it up and checks it with
a test render. Works on a Mac and on a Windows PC.

Tested end to end on a Mac. The Windows steps follow how each tool installs on Windows but have not yet been run on
a real PC; if a step fails there, please open an issue with its message.

## What you need

- [Claude Code](https://claude.com/claude-code)
- [Node.js](https://nodejs.org) 20 or newer, git, and a full [ffmpeg](https://ffmpeg.org) (Mac: `brew install ffmpeg`;
  Windows: `winget install -e --id Gyan.FFmpeg`). The install prompt takes care of these.
- About 3 GB free: the packages (about 1 GB) and a speech model (about 1.6 GB) that is downloaded once and runs on your
  own computer

## Install by hand

```bash
git clone https://github.com/testpilot8105/vx-reel-edit.git
cd vx-reel-edit
npx -y pnpm@10.33.0 install
node scripts/setup.mjs
```

`setup.mjs` checks Node and ffmpeg, fetches the headless browser and the speech engine and model, and makes a test
render. Run it again any time; it only fetches what is missing.

## Edit a video

1. Open Claude Code in the `vx-reel-edit` folder, or double-click the launcher for your system:
   `launch-vx-reel-edit (Mac).command`, `launch-vx-reel-edit (Windows).cmd` or `launch-vx-reel-edit (Linux).sh`, which
   also opens Remotion Studio (the live preview) in your browser.
2. Drag your video into Claude Code and say what you want, for example "edit this into a reel". Claude runs the
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

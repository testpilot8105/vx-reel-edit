# The intake, question by question

Asked through AskUserQuestion. Each round is one call with up to four questions. The profile's current answer goes
first, marked "(Recommended)". Each option says in a few plain words what the owner gets. Skip a question whose answer
is already clear from what the owner said this session.

## Round 0: the footage (only when there is more than one clip, or the speech is not all English)

Transcribe every clip first, then describe each one by its words before asking. Never ask "which clip" blind: on the
New Reel the owner picked "file 2" from a question about file sizes, and file 2 turned out to be a retake of one line.

| Header | Question | Options |
|---|---|---|
| Clips | How do the clips fit together? | Clip 1, with its last line swapped for the clip 2 retake (Recommended when clip 2 repeats a line) / Clip 1 only / Clip 2 only / Best lines from each. Quote the first words of each clip |
| Your words | Do you have the script or the words you said? | I'll paste them (Recommended when it is Taglish) / Use what you hear |

## Round 1: this video

| Header | Question | Options |
|---|---|---|
| Length | How long should it be? | All of it minus the pauses / About 30 s / About 60 s / About 90 s. Say the raw length and what the pauses alone would bring it to |
| Feel | How should it feel? | Expressive: punch-ins on most lines, kinetic headlines, sound on the moves / Balanced: a punch-in every other cut, graphics on the key lines / Minimal: clean cuts, captions only, long holds |
| Format | Where is it going? | 9:16 reel (TikTok, Reels, Shorts) / 1:1 feed / 16:9 YouTube. Default to the footage's own shape |
| Captions | Captions? | As spoken, Taglish and all / In English / None |

## Round 2: the look (saved to the profile)

| Header | Question | Options |
|---|---|---|
| Profile | Which look? | Each profile in `styles/` by name with a one-line description / A new look. A new look asks the next three |
| Headline | Font for the big words? | The profile's face / Drop a font file in `media/library/fonts` / Name one (a free Google font is fine). Never suggest a face of your own |
| Captions | How do captions appear? | Word reveal: words land as they are said, on a plate / Punches: one to three words at a time, big / Full lines: the whole phrase, quiet |
| Key words | Highlight key words? | One accent colour on the important words / Plain, all the same |

A new look also needs colours: ask for a brand sheet, a screenshot, or a product they like, and derive background,
ink, plate, accent and line from it. Then render `style-<name>` as a still and show it.

## Round 3: layers

| Header | Question | Options |
|---|---|---|
| Graphics | Motion graphics? | Hook and end card only / Cards on the key lines too / Custom graphics for this one (takes longer) / None |
| Sound | Sound effects? | Only on visible moves (a card landing, a switch) / Punchy, on every graphic / None |
| B-roll | B-roll? | From `media/library/broll` (say what is there) / I'll drop clips in now / None |
| Music | Music? | My track (drop it in `media/library/music`) / None. Never pick a track for them |

## Round 3b: finish

| Header | Question | Options |
|---|---|---|
| Grade | Colour on your footage? | Light cool grade, a small lift and a soft vignette (Recommended) / As shot, no grade / I'll send retouched clips. Never offer smoothing or blur on the face |
| End card | How should it end? | Follow button: "Follow for more" with a tap (Recommended) / My handle under it (type it) / No end card |
| Speed | Pace of your voice? | As spoken (Recommended) / A bit faster, 1.1x with the pitch kept |

## Round 4: pegs

Two questions. Header "Video peg": "Is there one video whose editing you want this to feel like (how things move, the
pace, the type)?" Header "Mood": "Any images for colour and shapes?" Keep them apart: the owner's real target on the
New Reel was a video's editing, while a mood board of stills sent three looks the wrong way.

Be proactive. Based on the topic of this video, suggest where to look and what to type, for example:

- On TikTok or Instagram: search "<topic> tutorial", "<topic> reel", the creator they already follow for this.
- On YouTube Shorts: "<topic> in 60 seconds".
- Their own saved posts.

Options: "I'll paste links or drop screenshots" / "Use my last video as the peg" / "No pegs, use the profile".
For a link: say what you can and cannot see from it. For a video peg, step through it frame by frame (8 to 12 moments)
before designing anything. For a local video in `refs/`: pull a few frames with ffmpeg and look at them. Write down, in
`beats.md`, what you take from each peg: background, type weights and sizes, caption size and place, how graphics
enter and leave, cut pace. Then show a sheet of two or three stills in that direction before building.

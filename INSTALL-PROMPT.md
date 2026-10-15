# Install VX Reel Edit with one prompt

Open Claude Code (the desktop app's Code tab, or `claude` in a terminal) in the folder where you keep your projects,
then paste everything in the box below. Works on a Mac and on a Windows PC.

```text
Install VX Reel Edit for me from https://github.com/testpilot8105/vx-reel-edit and get it ready to edit my videos. I am not technical: do every step yourself, explain in plain words, and only ask me when you need my password or a click.

1. Check what this computer has: git, Node.js 20 or newer, and ffmpeg (ffmpeg -version). Install anything missing:
   - Mac: use Homebrew (brew install git node ffmpeg whisper-cpp). If Homebrew is not installed, tell me to paste the one line from https://brew.sh into the Terminal app, since it needs my password, and wait for me.
   - Windows: use winget: winget install -e --id Git.Git, winget install -e --id OpenJS.NodeJS.LTS, winget install -e --id Gyan.FFmpeg (accept the agreements with --accept-source-agreements --accept-package-agreements). Then reload PATH in PowerShell before going on: $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
2. Clone it here: git clone https://github.com/testpilot8105/vx-reel-edit.git, then go into the vx-reel-edit folder.
3. Install the packages: npx -y pnpm@10.33.0 install
4. Run the setup check: node scripts/setup.mjs. It checks Node and ffmpeg, fetches the headless browser and the speech model (about 1.6 GB, once), and does a test render. If a step fails, read its message, fix the cause, and run it again until it says Ready.
5. When it says Ready, tell me in two lines: where the folder is, and that from now on I open Claude Code in that vx-reel-edit folder (or double-click the launch-vx-reel-edit file for my system), drag in a video I filmed, and say "edit this into a reel".
```

Everything runs on your computer: your footage is copied into the folder, never uploaded, and the speech is
transcribed locally. VX Reel Edit is MIT licensed; Remotion, which renders the video, is free for individuals and
companies of up to 3 people (see the README).

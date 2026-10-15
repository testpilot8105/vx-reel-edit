@echo off
rem VX Reel Edit: double-click to open Remotion Studio in the browser and Claude Code in this folder.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node is not installed. Get it from nodejs.org, then double-click this again. & pause & exit /b 1)
where pnpm >nul 2>nul || call npm install -g pnpm
if not exist node_modules call pnpm install
node scripts\index-videos.mjs
start "Remotion Studio" /min cmd /c "pnpm exec remotion studio"
where claude >nul 2>nul && (claude) || (echo Claude Code is not installed. Get it from claude.com/claude-code, then double-click this again. & pause)

#!/bin/sh
# VX Reel Edit: double-click (or run) to open Remotion Studio in the browser and Claude Code in this folder.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node is not installed. Get it from nodejs.org, then run this again."
  read -r _
  exit 1
fi
command -v pnpm >/dev/null 2>&1 || npm install -g pnpm
[ -d node_modules ] || pnpm install
node scripts/index-videos.mjs
(pnpm exec remotion studio >/dev/null 2>&1 &)
if command -v claude >/dev/null 2>&1; then
  exec claude
else
  echo "Claude Code is not installed. Get it from claude.com/claude-code, then run this again."
  read -r _
fi

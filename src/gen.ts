// Written by scripts/index-videos.mjs. Do not edit by hand: change styles/*.md or media/videos/*/edit.json and run it again.
import type { Edit, Style, Word } from './types';

export const STYLES: Record<string, Style> = {
  "papaya-light": {
    "name": "papaya-light",
    "fonts": [
      {
        "family": "Archivo",
        "src": "library/fonts/archivo-latin-wdth-wght.woff2",
        "weight": "100 900"
      }
    ],
    "headline": {
      "family": "Archivo",
      "weight": 800,
      "size": 196,
      "case": "as-is"
    },
    "caption": {
      "family": "Archivo",
      "weight": 700,
      "size": 72,
      "case": "as-is",
      "style": "lift",
      "y": 0.66,
      "plate": false,
      "maxWords": 3,
      "maxChars": 16,
      "color": "#FFFFFF",
      "band": true
    },
    "body": {
      "family": "Archivo",
      "weight": 400
    },
    "colors": {
      "background": "#F3F2EF",
      "ink": "#111214",
      "soft": "#A3A3A3",
      "plate": "#111214",
      "accent": "#FF7D24",
      "line": "rgba(17,18,20,0.05)",
      "card": "#FFFFFF"
    },
    "kinetic": {
      "light": 400,
      "bold": 700,
      "lead": 600
    },
    "grade": {
      "filter": "contrast(1.0) saturate(1.1) brightness(1.06)",
      "tint": [
        "rgba(120,170,255,0.18)",
        "rgba(150,190,255,0.06)",
        "rgba(60,100,170,0.16)"
      ],
      "lift": 0.1,
      "vignette": 0.3
    },
    "grain": 0.07,
    "radius": 36,
    "edge": 0,
    "feel": "expressive",
    "sound": {
      "music": 0.065,
      "sfx": 0.6
    }
  }
};

export const EDITS: { edit: Edit; words: Word[]; voice?: string; hookFrames?: { plate: string; matte: string; count: number } }[] = [];

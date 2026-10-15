import type { Anchor, Edit, Segment, Word } from './types';

/** `from` and `src` are the piece's first frame and length in the source; `len` is its length on the output, which is
 *  shorter when the video is sped up; `start` is where it lands on the output. */
export type Piece = Segment & { from: number; src: number; len: number; start: number };

const FORMATS = { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] } as const;

export const size = (e: Edit) => {
  const [width, height] = FORMATS[e.format];
  return { width, height };
};

export const speedOf = (e: Edit) => e.speed ?? 1;

/** The cut list in output order: each piece starts at `start` (output frame), plays `len` frames from source frame `from`. */
export const pieces = (e: Edit): Piece[] => {
  let start = 0;
  return e.segments.map((s) => {
    const from = Math.round(s.in * e.fps);
    const src = Math.max(1, Math.round(s.out * e.fps) - from);
    const len = Math.max(1, Math.round(src / speedOf(e)));
    const p = { ...s, from, src, len, start };
    start += len;
    return p;
  });
};

export const voiceEnd = (e: Edit) => {
  const ps = pieces(e);
  const last = ps[ps.length - 1];
  return last ? last.start + last.len : 0;
};

export const duration = (e: Edit) => voiceEnd(e) + Math.round((e.end?.seconds ?? 0) * e.fps);

/** Output frame for a moment in a source clip. A moment inside a cut lands on the next kept frame. */
export const at = (e: Edit, a: Anchor): number => {
  const f = a.t * e.fps;
  const ps = pieces(e);
  let after: number | null = null;
  for (const p of ps) {
    if (p.clip !== a.clip) continue;
    if (f >= p.from && f < p.from + p.src) return Math.min(p.start + p.len - 1, p.start + Math.round((f - p.from) / speedOf(e)));
    if (f < p.from && after === null) after = p.start;
  }
  return after ?? voiceEnd(e);
};

/** Words that survive the cut, each with its output frame. */
export const keptWords = (e: Edit, words: Word[]) => {
  const ps = pieces(e);
  const inside = (w: Word) => ps.some((p) => p.clip === w.clip && w.start * e.fps >= p.from - 1 && w.start * e.fps < p.from + p.src);
  const keys = new Set((e.keyWords ?? []).map(norm));
  return words.filter(inside).map((w) => ({ ...w, key: w.key || keys.has(norm(w.text)), f: at(e, { clip: w.clip, t: w.start }), fe: at(e, { clip: w.clip, t: w.end }) }));
};

export type Placed = ReturnType<typeof keptWords>[number];
export type Chunk = { words: Placed[]; from: number; to: number };

export const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');

/** Caption chunks: up to maxWords words, broken at punctuation, at pauses and at a cut between clips. */
export const chunks = (e: Edit, words: Placed[], maxWords: number, maxChars: number): Chunk[] => {
  const groups: Placed[][] = [];
  let cur: Placed[] = [];
  words.forEach((w, i) => {
    const next = words[i + 1];
    cur.push(w);
    const chars = cur.map((x) => x.text).join(' ').length;
    const ends =
      !next ||
      next.clip !== w.clip ||
      /[.?!,;:]$/.test(w.text) ||
      next.f - w.fe > 0.15 * e.fps ||
      cur.length >= maxWords ||
      chars + 1 + next.text.length > maxChars;
    if (ends) {
      groups.push(cur);
      cur = [];
    }
  });
  const end = voiceEnd(e);
  return groups.map((ws, i) => {
    const nx = groups[i + 1];
    const nextFrom = nx ? nx[0].f : end;
    // Captions land two frames before the word is heard.
    const from = Math.max(0, ws[0].f - 2);
    const to = Math.min(nextFrom - 2, ws[ws.length - 1].fe + Math.round(0.6 * e.fps));
    return { words: ws, from, to: Math.max(from + 1, to) };
  });
};

/** 1 while someone is talking, for ducking the music. */
export const talking = (e: Edit, words: Placed[]) => {
  const spans = words.map((w) => [w.f, w.fe] as const);
  return (f: number) => spans.some(([a, b]) => f >= a - 6 && f <= b + 9);
};

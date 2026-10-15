// The shapes every video is built from. A video is data (media/videos/<id>/edit.json plus words.json); the kit in
// src/kit reads it, and the look comes only from the style profile it names (styles/<style>.md).

/** A moment in a source clip, in that clip's own seconds. Beats are pinned to moments, not to output frames, so
 *  re-cutting never knocks a graphic off the word it belongs to. */
export type Anchor = { clip: string; t: number };

export type Word = { clip: string; text: string; start: number; end: number; key?: boolean };

export type Segment = {
  clip: string;
  in: number;
  out: number;
  /** Framing changes inside this piece: [source seconds, scale]. Hard changes at phrase starts, never animated. */
  zoom?: [number, number][];
};

/** reveal: words land on a line as said. punch: one to three words, hard swap. line: the whole phrase. lift: centred,
 *  each word lifting out of a soft blur, wrapping inside the frame (the light kinetic look). */
export type CaptionStyle = 'reveal' | 'punch' | 'line' | 'lift' | 'none';

/** What a full-frame scene shows under its title, one of: a bulleted list, the owner's footage in a floating card or
 *  phone (from a moment in a clip), an image under media/ (a logo from the maker's brand page, a screenshot) on its own
 *  or in a floating card, or a stack of named floating cards. */
export type SceneBody = {
  list?: string[];
  footage?: { clip: string; t: number; frame?: 'card' | 'phone' };
  image?: string;
  imageFrame?: 'card' | 'none';
  cards?: { title: string; image?: string }[];
};

export type Overlay =
  | { kind: 'card'; from: Anchor; to: Anchor; title: string; body?: string; badge?: string; y?: number }
  | { kind: 'title'; from: Anchor; to: Anchor; text: string }
  | { kind: 'lower-third'; from: Anchor; to: Anchor; title: string; line?: string }
  | { kind: 'broll'; from: Anchor; to: Anchor; src: string; layout?: 'full' | 'split'; startAt?: number }
  | { kind: 'push'; from: Anchor; to: Anchor; amount?: number }
  /** A full-frame canvas scene that hard-cuts in over the talking head and hard-cuts out: a kinetic title ("\n" makes
   *  two stacked lines; "*word" is bold ink, "**word" bold accent, the rest light) and an optional body. */
  | ({ kind: 'scene'; from: Anchor; to: Anchor; title: string } & SceneBody)
  /** Captions at the bigger size between two moments (for a line about captions, say). */
  | { kind: 'big-captions'; from: Anchor; to: Anchor }
  /** A graphic written for one video (src/custom), reusable by name in the next one. */
  | { kind: 'custom'; from: Anchor; to: Anchor; component: string; props?: Record<string, unknown> };

export type Sfx = { at: Anchor; src: string; volume?: number; seconds?: number };

export type Edit = {
  id: string;
  title: string;
  style: string;
  format: '9:16' | '1:1' | '16:9';
  fps: number;
  /** Clip letter to its file under media/. */
  clips: Record<string, string>;
  segments: Segment[];
  /** Approved mistake cuts, in source seconds. cut-pauses drops the words inside them. */
  cuts?: { clip: string; from: number; to: number; reason: string }[];
  /** Where the face sits in the frame, so punch-ins scale about it. Percentages, before framing. */
  focus?: [number, number];
  /** Re-framing that centres the head, applied everywhere the footage is drawn: `shift` moves the picture right (minus:
   *  left) in percent of the frame width; `zoom` is the least zoom that keeps the edge covered, worked out when left out.
   *  scripts/matte.mjs measures the head and prints the values. */
  framing?: { shift: number; zoom?: number };
  /** The whole video faster or slower, voice included, pitch kept (1.1 = 10% faster). Only when the owner asks. */
  speed?: number;
  /** The profile's grade on the footage; on by default when the profile has one. */
  grade?: boolean;
  captions?: { style?: CaptionStyle; y?: number };
  /** Words shown in the accent colour. Matched without case or punctuation. */
  keyWords?: string[];
  /** `cutout`: the type sits behind the person (scripts/matte.mjs makes the frames). `parts`: the hook changes text at
   *  each moment; `text` is used when there are none. */
  hook?: { text: string; to: Anchor; cutout?: boolean; parts?: { text: string; at: Anchor }[] };
  overlays?: Overlay[];
  sfx?: Sfx[];
  music?: { src: string; volume?: number };
  /** The end card. With `follow`, the title is a kinetic line over a Follow button that gets tapped. */
  end?: { title: string; line?: string; seconds: number; follow?: { button: string; done: string } };
};

export type FontFile = { family: string; src: string; weight: string; style?: 'normal' | 'italic' };

export type Style = {
  name: string;
  fonts: FontFile[];
  headline: { family: string; weight: number; size: number; case?: 'upper' | 'as-is' };
  caption: {
    family: string;
    weight: number;
    size: number;
    case?: 'upper' | 'as-is';
    style: CaptionStyle;
    /** Vertical position of the caption's centre, as a fraction of the frame height. */
    y: number;
    plate: boolean;
    maxWords: number;
    maxChars: number;
    /** Caption text colour on footage; the ink when left out. */
    color?: string;
    /** A narrow soft dark band (the plate colour) behind the caption line only. */
    band?: boolean;
  };
  body: { family: string; weight: number };
  colors: { background: string; ink: string; soft: string; plate: string; accent: string; line: string; card?: string };
  /** Kinetic type weights: light words, bold words, the hook's lead line. */
  kinetic?: { light: number; bold: number; lead: number };
  /** The look on the owner's footage (and its cutouts): a CSS filter, a tint laid over in soft light (top, middle,
   *  bottom), a soft lift on the face and a vignette strength. */
  grade?: { filter: string; tint: [string, string, string]; lift: number; vignette: number };
  /** Fine moving film grain over everything, 0 for none. */
  grain?: number;
  radius: number;
  /** Left edge of headlines and captions, as a fraction of the frame width. 0 centres them instead. */
  edge: number;
  feel: 'expressive' | 'balanced' | 'minimal';
  sound: { music: number; sfx: number };
};

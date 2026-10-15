import { createContext, useContext } from 'react';
import type { Edit, Style } from '../types';

export const StyleContext = createContext<Style | null>(null);
export const EditContext = createContext<Edit | null>(null);

export const useStyle = () => {
  const s = useContext(StyleContext);
  if (!s) throw new Error('No style profile in context. Is the edit pointing at a style that exists in styles/?');
  return s;
};

export const useEdit = () => {
  const e = useContext(EditContext);
  if (!e) throw new Error('No edit in context.');
  return e;
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** The family exactly as the style names it. No generic fallback: a font that failed to load should look wrong. */
export const face = (family: string) => `'${family}'`;

export const cased = (text: string, c?: 'upper' | 'as-is') => (c === 'upper' ? text.toUpperCase() : text);

/** A profile colour at a given opacity. Takes #rgb or #rrggbb; any other colour is returned as it is. */
export const alpha = (color: string, a: number) => {
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return color;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${a})`;
};

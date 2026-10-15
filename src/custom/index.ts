import type { FC } from 'react';

// Graphics written for one video, kept so the next video can use them by name. An overlay of kind 'custom' in an
// edit.json names one of these; it receives the overlay's props plus `len`, its length in frames. Add each new one
// here with a one-line note on what it is and which video it was made for.
export type CustomProps = Record<string, unknown> & { len: number };

export const CUSTOM: Record<string, FC<CustomProps>> = {};

import type { Position, Range } from './types.ts';

export function offsetToPosition(text: string, offset: number): Position {
  let line = 0;
  let lastNewline = -1;
  const bounded = Math.max(0, Math.min(offset, text.length));

  for (let i = 0; i < bounded; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }

  return { line, character: bounded - lastNewline - 1 };
}

export function positionToOffset(text: string, position: Position): number {
  let line = 0;
  let offset = 0;

  while (offset < text.length && line < position.line) {
    if (text[offset] === '\n') line++;
    offset++;
  }

  return Math.min(text.length, offset + position.character);
}

export function makeRange(text: string, start: number, end: number): Range {
  return { start: offsetToPosition(text, start), end: offsetToPosition(text, end) };
}

export function getWordAt(text: string, offset: number, pattern = /[A-Za-z_][A-Za-z0-9_]*/g): { word: string; start: number; end: number } | undefined {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (safeOffset >= start && safeOffset <= end) {
      return { word: match[0], start, end };
    }
  }

  return undefined;
}

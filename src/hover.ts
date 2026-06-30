import type { Hover, Position } from './types.ts';
import { getFunctionInfo } from './registry.ts';
import { getWordAt, makeRange, positionToOffset } from './position.ts';

export function formulaHover(text: string, position: Position): Hover | undefined {
  const offset = positionToOffset(text, position);
  const word = getWordAt(text, offset);
  if (!word) return undefined;

  const info = getFunctionInfo(word.word);
  if (!info) return undefined;

  return {
    contents: {
      kind: 'markdown',
      value: `**${info.signature}**\n\n${info.description}\n\n_Category: ${info.category}_`,
    },
    range: makeRange(text, word.start, word.end),
  };
}

export default formulaHover;

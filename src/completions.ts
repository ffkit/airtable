import type { CompletionItem, Position } from './types.ts';
import { CompletionItemKind } from './types.ts';
import { CALLABLE_CONSTANTS, FUNCTION_REGISTRY } from './registry.ts';

export interface FormulaCompletionOptions {
  includeDateUnits?: boolean;
  includeConstants?: boolean;
  snippetPlaceholders?: boolean;
}

export function formulaCompletions(
  _text = '',
  _position: Position = { line: 0, character: 0 },
  options: FormulaCompletionOptions = {},
): CompletionItem[] {
  const includeDateUnits = options.includeDateUnits !== false;
  const includeConstants = options.includeConstants !== false;
  const snippetPlaceholders = options.snippetPlaceholders !== false;

  const items: CompletionItem[] = Object.entries(FUNCTION_REGISTRY).map(([name, info]) => ({
    label: name,
    kind: name === 'TRUE' || name === 'FALSE' ? CompletionItemKind.Constant : CompletionItemKind.Function,
    detail: info.category,
    documentation: { kind: 'markdown', value: `**${info.signature}**\n\n${info.description}` },
    insertText: snippetPlaceholders && name !== 'TRUE' && name !== 'FALSE' ? `${name}($0)` : name,
  }));

  if (includeConstants) {
    for (const name of CALLABLE_CONSTANTS) {
      const existing = items.find(item => item.label === name);
      if (existing) {
        existing.kind = CompletionItemKind.Constant;
        if (name === 'TRUE' || name === 'FALSE') existing.insertText = name;
        continue;
      }

      items.push({ label: name, kind: CompletionItemKind.Constant, insertText: name });
    }
  }

  if (includeDateUnits) {
    for (const unit of ['days', 'weeks', 'months', 'years', 'hours', 'minutes', 'seconds']) {
      items.push({
        label: `'${unit}'`,
        kind: CompletionItemKind.Value,
        detail: 'Date/Time unit',
        insertText: `'${unit}'`,
      });
    }
  }

  return items;
}

export default formulaCompletions;

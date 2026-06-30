import type { Position, SignatureHelp } from './types.ts';
import { getFunctionInfo } from './registry.ts';
import { positionToOffset } from './position.ts';

function splitSignatureParameters(signature: string): string[] {
  const open = signature.indexOf('(');
  const close = signature.lastIndexOf(')');
  if (open === -1 || close === -1 || close <= open) return [];
  return signature.slice(open + 1, close).split(',').map(part => part.trim()).filter(Boolean);
}

function findCallContext(text: string, offset: number): { name: string; activeParameter: number } | undefined {
  let depth = 0;
  let activeParameter = 0;
  let quote: string | undefined;

  for (let i = offset - 1; i >= 0; i--) {
    const ch = text[i];

    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = undefined;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (ch === ')') {
      depth++;
      continue;
    }

    if (ch === '(') {
      if (depth > 0) {
        depth--;
        continue;
      }

      let j = i - 1;
      while (j >= 0 && /\s/.test(text[j])) j--;
      const end = j + 1;
      while (j >= 0 && /[A-Z0-9_]/i.test(text[j])) j--;
      const name = text.slice(j + 1, end).toUpperCase();
      if (!name) return undefined;
      return { name, activeParameter };
    }

    if (ch === ',' && depth === 0) activeParameter++;
  }

  return undefined;
}

export function formulaSignatureHelp(text: string, position: Position): SignatureHelp | undefined {
  const offset = positionToOffset(text, position);
  const context = findCallContext(text, offset);
  if (!context) return undefined;

  const info = getFunctionInfo(context.name);
  if (!info) return undefined;

  return {
    signatures: [{
      label: info.signature,
      documentation: { kind: 'markdown', value: info.description },
      parameters: splitSignatureParameters(info.signature).map(label => ({ label })),
    }],
    activeSignature: 0,
    activeParameter: context.activeParameter,
  };
}

export default formulaSignatureHelp;

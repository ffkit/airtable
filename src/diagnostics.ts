import type { Diagnostic } from './types.ts';
import { DiagnosticSeverity } from './types.ts';
import {
  ALL_CALLABLE,
  ALL_FUNCTION_NAMES,
  CALLABLE_CONSTANTS,
  COMMON_TYPOS,
  SMART_QUOTES,
  levenshteinDistance,
} from './registry.ts';
import { makeRange, offsetToPosition } from './position.ts';

export interface FormulaDiagnosticsOptions {
  uri?: string;
  checkComments?: boolean;
  checkDelimiters?: boolean;
  checkQuotes?: boolean;
  checkFunctions?: boolean;
  checkSmartQuotes?: boolean;
  checkCommonTypos?: boolean;
}

interface OffsetRange { start: number; end: number }

function getExclusionRanges(text: string): OffsetRange[] {
  const ranges: OffsetRange[] = [];
  let i = 0;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const rangeEnd = end === -1 ? text.length : end + 2;
      ranges.push({ start: i, end: rangeEnd });
      i = rangeEnd;
      continue;
    }

    if (ch === '/' && next === '/') {
      let j = i + 2;
      while (j < text.length && text[j] !== '\n') j++;
      ranges.push({ start: i, end: j });
      i = j;
      continue;
    }

    if (ch === '{') {
      let j = i + 1;
      while (j < text.length && text[j] !== '}') j++;
      if (j < text.length) j++;
      ranges.push({ start: i, end: j });
      i = j;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < text.length) {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text[j] === quote) {
          j++;
          break;
        }
        if (text[j] === '\n') break;
        j++;
      }
      ranges.push({ start: i, end: j });
      i = j;
      continue;
    }

    i++;
  }

  return ranges;
}

function isInside(position: number, ranges: OffsetRange[]): boolean {
  return ranges.some(range => position >= range.start && position < range.end);
}

function findClosestFunction(input: string): string | undefined {
  const upper = input.toUpperCase();
  let bestDistance = Infinity;
  let best: string | undefined;

  for (const name of ALL_CALLABLE) {
    const distance = levenshteinDistance(upper, name);
    if (distance < bestDistance && distance <= 3) {
      bestDistance = distance;
      best = name;
    }
  }

  return best;
}

function checkComments(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const patterns = [/\/\/[^\n]*/g, /\/\*[\s\S]*?\*\//g];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      diagnostics.push({
        range: makeRange(text, match.index, match.index + match[0].length),
        message: 'Comments are not allowed in Airtable formulas. This will cause an error when used in Airtable.',
        severity: DiagnosticSeverity.Warning,
        code: 'no-comments',
        source: 'airtable-formula',
      });
    }
  }

  return diagnostics;
}

function checkParentheses(text: string, uri?: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: number[] = [];
  const exclusions = getExclusionRanges(text);

  for (let i = 0; i < text.length; i++) {
    if (isInside(i, exclusions)) continue;

    if (text[i] === '(') stack.push(i);
    else if (text[i] === ')') {
      const open = stack.pop();
      if (open === undefined) {
        diagnostics.push({
          range: makeRange(text, i, i + 1),
          message: 'Unmatched closing parenthesis',
          severity: DiagnosticSeverity.Error,
          source: 'airtable-formula',
        });
      }
    }
  }

  for (const open of stack) {
    const openPos = offsetToPosition(text, open);
    const end = text.length;
    const diagnostic: Diagnostic = {
      range: makeRange(text, Math.max(0, end - 1), end),
      message: `Missing closing parenthesis for '(' at line ${openPos.line + 1}, column ${openPos.character + 1}`,
      severity: DiagnosticSeverity.Error,
      source: 'airtable-formula',
    };

    if (uri) {
      diagnostic.relatedInformation = [{
        location: { uri, range: makeRange(text, open, open + 1) },
        message: 'Opening parenthesis is here',
      }];
    }

    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

function checkBrackets(text: string, uri?: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: number[] = [];
  const exclusions = getExclusionRanges(text).filter(range => text[range.start] === '"' || text[range.start] === "'");

  for (let i = 0; i < text.length; i++) {
    if (isInside(i, exclusions)) continue;

    if (text[i] === '{') stack.push(i);
    else if (text[i] === '}') {
      const open = stack.pop();
      if (open === undefined) {
        diagnostics.push({
          range: makeRange(text, i, i + 1),
          message: 'Unmatched closing field-reference brace',
          severity: DiagnosticSeverity.Error,
          source: 'airtable-formula',
        });
      }
    }
  }

  for (const open of stack) {
    const openPos = offsetToPosition(text, open);
    const diagnostic: Diagnostic = {
      range: makeRange(text, Math.max(0, text.length - 1), text.length),
      message: `Missing closing field-reference brace for '{' at line ${openPos.line + 1}, column ${openPos.character + 1}`,
      severity: DiagnosticSeverity.Error,
      source: 'airtable-formula',
    };

    if (uri) {
      diagnostic.relatedInformation = [{
        location: { uri, range: makeRange(text, open, open + 1) },
        message: 'Opening brace is here',
      }];
    }

    diagnostics.push(diagnostic);
  }

  return diagnostics;
}

function checkQuotes(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let quote: '"' | "'" | undefined;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i - 1] === '\\') continue;

    if (!quote && (text[i] === '"' || text[i] === "'")) {
      quote = text[i] as '"' | "'";
      start = i;
      continue;
    }

    if (quote && text[i] === quote) {
      quote = undefined;
      start = -1;
    }
  }

  if (quote && start !== -1) {
    diagnostics.push({
      range: makeRange(text, start, start + 1),
      message: quote === '"' ? 'Unclosed double quote' : 'Unclosed single quote',
      severity: DiagnosticSeverity.Error,
      source: 'airtable-formula',
    });
  }

  return diagnostics;
}

function checkFunctions(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const exclusions = getExclusionRanges(text);
  const constants = new Set<string>(CALLABLE_CONSTANTS);
  const functionsRequiringParens = ALL_FUNCTION_NAMES.filter(name => !constants.has(name));

  const missingParen = new RegExp(`\\b(${functionsRequiringParens.join('|')})\\b(?!\\s*\\()`, 'g');
  let match: RegExpExecArray | null;

  while ((match = missingParen.exec(text)) !== null) {
    if (isInside(match.index, exclusions)) continue;
    diagnostics.push({
      range: makeRange(text, match.index, match.index + match[1].length),
      message: `Function '${match[1]}' is missing its opening parenthesis. Should be '${match[1]}('`,
      severity: DiagnosticSeverity.Error,
      code: 'missing-function-parenthesis',
      source: 'airtable-formula',
    });
  }

  const functionPattern = /\b([A-Z_][A-Z0-9_]*)\s*\(/g;
  while ((match = functionPattern.exec(text)) !== null) {
    const name = match[1];
    if (isInside(match.index, exclusions)) continue;
    if (!(ALL_CALLABLE as readonly string[]).includes(name)) {
      const suggestion = findClosestFunction(name);
      diagnostics.push({
        range: makeRange(text, match.index, match.index + name.length),
        message: suggestion ? `Unknown function '${name}'. Did you mean '${suggestion}'?` : `Unknown function '${name}'`,
        severity: DiagnosticSeverity.Error,
        code: 'unknown-function',
        source: 'airtable-formula',
      });
    }
  }

  return diagnostics;
}

function checkSmartQuotes(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const [smartQuote, replacement] of Object.entries(SMART_QUOTES)) {
    let index = text.indexOf(smartQuote);
    while (index !== -1) {
      diagnostics.push({
        range: makeRange(text, index, index + smartQuote.length),
        message: `Smart quote detected. Replace with ${replacement}.`,
        severity: DiagnosticSeverity.Warning,
        code: 'smart-quote',
        source: 'airtable-formula',
      });
      index = text.indexOf(smartQuote, index + smartQuote.length);
    }
  }

  return diagnostics;
}

function checkCommonTypos(text: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const exclusions = getExclusionRanges(text);
  const typoPattern = /\b([A-Z_][A-Z0-9_]*)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = typoPattern.exec(text)) !== null) {
    const name = match[1] as keyof typeof COMMON_TYPOS;
    if (isInside(match.index, exclusions)) continue;
    const replacement = COMMON_TYPOS[name];
    if (!replacement) continue;

    diagnostics.push({
      range: makeRange(text, match.index, match.index + name.length),
      message: `Possible typo or unsupported function '${name}'. Consider ${replacement}.`,
      severity: DiagnosticSeverity.Warning,
      code: 'common-typo',
      source: 'airtable-formula',
    });
  }

  return diagnostics;
}

export function formulaDiagnostics(text: string, options: FormulaDiagnosticsOptions = {}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (options.checkComments !== false) diagnostics.push(...checkComments(text));
  if (options.checkDelimiters !== false) {
    diagnostics.push(...checkParentheses(text, options.uri));
    diagnostics.push(...checkBrackets(text, options.uri));
  }
  if (options.checkQuotes !== false) diagnostics.push(...checkQuotes(text));
  if (options.checkFunctions !== false) diagnostics.push(...checkFunctions(text));
  if (options.checkSmartQuotes !== false) diagnostics.push(...checkSmartQuotes(text));
  if (options.checkCommonTypos !== false) diagnostics.push(...checkCommonTypos(text));

  diagnostics.sort((a, b) => {
    if (a.range.start.line !== b.range.start.line) return a.range.start.line - b.range.start.line;
    return a.range.start.character - b.range.start.character;
  });

  return diagnostics;
}

export default formulaDiagnostics;

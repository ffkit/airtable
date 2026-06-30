export type MaybePromise<T> = T | Promise<T>;

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface DiagnosticRelatedInformation {
  location: {
    uri: string;
    range: Range;
  };
  message: string;
}

export interface Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  code?: string;
  source?: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export interface MarkupContent {
  kind: 'plaintext' | 'markdown';
  value: string;
}

export interface CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string | MarkupContent;
  insertText?: string;
  sortText?: string;
  filterText?: string;
}

export interface Hover {
  contents: MarkupContent | MarkupContent[] | string;
  range?: Range;
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkupContent;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkupContent;
  parameters?: ParameterInformation[];
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature: number;
  activeParameter: number;
}

export type FormulaTextLike = string | { toString(encoding?: string): string };

export interface FormulaLogger {
  warn?: (...args: unknown[]) => void;
  error?: (...args: unknown[]) => void;
}

export interface FsLike {
  readFile?: ((path: string, encoding?: string) => MaybePromise<FormulaTextLike>) |
    ((path: string, encoding: string, callback: (error: unknown, data?: FormulaTextLike) => void) => void);
  readFileSync?: (path: string, encoding?: string) => FormulaTextLike;
  promises?: {
    readFile?: (path: string, encoding?: string) => Promise<FormulaTextLike>;
  };
}

export interface FetchLikeResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: () => MaybePromise<string>;
  arrayBuffer?: () => MaybePromise<ArrayBuffer>;
}

export type FetchLike = (url: string | URL, init?: unknown) => MaybePromise<FetchLikeResponse>;

export type FormulaSource =
  | string
  | { text: string }
  | { formula: string }
  | { getText: () => MaybePromise<string> }
  | { readText: () => MaybePromise<string> }
  | { text: () => MaybePromise<string> }
  | { path: string; fs?: FsLike; readFile?: FsLike['readFile']; encoding?: string }
  | { url: string | URL; fetch?: FetchLike; encoding?: string }
  | { urlPath: string; baseUrl?: string | URL; fetch?: FetchLike; encoding?: string }
  | { href: string; fetch?: FetchLike; encoding?: string };

export interface FormulaSourceResolverOptions {
  fs?: FsLike;
  fetch?: FetchLike;
  encoding?: string;
}

export interface FormulaTransformResult {
  text: string;
  changed: boolean;
}

export interface BeautifyOptions {
  max_line_length?: number;
  quote_style?: 'single' | 'double' | 'preserve' | string;
  style?: 'ultra-compact' | 'compact' | 'readable' | 'json' | 'cascade' | 'smart' | string;
  strip_comments?: boolean;
  warn_on_comments?: boolean;
  preserve_empty_field_refs?: boolean;
  smart_line_breaks?: boolean;
  logger?: FormulaLogger | false | null;
}

export interface MinifyOptions {
  level?: 'micro' | 'safe' | 'standard' | 'aggressive' | 'extreme' | string;
  preserve_readability?: boolean;
  remove_comments?: boolean;
  max_line_length?: number;
  safe_line_breaks?: boolean;
  safe_break_threshold?: number;
  logger?: FormulaLogger | false | null;
}

export interface FormatFormulaOptions {
  mode?: 'beautify' | 'minify';
  beautify?: BeautifyOptions;
  minify?: MinifyOptions;
}

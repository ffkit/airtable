import type {
  FetchLike,
  FormulaLogger,
  FormulaSource,
  FormulaSourceResolverOptions,
  FormulaTextLike,
} from './types.ts';

export function normalizeFormulaLogger(logger?: FormulaLogger | false | null): Required<FormulaLogger> {
  if (logger === false || logger === null) {
    return { warn() {}, error() {} };
  }

  const fallback = typeof console !== 'undefined' ? console : undefined;

  return {
    warn: typeof logger?.warn === 'function'
      ? logger.warn.bind(logger)
      : typeof fallback?.warn === 'function'
        ? fallback.warn.bind(fallback)
        : () => {},
    error: typeof logger?.error === 'function'
      ? logger.error.bind(logger)
      : typeof fallback?.error === 'function'
        ? fallback.error.bind(fallback)
        : () => {},
  };
}

function isFormulaObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isBinaryTextLike(value: unknown): value is ArrayBuffer | ArrayBufferView {
  return (
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) ||
    (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(value))
  );
}

export function decodeFormulaText(value: unknown, encoding = 'utf-8'): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';

  if (isBinaryTextLike(value) && typeof TextDecoder !== 'undefined') {
    return new TextDecoder(encoding).decode(value);
  }

  if (typeof (value as FormulaTextLike).toString === 'function') {
    return (value as FormulaTextLike).toString(encoding);
  }

  return String(value);
}

function getGlobalFetchLike(): FetchLike | undefined {
  return typeof fetch === 'function' ? fetch.bind(globalThis) as FetchLike : undefined;
}

function resolveUrlSource(source: Record<string, unknown>): string | URL | undefined {
  let url = source.url ?? source.urlPath ?? source.href;

  if (url && source.baseUrl && typeof URL !== 'undefined') {
    url = new URL(String(url), String(source.baseUrl)).toString();
  }

  return url as string | URL | undefined;
}

async function readFormulaPathSource(source: Record<string, unknown>, options: FormulaSourceResolverOptions = {}): Promise<string> {
  const fsLike = source.fs ?? options.fs;
  const encoding = String(source.encoding ?? options.encoding ?? 'utf8');

  if (!fsLike || typeof fsLike !== 'object') {
    throw new Error('Formula path source requires an fs-like object: { path, fs } or resolver options { fs }.');
  }

  const pathValue = source.path;
  if (typeof pathValue !== 'string') {
    throw new TypeError('Formula path source requires a string "path" value.');
  }

  const fsRecord = fsLike as Record<string, any>;
  const promiseReader =
    source.readFile ??
    fsRecord.promises?.readFile ??
    (typeof fsRecord.readFile === 'function' && fsRecord.readFile.length <= 2 ? fsRecord.readFile : undefined);

  if (typeof promiseReader === 'function') {
    const receiver = source.readFile
      ? source
      : fsRecord.promises?.readFile === promiseReader
        ? fsRecord.promises
        : fsRecord;

    const value = await promiseReader.call(receiver, pathValue, encoding);
    return decodeFormulaText(value, encoding);
  }

  if (typeof fsRecord.readFileSync === 'function') {
    return decodeFormulaText(fsRecord.readFileSync(pathValue, encoding), encoding);
  }

  if (typeof fsRecord.readFile === 'function') {
    const value = await new Promise<unknown>((resolve, reject) => {
      fsRecord.readFile(pathValue, encoding, (error: unknown, data?: unknown) => {
        if (error) reject(error);
        else resolve(data);
      });
    });

    return decodeFormulaText(value, encoding);
  }

  throw new TypeError('Formula fs-like object must expose readFile, readFileSync, or promises.readFile.');
}

async function readFormulaUrlSource(source: Record<string, unknown>, options: FormulaSourceResolverOptions = {}): Promise<string> {
  const url = resolveUrlSource(source);

  if (!url) {
    throw new TypeError('Formula URL source requires "url", "urlPath", or "href".');
  }

  const fetchLike = source.fetch as FetchLike | undefined ?? options.fetch ?? getGlobalFetchLike();
  if (typeof fetchLike !== 'function') {
    throw new Error('Formula URL source requires a fetch-like function or globalThis.fetch.');
  }

  const response = await fetchLike(url);
  if (response && response.ok === false) {
    const status = response.status ? ` ${response.status}` : '';
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    throw new Error(`Failed to fetch formula source:${status}${statusText}`.trim());
  }

  if (typeof response?.text === 'function') {
    return response.text();
  }

  if (typeof response?.arrayBuffer === 'function') {
    return decodeFormulaText(await response.arrayBuffer(), String(source.encoding ?? options.encoding ?? 'utf-8'));
  }

  return decodeFormulaText(response, String(source.encoding ?? options.encoding ?? 'utf-8'));
}

export async function resolveFormulaSourceText(
  source: FormulaSource,
  options: FormulaSourceResolverOptions = {},
): Promise<string> {
  if (typeof source === 'string') return source;

  if (!isFormulaObject(source)) {
    if (source === null || source === undefined) return '';
    throw new TypeError('Formula source must be a string or supported source object.');
  }

  const sourceRecord = source as Record<string, unknown>;

  if (typeof sourceRecord.text === 'string') return sourceRecord.text;
  if (typeof sourceRecord.formula === 'string') return sourceRecord.formula;
  if (typeof sourceRecord.getText === 'function') return sourceRecord.getText() as string | Promise<string>;
  if (typeof sourceRecord.readText === 'function') return sourceRecord.readText() as string | Promise<string>;

  if (
    typeof sourceRecord.text === 'function' &&
    !('path' in sourceRecord) &&
    !('url' in sourceRecord) &&
    !('urlPath' in sourceRecord) &&
    !('href' in sourceRecord)
  ) {
    return sourceRecord.text() as string | Promise<string>;
  }

  if (typeof sourceRecord.path === 'string') return readFormulaPathSource(sourceRecord, options);
  if ('url' in sourceRecord || 'urlPath' in sourceRecord || 'href' in sourceRecord) return readFormulaUrlSource(sourceRecord, options);

  throw new TypeError('Unsupported formula source object. Use { text }, { formula }, { getText }, { path, fs }, or { url, fetch }.');
}

export function createFormulaSourceResolver(defaults: FormulaSourceResolverOptions = {}) {
  return (source: FormulaSource, overrides: FormulaSourceResolverOptions = {}) => {
    return resolveFormulaSourceText(source, { ...defaults, ...overrides });
  };
}

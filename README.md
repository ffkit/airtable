# airtable

Environment-agnostic TypeScript ESM utilities for Airtable formulas.

This repo shape is meant for direct source-file imports, including URL imports via services such as esm.sh over GitHub paths.

```ts
const { beautifyFormula } = await import('https://esm.sh/gh/<user>/<repo>/src/beautify.ts');
const { minifyFormula } = await import('https://esm.sh/gh/<user>/<repo>/src/minify.ts');
```

## Design

- Everything lives under `./src`.
- No Node imports in `src`.
- File/URL/model reads are injected through `resolveFormulaSourceText`.
- Formatter/minifier accept raw formula strings first, and source objects second.
- Language-service utilities return editor-neutral objects that can be adapted to Monaco, VS Code, CodeMirror, CLI output, or tests.

## Useful solo imports

```ts
import { beautifyFormula, EnhancedFormulaBeautifier } from './src/beautify.ts';
import { minifyFormula, EnhancedFormulaMinifier } from './src/minify.ts';
import { formatFormula } from './src/format.ts';
import { formulaDiagnostics } from './src/diagnostics.ts';
import { formulaCompletions } from './src/completions.ts';
import { formulaHover } from './src/hover.ts';
import { formulaSignatureHelp } from './src/signature.ts';
import { FUNCTION_REGISTRY } from './src/registry.ts';
import { resolveFormulaSourceText } from './src/source.ts';
```

## Source abstraction

```ts
await beautifyFormula('IF({Done}, "yes", "no")');
await beautifyFormula({ text: 'IF({Done}, "yes", "no")' });
await beautifyFormula({ getText: () => monacoModel.getValue() });
await beautifyFormula({ path: './field.formula', fs });
await beautifyFormula({ url: '/field.formula', fetch });
await beautifyFormula({ urlPath: './field.formula', baseUrl: import.meta.url, fetch });
```

A plain string is treated as formula text, not as a file path.

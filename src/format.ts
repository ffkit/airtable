import { EnhancedFormulaBeautifier } from './beautify.ts';
import { EnhancedFormulaMinifier } from './minify.ts';
import { resolveFormulaSourceText } from './source.ts';
import type { FormatFormulaOptions, FormulaSource, FormulaSourceResolverOptions, FormulaTransformResult } from './types.ts';

export async function formatFormula(
  source: FormulaSource,
  options: FormatFormulaOptions = {},
  resolverOptions: FormulaSourceResolverOptions = {},
): Promise<FormulaTransformResult> {
  const original = await resolveFormulaSourceText(source, resolverOptions);
  const mode = options.mode ?? 'beautify';

  const text = mode === 'minify'
    ? new EnhancedFormulaMinifier(options.minify ?? {}).minify(original)
    : new EnhancedFormulaBeautifier(options.beautify ?? {}).beautify(original);

  return { text, changed: text !== original };
}

export default formatFormula;

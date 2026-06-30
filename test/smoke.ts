import { beautifyFormula } from '../src/beautify.ts';
import { minifyFormula } from '../src/minify.ts';
import { formulaDiagnostics } from '../src/diagnostics.ts';
import { formulaCompletions } from '../src/completions.ts';
import { formulaHover } from '../src/hover.ts';
import { formulaSignatureHelp } from '../src/signature.ts';

const input = 'IF({Done},"yes","no")';
const beautified = await beautifyFormula(input, { logger: false });
const minified = await minifyFormula(beautified, { logger: false });
const diagnostics = formulaDiagnostics('CONCATINATE({Name})');
const completions = formulaCompletions();
const hover = formulaHover(input, { line: 0, character: 1 });
const sig = formulaSignatureHelp(input, { line: 0, character: 4 });

console.log({ beautified, minified, diagnostics: diagnostics.length, completions: completions.length, hover: !!hover, sig: !!sig });

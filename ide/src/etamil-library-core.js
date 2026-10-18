// The standard library's functions, as the editor presents them.
//
// Pure: no CodeMirror and no fetch, so it runs under plain Node in the unit tests. The data is
// assets/ide/etamil-library.json, which tools/gen_vocabulary.py writes from the compiler's own
// vocabulary: for each function its name, parameter names, one line of documentation and the
// module that defines it. etamil-library.js loads it when the editor is idle.
//
// Offering these is honest since `run_project`: the browser runs the library. A program that
// uses one has to import its module, so accepting a completion adds that line (see
// `importEdit`), which is the whole point of knowing the module.

/** The import statement's spelling the editor writes. Any spelling works; this is the Tamil one. */
export const IMPORT_KEYWORD = 'இறக்கு'

/** Lookup tables over the generated data. */
export function makeLibrary(data) {
  const byForm = new Map()
  for (const fn of data.functions) {
    for (const form of fn.forms) byForm.set(form, fn)
  }
  return {
    functions: data.functions,
    functionFor: (text) => byForm.get(text),
  }
}

/** `இறக்கு "nUlakam/paNam/paNam.qmz";` */
export function importLine(module) {
  return `${IMPORT_KEYWORD} "${module}";`
}

/**
 * Whether `source` already imports `module`: its path, in quotes, anywhere in the text.
 * That also matches the path in a comment or a string, which at worst skips adding a line
 * the author evidently has in mind; adding a second import of the same file would be harmless
 * too, since a file imported twice is included once.
 */
export function hasImport(source, module) {
  return source.includes(`"${module}"`)
}

/**
 * The change that adds the import at the top of `source`, or null when it is there already.
 * The shape is a CodeMirror change: `{ from, to, insert }`.
 */
export function importEdit(source, module) {
  if (hasImport(source, module)) return null
  return { from: 0, to: 0, insert: `${importLine(module)}\n` }
}

// A snippet placeholder ends at `}`, and `$` and `\` start an escape.
const escapeSnippet = (text) => text.replace(/[\\${}]/g, (c) => `\\${c}`)

/** A call with a named tab stop per parameter: `ரூபாய்(${1:தொகை})`. */
export function callSnippet(fn, form) {
  const params = fn.params ?? []
  if (params.length === 0) return `${escapeSnippet(form)}()`
  const stops = params.map((name, index) => '${' + (index + 1) + ':' + escapeSnippet(name) + '}')
  return `${escapeSnippet(form)}(${stops.join(', ')})`
}

/** Where a function lives, short enough for a completion's detail column: `atippatY/aNi`. */
export function libraryDetail(fn) {
  return fn.module.replace(/^nUlakam\//, '').replace(/\.qmz$/, '')
}

/** What a function is: the library's one line of documentation, and the import it needs. */
export function libraryInfo(fn) {
  return `${fn.doc}\n${importLine(fn.module)}`
}

/** `ரூபாய்(தொகை)` */
export function librarySignature(fn, form) {
  return `${form}(${(fn.params ?? []).join(', ')})`
}

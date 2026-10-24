// The language's own vocabulary, as the editor presents it.
//
// Pure: no CodeMirror and no JSON import, so it runs under plain Node in the unit tests.
// The data is assets/ide/etamil-vocabulary.json, which tools/gen_vocabulary.py writes
// from the compiler's own generated vocabulary (keywords with every spelling and a
// statement template, and the host builtins). The wrapper in etamil-vocabulary.js loads it.
//
// The standard library's functions are not here: they are most of the size and wanted later, so
// they are a file of their own, fetched when the editor is idle (etamil-library-core.js).

/** Whether a spelling is written in Tamil script rather than Latin letters. */
export function isTamil(text) {
  return /[஀-௿]/.test(text)
}

/** Lookup tables over the generated data. */
export function makeVocabulary(data) {
  const keywordByForm = new Map()
  const builtinByForm = new Map()
  for (const keyword of data.keywords) {
    for (const form of keyword.forms) keywordByForm.set(form, keyword)
  }
  for (const builtin of data.builtins) {
    for (const form of builtin.forms) builtinByForm.set(form, builtin)
  }
  return {
    keywords: data.keywords,
    builtins: data.builtins,
    keywordFor: (text) => keywordByForm.get(text),
    builtinFor: (text) => builtinByForm.get(text),
  }
}

/**
 * The compiler's statement templates are written for VS Code, where `$0` is the final
 * cursor. CodeMirror's snippets have no `$0`; an empty `${}` field is a tab stop, and
 * as the last one it serves the same purpose.
 */
function toSnippet(template) {
  return template.replaceAll('$0', '${}')
}

/**
 * The statement a keyword completion can insert, or null if it has no template. The
 * template whose script matches the spelling is chosen, so a Tamil spelling gets Tamil
 * placeholders and a romanized one gets Latin ones; `{kw}` becomes the spelling.
 */
export function keywordTemplate(keyword, form) {
  const template = isTamil(form)
    ? (keyword.snippetTamil ?? keyword.snippetLatin)
    : (keyword.snippetLatin ?? keyword.snippetTamil)
  return template ? toSnippet(template.replaceAll('{kw}', form)) : null
}

/**
 * The first spelling in each script that is worth offering a template for: the first
 * Tamil one and the first Latin one that is not an `_underscore` English alias.
 */
export function templateForms(keyword) {
  const forms = []
  const tamil = keyword.forms.find((form) => isTamil(form))
  const latin = keyword.forms.find((form) => !isTamil(form) && !form.startsWith('_'))
  if (tamil) forms.push(tamil)
  if (latin) forms.push(latin)
  return forms
}

/** A call with an empty tab stop for each argument: `name(${1}, ${2})`. */
export function callTemplate(builtin, form) {
  const arity = builtin.arity
  if (arity === 0) return `${form}()`
  if (arity == null) return `${form}(` + '${}' + ')'
  const stops = Array.from({ length: arity }, (_, i) => '${' + (i + 1) + '}')
  return `${form}(${stops.join(', ')})`
}

/** `name()`, `name(1 argument)`, `name(3 arguments)`, or just the name if unknown. */
export function signature(builtin, form) {
  const arity = builtin.arity
  if (arity === 0) return `${form}()`
  if (arity == null) return form
  return `${form}(${arity} ${arity === 1 ? 'argument' : 'arguments'})`
}

/** What a builtin is: the compiler's own one-line documentation. */
export function builtinInfo(builtin, form) {
  return builtin.doc || signature(builtin, form)
}

/** What a keyword is: its group, and every other way it can be written. */
export function keywordInfo(keyword, form) {
  const others = keyword.forms.filter((spelling) => spelling !== form)
  return others.length
    ? `${keyword.group}. Also written: ${others.join(', ')}.`
    : `${keyword.group}.`
}

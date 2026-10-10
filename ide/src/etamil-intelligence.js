// CodeMirror adapters over the wasm compiler front end.
//
// Everything here is translation: compiler diagnostics into CodeMirror ranges,
// compiler symbols into completion options. The compiler bridge itself
// (etamil-compiler.js) stays editor-agnostic so a second shell can reuse it.

import { linter, lintGutter, forceLinting } from '@codemirror/lint'
import { snippetCompletion } from '@codemirror/autocomplete'
import { EditorView, ViewPlugin, hoverTooltip } from '@codemirror/view'

import { diagnostics, symbolsAt, ready } from './etamil-compiler.js'
import { etamilLanguage, IDENTIFIER, KEYWORD_TAGS } from './etamil-language.js'
import {
  vocabulary,
  keywordTemplate,
  templateForms,
  callTemplate,
  signature,
  builtinInfo,
  keywordInfo,
} from './etamil-vocabulary.js'

// --- Diagnostics -----------------------------------------------------------

/**
 * Convert the compiler's 1-based line/column into a document offset.
 *
 * The compiler counts columns in characters (Unicode scalar values); CodeMirror
 * counts UTF-16 code units. Tamil lives entirely in the BMP, so for eTamil
 * source the two agree. They would drift on an astral-plane character inside a
 * string or comment -- an emoji, say -- which would shift that one marker by a
 * column. Clamping below keeps such a case harmless rather than throwing.
 */
function rangeFor(doc, d) {
  const lineNo = Math.min(Math.max(d.line, 1), doc.lines)
  const line = doc.line(lineNo)
  const from = Math.min(line.from + Math.max(d.column - 1, 0), line.to)
  const to = Math.min(from + Math.max(d.length, 1), line.to)
  // A zero-width range renders no marker; borrow a column from the left when
  // the error sits at end of line.
  return from === to ? { from: Math.max(from - 1, line.from), to } : { from, to }
}

const etamilLinter = linter(
  (view) => {
    const doc = view.state.doc
    return diagnostics(doc.toString()).map((d) => ({
      ...rangeFor(doc, d),
      severity: d.severity === 'error' ? 'error' : 'warning',
      // Names which pass rejected the input, so "expected ; " and "declared
      // எண் but given சொல்" are visibly different kinds of problem.
      source: `etamil (${d.stage})`,
      message: d.message,
    }))
  },
  // The front end is fast enough that this could be near-zero, but a short
  // delay stops markers flickering under the cursor mid-word.
  { delay: 250 }
)

// The wasm finishes loading after the first lint pass has already run and
// returned nothing. Without this the editor shows no errors until the next
// keystroke.
const relintOnLoad = ViewPlugin.define((view) => {
  ready().then(() => forceLinting(view))
  return {}
})

// --- Completion ------------------------------------------------------------

// CodeMirror draws an icon per completion type. The generated token table's
// tags are finer-grained than the icon set, so several map onto one.
const ICON_FOR_TAG = {
  control: 'keyword',
  keyword: 'keyword',
  opKeyword: 'keyword',
  type: 'type',
  bool: 'constant',
  null: 'constant',
  domain: 'constant',
  builtin: 'constant',
}

const ICON_FOR_KIND = {
  function: 'function',
  parameter: 'variable',
  variable: 'variable',
}

// Built once: the spellings never change at runtime. A spelling that is also a builtin
// is left out here and offered below as the function it is, with its signature.
const KEYWORD_OPTIONS = Object.entries(KEYWORD_TAGS)
  .filter(([label]) => !vocabulary.builtinFor(label))
  .map(([label, tag]) => {
    const keyword = vocabulary.keywordFor(label)
    return {
      label,
      type: ICON_FOR_TAG[tag] ?? 'keyword',
      // Ranks keywords below names the author actually declared -- their own
      // variable is nearly always what they meant over a keyword that merely
      // shares a prefix.
      boost: -1,
      detail: keyword?.group,
      info: keyword ? keywordInfo(keyword, label) : undefined,
    }
  })

// A statement template for each keyword that has one, as an item of its own. It is not the
// keyword's own completion: eTamil writes the condition before `எனில்`, so completing the
// keyword in the middle of a statement must insert only the word, not a second statement.
// The label starts with the spelling, so typing the keyword finds it.
const TEMPLATE_OPTIONS = vocabulary.keywords.flatMap((keyword) =>
  templateForms(keyword).flatMap((form) => {
    const template = keywordTemplate(keyword, form)
    return template
      ? [
          snippetCompletion(template, {
            label: `${form} …`,
            type: 'keyword',
            detail: 'statement template',
            boost: -2,
          }),
        ]
      : []
  })
)

// The host builtins, with the call as a snippet. The standard library is not offered: the
// browser's compiler cannot import, so a library function would not run here.
const BUILTIN_OPTIONS = vocabulary.builtins.flatMap((builtin) =>
  builtin.forms.map((form) =>
    snippetCompletion(callTemplate(builtin, form), {
      label: form,
      type: 'function',
      detail: signature(builtin, form),
      info: builtinInfo(builtin, form),
      boost: -1,
    })
  )
)

function completeEtamil(context) {
  const token = context.matchBefore(IDENTIFIER)
  if (!token) return null
  if (token.from === token.to && !context.explicit) return null

  // Scoped to the cursor, so another function's parameters and locals are not
  // offered here -- suggesting a name that cannot compile is worse than
  // suggesting nothing. The compiler converts position to scope; this side
  // only has to translate CodeMirror's 0-based offset into the 1-based
  // line/column the compiler speaks.
  const line = context.state.doc.lineAt(context.pos)
  const declared = symbolsAt(
    context.state.doc.toString(),
    line.number,
    context.pos - line.from + 1
  ).map((s) => ({
    label: s.name,
    type: ICON_FOR_KIND[s.kind] ?? 'variable',
    detail: s.detail || undefined,
  }))

  return {
    from: token.from,
    options: [...declared, ...BUILTIN_OPTIONS, ...KEYWORD_OPTIONS, ...TEMPLATE_OPTIONS],
    // Re-filter in place while the word grows instead of re-querying wasm on
    // every keystroke.
    validFor: IDENTIFIER,
  }
}

// Attached as language data rather than its own autocompletion() instance, so
// it composes with the one basicSetup already installs instead of fighting it.
const etamilCompletion = etamilLanguage.data.of({ autocomplete: completeEtamil })

// --- Hover -----------------------------------------------------------------

// The word under the pointer: the identifier that covers the position, found with the
// lexer's own pattern (CodeMirror's word boundaries split a Tamil word at its pulli).
function wordAt(state, pos) {
  const line = state.doc.lineAt(pos)
  const pattern = new RegExp(IDENTIFIER.source, 'g')
  for (let match = pattern.exec(line.text); match; match = pattern.exec(line.text)) {
    const from = line.from + match.index
    const to = from + match[0].length
    if (pos >= from && pos <= to) return { text: match[0], from, to }
  }
  return null
}

function tooltip(heading, body) {
  const dom = document.createElement('div')
  dom.className = 'etamil-hover'
  const strong = document.createElement('strong')
  strong.textContent = heading
  dom.append(strong)
  if (body) {
    const text = document.createElement('div')
    text.textContent = body
    dom.append(text)
  }
  return { dom }
}

// What a keyword or a builtin is, from the compiler's own documentation. A name the author
// declared gets nothing here: completion already shows its kind and type, and a tooltip that
// repeats the word back is noise.
const etamilHover = hoverTooltip((view, pos) => {
  const word = wordAt(view.state, pos)
  if (!word) return null
  const builtin = vocabulary.builtinFor(word.text)
  if (builtin) {
    return {
      pos: word.from,
      end: word.to,
      above: true,
      create: () => tooltip(`builtin ${signature(builtin, word.text)}`, builtinInfo(builtin, word.text)),
    }
  }
  const keyword = vocabulary.keywordFor(word.text)
  if (keyword && !keyword.noSyntax) {
    return {
      pos: word.from,
      end: word.to,
      above: true,
      create: () => tooltip(`keyword ${word.text}`, keywordInfo(keyword, word.text)),
    }
  }
  return null
})

const hoverTheme = EditorView.theme({
  '.etamil-hover': {
    padding: '6px 10px',
    maxWidth: '420px',
    whiteSpace: 'pre-wrap',
    color: 'var(--ide-text, #DCE9F8)',
  },
})

// --- Public ----------------------------------------------------------------

/**
 * Diagnostics, completion and hover backed by the real compiler. Add alongside
 * `etamil()` from etamil-language.js, which supplies highlighting.
 */
export function etamilIntelligence() {
  return [etamilLinter, lintGutter(), relintOnLoad, etamilCompletion, etamilHover, hoverTheme]
}

// eTamil Studio's form builder: a form, as data, and the eTamil program it becomes.
//
// Pure: no page and no wasm, so it runs under plain Node in the unit tests (which also run
// what it generates through the real compiler). The page that edits a form and shows it is
// etamil-form-builder.js.
//
// A form has FIELDS (what a person types), CALCULATIONS (named results worked out from the
// fields and from each other, in order) and CHECKS (a condition under which the form is
// wrong, and what to tell the person). Nothing here is a second language: a calculation is an
// eTamil expression, and the program that evaluates the form is eTamil, run by the compiler's
// own VM, so a total is exact to the paisa for the same reason it is in any eTamil program.
//
// The first slice stores nothing. A form's definition is kept in the browser and can be
// exported; the values typed into it are not kept anywhere.

export const FORMAT = 'etamil-form'
export const VERSION = 1

export const FIELD_TYPES = ['number', 'percent', 'text']

/** A form with nothing in it. */
export function makeForm(title = '') {
  return { title, fields: [], calcs: [], checks: [] }
}

/**
 * The form the page opens with: tax on an amount. Names are in the project's own romanization
 * (qokY is தொகை, vikiqam is விகிதம், vari is வரி, moqqam is மொத்தம்), and the labels carry both
 * scripts.
 */
export function sampleForm() {
  return {
    title: 'GST invoice / ஜிஎஸ்டி விலைப்பட்டியல்',
    fields: [
      { id: 'qokY', label: 'Amount / தொகை', type: 'number', value: '1000' },
      { id: 'vikiqam', label: 'GST rate / விகிதம்', type: 'percent', value: '18' },
    ],
    calcs: [
      { id: 'vari', label: 'GST / வரி', formula: 'qokY * vikiqam' },
      { id: 'moqqam', label: 'Total / மொத்தம்', formula: 'qokY + vari' },
    ],
    checks: [
      {
        when: 'qokY < 0',
        message: 'The amount must not be negative / தொகை எதிர்மறையாக இருக்கக்கூடாது',
      },
    ],
  }
}

// --- Names ----------------------------------------------------------------------------------

// What an eTamil identifier is made of: Latin letters, Tamil letters and marks, digits and `_`,
// not starting with a digit. Whether a word is also a keyword is the compiler's to say, and the
// page asks it.
const IDENTIFIER = /^[A-Za-z_஀-௿][A-Za-z0-9_஀-௿]*$/

/** What is wrong with `id` as the name of a field or a calculation, or null. */
export function idProblem(id, taken = []) {
  if (!id) return 'a name is needed'
  if (!IDENTIFIER.test(id)) return 'use letters, Tamil letters, digits and _, and do not start with a digit'
  // The downloadable programs name their own helpers with two underscores (`qokY__text`), and `__` also
  // marks an English comment, so a name may not contain it.
  if (id.includes('__')) return 'two underscores in a row are kept for the generated program'
  if (taken.includes(id)) return 'another field or calculation already has this name'
  return null
}

/** Every field and calculation id, in the order the program defines them. */
export const allIds = (form) => [...form.fields.map((f) => f.id), ...form.calcs.map((c) => c.id)]

/** Problems with the design itself (not with what someone typed into it), keyed by where. */
export function designProblems(form) {
  const problems = []
  const seen = []
  for (const [kind, items] of [['field', form.fields], ['calculation', form.calcs]]) {
    items.forEach((item, index) => {
      const problem = idProblem(item.id, seen)
      if (problem) problems.push({ kind, index, id: item.id, message: problem })
      else seen.push(item.id)
    })
  }
  form.calcs.forEach((calc, index) => {
    if (!String(calc.formula ?? '').trim()) {
      problems.push({ kind: 'calculation', index, id: calc.id, message: 'a formula is needed' })
    }
  })
  form.checks.forEach((check, index) => {
    if (!String(check.when ?? '').trim()) {
      problems.push({ kind: 'check', index, id: '', message: 'a condition is needed' })
    }
  })
  return problems
}

// --- What someone typed, as eTamil -----------------------------------------------------------

const NUMBER = /^-?\d+(\.\d+)?$/

/** An eTamil string literal for any text: quotes and backslashes escaped, one line. */
export function stringLiteral(text) {
  const clean = String(text)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/\t/g, ' ')
  return `"${clean}"`
}

/**
 * The literal for what was typed into a field, or `{ error }` when it is not a value of the
 * field's type. A number is kept as typed, so `250.50` stays exact; a percent is the number
 * with `%`, which the language reads as exactly that fraction.
 */
export function fieldLiteral(field, raw) {
  const text = String(raw ?? '').trim()
  if (field.type === 'text') return { text: stringLiteral(raw ?? '') }
  if (text === '') return { error: 'enter a number' }
  if (!NUMBER.test(text)) return { error: 'a number is needed, such as 250.50' }
  return { text: field.type === 'percent' ? `${text}%` : text }
}

// --- The program ------------------------------------------------------------------------------

// A comment carries the form's title, which is the author's text: one line, and nothing that
// could be read as the end of the `__ ... __` mark.
const commentText = (text) => String(text).replace(/\s+/g, ' ').replace(/_{2,}/g, '_').trim()

/**
 * The eTamil program that works the form out for these values.
 *
 * `values` maps a field id to what was typed. Returns `{ program, origins }`, or `{ problems }`
 * when a field's value is not valid. `origins` maps each line of the program to where it came
 * from (`{ kind: 'field' | 'calculation' | 'check', id | index }`), so an error the compiler
 * reports at a line can be shown against the calculation that caused it.
 *
 * The program prints one `id=value` line per calculation, and a `!` line for each check that
 * fails. Nothing else is printed.
 */
export function buildProgram(form, values) {
  const problems = {}
  const lines = []
  const origins = {}
  const add = (text, origin) => {
    lines.push(text)
    if (origin) origins[lines.length] = origin
  }

  add(`// __generated by eTamil Studio: ${commentText(form.title || 'a form')}__`)
  add('// __changing this changes nothing: change the form__')

  for (const field of form.fields) {
    const literal = fieldLiteral(field, values[field.id])
    if (literal.error) problems[field.id] = literal.error
    else add(`${field.id} = ${literal.text};`, { kind: 'field', id: field.id })
  }
  if (Object.keys(problems).length) return { problems }

  for (const calc of form.calcs) {
    add(`${calc.id} = ${String(calc.formula).trim()};`, { kind: 'calculation', id: calc.id })
  }

  form.checks.forEach((check, index) => {
    add(`(${String(check.when).trim()}) எனில் {`, { kind: 'check', index })
    add(`    அச்சு "!" & ${stringLiteral(check.message || 'This is not right')};`, { kind: 'check', index })
    add('}', { kind: 'check', index })
  })

  for (const calc of form.calcs) {
    add(`அச்சு ${stringLiteral(`${calc.id}=`)} & ${calc.id};`, { kind: 'calculation', id: calc.id })
  }

  return { program: lines.join('\n') + '\n', origins }
}

/** What a run printed: `{ values: { id: text }, messages: [text] }`. */
export function parseOutput(output) {
  const values = {}
  const messages = []
  for (const line of String(output ?? '').split('\n')) {
    if (line === '') continue
    if (line.startsWith('!')) {
      messages.push(line.slice(1))
      continue
    }
    const cut = line.indexOf('=')
    if (cut > 0) values[line.slice(0, cut)] = line.slice(cut + 1)
  }
  return { values, messages }
}

/**
 * Which part of the form a compiler error is about, from the line it names, or null.
 * The compiler's messages end with `(line 4, column 9: ...)` in English.
 */
export function whereIsTheError(error, origins) {
  const found = /\(line (\d+), column/.exec(String(error ?? ''))
  return found ? (origins[Number(found[1])] ?? null) : null
}

/**
 * Work the form out. `run(source)` is the compiler's `run` (or any stand-in): it takes a
 * program and returns `{ ok, output, error, stage }`.
 *
 * Returns `{ ok, values, messages, problems, error, stage, where, program }`:
 * - `problems`: a field whose value is not valid, by id, with nothing run;
 * - `values` and `messages`: the results and the failed checks, when it ran;
 * - `error` and `where`: the compiler's own message when it did not, and the field,
 *   calculation or check it names.
 */
export function runForm(form, values, run) {
  const built = buildProgram(form, values)
  if (built.problems) return { ok: false, problems: built.problems, values: {}, messages: [] }

  const result = run(built.program)
  const printed = parseOutput(result.output)
  return {
    ok: !!result.ok,
    values: printed.values,
    messages: printed.messages,
    problems: {},
    error: result.error ?? null,
    stage: result.stage ?? null,
    where: result.ok ? null : whereIsTheError(result.error, built.origins),
    program: built.program,
  }
}

// --- Saving and loading a design ---------------------------------------------------------------

export function serialize(form) {
  return JSON.stringify({ format: FORMAT, version: VERSION, form }, null, 2)
}

const text = (value) => (typeof value === 'string' ? value : '')

/** A form from its JSON, or null if it is not one of ours or is damaged. */
export function parse(source) {
  let data
  try {
    data = JSON.parse(source)
  } catch {
    return null
  }
  if (!data || data.format !== FORMAT || data.version !== VERSION || !data.form) return null
  const { form } = data
  if (!Array.isArray(form.fields) || !Array.isArray(form.calcs) || !Array.isArray(form.checks)) return null
  return {
    title: text(form.title),
    fields: form.fields.map((f) => ({
      id: text(f?.id),
      label: text(f?.label),
      type: FIELD_TYPES.includes(f?.type) ? f.type : 'number',
      value: text(f?.value),
    })),
    calcs: form.calcs.map((c) => ({ id: text(c?.id), label: text(c?.label), formula: text(c?.formula) })),
    checks: form.checks.map((c) => ({ when: text(c?.when), message: text(c?.message) })),
  }
}

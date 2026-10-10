import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  makeForm,
  sampleForm,
  idProblem,
  allIds,
  designProblems,
  stringLiteral,
  fieldLiteral,
  buildProgram,
  parseOutput,
  whereIsTheError,
  runForm,
  serialize,
  parse,
  FIELD_TYPES,
} from '../src/etamil-form-core.js'

// --- the real compiler, when it has been built (npm run wasm) -----------------------------------
// The generated programs are checked by running them. ide/wasm is a build input and is not in the
// repository, so these tests say they were skipped rather than pass without checking anything.

const glue = new URL('../wasm/etamil_compiler.js', import.meta.url)
const binary = new URL('../wasm/etamil_compiler_bg.wasm', import.meta.url)
let compiler = null
if (existsSync(glue) && existsSync(binary)) {
  const wasm = await import(glue.href)
  await wasm.default({ module_or_path: readFileSync(binary) })
  compiler = (source) => JSON.parse(wasm.run(source))
}
const withCompiler = compiler ? test : test.skip

const values = (form, overrides = {}) => ({
  ...Object.fromEntries(form.fields.map((f) => [f.id, f.value])),
  ...overrides,
})

// --- names ---------------------------------------------------------------------------------------

test('names: Latin and Tamil letters, digits and underscores are fine', () => {
  for (const id of ['qokY', 'moqqam_vari', 'தொகை', 'வரி2', '_total']) assert.equal(idProblem(id), null, id)
})

test('names: nothing, a digit first, a space or a symbol is refused', () => {
  for (const id of ['', '2fast', 'a b', 'a-b', 'a.b', 'a"b', 'a;b']) assert.ok(idProblem(id), `"${id}"`)
})

test('names: a name already taken is refused', () => {
  assert.ok(idProblem('qokY', ['qokY', 'vari']))
  assert.equal(idProblem('moqqam', ['qokY', 'vari']), null)
})

test('the sample form has a clean design', () => {
  assert.deepEqual(designProblems(sampleForm()), [])
  assert.deepEqual(allIds(sampleForm()), ['qokY', 'vikiqam', 'vari', 'moqqam'])
})

test('design problems are found and say where', () => {
  const form = sampleForm()
  form.fields.push({ id: 'qokY', label: 'again', type: 'number', value: '1' })
  form.calcs.push({ id: 'x', label: '', formula: '  ' })
  form.checks.push({ when: '', message: '' })
  const problems = designProblems(form)
  assert.ok(problems.some((p) => p.kind === 'field' && p.index === 2), 'the repeated name')
  assert.ok(problems.some((p) => p.kind === 'calculation' && p.message === 'a formula is needed'))
  assert.ok(problems.some((p) => p.kind === 'check'))
})

// --- values ---------------------------------------------------------------------------------------

test('a number is kept as typed, so a decimal stays exact', () => {
  assert.deepEqual(fieldLiteral({ type: 'number' }, ' 250.50 '), { text: '250.50' })
  assert.deepEqual(fieldLiteral({ type: 'number' }, '-3'), { text: '-3' })
})

test('a percent is the number with %', () => {
  assert.deepEqual(fieldLiteral({ type: 'percent' }, '18'), { text: '18%' })
})

test('a number field refuses what is not a number, and an empty one', () => {
  for (const raw of ['abc', '1,000', '1e5', '1.', '.5', '--1', '']) {
    assert.ok(fieldLiteral({ type: 'number' }, raw).error, `"${raw}"`)
  }
})

test('text is quoted with quotes, backslashes and newlines escaped', () => {
  assert.equal(stringLiteral('a"b'), '"a\\"b"')
  assert.equal(stringLiteral('a\\b'), '"a\\\\b"')
  assert.equal(stringLiteral('a\nb'), '"a\\nb"')
  assert.equal(stringLiteral('வணக்கம்'), '"வணக்கம்"')
})

// --- the program ----------------------------------------------------------------------------------

test('a program has the fields, then the calculations, then the checks, then the results', () => {
  const form = sampleForm()
  const { program } = buildProgram(form, values(form))
  const at = (needle) => program.indexOf(needle)
  assert.ok(at('qokY = 1000;') < at('vari = qokY * vikiqam;'))
  assert.ok(at('vikiqam = 18%;') < at('vari = '))
  assert.ok(at('moqqam = qokY + vari;') < at('எனில்'))
  assert.ok(at('எனில்') < at('அச்சு "moqqam=" & moqqam;'))
})

test('a field with an invalid value stops the program being built, and says which', () => {
  const form = sampleForm()
  const built = buildProgram(form, values(form, { qokY: 'lots' }))
  assert.equal(built.program, undefined)
  assert.deepEqual(Object.keys(built.problems), ['qokY'])
})

test('the title cannot break out of its comment', () => {
  const form = sampleForm()
  form.title = 'a\nb __ c'
  const { program } = buildProgram(form, values(form))
  const first = program.split('\n')[0]
  assert.ok(!first.includes('\n') && first.startsWith('// __generated'), first)
  assert.equal(first.endsWith('__'), true)
  assert.equal((first.match(/__/g) || []).length, 2, 'only the opening and closing mark')
})

test('output is read back as values and failed checks', () => {
  assert.deepEqual(parseOutput('vari=180\nmoqqam=1180\n!too much\n'), {
    values: { vari: '180', moqqam: '1180' },
    messages: ['too much'],
  })
  assert.deepEqual(parseOutput('a=b=c\n'), { values: { a: 'b=c' }, messages: [] })
  assert.deepEqual(parseOutput(''), { values: {}, messages: [] })
})

test('an error is traced to the line it names', () => {
  const origins = { 4: { kind: 'calculation', id: 'vari' } }
  assert.deepEqual(whereIsTheError('x (line 4, column 9: expected a name)', origins), { kind: 'calculation', id: 'vari' })
  assert.equal(whereIsTheError('division by zero', origins), null)
  assert.equal(whereIsTheError('x (line 99, column 1: y)', origins), null)
})

// --- running it, with the real compiler -------------------------------------------------------------

withCompiler('the sample form works out the tax and the total exactly', () => {
  const form = sampleForm()
  const result = runForm(form, values(form), compiler)
  assert.equal(result.ok, true, result.error)
  assert.deepEqual(result.values, { vari: '180', moqqam: '1180' })
  assert.deepEqual(result.messages, [])
})

withCompiler('a decimal amount stays exact to the paisa', () => {
  const form = sampleForm()
  const result = runForm(form, values(form, { qokY: '250.50' }), compiler)
  assert.equal(result.values.moqqam, '295.59')
  assert.equal(result.values.vari, '45.09')
})

withCompiler('a failed check is reported, and the results are still worked out', () => {
  const form = sampleForm()
  const result = runForm(form, values(form, { qokY: '-5' }), compiler)
  assert.equal(result.ok, true)
  assert.equal(result.messages.length, 1)
  assert.match(result.messages[0], /negative/)
  assert.equal(result.values.moqqam, '-5.9')
})

withCompiler('text fields work, and a quote in them does not break the program', () => {
  const form = makeForm('letter')
  form.fields.push({ id: 'peyar', label: 'Name', type: 'text', value: 'A "quoted" name' })
  form.calcs.push({ id: 'vaNakkam', label: 'Greeting', formula: '"Hello " & peyar' })
  const result = runForm(form, values(form), compiler)
  assert.equal(result.ok, true, result.error)
  assert.equal(result.values.vaNakkam, 'Hello A "quoted" name')
})

withCompiler('a mistake in a formula is the compiler\'s own message, against the right calculation', () => {
  const form = sampleForm()
  form.calcs[0].formula = 'qokY *'
  const result = runForm(form, values(form), compiler)
  assert.equal(result.ok, false)
  assert.equal(result.stage, 'parse')
  assert.deepEqual(result.where, { kind: 'calculation', id: 'vari' })
  assert.match(result.error, /line \d+, column \d+/)
})

withCompiler('a name a formula does not know is an error, not a silent zero', () => {
  const form = sampleForm()
  form.calcs[0].formula = 'qokY * missing'
  const result = runForm(form, values(form), compiler)
  assert.equal(result.ok, false)
})

withCompiler('dividing by zero is reported', () => {
  const form = sampleForm()
  form.calcs[0].formula = 'qokY / 0'
  const result = runForm(form, values(form), compiler)
  assert.equal(result.ok, false)
  assert.match(result.error, /zero/)
})

withCompiler('a form with no calculations runs and has nothing to show', () => {
  const form = makeForm('empty')
  form.fields.push({ id: 'a', label: 'A', type: 'number', value: '1' })
  const result = runForm(form, values(form), compiler)
  assert.equal(result.ok, true)
  assert.deepEqual(result.values, {})
})

// --- saving ---------------------------------------------------------------------------------------

test('a design survives being saved and loaded', () => {
  const form = sampleForm()
  assert.deepEqual(parse(serialize(form)), form)
})

test('something that is not a saved form is refused', () => {
  for (const source of ['', 'not json', '{}', '{"format":"other","version":1,"form":{}}', '{"format":"etamil-form","version":2,"form":{}}']) {
    assert.equal(parse(source), null, source)
  }
})

test('a damaged field is repaired to something usable, not trusted', () => {
  const loaded = parse(JSON.stringify({ format: 'etamil-form', version: 1, form: { title: 3, fields: [{ id: 'a', type: 'weird' }], calcs: [], checks: [] } }))
  assert.equal(loaded.title, '')
  assert.equal(loaded.fields[0].type, 'number')
  assert.ok(FIELD_TYPES.includes(loaded.fields[0].type))
})

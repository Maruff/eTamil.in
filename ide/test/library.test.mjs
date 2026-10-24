import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  makeLibrary,
  importLine,
  hasImport,
  importEdit,
  callSnippet,
  libraryDetail,
  libraryInfo,
  librarySignature,
} from '../src/etamil-library-core.js'

const data = JSON.parse(readFileSync(new URL('../../assets/ide/etamil-library.json', import.meta.url), 'utf8'))
const rupee = { name: 'ரூபாய்', forms: ['ரூபாய்'], params: ['தொகை'], arity: 1, doc: 'ரூபாய்(தொகை) — a rupee amount', module: 'nUlakam/paNam/paNam.qmz' }

test('the generated data holds the whole library, each function with what completion needs', () => {
  assert.ok(data.functions.length >= 900, `only ${data.functions.length} functions`)
  for (const fn of data.functions) {
    assert.ok(fn.name && fn.forms.length >= 1, `${fn.name}: no spelling`)
    assert.ok(Array.isArray(fn.params), `${fn.name}: no parameter names`)
    assert.ok(fn.module.startsWith('nUlakam/') && fn.module.endsWith('.qmz'), `${fn.name}: ${fn.module}`)
    assert.ok(typeof fn.doc === 'string' && fn.doc.length > 0, `${fn.name}: no documentation`)
  }
})

test('every name and parameter survives being put in a snippet', () => {
  for (const fn of data.functions) {
    const snippet = callSnippet(fn, fn.forms[0])
    // Placeholders are balanced and numbered 1..n in order.
    const numbers = [...snippet.matchAll(/\$\{(\d+):/g)].map((m) => Number(m[1]))
    assert.deepEqual(numbers, fn.params.map((_, i) => i + 1), `${fn.name}: ${snippet}`)
  }
})

test('the library is indexed by every spelling', () => {
  const library = makeLibrary({ functions: [{ ...rupee, forms: ['ரூபாய்', 'rUpAy'] }] })
  assert.equal(library.functionFor('ரூபாய்').module, rupee.module)
  assert.equal(library.functionFor('rUpAy').module, rupee.module)
  assert.equal(library.functionFor('nothing'), undefined)
})

test('a real library function is found by name', () => {
  const library = makeLibrary(data)
  assert.equal(library.functionFor('ரூபாய்')?.module, 'nUlakam/paNam/paNam.qmz')
})

test('the import line is the statement an author writes', () => {
  assert.equal(importLine('nUlakam/paNam/paNam.qmz'), 'இறக்கு "nUlakam/paNam/paNam.qmz";')
})

test('an import is added at the top when the program does not have it', () => {
  const edit = importEdit('அச்சு 1;\n', 'nUlakam/paNam/paNam.qmz')
  assert.deepEqual(edit, { from: 0, to: 0, insert: 'இறக்கு "nUlakam/paNam/paNam.qmz";\n' })
})

test('an import is not added twice', () => {
  const source = 'இறக்கு "nUlakam/paNam/paNam.qmz";\nஅச்சு 1;\n'
  assert.equal(hasImport(source, 'nUlakam/paNam/paNam.qmz'), true)
  assert.equal(importEdit(source, 'nUlakam/paNam/paNam.qmz'), null)
})

test('another module is not mistaken for the one wanted', () => {
  const source = 'இறக்கு "nUlakam/paNam/paNam2.qmz";\n'
  assert.equal(hasImport(source, 'nUlakam/paNam/paNam.qmz'), false)
})

test('a call gets one named stop per parameter', () => {
  assert.equal(callSnippet(rupee, 'ரூபாய்'), 'ரூபாய்(${1:தொகை})')
  assert.equal(
    callSnippet({ ...rupee, params: ['அ', 'ஆ'] }, 'f'),
    'f(${1:அ}, ${2:ஆ})',
  )
  assert.equal(callSnippet({ ...rupee, params: [] }, 'f'), 'f()')
  assert.equal(callSnippet({ ...rupee, params: null }, 'f'), 'f()')
})

test('characters that mean something in a snippet are escaped', () => {
  assert.equal(callSnippet({ ...rupee, params: ['a}b'] }, 'f'), 'f(${1:a\\}b})')
  assert.equal(callSnippet({ ...rupee, params: ['$x'] }, 'f'), 'f(${1:\\$x})')
})

test('detail, info and signature say where a function is from and what it takes', () => {
  assert.equal(libraryDetail(rupee), 'paNam/paNam')
  assert.equal(libraryInfo(rupee), 'ரூபாய்(தொகை) — a rupee amount\nஇறக்கு "nUlakam/paNam/paNam.qmz";')
  assert.equal(librarySignature({ ...rupee, params: ['அ', 'ஆ'] }, 'f'), 'f(அ, ஆ)')
})

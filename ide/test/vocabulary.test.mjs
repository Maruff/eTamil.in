// The vocabulary the editor offers, checked against the real generated data.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import {
  isTamil,
  makeVocabulary,
  keywordTemplate,
  templateForms,
  callTemplate,
  signature,
  builtinInfo,
  keywordInfo,
} from '../src/etamil-vocabulary-core.js'

const data = JSON.parse(readFileSync(new URL('../../assets/ide/etamil-vocabulary.json', import.meta.url), 'utf8'))
const vocabulary = makeVocabulary(data)

test('the data has keywords and builtins, and no standard library', () => {
  assert.ok(vocabulary.keywords.length > 100, `${vocabulary.keywords.length} keywords`)
  assert.ok(vocabulary.builtins.length > 80, `${vocabulary.builtins.length} builtins`)
  // The browser's compiler cannot import, so a library function must not be offered.
  assert.ok(data.functions === undefined, 'no standard library functions')
  assert.ok(vocabulary.keywords.every((k) => !k.noSyntax), 'unusable keywords are left out')
})

test('every spelling can be looked up', () => {
  for (const keyword of vocabulary.keywords) {
    for (const form of keyword.forms) assert.equal(vocabulary.keywordFor(form).token, keyword.token)
  }
  assert.equal(vocabulary.keywordFor('எனில்').token, 'If')
  assert.equal(vocabulary.keywordFor('eZil').token, 'If')
  assert.equal(vocabulary.keywordFor('no such word'), undefined)
})

test('isTamil tells the scripts apart', () => {
  assert.ok(isTamil('எனில்'))
  assert.ok(!isTamil('eZil'))
  assert.ok(!isTamil('_if'))
})

test('a Tamil spelling gets the Tamil template and a Latin one the Latin template', () => {
  const keyword = vocabulary.keywordFor('எனில்')
  const tamil = keywordTemplate(keyword, 'எனில்')
  const latin = keywordTemplate(keyword, 'eZil')
  assert.ok(tamil.includes('எனில்') && tamil.includes('நிபந்தனை'), tamil)
  assert.ok(latin.includes('eZil') && latin.includes('condition'), latin)
})

test('a template becomes valid CodeMirror snippet syntax', () => {
  for (const keyword of vocabulary.keywords) {
    for (const form of templateForms(keyword)) {
      const template = keywordTemplate(keyword, form)
      if (template === null) continue
      assert.ok(!template.includes('{kw}'), `${form}: the spelling replaces the marker`)
      assert.ok(!template.includes('$0'), `${form}: VS Code's final-cursor marker is converted`)
      // Each ${ opens a field that closes with a }, and nothing is left dangling. Some
      // statements (stopping the server) have no field at all, which is fine.
      const opens = [...template.matchAll(/\$\{/g)].length
      const closed = [...template.matchAll(/\$\{[^{}]*\}/g)].length
      assert.equal(closed, opens, `${form}: every field closes`)
    }
  }
})

test('the template forms are the first Tamil and the first Latin, never an underscore alias', () => {
  const keyword = vocabulary.keywordFor('எனில்')
  assert.deepEqual(templateForms(keyword), ['எனில்', 'eZil'])
})

test('a builtin call has a tab stop per argument', () => {
  const noArguments = { arity: 0 }
  const two = { arity: 2 }
  const unknown = { arity: null }
  assert.equal(callTemplate(noArguments, 'f'), 'f()')
  assert.equal(callTemplate(two, 'f'), 'f(${1}, ${2})')
  assert.equal(callTemplate(unknown, 'f'), 'f(${})')
  for (const builtin of vocabulary.builtins) {
    for (const form of builtin.forms) {
      const call = callTemplate(builtin, form)
      assert.ok(call.startsWith(form + '('), call)
      // One empty field per argument; an unknown count gets a single field.
      assert.equal([...call.matchAll(/\$\{/g)].length, builtin.arity ?? 1, call)
    }
  }
})

test('signatures say how many arguments, or nothing if it is unknown', () => {
  assert.equal(signature({ arity: 0 }, 'f'), 'f()')
  assert.equal(signature({ arity: 1 }, 'f'), 'f(1 argument)')
  assert.equal(signature({ arity: 3 }, 'f'), 'f(3 arguments)')
  assert.equal(signature({ arity: null }, 'f'), 'f')
})

test('documentation falls back to the signature when the builtin has none', () => {
  assert.equal(builtinInfo({ arity: 2, doc: '' }, 'f'), 'f(2 arguments)')
  assert.equal(builtinInfo({ arity: 2, doc: 'adds' }, 'f'), 'adds')
})

test('a keyword names its group and its other spellings', () => {
  const text = keywordInfo(vocabulary.keywordFor('எனில்'), 'எனில்')
  assert.ok(text.includes('Also written') && text.includes('eZil') && !text.includes('எனில், '), text)
})

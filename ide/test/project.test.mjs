// The project model: names, the operations, and the file it travels in.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  cleanName,
  uniqueName,
  names,
  makeProject,
  addFile,
  renameFile,
  removeFile,
  setActive,
  setDoc,
  serialize,
  parse,
  DEFAULT_NAME,
} from '../src/etamil-project-core.js'

test('a name loses its path and unsafe characters, and gains an extension', () => {
  assert.equal(cleanName('வட்டி'), 'வட்டி.qmz')
  assert.equal(cleanName('a.qmz'), 'a.qmz')
  assert.equal(cleanName('  my   file  '), 'my file.qmz')
  assert.equal(cleanName('..\\..\\evil/name?.txt'), 'name_.txt')
  assert.equal(cleanName('.hidden'), 'hidden.qmz')
  assert.equal(cleanName(''), null)
  assert.equal(cleanName('   '), null)
  assert.equal(cleanName(undefined), null)
})

test('a long name is shortened but keeps its extension', () => {
  const name = cleanName('x'.repeat(200) + '.qmz')
  assert.ok(name.length <= 64 && name.endsWith('.qmz'), name)
})

test('a taken name gets a number before the extension', () => {
  assert.equal(uniqueName('a.qmz', []), 'a.qmz')
  assert.equal(uniqueName('a.qmz', ['a.qmz']), 'a-2.qmz')
  assert.equal(uniqueName('a.qmz', ['a.qmz', 'a-2.qmz']), 'a-3.qmz')
})

test('adding a file makes it active, and never reuses a name', () => {
  let p = makeProject('x = 1;')
  p = addFile(p, 'second')
  assert.deepEqual(names(p), [DEFAULT_NAME, 'second.qmz'])
  assert.equal(p.active, 'second.qmz')
  p = addFile(p, 'second')
  assert.equal(p.active, 'second-2.qmz')
  p = addFile(p, '')
  assert.equal(p.active, 'en_niral-2.qmz', 'an unusable name falls back to the default')
})

test('operations leave their argument alone', () => {
  const p = makeProject('x')
  const q = addFile(p, 'b')
  assert.equal(p.files.length, 1)
  assert.equal(q.files.length, 2)
})

test('renaming follows the active file, and refuses a clash or a bad name', () => {
  let p = addFile(makeProject('a'), 'b')
  const renamed = renameFile(p, 'b.qmz', 'c')
  assert.deepEqual(names(renamed), [DEFAULT_NAME, 'c.qmz'])
  assert.equal(renamed.active, 'c.qmz')
  assert.equal(renameFile(p, 'b.qmz', DEFAULT_NAME), p, 'another file has that name')
  assert.equal(renameFile(p, 'b.qmz', '///'), p, 'an empty name once cleaned')
  assert.equal(renameFile(p, 'missing.qmz', 'z'), p)
  assert.equal(renameFile(setActive(p, DEFAULT_NAME), 'b.qmz', 'c').active, DEFAULT_NAME)
})

test('removing keeps at least one file and moves the active one sensibly', () => {
  assert.equal(removeFile(makeProject('a'), DEFAULT_NAME).files.length, 1)
  let p = addFile(addFile(makeProject('a'), 'b'), 'c') // en_niral, b, c; c active
  p = removeFile(p, 'c.qmz')
  assert.equal(p.active, 'b.qmz', 'the one before, when the last goes')
  p = setActive(addFile(p, 'd'), 'b.qmz')
  assert.equal(removeFile(p, 'b.qmz').active, 'd.qmz', 'the one after, otherwise')
  assert.equal(removeFile(p, 'd.qmz').active, 'b.qmz', 'removing another file leaves the active one')
})

test('setActive ignores an unknown name; setDoc changes one file', () => {
  const p = addFile(makeProject('a'), 'b')
  assert.equal(setActive(p, 'nope.qmz'), p)
  const q = setDoc(p, 'b.qmz', 'new')
  assert.equal(q.files[1].doc, 'new')
  assert.equal(q.files[0].doc, 'a')
})

test('a project survives its own file, Tamil text and all', () => {
  let p = makeProject('அச்சு("வணக்கம்");')
  p = setDoc(addFile(p, 'வட்டி'), 'வட்டி.qmz', '// 😀\nதொகை = 1;\n')
  p = setActive(p, DEFAULT_NAME)
  assert.deepEqual(parse(serialize(p)), p)
})

test('damaged or foreign files give null, not an exception', () => {
  assert.equal(parse('not json'), null)
  assert.equal(parse('{}'), null)
  assert.equal(parse('null'), null)
  assert.equal(parse('{"format":"other","version":1,"files":[]}'), null)
  assert.equal(parse('{"format":"etamil-project","version":2,"files":[{"name":"a","doc":""}]}'), null)
  assert.equal(parse('{"format":"etamil-project","version":1,"files":[]}'), null, 'no files')
  assert.equal(parse('{"format":"etamil-project","version":1,"files":[{"name":"a"}]}'), null, 'no text')
  assert.equal(parse('{"format":"etamil-project","version":1,"files":[{"name":"","doc":""}]}'), null)
})

test('a hand-edited file is repaired: duplicate names renumbered, bad active reset', () => {
  const text = JSON.stringify({
    format: 'etamil-project',
    version: 1,
    active: 'gone.qmz',
    files: [
      { name: 'a.qmz', doc: '1' },
      { name: 'a.qmz', doc: '2' },
      { name: '../b', doc: '3' },
    ],
  })
  const p = parse(text)
  assert.deepEqual(names(p), ['a.qmz', 'a-2.qmz', 'b.qmz'])
  assert.equal(p.active, 'a.qmz')
})

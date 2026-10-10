import { test } from 'node:test'
import assert from 'node:assert/strict'

import { missingModule, runWithLibrary, LIBRARY_PREFIX, MAX_ATTEMPTS } from '../src/etamil-run-core.js'

// A stand-in for the compiler. A source is a list of the paths it imports, one per line
// (`import <path>`); running succeeds when every import is among the files, and fails
// the way the compiler does when one is not.
function fakeRun(log = []) {
  return (files, entry) => {
    log.push(Object.keys(files).sort())
    const seen = new Set()
    const visit = (path) => {
      if (seen.has(path)) return null
      seen.add(path)
      const source = files[path]
      if (source === undefined) {
        return `தொகுதி '${path}' கண்டுபிடிக்க முடியவில்லை  (cannot open module '${path}'): it is not one of the project's files`
      }
      for (const line of source.split('\n')) {
        const found = /^import (.+)$/.exec(line.trim())
        if (found) {
          const error = visit(found[1])
          if (error) return error
        }
      }
      return null
    }
    const error = visit(entry)
    return error
      ? { ok: false, output: '', error, stage: 'parse', files: [] }
      : { ok: true, output: 'done\n', error: null, stage: null, files: [] }
  }
}

const library = {
  'nUlakam/a.qmz': 'import nUlakam/b.qmz',
  'nUlakam/b.qmz': 'import nUlakam/c.qmz',
  'nUlakam/c.qmz': 'x',
  'nUlakam/self.qmz': 'import nUlakam/self.qmz',
}

function loader() {
  const calls = { count: 0 }
  return { calls, loadLibrary: async () => ((calls.count += 1), library) }
}

test('missingModule reads the path out of the compiler message', () => {
  const result = {
    ok: false,
    stage: 'parse',
    error: "தொகுதி 'nUlakam/paNam/paNam.qmz' கண்டுபிடிக்க முடியவில்லை  (cannot open module 'nUlakam/paNam/paNam.qmz'): it is not one of the project's files",
  }
  assert.equal(missingModule(result), 'nUlakam/paNam/paNam.qmz')
})

test('missingModule is null for a run that worked, or failed some other way', () => {
  assert.equal(missingModule({ ok: true, stage: null, error: null }), null)
  assert.equal(missingModule({ ok: false, stage: 'type', error: "cannot open module 'x'" }), null)
  assert.equal(missingModule({ ok: false, stage: 'parse', error: 'expected a name' }), null)
  assert.equal(missingModule(undefined), null)
})

test('a program that imports nothing never loads the library', async () => {
  const { calls, loadLibrary } = loader()
  const result = await runWithLibrary({ files: { 'main.qmz': 'x' }, entry: 'main.qmz', run: fakeRun(), loadLibrary })
  assert.equal(result.ok, true)
  assert.equal(calls.count, 0)
})

test('a library import is fetched once and the run is tried again', async () => {
  const { calls, loadLibrary } = loader()
  let told = 0
  const result = await runWithLibrary({
    files: { 'main.qmz': 'import nUlakam/c.qmz' },
    entry: 'main.qmz',
    run: fakeRun(),
    loadLibrary,
    onLibrary: () => (told += 1),
  })
  assert.equal(result.ok, true)
  assert.equal(calls.count, 1)
  assert.equal(told, 1)
})

test('a chain of library imports takes one attempt each and still fetches the library once', async () => {
  const { calls, loadLibrary } = loader()
  const log = []
  const result = await runWithLibrary({
    files: { 'main.qmz': 'import nUlakam/a.qmz' },
    entry: 'main.qmz',
    run: fakeRun(log),
    loadLibrary,
  })
  assert.equal(result.ok, true)
  assert.equal(calls.count, 1)
  assert.equal(log.length, 4) // main alone, + a, + b, + c
  assert.deepEqual(log.at(-1), ['main.qmz', 'nUlakam/a.qmz', 'nUlakam/b.qmz', 'nUlakam/c.qmz'])
})

test('a file the project is missing is reported without fetching anything', async () => {
  const { calls, loadLibrary } = loader()
  const result = await runWithLibrary({
    files: { 'main.qmz': 'import vari.qmz' },
    entry: 'main.qmz',
    run: fakeRun(),
    loadLibrary,
  })
  assert.equal(result.ok, false)
  assert.match(result.error, /vari\.qmz/)
  assert.equal(calls.count, 0, 'a typo in a file name must not cost a 600 kB download')
})

test('a library module the library does not have is reported as the compiler said it', async () => {
  const { calls, loadLibrary } = loader()
  const result = await runWithLibrary({
    files: { 'main.qmz': 'import nUlakam/nothing.qmz' },
    entry: 'main.qmz',
    run: fakeRun(),
    loadLibrary,
  })
  assert.equal(result.ok, false)
  assert.match(result.error, /nUlakam\/nothing\.qmz/)
  assert.equal(calls.count, 1)
})

test('the caller\'s files are not changed', async () => {
  const files = { 'main.qmz': 'import nUlakam/c.qmz' }
  const { loadLibrary } = loader()
  await runWithLibrary({ files, entry: 'main.qmz', run: fakeRun(), loadLibrary })
  assert.deepEqual(Object.keys(files), ['main.qmz'])
})

test('a run that fails for another reason is returned as it is', async () => {
  const { calls, loadLibrary } = loader()
  const failure = { ok: false, output: 'three lines', error: 'division by zero', stage: 'run', files: [] }
  const result = await runWithLibrary({ files: { 'main.qmz': 'x' }, entry: 'main.qmz', run: () => failure, loadLibrary })
  assert.equal(result, failure)
  assert.equal(calls.count, 0)
})

test('it gives up rather than looping when the compiler keeps asking for new modules', async () => {
  let n = 0
  const endless = () => {
    n += 1
    return {
      ok: false,
      stage: 'parse',
      error: `(cannot open module '${LIBRARY_PREFIX}m${n}.qmz')`,
      output: '',
      files: [],
    }
  }
  const everything = new Proxy({}, { has: () => true, get: (_, key) => (typeof key === 'string' ? 'x' : undefined), getOwnPropertyDescriptor: () => ({ value: 'x', enumerable: true, configurable: true }) })
  const result = await runWithLibrary({ files: {}, entry: 'main.qmz', run: endless, loadLibrary: async () => everything })
  assert.equal(result.ok, false)
  assert.equal(n, MAX_ATTEMPTS)
  assert.match(result.error, /circle/)
})

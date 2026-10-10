import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { sampleForm, designProblems, storageProblems, idProblem, RECORD_COLUMNS, parse, serialize } from '../src/etamil-form-core.js'
import {
  generateServer,
  generateCli,
  pageHtml,
  storageColumns,
  SERVER_FILE,
  SAVE_ROUTE,
  LIST_ROUTE,
  CSV_ROUTE,
} from '../src/etamil-form-generate.js'

const glue = new URL('../wasm/etamil_compiler.js', import.meta.url)
const binary = new URL('../wasm/etamil_compiler_bg.wasm', import.meta.url)
let wasm = null
if (existsSync(glue) && existsSync(binary)) {
  wasm = await import(glue.href)
  await wasm.default({ module_or_path: readFileSync(binary) })
}
const withWasm = wasm ? test : test.skip

const native = [process.env.ETAMIL_BIN, 'D:/src/eTamil-bin-target/release/etamil.exe', 'D:/src/eTamil-bin-target/release/etamil'].find(
  (path) => path && existsSync(path),
)
const withNative = native ? test : test.skip

const saved = () => {
  const form = sampleForm()
  form.storage = { on: true, table: 'pativu', version: 3 }
  return form
}

// --- the design rules ----------------------------------------------------------------------------------

test('saving off asks nothing more of the names', () => {
  const form = sampleForm()
  form.fields[0].id = 'தொகை'
  assert.deepEqual(storageProblems(form), [])
  assert.deepEqual(designProblems(form), [])
})

test('the sample can be saved as it is', () => {
  assert.deepEqual(storageProblems(saved()), [])
  assert.deepEqual(designProblems(saved()), [])
})

test('saving needs Latin names: a Tamil-letter field is refused, and says why', () => {
  const form = saved()
  form.fields[0].id = 'தொகை'
  const problems = storageProblems(form)
  assert.equal(problems.length, 1)
  assert.match(problems[0].message, /Latin letters/)
})

test('saving refuses a name that clashes with a record column, or differs only by capitals', () => {
  const form = saved()
  form.calcs[0].id = 'nEram'
  form.fields[1].id = 'QOKy'
  const messages = storageProblems(form).map((p) => p.message)
  assert.equal(messages.length, 2)
  assert.ok(messages.every((m) => /already|capital/.test(m)))
})

test('the table needs a plain name, and the version a whole number', () => {
  for (const table of ['', '1x', 'a b', 'a-b', 'sqlite_x', 'x'.repeat(41), 'தரவு']) {
    const form = saved()
    form.storage.table = table
    assert.ok(storageProblems(form).some((p) => /table/.test(p.message)), `"${table}"`)
  }
  for (const version of [0, -1, 1.5, '2', null]) {
    const form = saved()
    form.storage.version = version
    assert.ok(storageProblems(form).some((p) => /version/.test(p.message)), String(version))
  }
})

test('names the generated function uses for itself are refused, saving or not', () => {
  for (const id of ['input', 'problems', 'bad', 'messages']) assert.ok(idProblem(id), id)
})

test('the storage setting survives saving and loading, and a damaged one is repaired', () => {
  const form = saved()
  assert.deepEqual(parse(serialize(form)).storage, { on: true, table: 'pativu', version: 3 })
  const damaged = JSON.parse(serialize(form))
  damaged.form.storage = { on: 'yes', table: 3, version: -2 }
  assert.deepEqual(parse(JSON.stringify(damaged)).storage, { on: false, table: 'pativu', version: 1 })
  delete damaged.form.storage
  assert.equal(parse(JSON.stringify(damaged)).storage.on, false)
})

test('the table has the record columns first, then every field and calculation', () => {
  const names = storageColumns(saved()).map((c) => c.name)
  assert.deepEqual(names, [...RECORD_COLUMNS, 'qokY', 'vikiqam', 'vari', 'moqqam'])
})

test('the page has a save button and a link to the records only when saving is on', () => {
  assert.ok(!pageHtml(sampleForm()).includes(SAVE_ROUTE))
  const html = pageHtml(saved())
  assert.ok(html.includes(`fetch("${SAVE_ROUTE}"`))
  assert.ok(html.includes(`href="${CSV_ROUTE}"`))
  assert.ok(!html.includes('\\'), 'still no backslash')
})

test('a form that does not save generates no records code at all', () => {
  const server = generateServer(sampleForm())
  for (const word of ['தளம்_', SAVE_ROUTE, LIST_ROUTE, 'csvCell']) assert.ok(!server.includes(word), word)
  assert.ok(!generateCli(saved()).includes('தளம்_'), 'the terminal program does not save')
})

withWasm('the generated server with saving on parses and type-checks', () => {
  const problems = JSON.parse(wasm.diagnostics(generateServer(saved()))).filter((d) => d.severity === 'error')
  assert.deepEqual(problems, [])
})

// --- run for real: a server, and a database file on disk ------------------------------------------------------

async function startServer(dir, form) {
  writeFileSync(join(dir, SERVER_FILE), generateServer(form), 'utf8')
  const port = 20000 + Math.floor(Math.random() * 20000)
  const child = spawn(native, ['--server', '--port', String(port), join(dir, SERVER_FILE)], { cwd: dir, stdio: 'ignore' })
  const base = `http://127.0.0.1:${port}`
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      if ((await fetch(base + '/')).status === 200) return { child, base }
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }
  child.kill()
  throw new Error('the server did not start')
}

const stop = (server) =>
  new Promise((resolve) => {
    server.child.once('exit', resolve)
    server.child.kill()
    setTimeout(resolve, 3000)
  })

const post = async (server, body, path = SAVE_ROUTE) => {
  const response = await fetch(server.base + path, { method: 'POST', body: JSON.stringify(body) })
  return { status: response.status, json: await response.json() }
}
const records = async (server) => (await (await fetch(server.base + LIST_ROUTE)).json()).paqivukaL

withNative('saving: a record is kept, exactly, and read back, newest first', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'etamil-store-'))
  const server = await startServer(dir, saved())
  try {
    const before = Math.floor(Date.now() / 1000)
    const first = await post(server, { qokY: '250.50', vikiqam: '18' })
    assert.equal(first.status, 201)
    assert.equal(first.json.saved, 1)
    assert.equal(first.json.ilakkam, 1)
    const second = await post(server, { qokY: '12345678.90', vikiqam: '18' })
    assert.equal(second.json.ilakkam, 2)

    const list = await fetch(server.base + LIST_ROUTE)
    const text = await list.text()
    const rows = JSON.parse(text).paqivukaL
    assert.deepEqual(rows.map((r) => r.ilakkam), [2, 1], 'newest first')
    // The digits are the VM's, not a float's: 12345678.90 at 18% is 14567901.102 exactly.
    assert.ok(text.includes('14567901.102'), text)
    assert.equal(Number(rows[1].moqqam), 295.59)
    assert.equal(Number(rows[1].vari), 45.09)
    // The percent is what was typed, and the record says which design saved it, and when.
    assert.equal(Number(rows[1].vikiqam), 18)
    assert.equal(rows[1].paqippu, 3)
    assert.ok(rows[1].nEram >= before && rows[1].nEram <= before + 60, String(rows[1].nEram))
  } finally {
    await stop(server)
    rmSync(dir, { recursive: true, force: true })
  }
})

withNative('saving: a form with a bad field or a failed check is not kept, and says why', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'etamil-store-'))
  const server = await startServer(dir, saved())
  try {
    await post(server, { qokY: '1000', vikiqam: '18' })
    const bad = await post(server, { qokY: 'lots', vikiqam: '18' })
    assert.equal(bad.status, 422)
    assert.equal(bad.json.saved, 0)
    assert.ok(bad.json.problems.qokY)
    const negative = await post(server, { qokY: '-5', vikiqam: '18' })
    assert.equal(negative.status, 422)
    assert.equal(negative.json.messages.length, 1)
    const notJson = await fetch(server.base + SAVE_ROUTE, { method: 'POST', body: 'not json' })
    assert.equal(notJson.status, 422)
    assert.equal((await records(server)).length, 1, 'only the good one was kept')
  } finally {
    await stop(server)
    rmSync(dir, { recursive: true, force: true })
  }
})

withNative('saving: the records are still there after the server is stopped and started again', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'etamil-store-'))
  let server = await startServer(dir, saved())
  try {
    await post(server, { qokY: '250.50', vikiqam: '18' })
    await stop(server)
    server = await startServer(dir, saved())
    const rows = await records(server)
    assert.equal(rows.length, 1)
    assert.equal(Number(rows[0].moqqam), 295.59)
    const next = await post(server, { qokY: '100', vikiqam: '18' })
    assert.equal(next.json.ilakkam, 2, 'numbering carries on')
  } finally {
    await stop(server)
    rmSync(dir, { recursive: true, force: true })
  }
})

withNative('saving: text is kept as typed, whatever is in it, and nothing else happens', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'etamil-store-'))
  const form = saved()
  form.fields.push({ id: 'peyar', label: 'Name', type: 'text', value: '' })
  const server = await startServer(dir, form)
  try {
    const nasty = `Robert'); DROP TABLE pativu;-- "quoted", with, commas`
    const made = await post(server, { qokY: '1', vikiqam: '1', peyar: nasty })
    assert.equal(made.json.saved, 1)
    const again = await post(server, { qokY: '2', vikiqam: '1', peyar: 'plain' })
    assert.equal(again.json.ilakkam, 2, 'the table is still there')
    const rows = await records(server)
    assert.equal(rows.find((r) => r.ilakkam === 1).peyar, nasty)

    // CSV: every cell quoted, a quote inside doubled, and a comma inside is not a column break.
    const csv = await (await fetch(server.base + CSV_ROUTE)).text()
    const lines = csv.trim().split('\n')
    // The record's own columns, then the fields in the order they were added, then the calculations.
    assert.equal(lines[0], '"ilakkam","nEram","paqippu","qokY","vikiqam","peyar","vari","moqqam"')
    assert.ok(csv.includes('"Robert\'); DROP TABLE pativu;-- ""quoted"", with, commas"'), csv)
    assert.equal(lines.length, 3)
  } finally {
    await stop(server)
    rmSync(dir, { recursive: true, force: true })
  }
})

withNative('saving: a form that has gained a field keeps the old records, which read as empty there', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'etamil-store-'))
  let server = await startServer(dir, saved())
  try {
    await post(server, { qokY: '250.50', vikiqam: '18' })
    await stop(server)

    const grown = saved()
    grown.storage.version = 4
    grown.fields.push({ id: 'thaLLupaTi', label: 'Discount', type: 'number', value: '0' })
    grown.calcs.push({ id: 'nikaram', label: 'Net', formula: 'moqqam - thaLLupaTi' })
    server = await startServer(dir, grown)

    const made = await post(server, { qokY: '1000', vikiqam: '18', thaLLupaTi: '30' })
    assert.equal(made.json.saved, 1, JSON.stringify(made.json))
    const rows = await records(server)
    assert.equal(rows.length, 2)
    const old = rows.find((r) => r.ilakkam === 1)
    assert.equal(old.thaLLupaTi, null)
    assert.equal(Number(old.moqqam), 295.59, 'the old record is as it was')
    const fresh = rows.find((r) => r.ilakkam === 2)
    assert.equal(Number(fresh.nikaram), 1150)
    assert.equal(fresh.paqippu, 4)

    // The CSV follows the form's own order (fields, then calculations), whatever order the table grew in.
    const cells = (line) => line.slice(1, -1).split('","')
    const csv = (await (await fetch(server.base + CSV_ROUTE)).text()).trim().split('\n')
    const header = cells(csv[0])
    assert.deepEqual(header.slice(3), ['qokY', 'vikiqam', 'thaLLupaTi', 'vari', 'moqqam', 'nikaram'])
    const oldRow = cells(csv[2])
    assert.equal(oldRow[0], '1')
    assert.equal(oldRow[header.indexOf('thaLLupaTi')], '', 'empty, not the word for nothing')
    assert.equal(oldRow[header.indexOf('nikaram')], '')
    assert.equal(oldRow[header.indexOf('moqqam')], '295.59')
  } finally {
    await stop(server)
    rmSync(dir, { recursive: true, force: true })
  }
})

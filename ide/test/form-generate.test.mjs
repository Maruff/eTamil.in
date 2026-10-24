import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { sampleForm, makeForm, runForm, idProblem } from '../src/etamil-form-core.js'
import {
  generateLogic,
  generateServer,
  generateCli,
  pageHtml,
  escapeHtml,
  SERVER_FILE,
  CLI_FILE,
  ROUTE,
  FUNCTION_NAME,
} from '../src/etamil-form-generate.js'

// --- the compiler in the page's build (npm run wasm), and the native one (ETAMIL_BIN) --------------
// Both are build products and are not in the repository, so tests that need them say they were
// skipped rather than pass without checking anything.

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

const values = (form, overrides = {}) => ({
  ...Object.fromEntries(form.fields.map((f) => [f.id, f.value])),
  ...overrides,
})

// --- the function ---------------------------------------------------------------------------------

test('names: two underscores in a row are kept for the generated programs', () => {
  assert.ok(idProblem('a__b'))
  assert.equal(idProblem('a_b'), null)
})

withWasm('the generated programs parse and type-check', () => {
  for (const form of [sampleForm(), makeForm('empty')]) {
    for (const source of [generateLogic(form), generateServer(form), generateCli(form)]) {
      const problems = JSON.parse(wasm.diagnostics(source)).filter((d) => d.severity === 'error')
      assert.deepEqual(problems, [], source.slice(0, 200))
    }
  }
})

// The function answers what the preview answers, for the same values: one meaning for a form.
withWasm('the function agrees with the preview for the same values', () => {
  const form = sampleForm()
  const run = (source) => JSON.parse(wasm.run(source))
  for (const typed of [{}, { qokY: '250.50' }, { qokY: '-5' }, { qokY: '0' }, { qokY: '99999999.99', vikiqam: '28' }]) {
    const given = values(form, typed)
    const preview = runForm(form, given, run)
    const record = Object.entries(given)
      .map(([id, text]) => `"${id}": "${text}"`)
      .join(', ')
    const answer = run(`${generateLogic(form)}\nஅச்சு _jsonStringify(${FUNCTION_NAME}({${record}}));\n`)
    assert.equal(answer.ok, true, answer.error)
    const generated = JSON.parse(answer.output)
    assert.deepEqual(generated.values, preview.values, JSON.stringify(typed))
    assert.deepEqual(generated.messages, preview.messages, JSON.stringify(typed))
  }
})

withWasm('the function reports every field that is not a number, and works nothing out', () => {
  const run = (source) => JSON.parse(wasm.run(source))
  const form = sampleForm()
  const answer = run(`${generateLogic(form)}\nஅச்சு _jsonStringify(${FUNCTION_NAME}({"qokY": "lots", "vikiqam": ""}));\n`)
  const generated = JSON.parse(answer.output)
  assert.deepEqual(Object.keys(generated.problems).sort(), ['qokY', 'vikiqam'])
  assert.deepEqual(generated.values, {})
})

withWasm('a field that is missing from the input is a problem, not a crash', () => {
  const run = (source) => JSON.parse(wasm.run(source))
  const answer = run(`${generateLogic(sampleForm())}\nஅச்சு _jsonStringify(${FUNCTION_NAME}({}));\n`)
  assert.equal(answer.ok, true, answer.error)
  assert.equal(Object.keys(JSON.parse(answer.output).problems).length, 2)
})

withWasm('text fields pass through, quotes and all', () => {
  const run = (source) => JSON.parse(wasm.run(source))
  const form = makeForm('letter')
  form.fields.push({ id: 'peyar', label: 'Name', type: 'text', value: '' })
  form.calcs.push({ id: 'vaNakkam', label: 'Greeting', formula: '"Hello " & peyar' })
  const answer = run(`${generateLogic(form)}\nஅச்சு _jsonStringify(${FUNCTION_NAME}({"peyar": "A \\"quoted\\" name"}));\n`)
  assert.equal(answer.ok, true, answer.error)
  assert.equal(JSON.parse(answer.output).values.vaNakkam, 'Hello A "quoted" name')
})

// --- the page ---------------------------------------------------------------------------------------

test('the page escapes what the author wrote, wherever it lands', () => {
  const form = sampleForm()
  form.title = '</title><script>alert(1)</script>'
  form.fields[0].label = 'a "b" <i>c</i> & d'
  form.fields[0].value = '"><b>'
  const html = pageHtml(form)
  assert.ok(!html.includes('<script>alert'), 'the title must not become a script')
  assert.ok(!html.includes('<i>c</i>'), 'the label must not become markup')
  assert.ok(!html.includes('"><b>'), 'the value must not close its attribute')
  assert.ok(html.includes('&lt;/title&gt;'))
})

test('the page has no backslash, so it sits in an eTamil string as written', () => {
  assert.ok(!pageHtml(sampleForm()).includes('\\'))
})

test('the page names the route the server answers on', () => {
  assert.ok(pageHtml(sampleForm()).includes(`fetch("${ROUTE}"`))
  assert.ok(generateServer(sampleForm()).includes(`வழி பதி, "${ROUTE}"`))
})

test('escapeHtml covers the five characters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;')
})

// --- run for real -----------------------------------------------------------------------------------

function scratch(files) {
  const dir = mkdtempSync(join(tmpdir(), 'etamil-form-'))
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text, 'utf8')
  return dir
}

withNative('the command-line program asks for each field and prints the results', () => {
  const form = sampleForm()
  const dir = scratch({ [CLI_FILE]: generateCli(form) })
  try {
    const run = spawnSync(native, [join(dir, CLI_FILE)], { input: '250.50\n18\n', encoding: 'utf8', timeout: 20000 })
    assert.equal(run.status, 0, run.stdout + run.stderr)
    assert.match(run.stdout, /GST \/ வரி = 45\.09/)
    assert.match(run.stdout, /Total \/ மொத்தம் = 295\.59/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

withNative('the command-line program shows a failed check, and a field that is not a number', () => {
  const dir = scratch({ [CLI_FILE]: generateCli(sampleForm()) })
  try {
    const negative = spawnSync(native, [join(dir, CLI_FILE)], { input: '-5\n18\n', encoding: 'utf8', timeout: 20000 })
    assert.match(negative.stdout, /! The amount must not be negative/)
    const bad = spawnSync(native, [join(dir, CLI_FILE)], { input: 'lots\n18\n', encoding: 'utf8', timeout: 20000 })
    assert.match(bad.stdout, /a number is needed/)
    assert.doesNotMatch(bad.stdout, /Total/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

withNative('the server serves the page, and works a form out over POST', async () => {
  const dir = scratch({ [SERVER_FILE]: generateServer(sampleForm()) })
  const port = 20000 + Math.floor(Math.random() * 20000)
  const child = spawn(native, ['--server', '--port', String(port), join(dir, SERVER_FILE)], { stdio: 'ignore' })
  try {
    let page = null
    for (let attempt = 0; attempt < 60 && page === null; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`)
        page = { status: response.status, type: response.headers.get('content-type'), text: await response.text() }
      } catch {
        await new Promise((r) => setTimeout(r, 250))
      }
    }
    assert.ok(page, 'the server did not start')
    assert.equal(page.status, 200)
    assert.match(page.type, /text\/html/)
    assert.ok(page.text.includes('GST invoice'))

    const post = async (body) => {
      const response = await fetch(`http://127.0.0.1:${port}${ROUTE}`, { method: 'POST', body: JSON.stringify(body) })
      return { status: response.status, json: await response.json() }
    }
    const good = await post({ qokY: '250.50', vikiqam: '18' })
    assert.equal(good.status, 200)
    assert.deepEqual(good.json.values, { moqqam: '295.59', vari: '45.09' })
    // JSON numbers work as well as text, since a client may send either.
    const numbers = await post({ qokY: 1000, vikiqam: 18 })
    assert.equal(numbers.json.values.moqqam, '1180')
    const negative = await post({ qokY: '-5', vikiqam: '18' })
    assert.equal(negative.json.messages.length, 1)
    const bad = await post({ qokY: 'lots' })
    assert.deepEqual(Object.keys(bad.json.problems).sort(), ['qokY', 'vikiqam'])
    // Not JSON at all is a form with nothing in it, not a crash.
    const broken = await fetch(`http://127.0.0.1:${port}${ROUTE}`, { method: 'POST', body: 'not json' })
    assert.equal(broken.status, 200)
  } finally {
    child.kill()
    rmSync(dir, { recursive: true, force: true })
  }
})

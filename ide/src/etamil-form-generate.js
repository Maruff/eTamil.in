// A form as a program to keep: an eTamil server and a command-line program.
//
// The preview in etamil-form-core.js works a form out by building a one-off program for each set of
// values. What can be downloaded is the other shape: a program with a FUNCTION, `kaNakkitu`, that
// takes a record of text (one entry per field: what a page or a command line has) and answers a
// record, so it can be asked again and again. A server and a command-line program are two ways of
// asking it, and they share it, so there is one answer to what a form means.
//
// When the form says to save records, the server also keeps each submission in a SQLite table
// (docs/studio/FORM-STORAGE.md in the compiler repository): a table of the form's own, a column
// for every field and every calculation, and three of the record's own.
//
// Pure, like the core: the programs are strings, and the tests run them with the real `etamil`.

import { stringLiteral, RECORD_COLUMNS } from './etamil-form-core.js'

/** The names the downloads carry, in the project's romanization (படிவம் is pativam, சேவை is cEvY). */
export const SERVER_FILE = 'pativam_cEvY.qmz'
export const CLI_FILE = 'pativam_kaNakku.qmz'
export const ROUTE = '/kaNakku'
export const SAVE_ROUTE = '/paqivu'
export const LIST_ROUTE = '/paqivukaL'
export const CSV_ROUTE = '/paqivukaL.csv'
export const FUNCTION_NAME = 'kaNakkitu'

// A comment carries the form's title, which is the author's text: one line, and nothing that could be
// read as the end of the `__ ... __` mark.
const commentText = (text) => String(text).replace(/\s+/g, ' ').replace(/_{2,}/g, '_').trim()

/** The function: from a record of text to `{ values, inputs, messages, problems }`. */
export function generateLogic(form) {
  const lines = []
  const add = (text) => lines.push(text)

  add(`செயல் ${FUNCTION_NAME}(input) {`)
  add('    problems = {};')
  add('    bad = 0;')

  for (const field of form.fields) {
    if (field.type === 'text') {
      add(`    ${field.id} = _fieldOr(input, ${stringLiteral(field.id)}, "");`)
      continue
    }
    add(`    ${field.id}__text = _toNumber(_fieldOr(input, ${stringLiteral(field.id)}, ""));`)
    add(`    (_isErr(${field.id}__text)) எனில் {`)
    add(`        problems[${stringLiteral(field.id)}] = "a number is needed, such as 250.50";`)
    add('        bad = bad + 1;')
    add('    }')
  }

  add('    (bad > 0) எனில் {')
  add('        திரும்பு {"values": {}, "inputs": {}, "messages": [], "problems": problems};')
  add('    }')

  for (const field of form.fields) {
    if (field.type === 'number') add(`    ${field.id} = _unwrap(${field.id}__text);`)
    if (field.type === 'percent') add(`    ${field.id} = _unwrap(${field.id}__text) / 100;`)
  }

  add('    messages = [];')
  for (const calc of form.calcs) add(`    ${calc.id} = ${String(calc.formula).trim()};`)
  for (const check of form.checks) {
    add(`    (${String(check.when).trim()}) எனில் {`)
    add(`        messages = _append(messages, ${stringLiteral(check.message || 'This is not right')});`)
    add('    }')
  }

  // Values go out as text, so a decimal arrives exactly as the VM holds it. A percent is kept as it was
  // typed (18, not 0.18), so a saved record says what the person entered.
  const values = form.calcs.map((calc) => `${stringLiteral(calc.id)}: "" & ${calc.id}`).join(', ')
  const inputs = form.fields
    .map((field) => {
      const id = stringLiteral(field.id)
      if (field.type === 'text') return `${id}: ${field.id}`
      if (field.type === 'percent') return `${id}: "" & _unwrap(${field.id}__text)`
      return `${id}: "" & ${field.id}`
    })
    .join(', ')
  add(`    திரும்பு {"values": {${values}}, "inputs": {${inputs}}, "messages": messages, "problems": problems};`)
  add('}')
  return lines.join('\n') + '\n'
}

/** Text safe to put in HTML, in an attribute or between tags. */
export function escapeHtml(text) {
  const entity = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(text).replace(/[&<>"']/g, (c) => entity[c])
}

// Inside a <script>, `<` could end the element; as a JSON string it cannot.
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

const saving = (form) => form.storage?.on === true

/**
 * The page the server answers with: the form, and a little script that asks the server to work it out
 * as the person types, and to save it when asked. Self-contained, and free of backslashes in its own
 * text so that it sits in an eTamil string as written (the escaping of the whole is `stringLiteral`'s job).
 */
export function pageHtml(form) {
  const title = escapeHtml(form.title || 'A form')
  const fields = form.fields
    .map((field) => {
      const unit = field.type === 'percent' ? '<span class="u">%</span>' : ''
      const mode = field.type === 'text' ? 'text' : 'decimal'
      return (
        `<label><span>${escapeHtml(field.label || field.id)}</span><span class="i">` +
        `<input name="${escapeHtml(field.id)}" value="${escapeHtml(field.value)}" inputmode="${mode}" autocomplete="off">${unit}</span>` +
        `<small class="p" data-for="${escapeHtml(field.id)}"></small></label>`
      )
    })
    .join('')
  const results = form.calcs
    .map((calc) => `<div><dt>${escapeHtml(calc.label || calc.id)}</dt><dd data-result="${escapeHtml(calc.id)}">-</dd></div>`)
    .join('')
  const saveBar = saving(form)
    ? `<p class="s"><button type="button" id="b">Save / சேமி</button> <span id="t"></span> ` +
      `<a href="${CSV_ROUTE}">Records (CSV) / பதிவுகள்</a></p>`
    : ''
  const save = saving(form)
    ? 'function body(){var b={};IDS.forEach(function(i){b[i]=document.forms.f.elements[i].value});return b}' +
      `document.getElementById("b").addEventListener("click",function(){fetch("${SAVE_ROUTE}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body())})` +
      '.then(function(r){return r.json()}).then(function(d){var t=document.getElementById("t");' +
      't.textContent=d.saved?"Saved as record "+d.ilakkam:"Not saved: fix the form first";go()})});'
    : ''

  return (
    '<!doctype html><html lang="ta"><head><meta charset="utf-8">' +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
    '<style>body{font:16px system-ui,sans-serif;margin:0;background:#f4f8fc;color:#10233c}' +
    'main{max-width:34rem;margin:2rem auto;padding:0 1rem}h1{font-size:1.3rem}' +
    'label{display:grid;gap:.25rem;margin:0 0 .9rem}label span:first-child{font-size:.85rem;color:#4c6382}' +
    '.i{display:flex;gap:.4rem;align-items:center}input{flex:1;font:inherit;padding:.45rem .6rem;border:1px solid #d7e3f0;border-radius:8px}' +
    '.p,.m{color:#b31d28;font-size:.85rem}.m{background:#fdecee;padding:.5rem .7rem;border-radius:8px;margin:.4rem 0}' +
    '.s{margin:1rem 0 0}button{font:inherit;padding:.4rem .9rem;border:1px solid #d7e3f0;border-radius:8px;background:#fff;cursor:pointer}' +
    'dl{margin:1rem 0 0;padding-top:.8rem;border-top:1px solid #d7e3f0}dl div{display:flex;justify-content:space-between;margin:.3rem 0}' +
    'dd{margin:0;font-family:ui-monospace,monospace;font-weight:700}</style></head><body><main>' +
    `<h1>${title}</h1><form id="f" autocomplete="off">${fields}</form><div id="m" role="alert"></div><dl>${results}</dl>${saveBar}</main>` +
    `<script>var IDS=${jsonForScript(form.fields.map((f) => f.id))},RES=${jsonForScript(form.calcs.map((c) => c.id))},T=null;` +
    'function go(){var b={};IDS.forEach(function(i){b[i]=document.forms.f.elements[i].value});' +
    `fetch("${ROUTE}",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)})` +
    '.then(function(r){return r.json()}).then(function(d){' +
    'document.querySelectorAll("[data-for]").forEach(function(e){e.textContent=d.problems[e.dataset.for]||""});' +
    'var m=document.getElementById("m");m.textContent="";' +
    'd.messages.forEach(function(t){var p=document.createElement("p");p.className="m";p.textContent=t;m.appendChild(p)});' +
    'RES.forEach(function(i){var e=document.querySelector("[data-result=" + JSON.stringify(i) + "]");e.textContent=d.values[i]===undefined?"-":d.values[i]})})}' +
    save +
    'document.forms.f.addEventListener("input",function(){clearTimeout(T);T=setTimeout(go,150)});go();</script></body></html>'
  )
}

// --- Saving records -----------------------------------------------------------------------------------
//
// SQL is always parameterised in eTamil, and a name in it is quoted. The names are the form's own and
// were checked (by `storageProblems`) to be Latin letters, digits and `_`, so quoting is for the SQL
// keywords a form might happen to use as a name, not for safety.

const quote = (name) => `"${name}"`

/** The table's columns, in order: the record's own, then each field, then each calculation. */
export function storageColumns(form) {
  return [
    { name: RECORD_COLUMNS[0], type: 'INTEGER PRIMARY KEY', record: true },
    { name: RECORD_COLUMNS[1], type: 'INTEGER NOT NULL', record: true },
    { name: RECORD_COLUMNS[2], type: 'INTEGER NOT NULL', record: true },
    // Numbers are kept as exact text, as the compiler's SQLite driver keeps a decimal. (SQLite orders text
    // after every number and sums it as a float, which is why a list only reads rows in order.)
    ...form.fields.map((f) => ({ name: f.id, type: 'TEXT', field: f })),
    ...form.calcs.map((c) => ({ name: c.id, type: 'TEXT', calc: c })),
  ]
}

const sql = (text) => stringLiteral(text)

/** The statements a server runs once, when it starts: make the table, and add any column it lacks. */
export function schemaLines(form) {
  const table = quote(form.storage.table)
  const columns = storageColumns(form)
  const lines = []
  lines.push(`தளம்_இணை சீகுலைட், "${form.storage.table}.db";`)
  lines.push(
    `தளம்_செய் ${sql(`CREATE TABLE IF NOT EXISTS ${table} (${columns.map((c) => `${quote(c.name)} ${c.type}`).join(', ')})`)}, [];`,
  )
  // A form that has grown a field since its table was made gets the column; nothing is ever dropped or renamed.
  lines.push(`தளம்_வினா ${sql(`PRAGMA table_info(${table})`)}, [], existing;`)
  for (const column of columns.filter((c) => !c.record)) {
    lines.push('found = 0;')
    lines.push('ஒவ்வொரு column இல் existing {')
    lines.push(`    (_lower(column["name"]) == ${stringLiteral(column.name.toLowerCase())}) எனில் {`)
    lines.push('        found = 1;')
    lines.push('    }')
    lines.push('}')
    lines.push('(found == 0) எனில் {')
    lines.push(`    தளம்_செய் ${sql(`ALTER TABLE ${table} ADD COLUMN ${quote(column.name)} ${column.type}`)}, [];`)
    lines.push('}')
  }
  return lines
}

/** The routes that keep and read records. */
export function recordRoutes(form) {
  const db = `"${form.storage.table}.db"`
  const table = quote(form.storage.table)
  const columns = storageColumns(form)
  const names = columns.map((c) => quote(c.name))
  const dataColumns = columns.filter((c) => !c.record)

  const params = [
    '_nowSeconds()',
    String(form.storage.version),
    ...dataColumns.map((c) =>
      c.field ? `answer["inputs"][${stringLiteral(c.name)}]` : `answer["values"][${stringLiteral(c.name)}]`,
    ),
  ]
  // The record's number is not a parameter: SQLite makes it.
  const insertNames = names.slice(1)
  const insert = `INSERT INTO ${table} (${insertNames.join(', ')}) VALUES (${insertNames.map(() => '?').join(', ')})`

  const csvSelect = `SELECT ${columns.map((c) => `COALESCE(${quote(c.name)}, '') AS ${quote(c.name)}`).join(', ')} FROM ${table} ORDER BY ${names[0]} DESC LIMIT 1000`
  const csvHeader = columns.map((c) => `csvCell(${stringLiteral(c.name)})`).join(' & "," & ')
  const csvRow = columns.map((c) => `csvCell(row[${stringLiteral(c.name)}])`).join(' & "," & ')

  return [
    '',
    '// __a CSV cell: always quoted, with a quote inside it doubled__',
    'செயல் csvCell(value) {',
    '    text = "" & value;',
    '    திரும்பு "\\"" & _replace(text, "\\"", "\\"\\"") & "\\"";',
    '}',
    '',
    `வழி பதி, "${SAVE_ROUTE}" {`,
    '    input = _unwrapOr(_jsonParse(request_body), {});',
    `    answer = ${FUNCTION_NAME}(input);`,
    '    saved = 0;',
    '    (_length(answer["problems"]) == 0) எனில் {',
    '        (_length(answer["messages"]) == 0) எனில் {',
    `            தளம்_இணை சீகுலைட், ${db};`,
    `            தளம்_செய் ${sql(insert)}, [${params.join(', ')}];`,
    '            தளம்_வினா "SELECT last_insert_rowid() AS ilakkam", [], made;',
    '            answer["ilakkam"] = made[0]["ilakkam"];',
    '            saved = 1;',
    '        }',
    '    }',
    '    answer["saved"] = saved;',
    '    (saved == 1) எனில் {',
    '        ஜேசான்_உரை _jsonStringify(answer), 201;',
    '    }',
    '    (saved == 0) எனில் {',
    '        ஜேசான்_உரை _jsonStringify(answer), 422;',
    '    }',
    '}',
    '',
    `வழி பெறு, "${LIST_ROUTE}" {`,
    `    தளம்_இணை சீகுலைட், ${db};`,
    `    தளம்_வினா ${sql(`SELECT * FROM ${table} ORDER BY ${names[0]} DESC LIMIT 100`)}, [], rows;`,
    '    ஜேசான்_உரை _jsonStringify({"paqivukaL": rows}), 200;',
    '}',
    '',
    `வழி பெறு, "${CSV_ROUTE}" {`,
    `    தளம்_இணை சீகுலைட், ${db};`,
    `    தளம்_வினா ${sql(csvSelect)}, [], rows;`,
    `    csv = ${csvHeader} & "\\n";`,
    '    ஒவ்வொரு row இல் rows {',
    `        csv = csv & ${csvRow} & "\\n";`,
    '    }',
    '    பதில் 200, csv, {"Content-Type": "text/csv; charset=utf-8"};',
    '}',
  ]
}

/** The whole server program: the function, the page at `/`, `POST /kaNakku`, and (if asked) the records. */
export function generateServer(form) {
  const lines = [
    `// __generated by eTamil Studio: ${commentText(form.title || 'a form')}__`,
    `// __run it:  etamil --server --port 8080 ${SERVER_FILE}   then open http://localhost:8080/__`,
    '// __change the form in Studio, not this file, to change the form__',
  ]
  if (saving(form)) {
    lines.push(`// __records are kept in ${form.storage.table}.db, in the folder you run it from__`)
    lines.push('// __there is no sign-in: it listens on this computer only, unless you add --host__')
  }
  lines.push('', generateLogic(form).trimEnd())

  if (saving(form)) {
    lines.push('', '// __the table: made if it is not there, and given any column the form has gained since__')
    lines.push(...schemaLines(form))
  }

  lines.push(
    '',
    'வழி பெறு, "/" {',
    `    பதில் 200, ${stringLiteral(pageHtml(form))}, {"Content-Type": "text/html; charset=utf-8"};`,
    '}',
    '',
    `வழி பதி, "${ROUTE}" {`,
    '    input = _unwrapOr(_jsonParse(request_body), {});',
    `    ஜேசான்_உரை _jsonStringify(${FUNCTION_NAME}(input)), 200;`,
    '}',
  )
  if (saving(form)) lines.push(...recordRoutes(form))
  return lines.join('\n') + '\n'
}

/** A program for a terminal: it asks for each field in turn and prints the results. */
export function generateCli(form) {
  const lines = [
    `// __generated by eTamil Studio: ${commentText(form.title || 'a form')}__`,
    `// __run it:  etamil ${CLI_FILE}__`,
    '',
    generateLogic(form).trimEnd(),
    '',
  ]
  for (const field of form.fields) {
    lines.push(`அச்சு ${stringLiteral(`${field.label || field.id}: `)};`)
    lines.push(`உள்ளிடு ${field.id}__in;`)
  }
  const record = form.fields.map((f) => `${stringLiteral(f.id)}: ${f.id}__in`).join(', ')
  lines.push(`answer = ${FUNCTION_NAME}({${record}});`)
  for (const field of form.fields) {
    lines.push(`(_hasField(answer["problems"], ${stringLiteral(field.id)})) எனில் {`)
    lines.push(`    அச்சு ${stringLiteral(`${field.label || field.id}: `)} & answer["problems"][${stringLiteral(field.id)}];`)
    lines.push('}')
  }
  lines.push('ஒவ்வொரு message இல் answer["messages"] {')
  lines.push('    அச்சு "! " & message;')
  lines.push('}')
  for (const calc of form.calcs) {
    lines.push(`அச்சு ${stringLiteral(`${calc.label || calc.id} = `)} & answer["values"][${stringLiteral(calc.id)}];`)
  }
  return lines.join('\n') + '\n'
}

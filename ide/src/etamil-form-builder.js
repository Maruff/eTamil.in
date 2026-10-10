// The form builder's page: design a form on one side, use it on the other.
//
// Everything that is not touching the page is in etamil-form-core.js. This file builds the
// controls, keeps the design in the browser, and asks the compiler (in the page, through
// etamil-compiler.js) to work the form out whenever anything changes. Nothing is sent anywhere.
//
// The design is kept in localStorage, one per page, and can be exported and imported as a file.
// The values typed into the form are not kept.

import { runProgram, ready } from './etamil-compiler.js'
import {
  sampleForm,
  makeForm,
  designProblems,
  runForm,
  serialize,
  parse,
  FIELD_TYPES,
  allIds,
} from './etamil-form-core.js'
import { generateServer, generateCli, SERVER_FILE, CLI_FILE } from './etamil-form-generate.js'

const storageKey = () => 'etamil-form:design:' + location.pathname

function readSaved() {
  try {
    return parse(localStorage.getItem(storageKey()) ?? '')
  } catch {
    return null
  }
}

function writeSaved(form) {
  try {
    localStorage.setItem(storageKey(), serialize(form))
  } catch {
    // Private windows and blocked storage: the form still works, it is just not kept.
  }
}

/** A tiny element builder: `h('input', { type: 'text', value: 'x' })`. */
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value
    else if (key === 'dataset') Object.assign(node.dataset, value)
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value)
    // aria-* and other hyphenated names are attributes; they have no property of that name.
    else if (key.includes('-')) node.setAttribute(key, value)
    else if (value !== undefined && value !== null) node[key] = value
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue
    node.append(child.nodeType ? child : document.createTextNode(String(child)))
  }
  return node
}

function uniqueId(base, taken) {
  let n = 1
  while (taken.includes(`${base}${n}`)) n += 1
  return `${base}${n}`
}

/** Offer `text` to the person as a file. */
function download(name, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const link = h('a', { href: url, download: name })
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function mountFormBuilder(root) {
  let form = readSaved() ?? sampleForm()
  // What is typed into the preview. Starts from each field's default and is not saved.
  let values = Object.fromEntries(form.fields.map((f) => [f.id, f.value]))

  const designHost = h('div', { class: 'studio-design' })
  const previewHost = h('div', { class: 'studio-preview' })
  const codeHost = h('pre', { class: 'studio-code', tabIndex: 0 })
  const notice = h('p', { class: 'studio-notice', role: 'status' })

  let timer = null
  const changed = () => {
    writeSaved(form)
    clearTimeout(timer)
    timer = setTimeout(recompute, 120)
  }

  // --- the design ------------------------------------------------------------------------------

  const problemFor = (kind, index, problems) => problems.find((p) => p.kind === kind && p.index === index)

  function row(kind, index, problems, cells, remove) {
    const problem = problemFor(kind, index, problems)
    return h(
      'div',
      { class: 'studio-row' + (problem ? ' has-problem' : ''), dataset: { kind, index } },
      cells,
      h('button', { type: 'button', class: 'studio-remove', title: 'Remove / நீக்கு', 'aria-label': 'Remove / நீக்கு', onclick: remove }, '×'),
      problem ? h('span', { class: 'studio-problem' }, problem.message) : null
    )
  }

  function bind(item, key, props = {}) {
    return h('input', {
      type: 'text',
      value: item[key] ?? '',
      spellcheck: false,
      autocomplete: 'off',
      ...props,
      oninput: (e) => {
        item[key] = e.target.value
        if (props.after) props.after()
        changed()
      },
    })
  }

  function renderDesign() {
    const problems = designProblems(form)
    const section = (title, hint, rows, add) =>
      h('section', { class: 'studio-section' }, h('h3', {}, title), hint ? h('p', { class: 'studio-hint' }, hint) : null, rows, h('button', { type: 'button', class: 'studio-add', onclick: add }, '+ ' + 'Add / சேர்'))

    const fields = form.fields.map((field, index) =>
      row(
        'field',
        index,
        problems,
        [
          bind(field, 'label', { placeholder: 'Label / தலைப்பு', 'aria-label': 'Label' }),
          bind(field, 'id', { placeholder: 'name', class: 'studio-id', 'aria-label': 'Name', after: () => (values = { ...values }) }),
          h(
            'select',
            {
              'aria-label': 'Type',
              onchange: (e) => {
                field.type = e.target.value
                changed()
              },
            },
            FIELD_TYPES.map((type) => h('option', { value: type, selected: type === field.type }, type))
          ),
          bind(field, 'value', {
            placeholder: 'start with',
            'aria-label': 'Start with',
            after: () => (values[field.id] = field.value),
          }),
        ],
        () => {
          form.fields.splice(index, 1)
          delete values[field.id]
          renderDesign()
          changed()
        }
      )
    )

    const calcs = form.calcs.map((calc, index) =>
      row(
        'calculation',
        index,
        problems,
        [
          bind(calc, 'label', { placeholder: 'Label / தலைப்பு', 'aria-label': 'Label' }),
          bind(calc, 'id', { placeholder: 'name', class: 'studio-id', 'aria-label': 'Name' }),
          bind(calc, 'formula', { placeholder: 'qokY * vikiqam', class: 'studio-formula', 'aria-label': 'Formula' }),
        ],
        () => {
          form.calcs.splice(index, 1)
          renderDesign()
          changed()
        }
      )
    )

    const checks = form.checks.map((check, index) =>
      row(
        'check',
        index,
        problems,
        [
          bind(check, 'when', { placeholder: 'qokY < 0', class: 'studio-formula', 'aria-label': 'Wrong when' }),
          bind(check, 'message', { placeholder: 'What to tell the person / செய்தி', 'aria-label': 'Message' }),
        ],
        () => {
          form.checks.splice(index, 1)
          renderDesign()
          changed()
        }
      )
    )

    designHost.replaceChildren(
      h('label', { class: 'studio-title' }, h('span', {}, 'Form title / படிவத் தலைப்பு'), bind(form, 'title', { 'aria-label': 'Form title' })),
      section('Fields / புலங்கள்', 'What a person types: a number, a percent or text.', fields, () => {
        const id = uniqueId('field', allIds(form))
        form.fields.push({ id, label: '', type: 'number', value: '0' })
        values[id] = '0'
        renderDesign()
        changed()
      }),
      section('Calculations / கணக்கீடுகள்', 'Worked out in order. A formula is eTamil, and may use the fields and the calculations above it.', calcs, () => {
        form.calcs.push({ id: uniqueId('result', allIds(form)), label: '', formula: '' })
        renderDesign()
        changed()
      }),
      section('Checks / சரிபார்ப்புகள்', 'Show the message when the condition is true.', checks, () => {
        form.checks.push({ when: '', message: '' })
        renderDesign()
        changed()
      })
    )
  }

  // --- the form, as someone using it sees it ----------------------------------------------------

  function renderPreview(result) {
    const inputs = form.fields.map((field) => {
      const problem = result?.problems?.[field.id]
      const input = h('input', {
        type: 'text',
        value: values[field.id] ?? '',
        inputMode: field.type === 'text' ? 'text' : 'decimal',
        autocomplete: 'off',
        'aria-invalid': problem ? 'true' : 'false',
        oninput: (e) => {
          values[field.id] = e.target.value
          clearTimeout(timer)
          timer = setTimeout(recompute, 120)
        },
      })
      return h(
        'label',
        { class: 'studio-field' + (problem ? ' has-problem' : '') },
        h('span', { class: 'studio-label' }, field.label || field.id),
        h('span', { class: 'studio-input' }, input, field.type === 'percent' ? h('span', { class: 'studio-unit' }, '%') : null),
        problem ? h('span', { class: 'studio-problem' }, problem) : null
      )
    })

    const outputs = form.calcs.map((calc) =>
      h(
        'div',
        { class: 'studio-result' },
        h('span', { class: 'studio-label' }, calc.label || calc.id),
        h('output', { class: 'studio-value' }, result?.values?.[calc.id] ?? '—')
      )
    )

    const messages = (result?.messages ?? []).map((m) => h('p', { class: 'studio-check', role: 'alert' }, m))

    // replaceChildren takes nodes, not arrays and not null, so the list is built and filtered here.
    previewHost.replaceChildren(
      ...[
        h('h3', {}, form.title || 'A form / ஒரு படிவம்'),
        h('div', { class: 'studio-fields' }, inputs),
        ...messages,
        form.calcs.length ? h('div', { class: 'studio-results' }, outputs) : null,
      ].filter(Boolean)
    )
  }

  // --- working it out -------------------------------------------------------------------------------

  function recompute() {
    const problems = designProblems(form)
    notice.textContent = ''
    notice.classList.remove('is-error')

    if (problems.length) {
      renderPreview(null)
      codeHost.textContent = '(fix the highlighted names and formulas first / முதலில் சிவப்பு இடங்களைத் திருத்துங்கள்)'
      return
    }

    const result = runForm(form, values, runProgram)
    renderPreview(result)
    codeHost.textContent = result.program ?? '(enter valid values to see the program / சரியான மதிப்புகளை உள்ளிடுங்கள்)'

    if (!result.ok && !Object.keys(result.problems ?? {}).length) {
      // The compiler's own message, with the part of the form it is about.
      const where =
        result.where?.kind === 'calculation'
          ? `In calculation "${result.where.id}": `
          : result.where?.kind === 'field'
            ? `In field "${result.where.id}": `
            : result.where?.kind === 'check'
              ? `In check ${result.where.index + 1}: `
              : ''
      notice.textContent = where + (result.error ?? 'It could not be worked out.')
      notice.classList.add('is-error')
    }
  }

  // --- the toolbar ----------------------------------------------------------------------------------

  const load = (next) => {
    form = next
    values = Object.fromEntries(form.fields.map((f) => [f.id, f.value]))
    renderDesign()
    changed()
  }

  const importInput = h('input', {
    type: 'file',
    accept: '.json,application/json',
    hidden: true,
    onchange: async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      const loaded = parse(await file.text())
      if (!loaded) {
        notice.textContent = `${file.name} is not a form saved from here.`
        notice.classList.add('is-error')
        return
      }
      if (window.confirm('Replace this form with the one in the file? / இந்தப் படிவத்தை மாற்றவா?')) load(loaded)
    },
  })

  const toolbar = h(
    'div',
    { class: 'studio-toolbar' },
    h('button', { type: 'button', onclick: () => window.confirm('Replace this form with the sample? / மாதிரியால் மாற்றவா?') && load(sampleForm()) }, 'Sample / மாதிரி'),
    h('button', { type: 'button', onclick: () => window.confirm('Clear the whole form? / முழுப் படிவத்தையும் அழிக்கவா?') && load(makeForm('')) }, 'Clear / அழி'),
    h('button', { type: 'button', onclick: () => download('etamil-form.json', serialize(form), 'application/json') }, 'Export / ஏற்றுமதி'),
    h('button', { type: 'button', onclick: () => importInput.click() }, 'Import / இறக்குமதி'),
    importInput
  )

  const copy = h(
    'button',
    {
      type: 'button',
      class: 'studio-copy',
      onclick: async () => {
        try {
          await navigator.clipboard.writeText(codeHost.textContent)
          copy.textContent = 'Copied / நகலெடுக்கப்பட்டது'
        } catch {
          copy.textContent = 'Select the text and copy it'
        }
        setTimeout(() => (copy.textContent = 'Copy the eTamil / நகலெடு'), 1800)
      },
    },
    'Copy the eTamil / நகலெடு'
  )

  // The form as a program to keep. Offered only when the design is sound, because a program made from a
  // formula the compiler would refuse is no use to anyone.
  function offer(name, make) {
    const problems = designProblems(form)
    if (problems.length) {
      notice.textContent = 'Fix the highlighted names and formulas before taking the form with you.'
      notice.classList.add('is-error')
      return
    }
    download(name, make(form))
  }

  const downloads = h(
    'section',
    { class: 'studio-downloads' },
    h('h3', {}, 'Take it with you / எடுத்துச் செல்'),
    h('p', { class: 'studio-hint' }, 'eTamil programs that work this form out, with nothing but eTamil installed.'),
    h(
      'div',
      { class: 'studio-toolbar' },
      h('button', { type: 'button', onclick: () => offer(SERVER_FILE, generateServer) }, 'The app / செயலி'),
      h('button', { type: 'button', onclick: () => offer(CLI_FILE, generateCli) }, 'A terminal program / முனையம்')
    ),
    h(
      'p',
      { class: 'studio-hint' },
      'The app is a small web server with this form as its page: ',
      h('code', {}, `etamil --server --port 8080 ${SERVER_FILE}`),
      ', then open http://localhost:8080. The terminal program asks for each field in turn: ',
      h('code', {}, `etamil ${CLI_FILE}`),
      '. Install eTamil from the Get started page.'
    )
  )

  root.replaceChildren(
    toolbar,
    h(
      'div',
      { class: 'studio-columns' },
      h('div', { class: 'studio-column' }, h('h2', {}, 'Design / வடிவமைப்பு'), designHost),
      h(
        'div',
        { class: 'studio-column' },
        h('h2', {}, 'Preview / முன்னோட்டம்'),
        previewHost,
        notice,
        h('details', { class: 'studio-program' }, h('summary', {}, 'The eTamil this form runs / இந்தப் படிவம் இயக்கும் eTamil'), copy, codeHost),
        downloads
      )
    )
  )

  renderDesign()
  // The compiler is loaded by now or soon; recompute once it is, and once at the start so the
  // preview is not empty while it loads.
  renderPreview(null)
  ready().then(recompute)
}

function autoMount() {
  for (const el of document.querySelectorAll('[data-etamil-form-builder]')) {
    if (el.dataset.mounted) continue
    el.dataset.mounted = '1'
    mountFormBuilder(el)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoMount)
} else {
  autoMount()
}

// Several programs in one editor: a strip of tabs above the text, kept in the browser.
//
// This replaces the single autosaved program of etamil-share.js. One program is now the
// special case of a project with one file, so a reader who never opens a second tab sees
// nothing new except the strip.
//
// Each file keeps its own EditorState while the page is open, so undo history belongs to
// the file: pressing undo after a switch must not bring back the other file's text. The
// states are not saved. Only the text is: localStorage, one project per page, and the
// project can be exported as a single JSON file and imported again.
//
// Switching uses view.setState, which rebuilds the view's plugins and panels. Everything
// that must outlive a switch therefore lives in the controller below, not in a plugin.
//
// Only the main editor on a page gets this (see main.js), for the reason etamil-share.js
// gives: an editor embedded in prose illustrates the paragraph above it.

import { EditorView, ViewPlugin, showPanel } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import { decodeShare, SHARE_KEY } from './etamil-share-core.js'
import {
  addFile,
  cleanName,
  fileNamed,
  makeProject,
  names,
  parse,
  removeFile,
  renameFile,
  serialize,
  setActive,
  setDoc,
  uniqueName,
} from './etamil-project-core.js'

const storageKey = () => 'etamil-ide:project:' + location.pathname
// Phase 0 saved a bare program under this key. It is read once, so nobody loses what they
// had typed, and left where it is.
const legacyKey = () => 'etamil-ide:doc:' + location.pathname

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // storage blocked, as in some private windows
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Quota or blocked: saving is a convenience, never a reason to interrupt typing.
  }
}

function createController() {
  let project = null
  let view = null
  let base = null // the state the view had at the start: no history, every extension
  let ready = false
  let timer = null
  const states = new Map() // file name -> EditorState, for files opened this session
  const listeners = new Set()

  const publish = () => {
    // The download button names its file after this.
    view.dom.dataset.etamilFile = project.active
    listeners.forEach((fn) => fn())
  }

  // The active file's text is in the editor, not in `project`; bring it back before the
  // project is saved, switched or exported.
  function sync() {
    project = setDoc(project, project.active, view.state.doc.toString())
  }

  function save() {
    clearTimeout(timer)
    sync()
    write(storageKey(), serialize(project))
  }

  function stateFor(file) {
    // From `base`, not from the current state, so a new file starts with an empty history.
    return base.update({
      changes: { from: 0, to: base.doc.length, insert: file.doc },
      annotations: Transaction.addToHistory.of(false),
    }).state
  }

  // Show the active file of the project that `derive` makes from the current one. The
  // editor's text is synced first, so `derive` never sees a stale file. The file being
  // left keeps its state, unless it is going away.
  function open(derive, { keepLeaving = true } = {}) {
    if (keepLeaving) states.set(project.active, view.state)
    sync()
    project = derive(project)
    view.setState(states.get(project.active) ?? stateFor(fileNamed(project, project.active)))
    publish()
    save()
  }

  function renameKeepingState(from, to) {
    const next = renameFile(project, from, to)
    if (next === project) return false
    if (states.has(from)) {
      states.set(cleanName(to), states.get(from))
      states.delete(from)
    }
    sync()
    project = next
    publish()
    save()
    return true
  }

  return {
    get project() {
      return project
    },

    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },

    // Called whenever a plugin is built; only the first call for a view does anything.
    attach(v) {
      if (view === v) return
      view = v
      base = v.state
      project = parse(read(storageKey())) ?? makeProject(read(legacyKey()) ?? v.state.doc.toString())
      // Not synchronously: a plugin may not dispatch while the view is being constructed.
      Promise.resolve().then(async () => {
        let shared = false
        if (location.hash.startsWith(SHARE_KEY)) {
          const text = await decodeShare(location.hash.slice(SHARE_KEY.length))
          // The link has done its job. Leaving it would make a later reload add the
          // program again.
          history.replaceState(null, '', location.pathname + location.search)
          // A new file, never over the reader's own work.
          if (text != null) {
            project = addFile(project, 'shared', text)
            shared = true
          }
        }
        view.setState(stateFor(fileNamed(project, project.active)))
        publish()
        // The link is gone from the address bar; keep the file it carried.
        if (shared) save()
        // The sample list is a sibling in the same frame and announces what it loaded.
        view.dom.closest('.ide-frame')?.addEventListener('etamil-sample', (e) => {
          this.sampleLoaded(e.detail && e.detail.file)
        })
        // Saving starts only now, so the sample text cannot overwrite the saved project.
        ready = true
      })
    },

    touched() {
      if (!ready) return
      clearTimeout(timer)
      timer = setTimeout(save, 500)
    },

    show(name) {
      if (name !== project.active) open((p) => setActive(p, name))
    },

    add() {
      const raw = window.prompt('File name', 'program')
      if (raw == null) return
      open((p) => addFile(p, raw, ''))
    },

    rename(name) {
      const raw = window.prompt('New name', name)
      if (raw == null) return
      if (!renameKeepingState(name, raw) && cleanName(raw) && cleanName(raw) !== name) {
        window.alert('Another file already has that name.')
      }
    },

    remove(name) {
      if (project.files.length === 1) return
      if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
      states.delete(name)
      // Deleting the active file shows its neighbour; the deleted file's state is gone, so
      // there is nothing to keep from the view.
      open((p) => removeFile(p, name), { keepLeaving: project.active !== name })
    },

    exportProject() {
      sync()
      const blob = new Blob([serialize(project)], { type: 'application/json;charset=utf-8' })
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = 'etamil-project.json'
      document.body.append(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 0)
    },

    // A project file replaces the project; anything else is taken as one program and
    // added as a file, named after the file it came from.
    async importFile(file) {
      const text = await file.text()
      const imported = parse(text)
      if (imported) {
        const count = project.files.length
        const plural = count === 1 ? '' : 's'
        if (!window.confirm(`Replace the ${count} file${plural} in this project with ${imported.files.length} from ${file.name}?`)) {
          return
        }
        states.clear()
        open(() => imported, { keepLeaving: false })
        return
      }
      open((p) => addFile(p, cleanName(file.name) ?? 'imported.qmz', text))
    },

    // A sample loaded into the editor names the file after itself, unless that name is
    // taken by another file.
    sampleLoaded(file) {
      const to = cleanName(file)
      if (to && to !== project.active) renameKeepingState(project.active, to)
    },
  }
}

function stripPanel(controller) {
  return (view) => {
    const dom = document.createElement('div')
    dom.className = 'etamil-project-strip'

    const tabs = document.createElement('div')
    tabs.className = 'etamil-project-tabs'
    tabs.setAttribute('role', 'tablist')

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.qmz,.txt,text/plain,application/json'
    input.hidden = true
    input.addEventListener('change', async () => {
      const [file] = input.files
      input.value = ''
      if (file) await controller.importFile(file)
    })

    const button = (text, title, onClick) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'etamil-project-action'
      b.textContent = text
      b.title = title
      b.addEventListener('click', onClick)
      return b
    }

    const actions = document.createElement('div')
    actions.className = 'etamil-project-actions'
    actions.append(
      button('+', 'New file', () => controller.add()),
      button('⭱ Import', 'Import a project or a program', () => input.click()),
      button('⭳ Export', 'Export the project as one file', () => controller.exportProject()),
    )

    function render() {
      const { files, active } = controller.project
      tabs.replaceChildren(
        ...files.map((f) => {
          const tab = document.createElement('div')
          tab.className = 'etamil-project-tab' + (f.name === active ? ' active' : '')
          tab.setAttribute('role', 'tab')
          tab.setAttribute('aria-selected', String(f.name === active))

          const label = document.createElement('button')
          label.type = 'button'
          label.className = 'etamil-project-label'
          label.textContent = f.name
          label.title = f.name === active ? 'Double-click to rename' : 'Open ' + f.name
          label.addEventListener('click', () => controller.show(f.name))
          label.addEventListener('dblclick', () => controller.rename(f.name))
          tab.append(label)

          if (files.length > 1) {
            const close = document.createElement('button')
            close.type = 'button'
            close.className = 'etamil-project-close'
            close.textContent = '×'
            close.title = 'Delete ' + f.name
            close.setAttribute('aria-label', 'Delete ' + f.name)
            close.addEventListener('click', () => controller.remove(f.name))
            tab.append(close)
          }
          return tab
        }),
      )
    }

    dom.append(tabs, actions, input)
    // The plugin may not have attached yet; the first publish renders then.
    if (controller.project) render()
    return { dom, top: true, destroy: controller.subscribe(render) }
  }
}

const projectPlugin = (controller) =>
  ViewPlugin.define((view) => {
    controller.attach(view)
    return {
      update(update) {
        if (update.docChanged) controller.touched()
      },
    }
  })

// Spelled out, not var() fallbacks, for the reason etamil-download.js gives.
const projectTheme = EditorView.theme({
  '.etamil-project-strip': {
    display: 'flex',
    alignItems: 'stretch',
    gap: '8px',
    padding: '4px 6px 0',
    background: 'var(--ide-bar-bg, #0A2540)',
    borderBottom: '1px solid var(--ide-keyrow-border, #10416B)',
    color: 'var(--ide-text, #DCE9F8)',
  },
  '.etamil-project-tabs': { display: 'flex', gap: '2px', flex: '1', overflowX: 'auto', minWidth: 0 },
  '.etamil-project-tab': {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid var(--ide-keyrow-border, #10416B)',
    borderBottom: 'none',
    borderRadius: '6px 6px 0 0',
    background: 'var(--ide-key-bg, #0E3557)',
    whiteSpace: 'nowrap',
  },
  '.etamil-project-tab.active': {
    background: 'var(--ide-key-active, #17507F)',
    boxShadow: 'inset 0 2px 0 #5AA9E6',
    fontWeight: '600',
  },
  '.etamil-project-label, .etamil-project-close, .etamil-project-action': {
    background: 'transparent',
    border: 'none',
    color: 'var(--ide-text, #DCE9F8)',
    font: 'inherit',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '5px 8px',
  },
  '.etamil-project-close': { padding: '5px 6px 5px 0', opacity: '0.7' },
  '.etamil-project-actions': { display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', paddingBottom: '4px' },
  '.etamil-project-action': { border: '1px solid var(--ide-keyrow-border, #10416B)', borderRadius: '6px' },
})

/** Tabs, autosave and restore, project import and export, and a program in a link. */
export function etamilProject() {
  const controller = createController()
  return [projectTheme, projectPlugin(controller), showPanel.of(stripPanel(controller))]
}

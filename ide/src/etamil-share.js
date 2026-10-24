// Share the program as a link, and keep it from being lost.
//
// Two things the browser editor lacked. A reader who wrote something worth showing had no
// way to send it, and closing the tab lost whatever they had typed. Both are client-side:
// the link carries the program in its `#` fragment (see etamil-share-core.js), and the
// working copy is kept in localStorage. No server is involved, and nothing is sent anywhere.
//
// Only the main editor on a page gets this (see main.js): an editor embedded in prose
// illustrates the paragraph above it, and restoring someone's saved program into it would
// put the wrong code under that paragraph.

import { EditorView, ViewPlugin } from '@codemirror/view'
import { toolbarControl } from './etamil-toolbar.js'
import { encodeShare, decodeShare, SHARE_KEY } from './etamil-share-core.js'

// One saved program per page, so the tour and the playground do not overwrite each other.
const storageKey = () => 'etamil-ide:doc:' + location.pathname

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
    // Quota or blocked: autosave is a convenience, never a reason to interrupt typing.
  }
}

// Opens with the shared program if the URL carries one, otherwise with the saved one; then,
// and only then, starts saving. Starting earlier would overwrite the saved program with the
// page's sample text before it had been restored.
const restoreAndSave = ViewPlugin.define((view) => {
  const key = storageKey()
  let timer = null
  let restored = false

  // Not synchronously: a plugin may not dispatch while the view is being constructed.
  Promise.resolve().then(async () => {
    let text = null
    if (location.hash.startsWith(SHARE_KEY)) {
      text = await decodeShare(location.hash.slice(SHARE_KEY.length))
      // The link has done its job. Leaving it would make a later reload discard the edits
      // made since, in favour of the program as it was shared.
      history.replaceState(null, '', location.pathname + location.search)
    }
    if (text == null) text = read(key)
    if (text != null && text !== view.state.doc.toString()) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    }
    restored = true
  })

  return {
    update(update) {
      if (!update.docChanged || !restored) return
      clearTimeout(timer)
      const doc = update.state.doc
      timer = setTimeout(() => write(key, doc.toString()), 500)
    },
    destroy() {
      clearTimeout(timer)
    },
  }
})

function shareButton(view) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'etamil-share-button'
  const label = '🔗 பகிர் / Share'
  button.textContent = label
  button.title = 'Copy a link to this program'

  let reset = null
  const flash = (text) => {
    button.textContent = text
    clearTimeout(reset)
    reset = setTimeout(() => (button.textContent = label), 1800)
  }

  button.addEventListener('click', async () => {
    const link =
      location.origin + location.pathname + location.search + SHARE_KEY + (await encodeShare(view.state.doc.toString()))
    try {
      await navigator.clipboard.writeText(link)
      flash('✓ நகலெடுக்கப்பட்டது / Copied')
    } catch {
      // No clipboard permission (an insecure page, or a blocked iframe): show the link so
      // it can still be copied by hand.
      window.prompt('Copy this link:', link)
    }
  })

  return button
}

// Spelled out, not var() fallbacks, for the reason etamil-download.js gives: the bar sits in
// a dark shell, and a button that inherits the wrong ink is invisible.
const shareTheme = EditorView.theme({
  '.etamil-share-button': {
    padding: '5px 12px',
    border: '1px solid var(--ide-keyrow-border, #10416B)',
    borderRadius: '6px',
    background: 'var(--ide-key-bg, #0E3557)',
    color: 'var(--ide-text, #DCE9F8)',
    font: 'inherit',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  '.etamil-share-button:active': {
    background: 'var(--ide-key-active, #17507F)',
  },
})

/** A share button in the run bar, a link-borne program, and autosave. */
export function etamilShare() {
  return [toolbarControl.of(shareButton), restoreAndSave, shareTheme]
}

// Share the program as a link.
//
// The link carries the program in its `#` fragment (see etamil-share-core.js), so it is
// never sent to a server. Opening a link is handled by etamil-project.js, which adds the
// program to the reader's project as a new file instead of overwriting their work.
//
// Only the main editor on a page gets this (see main.js): an editor embedded in prose
// illustrates the paragraph above it.

import { EditorView } from '@codemirror/view'
import { toolbarControl } from './etamil-toolbar.js'
import { encodeShare, SHARE_KEY } from './etamil-share-core.js'

function shareButton(view) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'etamil-share-button'
  const label = '🔗 பகிர் / Share'
  button.textContent = label
  button.title = 'Copy a link to the open file'

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

/** A share button in the run bar. */
export function etamilShare() {
  return [toolbarControl.of(shareButton), shareTheme]
}

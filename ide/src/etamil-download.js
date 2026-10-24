// Download the current program as a .qmz file.
//
// This was briefly a "publish to GitHub" bar -- an owner/repo field, a filename
// field and a button that opened GitHub's prefilled new-file editor. It went,
// and the reason is worth writing down so it does not come back: the reader who
// wants their program on GitHub already knows how to put a file there, and the
// three controls it took to ask them where cost more attention than they
// returned. A download is one button and no questions.
//
// It is also not a panel of its own any more. A second bar under the run bar
// was a second row of chrome for one button; it goes in the run bar instead,
// contributed through the toolbar facet so neither module imports the other.
//
// The filename follows the loaded sample, so a downloaded program arrives
// called 44-vilaippattiyal.qmz rather than something anonymous.

import { EditorView } from '@codemirror/view'
import { toolbarControl } from './etamil-toolbar.js'

const DEFAULT_NAME = 'en_niral.qmz'

function downloadButton(view) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'etamil-download-button'
  button.textContent = '⭳ பதிவிறக்கு / Download'
  button.title = '.qmz'

  let name = DEFAULT_NAME

  button.addEventListener('click', () => {
    const blob = new Blob([view.state.doc.toString()], {
      type: 'text/plain;charset=utf-8',
    })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    // The open project file, when there is one, names the download.
    a.download = view.dom.dataset.etamilFile || name
    document.body.append(a)
    a.click()
    a.remove()
    // Revoked on the next turn of the event loop: revoking synchronously can
    // beat the browser to the download in Safari.
    setTimeout(() => URL.revokeObjectURL(href), 0)
  })

  // A loaded sample renames the buffer. The event comes from the sample list,
  // which is a sibling inside the same frame.
  view.dom.closest('.ide-frame')?.addEventListener('etamil-sample', (e) => {
    if (e.detail && e.detail.file) name = e.detail.file
  })

  return button
}

// Colours are spelled out rather than left to var() fallbacks. The first
// version used `background: transparent` with `color: var(--ide-text, …)`, and
// the button came out invisible: the panel sits inside the editor's dark shell,
// but the fallback in that var() is the light-theme ink, so anything that
// stopped the variable resolving painted dark text on a dark bar. These match
// the run button beside it, which does resolve.
const downloadTheme = EditorView.theme({
  '.etamil-download-button': {
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
  '.etamil-download-button:active': {
    background: 'var(--ide-key-active, #17507F)',
  },
})

/** A download button in the run bar, named after whichever sample is loaded. */
export function etamilDownload() {
  return [toolbarControl.of(downloadButton), downloadTheme]
}

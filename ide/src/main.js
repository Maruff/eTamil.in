// Mounts the eTamil editor. Kept deliberately thin: everything that is not
// "talk to CodeMirror's API" belongs in a module the future Monaco shell can
// share, not in here.

import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { etamil } from './etamil-language.js'
import { etamilFont } from './etamil-font.js'
import { etamilIntelligence } from './etamil-intelligence.js'
import { etamilKeyRow } from './etamil-keyrow.js'
import { etamilScriptSwitch } from './etamil-script-switch.js'
import { etamilRunner } from './etamil-run.js'
import { etamilDownload } from './etamil-download.js'
import { etamilShare } from './etamil-share.js'
import { etamilProject } from './etamil-project.js'
import { mountSamples } from './etamil-samples.js'
// Mounts itself on [data-etamil-form-builder], which only the Studio page has.
import './etamil-form-builder.js'

// Simple interest, which exercises every highlight category the generated
// token table produces: `செயல்`/`எனில்`/`திரும்பு` as control flow,
// `அசல்`/`வீதம்`/`வட்டி` as finance vocabulary, a percentage literal, and a
// string. It must also lint clean -- a sample with an error in it teaches the
// wrong syntax on first sight.
//
// Note there is no binding keyword: eTamil assigns with a bare `name = value`.
// `மாறி` (Let) exists as a token but the parser does not accept it as a
// statement prefix, so `மாறி தொகை = 50000;` is a parse error.
const SAMPLE = `// __எளிய வட்டி — simple interest__
செயல் வட்டி_கணக்கு(அசல், வீதம், ஆண்டு) {
    வட்டி = அசல் * வீதம் * ஆண்டு;
    (வட்டி > 10000) எனில் {
        அச்சு("வரி பிடித்தம் உண்டு");
    }
    திரும்பு வட்டி;
}

தொகை = 50000;
அச்சு(வட்டி_கணக்கு(தொகை, 7.5%, 3));
`

export function mount(parent, { doc = SAMPLE, extensions = [] } = {}) {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        basicSetup,
        etamil(),
        // After the language, so its decorations sit over the colouring the
        // highlighter applies rather than under it.
        etamilFont(),
        etamilIntelligence(),
        // Before the key row, so the output pane sits above it: on a phone the
        // keys belong closest to the thumbs.
        etamilRunner(),
        // After the runner, which owns the bar this contributes its button to.
        etamilScriptSwitch(),
        etamilKeyRow(),
        ...extensions,
      ],
    }),
  })
}

// Auto-mount so a Jekyll page needs only the container div and a module
// script tag -- no inline JavaScript, which keeps the site's CSP simple.
function autoMount() {
  for (const el of document.querySelectorAll('[data-etamil-editor]')) {
    if (el.dataset.mounted) continue
    el.dataset.mounted = '1'

    // An editor with a sample list beside it gets a download button too: the
    // reader has been handed fifty programs and will want one of them on
    // disk. It also gets a share link, tabs for several files and autosave,
    // since this is the one place a reader writes something of their own. An editor embedded in
    // prose illustrates the paragraph above it and stays without the furniture.
    const listHost = el.parentElement?.querySelector('[data-etamil-samples]')

    // Kept on the element so an embedding page (or a test) has a handle on the
    // editor without this module having to own a registry.
    el.etamilView = mount(el, {
      doc: el.textContent.trim() || SAMPLE,
      extensions: listHost ? [etamilDownload(), etamilShare(), etamilProject()] : [],
    })
    // The seed text lived in the element; CodeMirror has it now.
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) node.remove()
    }

    if (listHost) {
      // The include owns the URL: the bundle is built with a relative base and
      // only shares a directory with the samples by convention.
      mountSamples(listHost, el.etamilView, listHost.dataset.etamilSamples)
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoMount)
} else {
  autoMount()
}

export { SAMPLE, etamil }

// The library's function vocabulary, fetched when the editor is idle.
//
// assets/ide/etamil-library.json is 386 kB (about 50 kB compressed): most of the vocabulary's
// size, and wanted only once someone types a name. So it is not bundled, as the keywords and the
// host builtins are (etamil-vocabulary.js). Until it arrives, completion and hover simply do not
// offer library functions; they do not wait for it.
//
// The URL is resolved against this script, like etamil-stdlib.js, and for the same reason the
// file is not in ide/src.

import { makeLibrary } from './etamil-library-core.js'

export * from './etamil-library-core.js'

let current = null
let pending = null

/** The library once it has loaded, or null before that (or if it could not be fetched). */
export function currentLibrary() {
  return current
}

/** Start fetching, once. Safe to call from every editor on a page. */
export function startLoadingLibrary() {
  if (!pending) {
    pending = fetch(new URL(/* @vite-ignore */ 'etamil-library.json', import.meta.url))
      .then((response) => {
        if (!response.ok) throw new Error(`the library vocabulary could not be loaded (${response.status})`)
        return response.json()
      })
      .then((data) => {
        current = makeLibrary(data)
        return current
      })
      .catch(() => {
        // Offline, or a failed request. Completion still works without it, and the next editor
        // to mount tries again.
        pending = null
        return null
      })
  }
  return pending
}

// The standard library's sources, fetched when a program imports from it.
//
// assets/ide/etamil-stdlib.json is written by tools/gen_stdlib.py: an object from the path an
// import names (`nUlakam/paNam/paNam.qmz`) to that file's source. It is 3.6 MB (about 600 kB
// compressed), so it is not bundled and not fetched until a run needs it; see etamil-run-core.js.
//
// The URL is resolved against this script, so it is found wherever the site is served from.
// The file is not in ide/src, which Vite is told about by the build as a path it cannot find
// and leaves to run time, which is what is wanted.

let pending = null

/** Resolves to an object from library path to source. Fetched once, then kept. */
export function loadLibrary() {
  if (!pending) {
    pending = fetch(new URL(/* @vite-ignore */ 'etamil-stdlib.json', import.meta.url))
      .then((response) => {
        if (!response.ok) throw new Error(`the standard library could not be loaded (${response.status})`)
        return response.json()
      })
      .catch((error) => {
        // A failed fetch must not be remembered, or the reader could never retry.
        pending = null
        throw error
      })
  }
  return pending
}

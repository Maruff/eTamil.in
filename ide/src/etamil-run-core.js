// Running a project, with the standard library fetched when a program asks for it.
//
// Nothing here touches the page or the wasm, so it can be tested with a stand-in
// compiler. The compiler's `run_project` takes every source an import may reach as
// data, because the browser has no files to open. A program that imports
// `nUlakam/paNam/paNam.qmz` therefore needs that source in the set, and the whole
// library is 3.6 MB: far too much to send with a page that never imports it.
//
// So the run is tried first with what the project holds. If it fails because a module
// is not there, and the module is one of the library's, the library is fetched (once)
// and that module is added, and the run is tried again. A module that imports
// another fails the same way for the next one, so a chain of imports takes a few
// attempts; each fails while the program is being assembled, before anything runs, so
// an attempt costs a parse.

/** The library's own folder: the only place an import is looked for beyond the project. */
export const LIBRARY_PREFIX = 'nUlakam/'

/** Attempts before giving up. The library has about a thousand modules; no program wants that many. */
export const MAX_ATTEMPTS = 400

const MISSING = /cannot open module '([^']+)'/

/**
 * The path of the module a failed run could not find, or null when the run failed for
 * any other reason (or did not fail). The compiler reports the path as it resolved it,
 * relative to the importing file, which is also how the library is keyed.
 */
export function missingModule(result) {
  if (!result || result.ok || result.stage !== 'parse' || typeof result.error !== 'string') return null
  const found = MISSING.exec(result.error)
  return found ? found[1] : null
}

/**
 * Run `entry` from `files` (an object from path to source).
 *
 * - `run(files, entry, input)` is the compiler's `run_project`, returning its result.
 * - `loadLibrary()` resolves to an object from path to source; it is called at most once.
 * - `onLibrary()` is told when that fetch starts, so the page can say so.
 *
 * The caller's `files` is never changed. The result is the compiler's own.
 */
export async function runWithLibrary({
  files,
  entry,
  input = '',
  run,
  loadLibrary,
  onLibrary = () => {},
}) {
  const supplied = { ...files }
  let library = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = run(supplied, entry, input)
    const missing = missingModule(result)

    // Ran, or failed for a reason more files would not mend.
    if (missing === null) return result
    // Not the library's, so it is a file the project should have: nothing to fetch.
    if (!missing.startsWith(LIBRARY_PREFIX)) return result

    if (library === null) {
      onLibrary()
      library = await loadLibrary()
    }
    // The library does not have it either. The compiler's message already says so.
    if (!Object.hasOwn(library, missing)) return result

    supplied[missing] = library[missing]
  }

  return {
    ok: false,
    output: '',
    error: `more than ${MAX_ATTEMPTS} library modules were needed: is an import going round in a circle?`,
    stage: 'parse',
    files: [],
  }
}

# eTamil editor

CodeMirror 6 editor for eTamil, built into `../assets/ide/` for the Jekyll site
to serve at `/ide/`. Highlighting, diagnostics and completion all come from the
real compiler; nothing here reimplements the language.

GitHub Pages runs Jekyll, not npm or cargo, so **the built bundle and wasm are
committed**. Nothing here runs in CI; the build is a local step before a commit.

## The two generated inputs

**Keywords.** `etamil_compiler/src/lexer.rs` defines 203 keywords, most with two
or three spellings -- Tamil script, a romanization, and sometimes an English
abbreviation. That is 541 strings. Hand-copying them into a highlighter would
drift the moment a keyword is added, and the drift would be silent: the editor
would stop colouring a word the compiler still understands.
`tools/gen_tokens.py` reads them out of the lexer, grouped by the
`// --- ... ---` section they appear under, so finance vocabulary colours
differently from control flow.

**Diagnostics and completion.** The compiler front end -- lexer, parser, type
checker -- is compiled to wasm and runs in the browser. A diagnostic in the
editor is therefore the same diagnostic `etamil` prints on the command line,
including the bilingual message text, which comes straight from each error
type's `Display` impl. `lib.rs` gates every module that needs an operating
system out of a wasm build; the front end itself needed no porting.

## Rebuilding

```
npm run tokens      # lexer.rs -> ../assets/ide/etamil-tokens.json
npm run wasm        # compiler front end -> ide/wasm/ (build input, gitignored)
npm run stdlib      # nUlakam/ -> ../assets/ide/etamil-stdlib.json (3.6 MB, fetched only when a program imports)
npm run build       # bundle -> ../assets/ide/{etamil-ide.js, *.wasm}
```

Run `tokens` after a keyword changes, `wasm` after anything in `lexer.rs`,
`parser.rs` or `check.rs` changes, and `build` after either. Commit
`../assets/ide/`.

Both scripts expect the compiler checked out as a sibling of this site
(`../../eTamil/etamil_compiler`).

### wasm prerequisites

```
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version <the wasm-bindgen version in Cargo.lock> --locked
```

The CLI version must match the `wasm-bindgen` crate version exactly or the
generated glue will not load. Read it out of the lock file rather than guessing.

The wasm dependency block also declares `getrandom` twice, once as itself and
once renamed. Both are needed: getrandom refuses to build for
wasm32-unknown-unknown unless told which backend to use, the tree holds two
incompatible majors (0.3, which `signing.rs` calls by name, and 0.4, which
`p256` pulls through `rand_core`), and a feature can only be enabled on a
direct dependency. Do not "tidy" the duplicate away.

## Local development

```
npm run dev         # vite dev server, ide/index.html as the harness
```

`ide/index.html` is a harness only and is not deployed -- the deployed page is
`../ide.html`, which loads the built bundle and owns the colour palette.

## Layout

| File | Purpose |
|---|---|
| `src/etamil-language.js` | tokenizer + highlight style; mirrors `lexer.rs` rule order |
| `src/etamil-compiler.js` | wasm bridge; knows nothing about CodeMirror |
| `src/etamil-intelligence.js` | CodeMirror adapters: linter, completion (names, builtins, statement templates), hover |
| `src/etamil-vocabulary*.js` | keywords and host builtins from the generated JSON; `-core` is pure |
| `src/etamil-share*.js` | share link (`#code=`); `-core` is pure |
| `src/etamil-project*.js` | tabs for several files, autosave, project import and export, opening a share link as a new file; `-core` is pure |
| `../tools/gen_vocabulary.py` | compiler `language-data.json` -> `assets/ide/etamil-vocabulary.json` (`npm run vocabulary`) |
| `src/etamil-keyrow.js` | mobile key row, shown by media query |
| `src/main.js` | mounts the editor; auto-mounts `[data-etamil-editor]` |
| `../tools/gen_tokens.py` | lexer.rs -> keyword table |
| `../ide.html` | the Jekyll page, and where the colour palette lives |

`etamil-compiler.js` deliberately has no CodeMirror import: a second editor
shell should be able to consume the compiler through it without dragging in
this directory's neighbours.

## Notes and known gaps

- **`base: './'` in vite.config.mjs is load-bearing.** With Vite's default base
  of `/`, the built bundle asks for `/etamil-ide-….wasm` at the site root and
  gets a 404 -- the file is served from `/assets/ide/`. A relative base makes the
  emitted URL `new URL("….wasm", import.meta.url)`, which resolves against the
  module and works from any mount path. **`npm run dev` cannot catch this**: the
  dev server serves the module graph directly rather than the built output. To
  test it, serve the site directory statically and load `/assets/ide/` from
  there.


- **Programs run in the browser.** Lex, parse, check, compile to bytecode and
  interpret, all client-side. `vm/host.rs` is what made this possible: the
  interpreter's output and file access go through it, with `std::fs` and stdout
  natively and an in-memory buffer and file map in the browser. It is a
  `#[cfg]`-selected module rather than a trait the VM holds, because a trait
  would mean threading `&mut dyn Host` through every method of a 2,000-line
  file; swapping `fs::write` for `host::write` changes the call and nothing
  else.

  `db`, `redis` and `http` are not gated out but *substituted*: `wasm_stubs.rs`
  re-creates the sixteen items the interpreter touches as types that compile and
  functions that fail, so the interpreter needs no `#[cfg]` in its body and a
  program asking for a database gets a sentence instead of a missing feature.
  `run_program`, `package_entry` and `package_copy` have same-signature browser
  twins for the same reason.

  **Unavailable in the browser, by design:** databases, Redis, HTTP auth and
  tokens, subprocesses, ODF/zip packages, and `உள்ளிடு` (there is no console to
  read). Each returns a bilingual explanation. File I/O *works*, against an
  in-memory filesystem that is cleared before every run.

- **Runs are capped at 10 million instructions** (`execute_limited`). A browser
  tab cannot interrupt a `சுற்று` whose condition never goes false; without a
  ceiling the page just stops responding. The cap trips in about 0.6 s and
  reports an endless loop. `execute` keeps no ceiling, since a long-running
  report is legitimate on a server.

- **The VM runs on the main thread.** The ceiling stops a runaway loop from
  hanging the tab, which is the problem a Worker would have solved, and a Worker
  needs its own copy of the wasm plus a message protocol. Revisit when a program
  can legitimately run for seconds.

- **Carrying the VM cost ~133 kB gzipped** (82 kB -> 215 kB). Roughly half of
  that is `p256`, carried because `signing` is real ECDSA and stubbing it would
  mean handing back key pairs that are not keys. If size matters more than
  `கையொப்பம்` working in the browser, gating `signing` out is the lever.

- **`wasm-opt` is deliberately not in the pipeline.** It reduces raw size and
  makes the download *bigger*, because it removes exactly the repetition gzip
  was exploiting. Measured on the 981 kB module, gzipped: none 79,765; -O1
  81,324; -O2 99,137; -Os 115,989; -Oz 124,136. Every level is worse over the
  wire. Do not re-add it without re-measuring transfer size, not raw size.
  (gzip; brotli untested, but the trend is monotonic.)

- **Completion is scoped** via `symbols_at(source, line, column)`. Function
  bodies come from brace-matching the token stream, since the AST carries no
  span for a `FunctionDef`. One imprecision remains, in the broken-parse
  fallback only: a name appearing both globally and inside a function is
  recorded once, under whichever came first.

- **The compiler counts columns in characters, CodeMirror in UTF-16 code
  units.** These agree for Tamil, which is entirely in the BMP. An astral-plane
  character inside a string or comment would shift that one marker by a column.

- **Tamil has no common monospace face**, so columns do not align the way they
  do for Latin. See the font stack comment in `../ide.html`.

## Running a project, and the standard library

The Run button runs the whole project, not only the file on screen: every file is handed to the
compiler's `run_project`, and an `இறக்கு "vari.qmz";` finds `vari.qmz` among them, relative to the
importing file, with the same rules as on disk (a file imported twice is included once, a cycle
stops, two modules defining one name is an error).

The browser has no files to open, so the **standard library** is data too.
`assets/ide/etamil-stdlib.json` (3.6 MB, about 600 kB compressed) holds its sources, keyed by the
path an import names, and is **fetched only when a run needs it**: the run is tried first with what
the project holds, and if the compiler reports a missing module under `nUlakam/`, the library is
fetched (once) and that module is added and the run tried again. A chain of imports takes one
quick attempt each; each fails while the program is being assembled, before anything runs. A
missing file of the project's own is reported without a download. The logic is
`src/etamil-run-core.js`, tested with a stand-in compiler in `test/run-core.test.mjs`.

Run `npm run stdlib` after the library changes, and commit the JSON it writes.

**Not offered yet:** completion and hover for the library's functions. `tools/gen_vocabulary.py`
still drops them, because they could not run in a page when it was written. They can now.

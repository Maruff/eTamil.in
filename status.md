---
layout: page
title: Status and roadmap
section: Project
permalink: /status/
summary: >-
  An honest table of what works, what is partial, and what deliberately fails with
  an explicit message rather than quietly doing nothing.
description: >-
  The current state of the eTamil compiler — a feature-by-feature status table for
  the lexer, VM, decimals, collections, modules, databases, HTTP server, LLVM
  backend and type checking, plus what remains on the roadmap.
lang: en
key: status
alt_url: /ta/status/
---

eTamil runs backend programs today: functions, collections, error handling,
modules, SQL and document databases, a concurrent HTTP server with routing, and
accounting, taxation, banking, insurance and customs frameworks written in the
language itself. It also runs in a browser — the
compiler is built to WebAssembly, so the editor on this site is the real thing.

This table is the honest state of the code, not a wish list.

## What works

<div class="table-scroll" markdown="1">

| Area | Status | Notes |
|---|---|---|
| Lexer (Tamil / romanized / English keywords) | <span class="pill pill-ok">Working</span> | 203 tokens across 545 spellings; errors carry line and column |
| Romanization coverage | <span class="pill pill-ok">Complete</span> | Every one of the 202 keywords romanizes on-scheme, and `scripts/transliterate.py --check` gates CI on it. Getting there needed no breaking rename: a keyword may carry several spellings, so the scheme's form was made canonical and the old one kept — both lex. 524 spellings across 202 tokens, up from 505 |
| Variables, arithmetic, percentages, strings | <span class="pill pill-ok">Working</span> |  |
| Comparisons, `எனில்` / `இன்றேல்`, `சுற்று` loops | <span class="pill pill-ok">Working</span> |  |
| Chained comparisons | <span class="pill pill-ok">Working</span> | `(300000 < வருமானம் <= 700000)` — which is how a tax slab reads, and this language is full of them. It used to parse as `(300000 < வருமானம்) <= 700000`, a boolean compared against a number, so `3 > 2 > 1` was `false` and nothing said so. A chain becomes `மற்றும்` over neighbouring pairs, so it short-circuits and needs no new syntax. The middle operand is written twice, so it must be something that can be read twice — a name, a literal, a field, an index. A call there is refused rather than called twice, and told to name the value; a call at either end is read once and is fine |
| Logical `மற்றும்` / `அல்லது` / `இல்லை` | <span class="pill pill-ok">Working</span> | `மற்றும்` and `அல்லது` now stop as soon as the answer is known, so `(நீளம்(அ) > 0 மற்றும் அ[0] == 1)` is safe on an empty array |
| File I/O and CSV row counting | <span class="pill pill-ok">Working</span> | in the VM (`--vm`) |
| VM bytecode executor | <span class="pill pill-ok">Working</span> |  |
| Functions (`செயல்` / `திரும்பு`) | <span class="pill pill-ok">Working</span> | parameters, returns, local scope, recursion |
| Declared function signatures | <span class="pill pill-ok">Working</span> | `செயல் வரி(எண் தொகை, சொல் பெயர்) எண் { … }` — the type before the name, as in `எண் வருவாய்;`, and the return type between the parameter list and the body. Every part is optional, so nothing written before this changes meaning; what is written is enforced. An argument that cannot be its parameter's type is an error, so is a `திரும்பு` that cannot be the declared return type, and a call now infers as what it promised — so `அணி அ = பெயர்();` is caught when `பெயர்` returns `சொல்` |
| Arrays (`[…]`) and records (`{…}`) | <span class="pill pill-ok">Working</span> | indexing, field access, assignment |
| Iteration (`ஒவ்வொரு … இல்`) | <span class="pill pill-ok">Working</span> | arrays, records, strings |
| Results (`சரி` / `தவறு` / `?`) | <span class="pill pill-ok">Working</span> | Rust semantics; failure is a value, not an exception |
| Modules (`இறக்கு`) | <span class="pill pill-ok">Working</span> | resolves beside the file, then `ETAMIL_PATH`. Two imported modules that define the same name are refused, and the error names both files. Imports are flattened, so one would otherwise quietly replace the other. A program's own definition may still replace a library's. Namespaced imports are not written yet |
| Decimal arithmetic | <span class="pill pill-ok">Working</span> | fixed point, not `f64` |
| Standard library (`nUlakam/`) | <span class="pill pill-ok">Working</span> | strings, math, arrays, money — **written in eTamil** |
| Accounting framework | <span class="pill pill-ok">Working</span> | double entry, GST, three statements — **written in eTamil** |
| SQLite (`தளம்_இணை` etc.) | <span class="pill pill-ok">Working</span> | parameterised queries only; rows return as an array of records |
| Connection reuse | <span class="pill pill-ok">Working</span> | `தளம்_இணை` borrows from a process-wide idle cache instead of reconnecting per request; leases are exclusive, so transactions stay isolated. `ETAMIL_DB_IDLE` caps it |
| Named database handles | <span class="pill pill-ok">Working</span> | `தளம்_இணை SQL, "a.db", அ;` then `தளம்_வினா "SELECT …", [], வரிசைகள், அ;` — the name is an optional *trailing* operand, which the fixed-arity grammar makes unambiguous, so an unnamed connection still keys on its driver name exactly as before. Two SQLite files open at once, each query reaching its own, was previously impossible to express. An unnamed query with several open is still refused, and the message lists the open handles |
| PostgreSQL | <span class="pill pill-ok">Working</span> | `--features postgres`; money as native `NUMERIC`, so a text column stays text — unlike SQLite, where decimals are stored as text |
| MySQL / MariaDB | <span class="pill pill-ok">Live verified</span> | `--features mysql`; the live sample passes with `ETAMIL_TEST_MYSQL=1 ./scripts/run_examples.sh`; setup details are in `TESTING.md` |
| HTTP server (`--server`) | <span class="pill pill-ok">Working</span> | worker pool; `வழி` routes with `:id` path parameters, query params, headers and request bodies; `பதில்` responses |
| Response headers | <span class="pill pill-ok">Working</span> | `பதில் 200, உடல், {"Content-Type": "text/html"}` — an ordinary record; defaults to JSON when omitted |
| JSON responses (`ஜேசான்_உரை`) | <span class="pill pill-ok">Working</span> | `ஜேசான்_உரை உடல், 201` — sets the JSON content type for you and defaults to 200. The body must already be text: encoding a record here would need a second JSON encoder beside `ஜேசான்_ஆக்கு`, and eTamil's record syntax is not JSON, so it asks for the encoder that exists rather than emitting something that only looks right |
| JSON (`ஜேசான்_படி` / `ஜேசான்_ஆக்கு`) | <span class="pill pill-ok">Working</span> | Builtins since 1.4.0. They replace a parser written in eTamil, which could not read 624 KB in ten minutes; that takes 1.31 s now. `\uXXXX` escapes are decoded. A number is read and written as its exact decimal text, never through a binary float. Before 1.4.1, reading rounded one with more than about 17 significant digits |
| Scheduled blocks (`இடைவெளி`) | <span class="pill pill-ok">Working</span> | `இடைவெளி 3600 { … }` under either server; the number is the gap *between* runs, so a slow job runs late rather than twice at once |
| Bytes | <span class="pill pill-ok">Working</span> | `பைட்டுகள்` / `பைட்டுச்_சரம்` — a byte array is an ordinary array of numbers, not a new value type |
| base64 and hex (`nUlakam/vativam/kuRiyAkkam.qmz`) | <span class="pill pill-ok">Working</span> | `அறுபத்துநான்கு_ஆக்கு` `அறுபத்துநான்கு_படி` `பதினாறு_ஆக்கு` `பதினாறு_படி` — **written in eTamil** |
| Signing (HMAC-SHA256) | <span class="pill pill-ok">Working</span> | `கையொப்பம்` / `கையொப்பம்_சரியா` — verify a signed webhook; the comparison is constant-time |
| Outbound HTTP | <span class="pill pill-ok">Working</span> | `--features http-client` (on by default); `வலை_பெறு` `வலை_பதி` `வலை_அனுப்பு`. A non-2xx is a result, not a failure |
| Authentication | <span class="pill pill-ok">Working</span> | bcrypt and JWT in the host; `கடவுச்சொல்_மறை` `கடவுச்சொல்_சரியா` `சீட்டு_ஆக்கு` `சீட்டு_சரிபார்`. Set `ETAMIL_JWT_SECRET` |
| String escapes | <span class="pill pill-ok">Working</span> | `\n` `\t` `\r` `\"` `\\`; an unknown escape keeps both characters |
| Async HTTP server (`--async`) | <span class="pill pill-ok">Working</span> | tokio accept loop, handlers on the blocking pool; the VM stays synchronous |
| Parse error positions | <span class="pill pill-ok">Working</span> | every error carries a line and column, bilingually |
| Type checking | <span class="pill pill-ok">Working</span> | a declared type is enforced, with a position; deliberately narrow — no rule the rest of the language does not follow |
| VS Code extension | <span class="pill pill-ok">Working</span> | `eTamil_Code/`, and [**eTamil**]({{ site.brand.vscode_url }}) on the Marketplace — highlighting for all 203 keywords in every spelling, completions for 97 builtins and 940 `nUlakam` functions, and errors from `--check` as you type. Since 1.0.0 it carries the compiler, the standard library, the examples and the eTamil font inside the VSIX, so installing it is the whole installation. Grammar and completion data are **generated** from `lexer.rs`; CI fails if they drift |
| Interactive shell (`--repl`) | <span class="pill pill-ok">Working</span> | `etamil --repl` — type an expression, see what it comes to, without a file |
| Redis | <span class="pill pill-ok">Working</span> | The host offers one generic `ரெடிஸ்_கட்டளை` (a command name and its arguments), so every Redis command works, including ones invented later; `nUlakam/qaLam/retis.qmz` wraps the common ones by name |
| MongoDB | <span class="pill pill-ok">Working</span> | `--features mongodb`; a document *is* a `பொருள்`, so the mapping needed no invention — numbers are stored as `Decimal128` rather than doubles |
| Array and record equality | <span class="pill pill-ok">Working</span> | An array compares by position, a record by field. Both previously fell to a catch-all and were never equal, silently |
| Client certificates (mTLS) | <span class="pill pill-ok">Working</span> | `--features http-client`; proves who the client is to a bank that will not talk to an unidentified caller |
| ECDSA signatures (P-256) | <span class="pill pill-ok">Working</span> | `கையொப்பம்` over P-256, alongside the HMAC-SHA256 path; works in the browser build too |
| Tests written in eTamil | <span class="pill pill-ok">Working</span> | `nUlakam/cOqaZY/cOqaZY.qmz` — a library written in this language no longer has to be tested from Rust |
| Records as maps | <span class="pill pill-ok">Working</span> | `புலம்_உள்ளதா(ப, "சாவி")` and `புலம்_அல்லது(ப, "சாவி", இயல்பு)` are one hash lookup each, so a record can be a table of counts. Reading an absent field directly is still an error |
| Roots, logarithms and powers | <span class="pill pill-ok">Working</span> | `வர்க்கமூலம்` `இயற்கை_மடக்கை` `இயற்கை_அடுக்கு` `அடுக்கேற்று` `பத்தின்_மடக்கை` — computed on the decimal, not on `f64`, so √25 is exactly 5 and log10(1000) is exactly 3 |
| Sorting | <span class="pill pill-ok">Working</span> | `வரிசையாக்கு` sorts an array, and `புலத்தால்_வரிசையாக்கு` sorts records by one field |
| File system (`nUlakam/kOppumuRY/kOppumuRY.qmz`) | <span class="pill pill-ok">Working</span> | Join and split paths, list a directory, walk a tree, find files by extension — **written in eTamil** on three builtins. A path uses `/` on every platform, and listings are sorted. In the browser a directory is inferred from the in-memory files, and there is no modification time |
| Retrieval and language models (`nUlakam/nuNNaRivu/`) | <span class="pill pill-ok">Working</span> | Search by shared words (BM25) and by meaning (vectors), merged by rank, then optionally ask a model to phrase the answer — **written in eTamil**. The model is on the machine itself by default; another provider takes a key from whoever runs the program |
| Money as whole paise | <span class="pill pill-ok">Working</span> | `nUlakam/paNam/kAcu.qmz` — two decimal places without decimal arithmetic; `ரூபாயும்_பைசாவும்(2, 5)` is ₹2.05 |
| Depreciation and payroll | <span class="pill pill-ok">Working</span> | `nUlakam/kaNakkiyal/qEymAZam.qmz` and `Uqiyam.qmz`, posting into the same ledger — **written in eTamil** |
| WebAssembly target | <span class="pill pill-ok">Working</span> | `cargo build --target wasm32-unknown-unknown --no-default-features`; lexer, parser, checker and VM all build for the browser. Native builds are unchanged |
| Browser editor ([/start/]({{ '/start/' | relative_url }})) | <span class="pill pill-ok">Working</span> | The real compiler as WebAssembly: diagnostics, scope-aware completion and execution with no server and no upload. Highlighting is generated from `lexer.rs`, so it cannot drift from the language. It also completes the host builtins with their arguments as tab stops, offers a statement template for each keyword, shows documentation on hover, copies a share link that carries the program in the URL (never sent to a server), autosaves, and keeps several files as tabs that export and import as one file. It cannot import the standard library, because the browser build has no module loader |
| In-browser VM | <span class="pill pill-ok">Working</span> | Programs run client-side, capped at ten million instructions so a runaway `சுற்று` reports an endless loop instead of hanging the tab. File statements work against an in-memory filesystem cleared before every run |
| In the browser: databases, Redis, HTTP server | <span class="pill pill-no">Not available</span> | A page cannot open a TCP socket or listen on a port, so Postgres, MySQL, MongoDB, Redis and `சேவை` are out of reach for a reason no amount of work here would change. Each says so when tried, in both languages |
| In the browser: auth, ODF packages | <span class="pill pill-part">Not built yet</span> | Not the browser's doing: bcrypt wants a random source wired to the page's, and the ODF writer still reads and writes through `std::fs` rather than the host it was given. Both say they are unavailable until someone does the work — which is work, not a different machine |
| `உள்ளிடு` in the browser | <span class="pill pill-ok">Working</span> | The page hands the program its input before the run, through `run_with_input`, and `உள்ளிடு` reads it a line at a time. Up front because a page has nowhere to type during a run: the VM would have to block, and a blocked page is a hung tab. Asking for more lines than were given is the program's own error, like reading past the end of a file |
| Language server (`etamil-lsp`) | <span class="pill pill-part">Built and tested; not tried in a live editor</span> | The compiler's own diagnostics in both languages, completion of keywords (with statement templates), builtins and standard-library functions (which add their `இறக்கு`), hover, and go to definition. In every release package |
| JetBrains plugin | <span class="pill pill-part">Built; not tried in a live IDE</span> | Highlighting, the language server through LSP4IJ, and a run configuration (run, check only, or serve). No debugger: the compiler has none to attach to |
| Visual Studio extensions | <span class="pill pill-part">Built; not installed in Visual Studio</span> | The language, and the language server |
| Emacs mode | <span class="pill pill-part">Written, with tests; not yet run in Emacs</span> | Highlighting from word lists generated from the lexer, indentation, run and check, Eglot |
| Jupyter kernel | <span class="pill pill-part">Tested against the compiler; not run in a real Jupyter</span> | A cell runs in the compiler's own shell, so variables and functions persist; a cell stops at its first error |
| Retail banking libraries | <span class="pill pill-part">Tested; nothing run against an e-Sign provider or a bureau</span> | Loans, deposits, UPI AutoPay and NACH mandates, Aadhaar e-Sign, KYC and consent, and a general-ledger mapping. Rates and thresholds are parameters, never written into a library |
| Language specification | <span class="pill pill-ok">Working</span> | The grammar is generated from the tree-sitter grammar and accepts every program in `nUlakam/` and `examples/`. It is not shown to *reject* exactly what the compiler rejects: `--check` is the judge |
| Homebrew tap | <span class="pill pill-ok">Working</span> | Installs, passes `brew audit --strict` and `brew test`, and runs a Tamil program on macOS (Apple Silicon and Intel) and Linux (x64 and arm64) |
| GitHub Action | <span class="pill pill-ok">Working</span> | Passes on Linux (x64 and arm64), macOS and Windows against a real release, and with a pinned version |
| Docker image, `.deb`, `.rpm`, apt repository, npm and NuGet packages | <span class="pill pill-part">Built by the release workflow; first run pending</span> | Each is checked on a clean machine before a release names it |
| AWS template | <span class="pill pill-part">Passes <code>cfn-lint</code>; never deployed</span> | A CloudFormation template for ECS Fargate behind a load balancer |

</div>

## What is partial or missing

<div class="table-scroll" markdown="1">

| Area | Status | Notes |
|---|---|---|
| LLVM backend (`--llvm`) | <span class="pill pill-part">Expressions complete; I/O statements refused</span> | Linux/macOS, `--features llvm`. The IR no longer holds values: every one is a handle into an arena in `src/runtime.rs` and every operation on it is a call into the `cdylib` Cargo already builds. So decimals are **exact** — `1 / 3` prints all twenty-eight digits, as on the VM — formatting cannot drift because printing goes through the VM's own `to_string`, and all 97 builtins work at once because dispatch goes through the interpreter's own table. Strings, arrays, records, results, booleans and `இன்மை` all have a representation. What is still refused is *statements*: files, databases, HTTP, routes. The IR is therefore not self-contained — it links `-letamil_compiler`, and a compiled program ships with that library beside it. `llvm-sys 180` needs LLVM 18, which CI installs on Ubuntu 24.04 and builds against on every change. There, 109 of the 127 examples and library files compile and give the VM's answer, none disagrees, 8 are refused for the statements above, and 10 are skipped because they need a server or the VM cannot run them either |
| Arduino firmware (`--artino`) | <span class="pill pill-part">Tested off the board; not yet run on hardware</span> | `etamil --artino --board uno` compiles a program through LLVM to firmware for an Uno, Nano, Mega, Pico or Pico 2, and builds or uploads it with arduino-cli. A number is the value × 1000 in 64 bits, and wherever that differs from the VM the board says so over serial. CI runs every artino test against the VM, and compiles every example for all five boards. Needs an `etamil` built with `--features llvm`; the release packages have none. [How it works]({{ site.brand.compiler_repo }}/blob/main/docs/artino.md) |
| C++ libraries (`artino.toml`) | <span class="pill pill-part">Linked; not yet run on hardware</span> | A manifest beside the program names the C++ it may call. The Servo, NeoPixel and DS18B20 examples link for every board, and `[[port]]` makes SoftwareSerial one of a program's serial ports |
| Hardware on the VM (`nUlakam/vaZporuL`) | <span class="pill pill-part">Simulated board working; Raspberry Pi untested</span> | Pins, analog readings, time, serial ports, tone and the watchdog, and a file of pin names for each board. `ETAMIL_BOARD=sim` simulates a board on any machine, and the library's tests pass there. A Raspberry Pi's GPIO, and serial ports on Linux and macOS, are written but have not run on a Pi. Windows has the simulated board only |
| Adding a keyword can break a program | <span class="pill pill-part">By design, worth knowing</span> | 94 of the 203 keywords are deliberately usable as names, so a new keyword takes a word that existing code may already use as a variable |
| File encryption | <span class="pill pill-ok">Working</span> | `மறை(text, passphrase)` seals to one base64 string; `வெளிப்படு(sealed, passphrase)` returns a **result**, so a wrong passphrase or a tampered byte is something a program handles with `இயல்பு` or `?` rather than something that stops it. XChaCha20-Poly1305 over an Argon2id key, with the format's version byte authenticated, so a file from a future version is refused instead of misread. `மறை_விசை()` mints a passphrase for a program that would rather store a strong one than ask a person to invent one. Works in the browser build too |


</div>

Anything marked *not implemented* **fails with an explicit message** rather than
quietly doing nothing. That is deliberate: a silent no-op in a tax calculator is
worse than an error.

## Planned domain frameworks

Accounting, taxation and finance are in the language today. These extend the same
vocabulary across the rest of the Indian financial stack, each built as an eTamil
framework on the ledger that already exists.

<div class="table-scroll" markdown="1">

| Domain | Status | Scope |
|---|---|---|
| Accounting | <span class="pill pill-ok">Working</span> | Chart of accounts, double-entry ledger, trial balance, the three statements, reporting periods, year-end close, clearing, depreciation and payroll |
| Taxation | <span class="pill pill-ok">Working</span> | GST with CGST/SGST/IGST splitting, transaction types, ageing, tax-rate tables |
| Banking | <span class="pill pill-ok">Working</span> | `nUlakam/vawki/` — interest, loan instalments and schedules, accounts. `nUlakam/upi/` — virtual payment addresses, `upi://` pay links, and the rule that pending is not failure |
| Insurance | <span class="pill pill-ok">Working</span> | `nUlakam/kAppIttu/` — policy, premium and claim, including the average clause: under-insure a property and the insurer pays only the insured proportion, even on a partial loss |
| Customs &amp; trade | <span class="pill pill-ok">Working</span> | `nUlakam/cuwkam/` — the duty cascade in the order duties are actually applied, and trade documents |
| Blockchain | <span class="pill pill-ok">Working</span> | `nUlakam/cawkili/` — Hyperledger Fabric through a REST gateway. Fabric's own Gateway speaks gRPC, which eTamil does not; fronting a network with REST is an ordinary deployment |
| ITR and TDS | <span class="pill pill-part">Partly</span> | Depreciation and payroll post into the ledger; direct-tax return templates and TDS schedules are not written |
| GSTN / NPCI bindings | <span class="pill pill-part">Partly</span> | The UPI side is done as far as it can be without credentials — addresses and pay links are public and checkable. REST bindings to the GSTN portal are not written |

</div>

## Two numbering schemes, kept apart

Two unrelated things in this project were both called "Phase 1–N". They mean
entirely different things:

| Term | Meaning |
|---|---|
| **Paper Phase 1–5** | The research roadmap: compiler core → domain modules → tooling/REPL → pilot projects → policy engagement |
| **Backend milestone 1–4** | The repository's HTTP work: sync server → async → logging → auth |

Backend milestones 1–4 being complete says nothing about the paper's phases.
**Against the paper's scheme the project is mid-Phase 2 and mid-Phase 3, working
on both at once**, with Phase 1 close enough to done that what remains in it are
known defects rather than missing pieces.

Phase 2's domain modules are largely written: accounting, taxation, banking,
insurance, customs and a Fabric audit trail all exist as eTamil libraries on the
ledger. Phase 3 has databases, the tooling, and now an interactive shell.
Phase 4 is released but no pilot is deployed against a real product. Phase 5,
policy engagement, has not started and depends on Phase 2 being recognisable to
a regulator — a GST module that handles transactions is not that yet.

What remains design rather than code from the
[research]({{ '/research/' | relative_url }}): the GSTN portal bindings, ITR and
TDS templates, and RBI/KYC syntax.

## Contributing

The four items this section used to list are done: named database handles,
declared parameter and return types for `செயல்`, the romanization sweep, and
encryption behind `மறை`. The cipher that used to sit there was unreachable dead
code rather than a weak implementation, so it was deleted first and then replaced
by a real one.

What is most useful now:

- **Auth and ODF in the browser.** These are the two things the browser build
  refuses that it would not have to. bcrypt needs its random source pointed at
  the page's, and the ODF writer needs to go through `vm::host` like every other
  file statement instead of reaching for `std::fs` — the host would need a way to
  read bytes, which it has not needed until now. Databases, Redis and the HTTP
  server are a different matter and will keep refusing: a page has no socket.
- **The LLVM backend's statements.** Expressions are complete; files, databases,
  HTTP and routes are refused. `scripts/run_parity.sh` ranks them by how many
  distinct reasons each program has left, so the next one to do is measured
  rather than guessed.
- **artino on real boards.** Everything is tested against a stand-in for the
  board. A report from an Uno, Mega or Pico running `examples/artino`, or from a
  Raspberry Pi running `nUlakam/vaZporuL/vaZporuL_cOqaZY.qmz` against real pins,
  settles what the simulation cannot.

Please add a test to `etamil_compiler/tests/language_tests.rs` for any language
behaviour you change, and make sure `cargo test` passes on both Linux and Windows.

[The full roadmap, with reasoning →]({{ site.brand.compiler_repo }}/blob/main/docs/ROADMAP.md)

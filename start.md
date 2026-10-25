---
layout: page
title: Get started
section: Getting started
permalink: /start/
lang: en
key: start
alt_url: /ta/start/
summary: >-
  Run eTamil in your browser with nothing installed, or install the compiler —
  a single binary that needs neither Rust nor a C toolchain.
description: >-
  Two ways to start with eTamil: an in-browser editor that is the real compiler
  built to WebAssembly, and a prebuilt package for Windows, Linux and macOS that
  needs neither Rust nor a C toolchain, plus building from source with Cargo.
---

Two ways in. Run eTamil in your browser right now, or install the compiler and
use it locally. The browser editor **is** the compiler — the same lexer, parser,
type checker and VM, built to WebAssembly — so what works there works on your
machine.

## Try it now, nothing installed

{% capture editor_seed %}// __எளிய வட்டி — simple interest, exact to the paisa__
செயல் வட்டி_கணக்கு(அசல், வீதம், ஆண்டு) {
    திரும்பு அசல் * வீதம் * ஆண்டு;
}

தொகை = 50000;
அச்சு(வட்டி_கணக்கு(தொகை, 7.5%, 3));
{% endcapture %}
{% include editor.html seed=editor_seed name="வட்டி.qmz" samples=true %}

Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run. Nothing is uploaded and nothing is
stored. Databases, the HTTP server and `உள்ளிடு` need a machine of their own and
say so when you try them; everything else works here, including file statements
against an in-memory filesystem.

Ready for more than a scratchpad? Install it below.

## Download and install

No Rust, no C toolchain, no build step. The archive carries the compiler, the
eTamil standard library and the examples; the script copies them into place and
puts `etamil` on your `PATH`.

<div class="hero-actions" markdown="0">
  <a class="btn btn-primary" href="{{ site.brand.download_windows }}" rel="noopener">Windows x64 &middot; .zip</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_linux }}" rel="noopener">Linux x64 &middot; .tar.gz</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_linux_arm64 }}" rel="noopener">Linux arm64 (Raspberry Pi) &middot; .tar.gz</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_macos_arm64 }}" rel="noopener">macOS Apple Silicon &middot; .tar.gz</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_macos_x64 }}" rel="noopener">macOS Intel &middot; .tar.gz</a>
</div>

**Windows (PowerShell)**

```powershell
Expand-Archive etamil-windows-x64.zip -DestinationPath .
.\etamil-windows-x64\install.ps1
```

**Linux** — `arm64` for a Raspberry Pi 4 or 5 on 64-bit Raspberry Pi OS (or any other
aarch64 machine), `x64` otherwise. `uname -m` tells you which: `aarch64` or `x86_64`.
A 32-bit Raspberry Pi OS reports `armv7l`, and there is no package for it.

```bash
tar -xzf etamil-linux-x64.tar.gz
./etamil-linux-x64/install.sh
```

**macOS** — `arm64` for Apple Silicon, `x64` for Intel. `uname -m` tells you
which one you are on.

```bash
tar -xzf etamil-macos-arm64.tar.gz
./etamil-macos-arm64/install.sh
xattr -dr com.apple.quarantine ~/.local/lib/etamil
```

That last line is not optional. These builds are not notarized, so macOS
quarantines anything downloaded through a browser and Gatekeeper refuses to run
it — "cannot be opened because the developer cannot be verified" — rather than
asking. Clearing the flag once is enough.

Open a *new* terminal afterwards — the installer edits `PATH`, and a shell that is
already running does not see the change — then check it:

```bash
etamil --version
```

Nothing is left behind that a plain delete cannot undo: the Windows installer puts
everything under `%LOCALAPPDATA%\Programs\eTamil`, the Linux and macOS one under
`~/.local`, and none of them needs administrator rights.

<div class="note" markdown="1">
**Why no runtime to install.** The Windows binary links the C runtime statically,
so it does not need the Visual C++ Redistributable. The Linux binary is built
against musl, so it is one fully static ELF that does not depend on the build
machine's glibc.

The packages carry the PostgreSQL and MySQL drivers, since a downloaded binary
cannot have a cargo feature added to it later; the LLVM backend is not included,
because it needs LLVM present on the machine that runs the compiler. Every
archive is listed with its SHA-256 on the
[releases page]({{ site.brand.releases_url }}).
</div>

## Other ways to install

Each of these installs the same compiler, standard library and examples as the archives above.

| Where | Command |
|---|---|
| **Homebrew** (macOS, Linux) | `brew install Maruff/etamil/etamil` |
| **apt** (Debian, Ubuntu) | add the repository below, then `sudo apt install etamil` |
| **rpm** (Fedora, RHEL, openSUSE) | `sudo dnf install ./etamil-<version>-1.x86_64.rpm`, from the [releases page]({{ site.brand.releases_url }}) |
| **Docker** | `docker run --rm -v "$PWD":/work ghcr.io/maruff/etamil --vm hello.qmz` |
| **npm** | `npx etamil hello.qmz`, or `npm install -g etamil` |
| **.NET** | `dotnet tool install -g etamil` |
| **GitHub Actions** | `uses: Maruff/setup-etamil@v1` |

**apt.** The repository is on the releases page, signed with a key published beside it:

```bash
sudo curl -fsSL https://github.com/Maruff/eTamil_lang/releases/latest/download/etamil-archive-keyring.gpg \
    -o /usr/share/keyrings/etamil.gpg
echo "deb [signed-by=/usr/share/keyrings/etamil.gpg] https://github.com/Maruff/eTamil_lang/releases/latest/download ./" \
    | sudo tee /etc/apt/sources.list.d/etamil.list
sudo apt update && sudo apt install etamil
```

It holds the newest release only, so `apt upgrade` moves you to the next one.

**Docker.** The image runs `etamil` as a non-root user with `/work` as its working directory,
so mount your folder there. Use a release tag, such as `ghcr.io/maruff/etamil:2.0.0`, rather
than relying on `latest`.

## Build from source

Worth doing if you want the LLVM
backend, or to work on the compiler itself.

### Prerequisites

**Rust 1.88+** (edition 2024) and a C toolchain — the bundled SQLite and the crypto
crates compile C.

- **Windows** — Visual Studio Build Tools with the *Desktop development with C++*
  workload. The MSVC linker is not optional: without it even `cargo check` fails,
  because proc-macro crates link as DLLs.
- **Linux / macOS** — a working `cc` (`build-essential`, or the Xcode command line
  tools).

### With Cargo

```bash
git clone https://github.com/Maruff/eTamil_lang.git
cd etamil_compiler/etamil_compiler
cargo build --release
```

The binary is `target/release/etamil` (`etamil.exe` on Windows). Put it on your
`PATH`:

**Linux / macOS**

```bash
sudo cp target/release/etamil /usr/local/bin/etamil
```

**Windows (PowerShell)**

```powershell
Copy-Item "target\release\etamil.exe" "$env:USERPROFILE\bin\etamil.exe"
```

Verify:

```bash
etamil --version
```

## Your first program

```bash
echo 'அச்சு "வணக்கம் உலகம்!";' > hello.etamil
etamil --vm hello.etamil
```

On Windows, write the file as UTF-8:

```powershell
'அச்சு "வணக்கம் உலகம்!";' | Out-File hello.etamil -Encoding UTF8
etamil --vm hello.etamil
```

Then something that earns its keep — an income tax calculator that reads from
stdin:

```bash
echo "950000" | etamil --vm examples/basic_samples/example.qmz
```

## Optional features

SQLite is built in. The rest are behind Cargo features, so a default build does
not carry their dependencies.

```bash
cargo build --release --features postgres,mysql
```

The LLVM backend is only needed for `--llvm`, and only available on Linux and macOS:

```bash
cargo build --release --features llvm
```

<div class="note" markdown="1">
**The LLVM backend still compiles a subset of the VM**, though a growing one: it
now handles numeric functions, arrays, records, array iteration, and imports
resolved before codegen. Heterogeneous values and other unsupported constructs
are rejected rather than emitted as incorrect IR. Use `--vm` for real work.
</div>

## Running the tests

```bash
cd etamil_compiler
cargo test          # 295 language + 126 unit + 10 host-capture + 8 --check
```

`tests/language_tests.rs` covers the front end end-to-end by asserting on
**program results**, not exit codes — every bug those cover exited 0 while
producing the wrong answer. CI runs the build and full suite on Linux and Windows
for every push and pull request.

Every example also runs with its expected outcome checked, including the ones that
are *supposed* to fail:

```bash
./scripts/run_examples.sh
python3 scripts/transliterate.py --check   # romanization audit
```

## Editor support

[**eTamil**]({{ site.brand.vscode_url }}) on the VS Code Marketplace is the
shortest way to start: it carries the compiler, the `nUlakam` standard library,
the example programs and the eTamil font, so there is nothing on this page left
to do. Highlighting for all 203 keywords in every spelling, completions for the
98 builtins and 940 `nUlakam` functions, errors from `--check` as you type, and
**eTamil: Open an example** for one of twenty-nine working programs.

Its grammar and completion data are **generated from `lexer.rs`**, and CI fails
if they drift — so the editor cannot fall behind the compiler. To run a compiler
of your own instead, point `etamil.compilerPath` at it; to use `etamil` at a
terminal as well, run **eTamil: Install the compiler for use outside the
editor**.

The same extension is on Open VSX, so **Cursor, Windsurf and VSCodium** get it too. Other editors:

- **JetBrains IDEs** (2024.2 and later): a [plugin]({{ site.brand.compiler_repo }}/tree/main/packaging/jetbrains) with
  highlighting, the language server and a run configuration, so Ctrl+Shift+F10 runs, checks or serves a `.qmz` file.
- **Visual Studio:** [extensions]({{ site.brand.compiler_repo }}/tree/main/packaging/visualstudio) for the language and the language server.
- **Emacs:** [`etamil-mode`]({{ site.brand.compiler_repo }}/tree/main/eTamil_Emacs), with Eglot set up.
- **Neovim:** a [plugin]({{ site.brand.compiler_repo }}/tree/main/eTamil_Neovim) with file type detection, the language server, tree-sitter highlighting and `:checkhealth etamil`.
- **Helix and Zed:** the [tree-sitter grammar]({{ site.brand.compiler_repo }}/tree/main/tree-sitter-etamil).
- **Any editor that speaks the Language Server Protocol:** `etamil-lsp`, which is in every release package, gives the
  compiler's own diagnostics, completion, hover and go to definition.
- **Jupyter:** an [eTamil kernel]({{ site.brand.compiler_repo }}/tree/main/eTamil_Jupyter), so a notebook cell runs eTamil.

Some of these are built and tested but have not yet been tried in a live editor; the [status page]({{ '/status/' | relative_url }})
says which.

## Where next

<ul class="cards" markdown="0">
  <li class="card">
    <h3><a href="{{ '/language/' | relative_url }}">Language tour</a></h3>
    <p>Syntax, three spellings, exact decimals, functions, collections and modules.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/finance/' | relative_url }}">Finance &amp; accounting</a></h3>
    <p>GST, double entry and the three statements.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/server/' | relative_url }}">Backend</a></h3>
    <p>HTTP routes, SQL drivers, JSON and auth.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/status/' | relative_url }}">Status</a></h3>
    <p>What works today, what is partial, and what is not built.</p>
  </li>
</ul>

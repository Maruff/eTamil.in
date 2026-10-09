---
layout: page
title: eTamil user manual
section: Language
permalink: /language/manual/
lang: en
key: manual
alt_url: /ta/language/manual/
summary: >-
  The complete guide to writing, running and deploying eTamil programs — from your
  first line to a database-backed HTTP service.
description: >-
  The complete eTamil user manual: installing the compiler, the language in full
  (types, decimals, control flow, functions, collections, results, modules),
  the standard library, the accounting and GST framework, databases, the HTTP
  server, authentication, signing and scheduled work.
---

{% include language-nav.html %}
This manual covers everything needed to write and run eTamil programs. It assumes
you can use a terminal, and nothing else.

If you only want a taste, the [language tour]({{ '/language/' | relative_url }})
is shorter. If you want the full keyword list, that is the
[keyword reference]({{ '/language/keywords/' | relative_url }}).

<div class="note" markdown="1">
**Conventions.** Code is shown in Tamil script. Every keyword also has a
romanized and often an English spelling, all interchangeable — see
[Three spellings](#three-spellings). Where a feature needs a build flag or an
environment variable, it says so.
</div>

## Contents

**Getting started** — [Install](#1-install) · [Run a program](#2-run-a-program) · [Three spellings](#three-spellings)

**The language** — [Variables and types](#3-variables-and-types) · [Numbers and money](#4-numbers-and-money) · [Strings](#5-strings) · [Input and output](#6-input-and-output) · [Operators](#7-operators) · [Conditionals and loops](#8-conditionals-and-loops) · [Functions](#9-functions) · [Arrays and records](#10-arrays-and-records) · [Iteration](#11-iteration) · [Results](#12-results-handling-failure) · [Modules](#13-modules) · [Type checking](#14-type-checking) · [Naming rules](#15-naming-rules) · [Errors](#16-reading-error-messages) · [Files](#17-files-and-csv)

**Libraries** — [Standard library](#18-the-standard-library) · [Accounting and GST](#19-accounting-and-gst)

**Building services** — [Databases](#20-databases) · [HTTP server](#21-the-http-server) · [JSON](#22-json) · [Authentication](#23-authentication) · [Signing](#24-signing-and-webhooks) · [Bytes and encoding](#25-bytes-base64-and-hex) · [Outbound HTTP](#26-calling-other-services) · [Scheduled work](#27-scheduled-work)

**Practicalities** — [Editor](#28-editor-support) · [Checking and testing](#29-checking-and-testing) · [Environment variables](#30-environment-variables) · [Next steps](#31-next-steps)

---

## 1. Install {: #1-install}

**If you use VS Code, install the extension and stop here.**
[eTamil]({{ site.brand.vscode_url }}) carries the compiler, the whole `nUlakam`
standard library, the example programs and the eTamil font inside it, so
installing it is the whole installation — no download, no `PATH`, nothing to
build. Everything below is for using `etamil` at a terminal, which the extension
will set up for you too: **eTamil: Install the compiler for use outside the
editor**.

Otherwise the quickest route needs no Rust and no C toolchain.

<div class="hero-actions" markdown="0">
  <a class="btn btn-primary" href="{{ site.brand.download_windows }}" rel="noopener">Windows x64 &middot; .zip</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_linux }}" rel="noopener">Linux x64 &middot; .tar.gz</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_linux_arm64 }}" rel="noopener">Linux arm64 (Raspberry Pi) &middot; .tar.gz</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_macos_arm64 }}" rel="noopener">macOS Apple Silicon</a>
  <a class="btn btn-ghost" href="{{ site.brand.download_macos_x64 }}" rel="noopener">macOS Intel</a>
</div>

**Windows**

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

**macOS** — pick `arm64` for Apple Silicon or `x64` for Intel; `uname -m` tells you which.

```bash
tar -xzf etamil-macos-arm64.tar.gz
./etamil-macos-arm64/install.sh
xattr -dr com.apple.quarantine ~/.local/lib/etamil
```

That last line is required, not optional: the packages are not notarized, so
macOS quarantines anything downloaded through a browser and Gatekeeper refuses to
run it. Clearing the flag once is enough.

Open a **new** terminal afterwards — the installer edits `PATH`, and a shell
already running will not see it — then check:

```bash
etamil --version
```

Removal is just as simple: the Windows installer puts everything under
`%LOCALAPPDATA%\Programs\eTamil`, the Linux one under `~/.local`. Neither needs
administrator rights.

To build from source instead — needed for the PostgreSQL and MySQL drivers, the
LLVM backend, or work on the compiler itself — see
[the install page]({{ '/start/' | relative_url }}).

## 2. Run a program {: #2-run-a-program}

```bash
echo 'அச்சு "வணக்கம் உலகம்!";' > hello.etamil
etamil --vm hello.etamil
```

On Windows write the file as UTF-8:

```powershell
'அச்சு "வணக்கம் உலகம்!";' | Out-File hello.etamil -Encoding UTF8
etamil --vm hello.etamil
```

<div class="table-scroll" markdown="1">

| Flag | Effect |
|---|---|
| `--vm` | Run on the bytecode VM. This is the default and what you want |
| `--check` | Lex, parse and type check, then stop. Reports every error and **never runs the program** |
| `--server` | Start the HTTP server with a worker pool |
| `--async` | Concurrent server: async accept, handlers on the blocking pool. Ctrl-C stops it |
| `--llvm` | LLVM backend. Needs `--features llvm`; Linux and macOS only |
| `--port <PORT>` | Server port, default 8080 |
| `--host <HOST>` | Server host, default 127.0.0.1 |

</div>

File extensions are conventional, not enforced: `.etamil` and `.qmz` are both
used in the repository.

<h2 id="three-spellings">Three spellings</h2>

Every keyword accepts Tamil script, a romanized spelling typeable on a plain
keyboard, and where one exists an English alias. All produce the same token.

```etamil
எண் வருவாய் = 100000;     // Tamil script
eN varuvAy = 100000;       // romanized (ezuqqu)
int income = 100000;       // English alias
```

The romanization is its own scheme, deliberately not ISO 15919: one ASCII
character per Tamil letter, no diacritics, no digraphs. It keeps the three Tamil
nasals distinct where English collapses them into one `n` — `ண` is `N`, `ந` is
`n`, `ன` is `Z`. The
[full letter table]({{ '/language/' | relative_url }}#romanization) is on the
language page.

Pick one spelling per program. Mixing them is legal but produces variables that
look identical and are not — see [Naming rules](#15-naming-rules).

---

## 3. Variables and types {: #3-variables-and-types}

```etamil
எண் age = 25;          // number
எண் price = 99.99;     // fixed-point decimal
எண் rate = 15%;        // percentage literal — exactly 0.15
சொல் name = "Ravi";    // string
```

Declaring a type is optional; assigning without one works and infers nothing.
When you do declare, the compiler holds you to it, including on later
assignments.

The type keywords are `எண்` and `பின்னம்` (number), `சொல்` and `உரை` (string),
`ஈர்ம` (boolean), `அணி` (array), `பொருள்` and `தரவு` (record), and `தேதி` (a
date, held as ISO-8601 text because that sorts chronologically). `மெய்` and
`பொய்` are the two boolean *values*, not types.

## 4. Numbers and money {: #4-numbers-and-money}

**Every number is a fixed-point decimal.** There is no `f64` anywhere in the
arithmetic path, which is the single most important fact about this language for
financial work.

```etamil
அச்சு 0.1 + 0.2;      // 0.3        — not 0.30000000000000004
அச்சு 99.99 * 3;      // 299.97     — not 299.96999999999997
அச்சு 18%;            // 0.18       exactly
```

Equality is exact too. Two amounts a fraction of a paisa apart are never treated
as equal — which matters the moment you reconcile anything.

Division keeps full precision rather than rounding at each step, because Indian
tax computation rounds once at the end. Round explicitly when you need to:

```etamil
அச்சு வட்டமிடு(மொத்தம் / 3, 2);   // round to 2 places
அச்சு தரை(12.7);                  // 12
அச்சு மேல்(12.1);                 // 13
```

`எண்` is currently the only numeric type — there is no separate integer, and no
money type carrying a currency, so the checker cannot yet reject adding rupees to
a count.

## 5. Strings {: #5-strings}

`&` concatenates. Strings are measured in **written letters, not code points**:

```etamil
அச்சு நீளம்("வணக்கம்");     // 5, not 7
```

A Tamil letter is often a consonant plus a vowel sign or pulli. Counting code
points would give the wrong answer and every string helper would inherit it.

Escapes are `\n` `\t` `\r` `\"` `\\`. An unknown escape keeps both characters
rather than guessing.

## 6. Input and output {: #6-input-and-output}

```etamil
எண் வருவாய்;
அச்சு "Enter income: ";
உள்ளிடு வருவாய்;
அச்சு "Income: " & வருவாய்;
```

`உள்ளிடு` always returns text. It converts when compared with or used as a
number, so reading a figure and comparing it against a slab works without an
explicit cast.

## 7. Operators {: #7-operators}

<div class="table-scroll" markdown="1">

| Kind | Operators |
|---|---|
| Arithmetic | `+` `-` `*` `/`, and unary `-` |
| Comparison | `==` `!=` `<` `<=` `>` `>=` |
| Logical | `மற்றும்` / `maRRum` / `_and`, `அல்லது` / `allaqu` / `_or`, `இல்லை` / `illY` / `_not` |
| String | `&` |

</div>

Precedence, loosest first: `or` → `and` → `not` → comparison → `+ -` → `* /`.

```etamil
(வருவாய் > 800000 மற்றும் வயது < 60) எனில் {
    அச்சு "Taxable";
}
```

**`மற்றும்` and `அல்லது` short-circuit.** The right side is not evaluated once the
answer is known, so the left side can guard the right.

## 8. Conditionals and loops {: #8-conditionals-and-loops}

```etamil
(வருவாய் > 800000) எனில் {
    அச்சு "High";
}
இன்றேல் {
    அச்சு "Low";
}

எண் i = 0;
(i < 3) சுற்று {
    அச்சு i;
    i = i + 1;
}
```

The condition comes first and is parenthesised; `எனில்` follows it.

## 9. Functions {: #9-functions}

`செயல்` declares, `திரும்பு` returns. Parameters, local scope and recursion all
work.

**A parameter may declare a type, and is held to it.** Types are per parameter,
so some may be declared and others left open, and a return type goes after the
list. Giving one the wrong thing is a checked error, not a surprise at runtime:

```etamil
செயல் இரட்டி(எண் ம) எண் { திரும்பு ம * 2; }

அச்சு இரட்டி("சொல்");
```

```text
✗ வரி 1, நெடுவரிசை 18: 'ம' எண் (eN, a number) என அறிவிக்கப்பட்டது,
  ஆனால் ஒரு சொல் (a string) வழங்கப்பட்டது
  (line 1, column 18: 'ம' is declared எண் (eN, a number),
   but was given ஒரு சொல் (a string))
```

The position is the **parameter**, on line 1, rather than the call on line 3:
the declaration is what was broken, and it is where the fix goes.

```etamil
செயல் வரிசை_மதிப்பு(உருப்படி) {
    திரும்பு உருப்படி.அளவு * உருப்படி.விலை;
}

அச்சு வரிசை_மதிப்பு({அளவு: 3, விலை: 54999});
```

### Functions are values

A `செயல்` can be held in a variable, passed to another function, returned from
one, and kept in an array — the same as a number or a string.

Written **without a name**, `செயல்(ம) { … }` is a function where a value goes.
It takes the same signature as a named one.

```etamil
செயல் இரட்டி(ம) { திரும்பு ம * 2; }

ச = இரட்டி;
அச்சு ச(21);                                  // 42

மும்மடி = செயல்(ம) { திரும்பு ம * 3; };
அச்சு மும்மடி(5);                            // 15

செயல் பயன்படுத்து(அளவு, செயல் மாற்றம்) { திரும்பு மாற்றம்(அளவு); }
அச்சு பயன்படுத்து(7, செயல்(ம) { திரும்பு ம + 1; });   // 8

பட்டியல் = [இரட்டி, மும்மடி];
அச்சு பட்டியல்[0](6);                       // 12
```

`செயல்` is also a parameter type, as `பயன்படுத்து` uses it above: it says
this argument must be a function.

**A returned function keeps what it closed over.** `கூட்டுபவன்` below is
called once and answers with a function; that function still knows `எத்தனை`
afterwards, although the call that supplied it has returned.

```etamil
செயல் கூட்டுபவன்(எண் எத்தனை) செயல் {
    திரும்பு செயல்(ம) { திரும்பு ம + எத்தனை; };
}

கூட்டு_பத்து = கூட்டுபவன்(10);
அச்சு கூட்டு_பத்து(5);                        // 15
```

This is what `nUlakam/atippatY/aNi.qmz`'s `ஒவ்வொன்றுக்கும்`, `வடிகட்டு` and `மடி`
— map, filter and fold — are built on. See section 18.

## 10. Arrays and records {: #10-arrays-and-records}

Arrays use `[…]` and are zero-indexed. Records use `{…}` with `key: value`.

```etamil
விலைகள் = [100, 250, 375];
அச்சு விலைகள்[0];                 // 100

உருப்படி = {விவரம்: "மடிக்கணினி", விலை: 54999};
அச்சு உருப்படி.விலை;              // field access
அச்சு உருப்படி["விலை"];           // same thing, key computed at runtime
```

That second form matters: because a key can be computed, the JSON parser is
written in eTamil rather than in the host.

## 11. Iteration {: #11-iteration}

`ஒவ்வொரு … இல்` walks arrays, records and strings.

```etamil
ஒவ்வொரு உருப்படி இல் உருப்படிகள் {
    அச்சு உருப்படி.விவரம்;
}
```

## 12. Results — handling failure {: #12-results-handling-failure}

Failure is a value, not an exception. A fallible call returns `சரி` (ok) or
`தவறு` (error), following Rust's semantics.

<div class="table-scroll" markdown="1">

| Builtin | Purpose |
|---|---|
| `சரியா(r)` | true if the result succeeded |
| `தவறா(r)` | true if it failed |
| `மதிப்பு(r)` | unwrap the value |
| `இயல்பு(r, d)` | unwrap, or `d` if it failed |
| `?` | propagate a failure to the caller |

</div>

```etamil
ப = ஜேசான்_படி(request_body);
(தவறா(ப)) எனில் {
    பதில் 400, "malformed JSON";
}
தரவு = மதிப்பு(ப);
```

Because parsing returns a result, malformed input is something you handle rather
than something that crashes the handler.

## 13. Modules {: #13-modules}

`இறக்கு` imports another file. Paths resolve **beside the importing file first**,
then along `ETAMIL_PATH`, then next to the compiler binary.

```etamil
இறக்கு "nUlakam/paNam/paNam.qmz";
இறக்கு "../../nUlakam/atippatY/kaNiqam.qmz";
```

To use the standard library from anywhere:

```bash
export ETAMIL_PATH=/path/to/etamil_compiler
```

## 14. Type checking {: #14-type-checking}

`--check` parses and type checks without running:

```bash
etamil --check my_program.qmz
```

A declared type is enforced with a position:

```
✗ வரி 2, நெடுவரிசை 6: 'கொடியா' ஈர்ம (Irma, a boolean) என அறிவிக்கப்பட்டது,
  ஆனால் ஒரு அணி (an array) வழங்கப்பட்டது
  (line 2, column 6: 'கொடியா' is declared a boolean, but was given an array)
```

The checker is deliberately narrow. A number satisfies `சொல்`, because every
value renders as text and `உள்ளிடு` hands back text routinely compared with
numbers. A call, an index and a field access make no claim at all, because
functions have no signatures yet — silence there is the absence of a claim, not
approval.

<h2 id="15-naming-rules">15. Naming rules</h2>

**A name is stored exactly as you typed it**, including when the word is also a
keyword. `வங்கி = 5` creates a variable called `வங்கி`; `{வரி: 100}` produces the
field `வரி`.

The consequence: `{வரி: 1}` and `{vari: 1}` are **different fields**, and
`வருவாய்` and `varuvAy` are **different variables**. Pick one spelling per
program. A field name is data — what you typed — not a language construct.

Two positions keep the canonical English name, because what they name belongs to
the host rather than to you: the database type in `தளம்_இணை`, and the HTTP method
in `வழி`.

**Two kinds of keyword.** Of the 203 keywords, **109 are reserved and 94 are
not**, and the split follows one rule: the words the grammar needs are reserved,
and the words programs are *about* are not.

*Reserved* — the language's own machinery. Types (`எண்`, `சொல்`, `பொருள்`,
`தேதி`), literals (`மெய்`, `பொய்`, `இன்மை`), control flow (`எனில்`, `இன்றேல்`,
`சுற்று`, `ஒவ்வொரு`), statements (`அச்சு`, `உள்ளிடு`, `செயல்`, `திரும்பு`), and
the database, server and SQL words. Using one as a name is a parse error, not a
surprise.

*Not reserved* — the accountancy vocabulary. `வரவு` (credit), `பற்று` (debit),
`இருப்பு` (balance), `சொத்து` (asset), `பொறுப்பு` (liability), `வருவாய்`
(revenue), `செலவு` (expense), `வரி` (tax), `வட்டி` (interest), `பேரேடு`
(ledger), `கடன்` (loan), `தொகை` (amount) — 89 in all, and every one is a
perfectly good variable, parameter or field name.

That second group exists because this is a language for accounting. If `வரி`
were reserved you could not write a tax calculation using the word for tax, and
`எண் வருவாய்;` — the first line of section 3 — would not compile.

**Adding a keyword can break a program.** That is what the arrangement costs,
and it is worth knowing rather than fixing. Because the language invites you to
name things after the domain, your variables and its future keywords come from
the same pool of words. Suppose a later version adds `மொத்தம்` ("total") with
syntax of its own. Somewhere there is already a program containing:

```etamil
மொத்தம் = 0;
```

Nothing in that program changed, but the language did, and the line now either
fails to parse or means something other than it did.

No fix keeps what is good about the arrangement. Reserving all 203 takes the
domain vocabulary away. Treating a word as a keyword only in keyword position is
possible, but it makes the grammar harder to reason about and the error messages
worse. So the rule is written down instead: **before a keyword is added, check
whether the word is already in use** — and if a program stops parsing after an
upgrade, this is the first thing to suspect.

## 16. Reading error messages {: #16-reading-error-messages}

Every parse error carries a line and column, in Tamil and English:

```
✗ வரி 3, நெடுவரிசை 1: ';' எதிர்பார்க்கப்பட்டது, 'அச்சு' கிடைத்தது
  (line 3, column 1: expected ';', found 'அச்சு')
```

Columns count **written letters, not bytes**, so the position is the one you
would point at on screen.

Anything unimplemented fails with an explicit message rather than quietly doing
nothing — a silent no-op in a tax calculator is worse than an error.

## 17. Files and CSV {: #17-files-and-csv}

```etamil
கோப்பு_திற "output.txt", "write";     // opening for write truncates
கோப்பு_எழுது "output.txt", "வணக்கம்";  // subsequent writes append
கோப்பு_மூடு "output.txt";

கோப்பு_படி "output.txt", data;
அச்சு data;
```

Counting CSV rows, excluding the header:

```etamil
தரவுரை_படி "students.csv", total;
அச்சு total;
```

---

## 18. The standard library {: #18-the-standard-library}

`nUlakam/` is written **in eTamil**, not Rust. If the standard library needed a
systems language, the DSL would not be sufficient for what it exists to do.

<div class="table-scroll" markdown="1">

| Module | Contents |
|---|---|
| `col.qmz` | strings — `துண்டு` `தேடு` `பிரி` `ஒன்றிணை` `ஒழுங்கு` `தொடங்குகிறதா` `முடிகிறதா` `இடமிருந்து_நிரப்பு` |
| `kaNiqam.qmz` | math — `முழுமதிப்பு` `சிறியது` `பெரியது` `கூட்டு` `சராசரி` `சதவீதம்` |
| `aNi.qmz` | arrays — `உள்ளதா` `இடம்_காண்` `தலைகீழ்` `வெட்டு` `புலம்_எடு` `காலியா` `புலத்தால்_வடிகட்டு` `ஒவ்வொன்றுக்கும்` `வடிகட்டு` `மடி` |
| `paNam.qmz` | money — `ரூபாய்` `காசு_வடிவம்` `காசாக` `லட்சம்` `கோடி` |
| `jEcAZ.qmz` | JSON — `ஜேசான்_ஆக்கு` `ஜேசான்_படி` |
| `kuRiyAkkam.qmz` | encoding — `அறுபத்துநான்கு_ஆக்கு` `அறுபத்துநான்கு_படி` `பதினாறு_ஆக்கு` `பதினாறு_படி` |

</div>

```etamil
இறக்கு "nUlakam/paNam/paNam.qmz";

அச்சு ரூபாய்(12345678.5);      // ₹1,23,45,678.50 — lakh and crore
```

**What the host provides**, because a language cannot express it: `நீளம்` `இணை`
`வகை` · `சரி` `தவறு` `சரியா` `தவறா` `மதிப்பு` `இயல்பு` · `வட்டமிடு` `தரை` `மேல்` ·
`சொல்லாக்கு` `எண்ணாக்கு` · `மேல்_எழுத்து` `கீழ்_எழுத்து` · `இன்று`
`நாள்_வேறுபாடு` `நாள்_கூட்டு` · `கடவுச்சொல்_மறை` `கடவுச்சொல்_சரியா` `சீட்டு_ஆக்கு`
`சீட்டு_சரிபார்` · `கையொப்பம்` `கையொப்பம்_சரியா` · `வலை_பெறு` `வலை_பதி`
`வலை_அனுப்பு` · `பைட்டுகள்` `பைட்டுச்_சரம்`.

Everything else is built from those.

**Three of the array helpers take a `செயல்` as an argument.**
`ஒவ்வொன்றுக்கும்`, `வடிகட்டு` and `மடி` — map, filter and fold — became
writable when functions became values. Before that the rule each one applies had
to be spelled out again by every caller, as a loop; now it is an argument.

```etamil
இறக்கு "nUlakam/atippatY/aNi.qmz";

செயல் இரட்டி(ம) { திரும்பு ம * 2; }
செயல் பெரியது(ம) { திரும்பு ம > 10; }
செயல் கூட்டல்(திரட்டு, ம) { திரும்பு திரட்டு + ம; }

விலைகள் = [5, 12, 30];

அச்சு ஒவ்வொன்றுக்கும்(விலைகள், இரட்டி);   // [10, 24, 60]
அச்சு வடிகட்டு(விலைகள், பெரியது);          // [12, 30]
அச்சு மடி(விலைகள், 0, கூட்டல்);            // 47
```

`மடி` takes a starting value as well as the array: the `செயல்` it is given
receives what has been gathered so far and the next item, and is applied left to
right. `ஒவ்வொன்றுக்கும்` and `வடிகட்டு` both answer with a new array and leave
the one they were given alone.

`புலத்தால்_வடிகட்டு` is the same idea for records, from before there were
function values: it keeps the rows whose named field equals a value. The field is
named as **text** rather than reached with a dot, which is what lets one function
serve every caller — `பதிவு.கணக்கு_குறி` could only ever filter on
`கணக்கு_குறி`.

## 19. Accounting and GST {: #19-accounting-and-gst}

The financial vocabulary is in the language — `வரவு`, `பற்று`, `வரி`,
`இருப்புநிலை`, `பேரேடு`, `மூலதனம்` are keywords. The framework above them lives
in `nUlakam/kaNakkiyal/`, also written in eTamil.

```etamil
இறக்கு "nUlakam/kaNakkiyal/kaNakkukaL.qmz";
இறக்கு "nUlakam/kaNakkiyal/pErEtu.qmz";

பேரேடு = மதிப்பு(பதிவிடு(பேரேடு, பரிவர்த்தனை_ஆக்கு(
    "JV001", "2026-04-01", "தொடக்க மூலதனம்", [
        பற்று_வரிசை("1000", 500000),
        வரவு_வரிசை("3000", 500000)
    ])));
```

`பதிவிடு` **refuses an unbalanced transaction** and returns `தவறு`, so nothing
unbalanced ever reaches the ledger. The ledger is a value: posting returns a new
one rather than editing the old, so an entry cannot be changed after the fact.

GST splits into CGST and SGST within a state, or IGST across states. Full worked
examples are on the [finance page]({{ '/finance/' | relative_url }}).

---

## 20. Databases {: #20-databases}

Queries are **always parameterised**. There is deliberately no way to splice a
value into SQL text, so the injection class of bug is not available to write.

```etamil
தளம்_இணை எசுகியூஎல்லைட், "kaNakku.db";
தளம்_வினா "SELECT peyar, qokY FROM pativukaL WHERE vakY = ?", ["வரவு"], வரவுகள்;
```

Rows come back as an array of records, so a result set iterates like any table.

<div class="table-scroll" markdown="1">

| Engine | Status | Notes |
|---|---|---|
| SQLite | <span class="pill pill-ok">Working</span> | Built in. Decimals stored as text, so no precision is lost |
| PostgreSQL | <span class="pill pill-ok">Working</span> | `--features postgres`. Money in native `NUMERIC`; placeholders are `$1, $2` |
| MySQL / MariaDB | <span class="pill pill-ok">Live verified</span> | `--features mysql`. Placeholders are `?` |
| MongoDB | <span class="pill pill-ok">Working</span> | `--features mongodb`; a document *is* a `பொருள்`, with numbers as `Decimal128` |
| Redis | <span class="pill pill-ok">Working</span> | One generic `ரெடிஸ்_கட்டளை`, so every command works; `nUlakam/qaLam/retis.qmz` names the common ones |

</div>

Connections are reused from a process-wide idle cache rather than reopened per
request; leases are exclusive, so a transaction keeps its connection to itself.
`ETAMIL_DB_IDLE` caps how many stay warm.

**A function of your own in a query.** `தளம்_செயல்_பதிவு` registers a `செயல்` on the open
SQLite database, and a query then calls it once per row:

```etamil
செயல் moqqam_vari(qokY, vikiqam) { திரும்பு qokY * (1 + vikiqam / 100); }
தளம்_செயல்_பதிவு("moqqam_vari", moqqam_vari, 2, "numeric");
தளம்_வினா "SELECT moqqam_vari(qokY, 18) AS moqqam FROM paRRuccIttu", [], வரிசைகள்;
```

The function may only compute: one that could read a file, use the network, another
database or the environment is refused when it is registered, and each call runs under a
step limit. A number result goes back as exact text unless you pass `"numeric"`; SQLite
orders text after every number, so compare or sort only on a `"numeric"` function.
See `examples/db_samples/qaLam_ceyal_paqivu.qmz`.

PostgreSQL folds unquoted identifiers to lower case — write `"qokY"` to get that
column name back as you spelled it.

## 21. The HTTP server {: #21-the-http-server}

```bash
etamil --server --port 8080 my_service.qmz
etamil --async  --port 8080 my_service.qmz
```

`வழி` declares a route, `பதில்` answers:

```etamil
வழி பெறு, "/kaNakku/:id" {
    பதில் 200, "id=" & param_id & " vakY=" & query_params["vakY"];
}

வழி பதி, "/pativu" {
    பதில் 201, "got body: " & request_body;
}

வழி பெறு, "/aRikkY.csv" {
    பதில் 200, வரிசைகள், {"Content-Type": "text/csv"};
}
```

<div class="table-scroll" markdown="1">

| Variable | Contents |
|---|---|
| `request_method` | the HTTP method |
| `request_path` | the path as requested |
| `request_body` | the raw body |
| `query_params` | query string, as a record |
| `headers` | request headers, as a record |
| `path_params` | matched `:name` segments, as a record |
| `param_<name>` | each path parameter, bound directly |

</div>

Response headers are an ordinary record; omit them and the server answers
`application/json`.

`--async` changes only how connections are accepted — a connection costs a task
rather than a thread. **The VM stays synchronous**, and handlers run on tokio's
blocking pool, which is what lets the blocking database drivers keep working.

## 22. JSON {: #22-json}

```etamil
இறக்கு "nUlakam/vativam/jEcAZ.qmz";

ப = மதிப்பு(ஜேசான்_படி(request_body));
அச்சு ப["qokY"] + 1;                       // a number, not text
பதில் 200, ஜேசான்_ஆக்கு({நிலுவை: 1500});
```

Fields serialize in sorted order, which makes a response body stable enough to
assert on in tests. `\uXXXX` escapes are not decoded.

`ஜேசான்_உரை` sends a body with the JSON content type already on it, so you do not
have to spell the header out:

```etamil
ஜேசான்_உரை ஜேசான்_ஆக்கு({நிலுவை: 1500}), 201;
```

Leave the status off and it answers 200. The body must already be text — it asks
for `ஜேசான்_ஆக்கு` rather than rendering a record itself, because a second encoder
would be a second answer to one question, and eTamil's record syntax is not JSON.

## 23. Authentication {: #23-authentication}

bcrypt and JWT live in the host, because hashing and HMAC need bytes and
randomness the language cannot reach.

```etamil
மறை = கடவுச்சொல்_மறை(கடவுச்சொல்);
(கடவுச்சொல்_சரியா(கடவுச்சொல், மறை)) எனில் {
    சீட்டு = சீட்டு_ஆக்கு({பயனர்: "ravi", பங்கு: "admin"});
    பதில் 200, சீட்டு;
}
```

Set `ETAMIL_JWT_SECRET` before starting the server. Everything above these four
builtins — who a user is, which route needs which role — stays in eTamil.

## 24. Signing and webhooks {: #24-signing-and-webhooks}

`கையொப்பம்` produces an HMAC-SHA256 signature; `கையொப்பம்_சரியா` verifies one.
The comparison is **constant-time**, so it does not leak the expected signature a
byte at a time to anything measuring how long the check takes.

```etamil
வழி பதி, "/webhook" {
    (கையொப்பம்_சரியா(request_body, headers["X-Signature"], ரகசியம்)) எனில் {
        பதில் 200, "ok";
    }
    பதில் 401, "bad signature";
}
```

## 25. Bytes, base64 and hex {: #25-bytes-base64-and-hex}

`பைட்டுகள்` turns text into bytes; `பைட்டுச்_சரம்` turns them back. A byte array
is an ordinary array of numbers — deliberately **not** a new value type, so every
array helper already works on it.

```etamil
இறக்கு "nUlakam/vativam/kuRiyAkkam.qmz";

க = அறுபத்துநான்கு_ஆக்கு(பைட்டுகள்("வணக்கம்"));
அச்சு பைட்டுச்_சரம்(அறுபத்துநான்கு_படி(க));
```

## 26. Calling other services {: #26-calling-other-services}

`வலை_பெறு`, `வலை_பதி` and `வலை_அனுப்பு` make outbound requests, behind
`--features http-client`, which is on by default. **A non-2xx response is a
result, not a failure** — a 404 from a gateway is something you branch on.

```etamil
ப = வலை_பெறு("https://api.example.in/rates");
(சரியா(ப)) எனில் {
    அச்சு மதிப்பு(ப).உடல்;
}
```

## 27. Scheduled work {: #27-scheduled-work}

`இடைவெளி` runs a block on a timer under either server:

```etamil
இடைவெளி 3600 {
    அச்சு "hourly reconciliation";
}
```

The number is the gap **between** runs, not a fixed period. If a run overruns the
interval, the next starts late rather than starting on top of the one still
going — for a job posting ledger entries, that is the difference between late and
wrong.

---

## 28. Editor support {: #28-editor-support}

The extension is [**eTamil**]({{ site.brand.vscode_url }}) on the Marketplace, and
`eTamil_Code/` in the compiler repository.

**It carries its own toolchain.** The `etamil` binary for your platform, the
whole `nUlakam` standard library and the repository's twenty-nine example
programs travel inside it, so error checking, running a file and Go to
Definition into the library all work the moment it finishes installing. Point
`etamil.compilerPath` at a build of your own and that wins instead.

What you get:

- highlighting for all 203 keywords in every spelling
- completions for the 97 builtins and 940 `nUlakam` functions
- errors from `--check` as you type — which stops after the type checker, so
  opening a file never runs it
- hover with every spelling of a word, signature help, Go to Definition and an
  outline of the file
- **eTamil: Open an example** — a copy of one of the carried programs, to edit
  and run
- **eTamil: Documentation…** — this manual, the playground and the reference

**It also carries the eTamil fonts.** `ican qamiz` is the face in which the
ASCII letters carry Tamil glyphs: `c` draws ச, `q` draws த, `Z` draws ன.
`ican qamiz Smart` does the same and adds the Tamil block and three contextual
rules, so that one face sets both a program and the prose about it; those rules
are the font's own and the compiler does not accept them, as
[the font page]({{ '/font/' | relative_url }}) sets out.
**eTamil: Install the eTamil font** puts both on the machine — per-user, no
administrator rights — and offers to set `etamil.eTamilFont` to `ican qamiz
Smart`. It then draws the ASCII that is
eTamil in it while English stays Latin: a name marked with a leading `_`, a
comment wrapped in `__ … __`, every string literal and the licence header. Those
two marks are the language's, not the editor's; they are specified in
[SCRIPT_RULES.md]({{ site.brand.script_rules_url }}) and a gate in CI holds the
library to them.

Its grammar and completion data are generated from `lexer.rs`, and CI fails if
they drift, so the editor cannot fall behind the compiler.

## 29. Checking and testing {: #29-checking-and-testing}

```bash
etamil --check my_program.qmz     # parse and type check, do not run
```

In the compiler repository:

```bash
cargo test                        # 295 language + 126 unit + 10 host-capture + 8 --check
./scripts/run_examples.sh         # every example, with expected outcomes
```

**In continuous integration**, the `Maruff/setup-etamil@v1` GitHub Action installs the compiler on
the runner and can check your files:

```yaml
- uses: actions/checkout@v4
- uses: Maruff/setup-etamil@v1
  with:
    check: "src/**/*.qmz"
```

`--check` parses and type-checks and never runs the program, so a failing file fails the job.
Templates for GitHub Actions, GitLab CI and a generic shell pipeline are in `packaging/ci/`.

The language tests assert on **program results**, not exit codes — every bug they
cover exited 0 while producing the wrong answer.

## 30. Environment variables {: #30-environment-variables}

<div class="table-scroll" markdown="1">

| Variable | Effect |
|---|---|
| `ETAMIL_PATH` | Where `இறக்கு` looks after the importing file's own directory |
| `ETAMIL_JWT_SECRET` | Signing secret for `சீட்டு_ஆக்கு` / `சீட்டு_சரிபார்` |
| `ETAMIL_DB_IDLE` | How many database connections stay warm in the idle cache |
| `ETAMIL_TEST_MYSQL` | Set to `1` to include the live MySQL example in the runner |

</div>

## 31. Next steps {: #31-next-steps}

<ul class="cards" markdown="0">
  <li class="card">
    <h3><a href="{{ '/language/keywords/' | relative_url }}">Keyword reference</a></h3>
    <p>Every token in all three spellings, generated from the lexer.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/finance/' | relative_url }}">Accounting framework</a></h3>
    <p>Double entry, GST, the three statements, and the eCommerce example.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/status/' | relative_url }}">Status</a></h3>
    <p>What works, what is partial, what is planned.</p>
  </li>
  <li class="card">
    <h3><a href="{{ site.brand.compiler_repo }}" rel="noopener">Compiler source</a></h3>
    <p>The Rust host, the standard library, and every example.</p>
  </li>
</ul>

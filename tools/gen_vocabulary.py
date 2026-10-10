#!/usr/bin/env python3
"""Generate the editor's vocabulary (keywords and builtins) from the compiler's data.

The compiler repository's generator, scripts/generate_editor_support.py, writes
etamil_lsp/data/language-data.json: every keyword with each spelling and its
statement template, and every builtin and standard library function with its
documentation. The desktop editors (through the language server) use all of it.

The browser editor can use less, and in two pieces. The keywords and the host builtins are
small and wanted at the first keystroke, so they go in one file the bundle imports
(`etamil-vocabulary.json`). The 940 standard-library functions are most of the size and are
wanted only once someone types a name, so they go in a second file the editor fetches when it
is idle (`etamil-library.json`). The library runs in the browser since `run_project`, so
offering it is no longer a lie: accepting one adds the `இறக்கு` line that makes it work.

Run it again whenever the compiler's vocabulary changes; commit the JSON it writes.

    py tools/gen_vocabulary.py --data ../eTamil/etamil_lsp/data/language-data.json
"""

import argparse
import json
import sys
from pathlib import Path

KEYWORD_FIELDS = ("token", "forms", "group", "noSyntax", "snippetTamil", "snippetLatin")
BUILTIN_FIELDS = ("name", "forms", "arity", "doc")
# `line` is where the function is written in its module, which an editor in a page has no use for.
LIBRARY_FIELDS = ("name", "forms", "params", "arity", "doc", "module")


def trim(entry: dict, fields: tuple[str, ...]) -> dict:
    return {field: entry[field] for field in fields}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", required=True, type=Path, help="the compiler's etamil_lsp/data/language-data.json")
    ap.add_argument("--out", type=Path, default=Path("assets/ide/etamil-vocabulary.json"))
    ap.add_argument("--library-out", type=Path, default=Path("assets/ide/etamil-library.json"))
    args = ap.parse_args()

    if not args.data.is_file():
        sys.exit(f"error: {args.data} not found; it is written by the compiler's generate_editor_support.py")
    data = json.loads(args.data.read_text(encoding="utf-8"))

    keywords = [trim(k, KEYWORD_FIELDS) for k in data["keywords"] if not k["noSyntax"]]
    builtins = [trim(f, BUILTIN_FIELDS) for f in data["functions"] if f["kind"] == "builtin"]
    if not keywords or not builtins:
        sys.exit("error: the data has no keywords or no builtins; is this the right file?")

    library = [trim(f, LIBRARY_FIELDS) for f in data["functions"] if f["kind"] == "stdlib"]
    if len(library) < 100:
        sys.exit(f"error: only {len(library)} library functions in the data; the library has about 940")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.library_out.parent.mkdir(parents=True, exist_ok=True)
    args.library_out.write_text(
        json.dumps({"functions": library}, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"wrote {args.library_out}: {len(library)} library functions, {args.library_out.stat().st_size / 1024:.0f} KB")
    args.out.write_text(
        json.dumps({"keywords": keywords, "builtins": builtins}, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    size = args.out.stat().st_size
    print(f"wrote {args.out}: {len(keywords)} keywords, {len(builtins)} builtins, {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main())

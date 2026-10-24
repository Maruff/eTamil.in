#!/usr/bin/env python3
"""Pack the standard library's sources into one JSON file for the browser editor.

The browser cannot read files, so `இறக்கு "nUlakam/paNam/paNam.qmz";` has nothing to open
there. The compiler's wasm build takes the sources it may import as data (`run_project`),
and this writes the standard library in the form that call wants: an object from the path
an author writes to the source at that path.

The editor loads this file only when a program imports something it does not have, so a
page that never imports pays nothing for it. It is about 3.5 MB of text, which GitHub
Pages serves compressed.

Run it again whenever the compiler's library changes; commit the JSON it writes.

    py tools/gen_stdlib.py --nulakam ../eTamil_lang/nUlakam
"""

import argparse
import json
import sys
from pathlib import Path

PREFIX = "nUlakam"


def collect(nulakam: Path) -> dict[str, str]:
    """Every .qmz under `nulakam`, keyed the way an import names it."""
    files: dict[str, str] = {}
    for path in sorted(nulakam.rglob("*.qmz")):
        relative = path.relative_to(nulakam).as_posix()
        # Newlines as the compiler counts them: LF. A CRLF checkout would otherwise
        # change what the file says to anyone diffing the output.
        files[f"{PREFIX}/{relative}"] = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    return files


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--nulakam", required=True, type=Path, help="the compiler's nUlakam folder")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "assets" / "ide" / "etamil-stdlib.json",
    )
    args = parser.parse_args()

    if not args.nulakam.is_dir():
        print(f"error: {args.nulakam} is not a folder", file=sys.stderr)
        return 1
    files = collect(args.nulakam)
    if len(files) < 30:
        print(f"error: only {len(files)} modules found; the library has about 41", file=sys.stderr)
        return 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(files, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    args.out.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {args.out} ({len(files)} modules, {len(text.encode('utf-8')) / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

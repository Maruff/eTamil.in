---
layout: page
title: தொடங்குதல்
section: தொடங்குதல்
permalink: /ta/start/
lang: ta
key: start
alt_url: /start/
summary: >-
  எதையும் நிறுவாமல் உலாவியில் இ-தமிழ் இயக்குங்கள், அல்லது தொகுப்பியை நிறுவுங்கள் —
  Rust-ம் C கருவித்தொகுப்பும் தேவைப்படாத ஒரே கோப்பு.
description: >-
  இ-தமிழ் தொடங்க இரண்டு வழிகள்: WebAssembly-ஆகக் கட்டப்பட்ட உண்மையான தொகுப்பியே
  ஆன உலாவி எழுதுகளம், மற்றும் Rust-ம் C கருவித்தொகுப்பும் தேவைப்படாத Windows,
  Linux, macOS தயார் நிலை தொகுப்பு, Cargo மூலம் மூலக்குறியீட்டிலிருந்து உருவாக்குதல்.
---

இரண்டு வழிகள். இப்போதே உலாவியில் இ-தமிழ் இயக்குங்கள், அல்லது தொகுப்பியை நிறுவி
உங்கள் கணினியில் பயன்படுத்துங்கள். உலாவி எழுதுகளம் தொகுப்பியே **ஆகும்** — அதே
லெக்சர், பாகுபடுத்தி, வகைச் சரிபார்ப்பான், VM, WebAssembly-ஆகக் கட்டப்பட்டவை —
எனவே அங்கு இயங்குவது உங்கள் கணினியிலும் இயங்கும்.

## இப்போதே முயற்சி, நிறுவல் இல்லாமல்

{% capture editor_seed %}// __எளிய வட்டி — simple interest, exact to the paisa__
செயல் வட்டி_கணக்கு(அசல், வீதம், ஆண்டு) {
    திரும்பு அசல் * வீதம் * ஆண்டு;
}

தொகை = 50000;
அச்சு(வட்டி_கணக்கு(தொகை, 7.5%, 3));
{% endcapture %}
{% include editor.html seed=editor_seed name="வட்டி.qmz" samples=true %}

இயக்க <kbd>Ctrl</kbd>+<kbd>Enter</kbd> அழுத்துங்கள். எதுவும் பதிவேற்றப்படுவதில்லை,
எதுவும் சேமிக்கப்படுவதில்லை. தரவுதளங்கள், HTTP சேவையகம், `உள்ளிடு` ஆகியவற்றுக்குத் தனி
இயந்திரம் தேவை — முயற்சிக்கும்போது அதைச் சொல்லும்; மற்ற அனைத்தும் இங்கு இயங்கும்,
நினைவில் நிலைக்கும் கோப்பு அமைப்பில் கோப்புக் கூற்றுகள் உட்பட.

வெறும் பயிற்சிக் களத்தைத் தாண்டி வேண்டுமா? கீழே நிறுவுங்கள்.

## பதிவிறக்கம் & நிறுவுதல்

Rust தேவையில்லை, C கருவித்தொகுப்பு தேவையில்லை, உருவாக்கப் படியும் தேவையில்லை.
காப்பகத்தில் தொகுப்பி, இ-தமிழ் நிலையான நூலகம், எடுத்துக்காட்டுகள் அடங்கியுள்ளன;
ஸ்கிரிப்ட் அவற்றைச் சரியான இடத்தில் நகலெடுத்து, `etamil`-ஐ உங்கள் `PATH`-இல் சேர்க்கிறது.

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

**Linux** — 64-bit Raspberry Pi OS இயங்கும் Raspberry Pi 4, 5-க்கும் (அல்லது வேறு
aarch64 கணினிக்கும்) `arm64`; மற்றவற்றுக்கு `x64`. `uname -m` எது என்பதைச் சொல்லும்:
`aarch64` அல்லது `x86_64`. 32-bit Raspberry Pi OS `armv7l` எனக் காட்டும்; அதற்குத் தொகுப்பு இல்லை.

```bash
tar -xzf etamil-linux-x64.tar.gz
./etamil-linux-x64/install.sh
```

**macOS** — Apple Silicon-க்கு `arm64`, Intel-க்கு `x64`. உங்கள் கணினி எது என்பதை
`uname -m` சொல்லும்.

```bash
tar -xzf etamil-macos-arm64.tar.gz
./etamil-macos-arm64/install.sh
xattr -dr com.apple.quarantine ~/.local/lib/etamil
```

கடைசி வரி விருப்பத்தேர்வு அல்ல. இந்தக் கோப்புகள் notarize செய்யப்படவில்லை, எனவே
உலாவி வழியாகப் பதிவிறக்கியதை macOS தனிமைப்படுத்துகிறது; Gatekeeper அதை இயக்க
மறுக்கும். இந்தக் குறியை ஒருமுறை நீக்கினால் போதும்.

பின்னர் ஒரு *புதிய* முனையத்தைத் திறக்கவும் — நிறுவி `PATH`-ஐ மாற்றுகிறது, ஏற்கனவே
இயங்கிக்கொண்டிருக்கும் ஷெல் அந்த மாற்றத்தைக் காண்பதில்லை — பிறகு சரிபார்க்கவும்:

```bash
etamil --version
```

நீக்குவதும் எளிது: Windows நிறுவி அனைத்தையும் `%LOCALAPPDATA%\Programs\eTamil`-இல்,
Linux நிறுவி `~/.local`-இல் வைக்கிறது; இரண்டுக்கும் நிர்வாகி உரிமை தேவையில்லை.

<div class="note" markdown="1">
**தனியாக இயக்க நேரம் (runtime) நிறுவ வேண்டியதில்லை — ஏன்.** Windows இருமம் C இயக்க
நேரத்தை நிலையாக (statically) இணைக்கிறது, எனவே Visual C++ Redistributable தேவையில்லை.
Linux இருமம் musl-உடன் உருவாக்கப்படுகிறது, எனவே அது முழுமையாக நிலையான ELF — உருவாக்கிய
இயந்திரத்தின் glibc-ஐச் சார்ந்திருப்பதில்லை.

**macOS**-க்கு இன்னும் முன்னுருவாக்கிய தொகுப்பு இல்லை — கீழே மூலக்குறியீட்டிலிருந்து
உருவாக்குங்கள். ஒவ்வொரு காப்பகமும் அதன் SHA-256 உடன்
[வெளியீட்டுப் பக்கத்தில்]({{ site.brand.releases_url }}) பட்டியலிடப்பட்டுள்ளது.
</div>

## வேறு வழிகளில் நிறுவுதல்

இவை ஒவ்வொன்றும் மேலுள்ள காப்பகங்களில் உள்ள அதே தொகுப்பி, நிலையான நூலகம், எடுத்துக்காட்டுகளை நிறுவுகின்றன.

| எங்கே | கட்டளை |
|---|---|
| **Homebrew** (macOS, Linux) | `brew install Maruff/etamil/etamil` |
| **apt** (Debian, Ubuntu) | கீழுள்ள களஞ்சியத்தைச் சேர்த்து, `sudo apt install etamil` |
| **rpm** (Fedora, RHEL, openSUSE) | `sudo dnf install ./etamil-<version>-1.x86_64.rpm`, [வெளியீட்டுப் பக்கத்திலிருந்து]({{ site.brand.releases_url }}) |
| **Docker** | `docker run --rm -v "$PWD":/work ghcr.io/maruff/etamil --vm hello.qmz` |
| **npm** | `npx etamil hello.qmz`, அல்லது `npm install -g etamil` |
| **.NET** | `dotnet tool install -g etamil` |
| **GitHub Actions** | `uses: Maruff/setup-etamil@v1` |

**apt.** களஞ்சியம் வெளியீட்டுப் பக்கத்தில் உள்ளது; அதனுடன் வெளியிடப்படும் திறவுகோலால் கையொப்பமிடப்படுகிறது:

```bash
sudo curl -fsSL https://github.com/Maruff/eTamil_lang/releases/latest/download/etamil-archive-keyring.gpg \
    -o /usr/share/keyrings/etamil.gpg
echo "deb [signed-by=/usr/share/keyrings/etamil.gpg] https://github.com/Maruff/eTamil_lang/releases/latest/download ./" \
    | sudo tee /etc/apt/sources.list.d/etamil.list
sudo apt update && sudo apt install etamil
```

இது புதிய வெளியீட்டை மட்டுமே கொண்டிருக்கும்; `apt upgrade` உங்களை அடுத்த வெளியீட்டுக்கு மாற்றும்.

**Docker.** படம் `etamil` ஐ root அல்லாத பயனராக இயக்குகிறது; `/work` அதன் பணி அடைவு, எனவே உங்கள் அடைவை அங்கே இணைக்கவும். `latest` ஐ நம்புவதற்குப் பதிலாக `ghcr.io/maruff/etamil:2.0.0` போன்ற வெளியீட்டுக் குறிச்சொல்லைப் பயன்படுத்துங்கள்.

## மூலக்குறியீட்டிலிருந்து உருவாக்குதல்

விருப்ப PostgreSQL, MySQL drivers, LLVM backend வேண்டுமெனில், அல்லது தொகுப்பியிலேயே
பணியாற்ற வேண்டுமெனில், இது பயனுள்ளது.

### முன்நிபந்தனைகள்

**Rust 1.88+** (edition 2024) மற்றும் ஒரு C கருவித்தொகுப்பு — உள்ளடங்கிய SQLite மற்றும்
கிரிப்டோ crate-கள் C-ஐத் தொகுக்கின்றன.

- **Windows** — Visual Studio Build Tools, *Desktop development with C++* பணிச்சுமையுடன்.
  MSVC லிங்கர் விருப்பமானது அல்ல: அது இல்லாமல் `cargo check` கூட தோல்வியடையும், ஏனெனில்
  proc-macro crate-கள் DLL ஆக இணைக்கப்படுகின்றன.
- **Linux / macOS** — இயங்கும் `cc` (`build-essential`, அல்லது Xcode command line tools).

### Cargo மூலம்

```bash
git clone https://github.com/Maruff/eTamil_lang.git
cd etamil_compiler/etamil_compiler
cargo build --release
```

இருமம் (binary) `target/release/etamil` (Windows-இல் `etamil.exe`). அதை உங்கள்
`PATH`-இல் சேர்க்கவும்:

**Linux / macOS**

```bash
sudo cp target/release/etamil /usr/local/bin/etamil
```

**Windows (PowerShell)**

```powershell
Copy-Item "target\release\etamil.exe" "$env:USERPROFILE\bin\etamil.exe"
```

சரிபார்க்க:

```bash
etamil --version
```

## உங்கள் முதல் நிரல்

```bash
echo 'அச்சு "வணக்கம் உலகம்!";' > hello.etamil
etamil --vm hello.etamil
```

Windows-இல், கோப்பை UTF-8 ஆக எழுதுங்கள்:

```powershell
'அச்சு "வணக்கம் உலகம்!";' | Out-File hello.etamil -Encoding UTF8
etamil --vm hello.etamil
```

பிறகு பயனுள்ள ஒன்று — நிலையான உள்ளீட்டிலிருந்து (stdin) படிக்கும் வருமான வரிக் கணக்கீடு:

```bash
echo "950000" | etamil --vm examples/basic_samples/example.qmz
```

## விருப்ப வசதிகள்

SQLite உள்ளமைக்கப்பட்டுள்ளது. மற்றவை Cargo வசதிகளுக்குப் பின்னால் உள்ளன; எனவே இயல்பான
உருவாக்கம் அவற்றின் சார்புகளைச் சுமப்பதில்லை.

```bash
cargo build --release --features postgres,mysql
```

LLVM பின்தளம் `--llvm`-க்கு மட்டுமே தேவை, மேலும் Linux மற்றும் macOS-இல் மட்டுமே கிடைக்கிறது:

```bash
cargo build --release --features llvm
```

<div class="note" markdown="1">
**LLVM பின்தளம் VM-ஐ விடக் குறைவாகவே தொகுக்கிறது** — செயல்கள், சுழற்சி, தொகுப்புகள்,
தொகுதிகள் இல்லை. வேறு ஒன்றைக் கணக்கிடும் IR-ஐ உருவாக்குவதற்குப் பதிலாக, தன்னால் கட்ட
முடியாததை அது மறுக்கிறது. உண்மையான வேலைக்கு `--vm` பயன்படுத்துங்கள்.
</div>

## சோதனைகளை இயக்குதல்

```bash
cd etamil_compiler
cargo test          # 295 மொழி + 126 அலகு + 10 host-capture + 8 --check
```

`tests/language_tests.rs` முன்தளத்தை முழுமையாகச் சோதிக்கிறது — வெளியேறு நிலைக் குறியீடுகளை
அல்ல, **நிரலின் முடிவுகளை** உறுதிப்படுத்துவதன் மூலம். அவை உள்ளடக்கும் ஒவ்வொரு பிழையும்
தவறான விடையைத் தந்தபடியே 0 என வெளியேறியது. ஒவ்வொரு push மற்றும் pull request-க்கும்
CI, Linux மற்றும் Windows-இல் உருவாக்கத்தையும் முழுத் தொகுப்பையும் இயக்குகிறது.

ஒவ்வொரு எடுத்துக்காட்டும் அதன் எதிர்பார்க்கப்படும் விளைவுடன் சரிபார்க்கப்படுகிறது —
தோல்வியடைய *வேண்டியவை* உட்பட:

```bash
./scripts/run_examples.sh
python3 scripts/transliterate.py --check   # எழுத்துப்பெயர்ப்புத் தணிக்கை
```

## திருத்தி ஆதரவு

[**eTamil**]({{ site.brand.vscode_url }}) — VS Code Marketplace-இல் உள்ள இந்த
நீட்சியே தொடங்குவதற்கு மிகக் குறுகிய வழி: தொகுப்பி, `nUlakam` நிலையான நூலகம்,
எடுத்துக்காட்டு நிரல்கள், இ-தமிழ் எழுத்துரு அனைத்தையும் அது சுமந்து வருகிறது;
எனவே இப்பக்கத்தில் செய்வதற்கு வேறெதுவும் மிச்சமில்லை. 202 திறவுச்சொற்களுக்கும்
எல்லா எழுத்து வடிவங்களிலும் நிறமூட்டல், 62 உள்ளமைச் செயல்கள் மற்றும் 691 `nUlakam`
செயல்களுக்கு நிரப்புதல், நீங்கள் தட்டச்சு செய்யும்போதே `--check` பிழைகள், மேலும்
இருபத்தொன்பது இயங்கும் நிரல்களில் ஒன்றைத் திறக்க **eTamil: Open an example**.

அதன் இலக்கணமும் நிரப்புதல் தரவும் `lexer.rs`-இலிருந்து **உருவாக்கப்படுகின்றன**; அவை
விலகினால் CI தோல்வியடையும் — எனவே திருத்தி தொகுப்பியை விடப் பின்தங்க முடியாது.
நீங்களே உருவாக்கிய தொகுப்பியை இயக்க வேண்டுமெனில் `etamil.compilerPath`-ஐ அதை
நோக்கிக் காட்டுங்கள்; முனையத்திலும் `etamil` பயன்படுத்த **eTamil: Install the
compiler for use outside the editor** கட்டளையை இயக்குங்கள்.

அதே நீட்சி Open VSX-இலும் உள்ளது, எனவே **Cursor, Windsurf, VSCodium** ஆகியவையும் அதைப் பெறுகின்றன. மற்ற திருத்திகள்:

- **JetBrains IDE-கள்** (2024.2 மற்றும் பின்): [செருகுநிரல்]({{ site.brand.compiler_repo }}/tree/main/packaging/jetbrains) —
  வண்ணமிடல், மொழிச் சேவையகம், இயக்க அமைவு ஆகியவற்றுடன்; Ctrl+Shift+F10 ஒரு `.qmz` கோப்பை இயக்கும், சரிபார்க்கும் அல்லது சேவையாக்கும்.
- **Visual Studio:** மொழிக்கும் மொழிச் சேவையகத்துக்குமான [நீட்சிகள்]({{ site.brand.compiler_repo }}/tree/main/packaging/visualstudio).
- **Emacs:** [`etamil-mode`]({{ site.brand.compiler_repo }}/tree/main/eTamil_Emacs), Eglot அமைப்புடன்.
- **Neovim, Helix, Zed:** [tree-sitter இலக்கணம்]({{ site.brand.compiler_repo }}/tree/main/tree-sitter-etamil).
- **Language Server Protocol-ஐப் புரிந்துகொள்ளும் எந்தத் திருத்தியும்:** `etamil-lsp` — ஒவ்வொரு வெளியீட்டுத் தொகுப்பிலும் உள்ளது;
  தொகுப்பியின் சொந்தப் பிழைகள், நிறைவுசெய்தல், சுட்டுதல், வரையறைக்குச் செல்லுதல் ஆகியவற்றைத் தருகிறது.
- **Jupyter:** [eTamil கர்னல்]({{ site.brand.compiler_repo }}/tree/main/eTamil_Jupyter) — நோட்புக் கலத்தில் eTamil இயங்கும்.

இவற்றுள் சில கட்டப்பட்டுச் சோதிக்கப்பட்டவை, ஆனால் நேரடித் திருத்தியில் இன்னும் முயலப்படவில்லை; எவை என்பதை [நிலைப் பக்கம்]({{ '/ta/status/' | relative_url }}) சொல்கிறது.

## அடுத்து எங்கே

<ul class="cards" markdown="0">
  <li class="card">
    <h3><a href="{{ '/ta/language/' | relative_url }}">மொழி அறிமுகம்</a></h3>
    <p>தொடரியல், மூன்று எழுத்து வடிவங்கள், துல்லியமான தசமங்கள், செயல்கள், தொகுப்புகள், தொகுதிகள்.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/ta/finance/' | relative_url }}">நிதியும் கணக்கியலும்</a></h3>
    <p>GST, இரட்டைப் பதிவு, மூன்று அறிக்கைகள்.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/ta/server/' | relative_url }}">பின்தளம்</a></h3>
    <p>HTTP வழிகள், SQL இயக்கிகள், JSON, அங்கீகாரம்.</p>
  </li>
  <li class="card">
    <h3><a href="{{ '/ta/status/' | relative_url }}">நிலை</a></h3>
    <p>இன்று எது இயங்குகிறது, எது பகுதியளவு, எது கட்டப்படவில்லை.</p>
  </li>
</ul>

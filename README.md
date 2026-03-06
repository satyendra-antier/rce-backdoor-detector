# rce-detector — RCE / Backdoor Detection

A **cross-platform** (Windows, macOS, Linux) static analysis tool that scans **multiple languages and codebases** (JavaScript/TypeScript, Python, Ruby, Dart/Flutter, React Native, and env files) for patterns used in **remote code execution (RCE)** and supply-chain backdoors. It can **block application startup** when threats are found, supports **confirmation before running**, and **allowlist (override)** for known-good code. It can be installed **system-wide** and run as a **systemd service** (e.g. with `systemctl`).

Works with **any project type** out of the box: React, Next.js, NestJS, Vue, Nuxt, plain Node, Python, Ruby, Dart/Flutter — one install, no per-repo setup.

---

## Quick start

| Platform | One-line install |
|----------|-------------------|
| **Any (npm)** | `npm install -g rce-detector` then `rce-detector --path . --block --yes` or use platform wrappers below |
| **Linux / macOS** | `curl -fsSL https://raw.githubusercontent.com/satyendra-antier/rce-backdoor-detector/main/get.sh | bash` or `./install.sh` from repo |
| **Windows** | From repo: `powershell -ExecutionPolicy Bypass -File install.ps1` (or `npm install -g rce-detector`) |

After install (with wrappers), **before any `npm install` or `npm run start` / `dev` / `serve` / `build`**, and before `node app.js`, `python app.py`, etc., the scanner runs on the current directory; if it finds issues, the command is blocked.

---

## Install by platform

| Platform | Install methods |
|----------|------------------|
| **Linux** | `get.sh` (curl \| bash), `install.sh` (user or `--system`), `.deb` package, `npm install -g rce-detector` |
| **macOS** | `get.sh`, `install.sh`, `npm install -g rce-detector` |
| **Windows** | `install.ps1` (PowerShell), `npm install -g rce-detector` |

**Global npm:** After `npm install -g rce-detector` (or `npm install -g .` from repo), run `rce-detector --path . --block --yes` from any project. For automatic scan-before-run on every `npm start` / `node app.js`, use the platform installer (install.sh or install.ps1) to set up command wrappers.

---

## Install as a Linux tool (system-wide)

To have the scanner **work across the whole system** for every user and every directory (any `npm install`, `node app.js`, `python app.py`, etc. gets scanned first and blocked if threats are found):

**Option 1 — Direct install (recommended):**
```bash
cd /path/to/rce-detector
sudo ./install.sh --system
```
- Installs to `/opt/security-scanner` and puts `security-scanner` plus command wrappers (`node`, `npm`, `npx`, `python3`, etc.) in `/usr/local/bin`.
- Config: `/etc/security-scanner/config.json`.
- **No codebase is destroyed**; the tool only blocks the command when threats are found.

**Option 2 — Install from a .deb package (like system software):**
```bash
cd /path/to/rce-detector
./scripts/build-deb.sh 1.0.0
sudo dpkg -i dist/security-scanner_1.0.0_all.deb
```
- Same effect as Option 1: system-wide install. Requires Node.js (`apt install nodejs` if needed).

After either option, `/usr/local/bin` is usually already in PATH. Then **any** project run (from any directory, any user) is intercepted: scanner runs first, and the run is blocked if threats are found.

---

## System-level block (install once, works across all projects)

You can install the scanner **once on your system** and have it **automatically** run before **any** project start, without scanning or configuring each repo.

1. **Install** (user install, no sudo):
   ```bash
   cd rce-detector && chmod +x install.sh && ./install.sh
   ```
   The installer **automatically** adds `~/.local/bin` to the start of your PATH in `~/.bashrc` and `~/.zshrc`. Open a new terminal (or run `source ~/.bashrc`) so the wrappers are used.

2. **Done.** From then on:
   - When you run **`npm start`**, **`node server.js`**, **`python app.py`**, **`rails s`**, **`flutter run`**, etc., the scanner runs on the **current directory** first.
   - If it finds threats, the command is **blocked** and does not run.
   - If the scan passes (or the path/findings are allowlisted), the real command runs as usual.
   - This applies to **any** repo or codebase you run from; you do **not** run the scanner manually or configure each project.

**Wrapped commands:** `node`, `npm`, `npx`, `python3`, `python`, `ruby`, `bundle`, `rails`, `flutter`, `dart` (only those present on your system at install time are wrapped).

**Allowlist:** Use the same allowlist as elsewhere: allowlist a path so it is never scanned, or allowlist findings so they are ignored. Config: `~/.config/security-scanner/config.json`.

**Note:** System-level block (wrappers) is set up by `install.sh` on **Linux and macOS**, and by **`install.ps1`** on **Windows** (adds `%LOCALAPPDATA%\bin` to PATH). On Windows without install.ps1, use the CLI or safe-start (e.g. `rce-detector --path . --block --yes` or `node path\to\rce-detector\cli.js --path . --block --yes` before starting the app).

---

## Supported codebases

| Language / stack      | Extensions   | Examples                    |
|-----------------------|-------------|-----------------------------|
| JavaScript / TypeScript / React Native | `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs` | Node, Express, React, React Native |
| Python                | `.py`       | Django, Flask               |
| Ruby / Ruby on Rails  | `.rb`, `.rake` | Rails, Rake                 |
| Dart / Flutter        | `.dart`     | Flutter apps                 |
| Env / config          | `.env`, `*.env` | Any project                |

---

## What it detects (by language)

- **JS/TS:** `eval`, `Function.constructor`, `atob(process.env)`, `axios.get(variable)`, `.data.cookie`, `handler(require)`, IIFE on load, `child_process` with variable.
- **Python:** `eval`, `exec`, `compile`+exec, `__import__(var)`, `os.system(var)`, `subprocess` with variable, `pickle.loads`, unsafe `yaml.load`.
- **Ruby:** `eval`, `instance_eval`/`class_eval` with variable, `system`/`exec` with variable, backtick with interpolation, `open(var)`.
- **Dart:** `Process.run` / `Process.start` with variable.
- **Env:** Base64-like values (possible hidden URL/payload).

The tool **does not** execute your code; it only reads source and env files.

---

## Requirements

- **Node.js** v12 or later. No npm dependencies (built-in modules only).

---

## Confirmation before running

When you run the scanner **without** `--yes`, it asks:

```text
Run security scan on /path/to/project? [y/N]
```

- Answer **y** to run the scan.
- Use **`--yes`** or **`-y`** to skip this prompt (CI, systemd, scripts).

---

## Override / allowlist (after detection)

For **known-good projects** or **intentional patterns** you can **override** so the scanner ignores them next time.

1. **Allowlist the whole path (skip future scans)**  
   ```bash
   rce-detector --path /path/to/project --allowlist-path
   ```
   Or when the scan shows findings, at the prompt choose **A** (allowlist this path).

2. **Allowlist current findings (keep scanning, ignore these rules in this project)**  
   After the report, at the prompt choose **F** (allowlist these findings). The config file is updated so the same file+line+rule are not reported again.

3. **Config file**  
   - **User (all platforms):** `~/.config/security-scanner/config.json` (Windows: `%USERPROFILE%\.config\security-scanner\config.json`)  
   - **System (Unix):** `/etc/security-scanner/config.json` (optional)  
   - **System (Windows):** `%ProgramData%\security-scanner\config.json` (optional)  
   - Example: `config/config.example.json`  
   - You can edit it to add `allowlistedPaths` and `allowlistedFindings` by hand.

---

## Usage (all platforms)

### 1. Scan only (report, no block)

```bash
rce-detector --path .
# Asks for confirmation unless you pass --yes
```

- **Windows:** `rce-detector --path .` or `node path\to\rce-detector\cli.js --path .`
- **macOS / Linux:** `rce-detector --path .`

Or from project root: `npm run security-scan`

### 2. Scan and block (exit 1 if any finding)

```bash
rce-detector --path . --block --yes
npm run security-scan:block
```

Use in CI or before starting the app so the process does **not** start when threats are present.

### 3. Safe-start (scan then start server only if clean)

```bash
node safe-start.js   # or: rce-detector --path . --block --yes && npm run start
npm run safe-start:server
```

Runs the scanner with `--block --yes`; only if the scan passes does it start `node server/server.js`. You can change the start command with `--start "..."`.

### 4. Allowlist (override)

```bash
# Add current path to allowlist (skip scanning this path)
rce-detector --path /path/to/known-project --allowlist-path
```

Or run a scan; when findings appear, use the interactive **A** / **F** options to allowlist path or findings.

---

## CLI options

| Option | Description |
|--------|-------------|
| `--path <dir>` | Directory to scan (default: `.`) |
| `--block` | Exit with code 1 if any finding |
| `--yes`, `-y` | Skip confirmation prompt (non-interactive) |
| `--allowlist-path` | Add `--path` to allowlist and exit |
| `--json` | Machine-readable JSON only |
| `--help`, `-h` | Show help |

---

## System-wide install and systemd (Linux / macOS)

You can install the scanner once on the system. The install also sets up **command wrappers** for system-level block (see above).

### User install (recommended)

```bash
cd rce-detector
chmod +x install.sh
./install.sh
```

- Installs to **`~/.local/share/security-scanner`**
- Puts **`security-scanner`** and **command wrappers** (`node`, `npm`, `npx`, `python3`, etc.) in **`~/.local/bin`**
- Installs **user** systemd unit in `~/.config/systemd/user/` (Linux)

**To enable system-level block:** The installer adds `~/.local/bin` to your shell profile automatically; open a new terminal or run `source ~/.bashrc`.

**Optional – scheduled scan (systemd):**

```bash
mkdir -p ~/.config/security-scanner
cp rce-detector/config/config.example.json ~/.config/security-scanner/config.json
# Edit scanPaths: ["/home/user/projects"] etc.

systemctl --user start security-scanner
systemctl --user enable --now security-scanner.timer
```

### System-wide install (optional, requires sudo)

```bash
sudo ./install.sh --system
```

- Installs to **`/opt/security-scanner`**
- **`/usr/local/bin/security-scanner`** and wrappers in **`/usr/local/bin`** (node, npm, python3, etc.)
- Config: **`/etc/security-scanner/config.json`**
- Systemd units in **`/etc/systemd/system/`**

Ensure `/usr/local/bin` is in PATH (it usually is). Then any user running `npm start`, `node server.js`, etc. will use the wrappers and get scanned first.

```bash
sudo systemctl start security-scanner
sudo systemctl enable --now security-scanner.timer
```

The **service** runs **`run-service.js`**, which reads **`scanPaths`** from config and runs the scanner on each path with **`--block --yes`**. The **wrappers** run the scanner on the **current working directory** whenever you run a project (npm start, node server.js, etc.).

---

## Install like system software (apt-style)

You can distribute the tool so others can install it with a single command.

### Option A: One-line install (curl + bash)

Host `get.sh` and `install.sh` (e.g. on GitHub). Users run:

```bash
curl -fsSL https://raw.githubusercontent.com/satyendra-antier/rce-backdoor-detector/main/get.sh | bash
```

Or from a repo clone: `./get.sh` (uses local `install.sh`). This does a user install to `~/.local` and auto-configures PATH.

### Option B: .deb package (Debian/Ubuntu)

Build a `.deb` and install like any system package:

```bash
# From the rce-detector repo
./scripts/build-deb.sh 1.0.0
# Produces: dist/security-scanner_1.0.0_all.deb

sudo dpkg -i dist/security-scanner_1.0.0_all.deb
```

This installs to `/opt/security-scanner`, puts `security-scanner` and command wrappers in `/usr/local/bin`, and config in `/etc/security-scanner/`. Requires Node.js (`apt install nodejs`).

### Option C: Add to your own apt repo (PPA or private repo)

1. Build the .deb with `./scripts/build-deb.sh <version>`.
2. Publish the `.deb` to a PPA (Launchpad), or to a private apt repository.
3. Users then run:
   ```bash
   sudo add-apt-repository ppa:your-org/rce-detector   # if using PPA
   sudo apt update
   sudo apt install security-scanner
   ```

### Windows: PowerShell install (user, with wrappers)

From a clone or extracted archive of the repo:

```powershell
cd path\to\rce-detector
powershell -ExecutionPolicy Bypass -File install.ps1
```

- Installs to **`%LOCALAPPDATA%\security-scanner`**
- Creates **`security-scanner.cmd`** and command wrappers (**`node.cmd`**, **`npm.cmd`**, **`npx.cmd`**, etc.) in **`%LOCALAPPDATA%\bin`**
- Adds that directory to your user PATH
- Config: **`%USERPROFILE%\.config\security-scanner\config.json`**

Open a **new** terminal so PATH is updated. Then `npm start`, `node app.js`, etc. run the scanner on the current directory first and block if threats are found.

For a **private** repo you would host the .deb and a `Packages`/`Release` structure and add the source to `/etc/apt/sources.list.d/`.

---

## How “preventing execution” works

1. **Scan** – Statically scans code and env files; does not run your app.
2. **Block** – With `--block`, the CLI exits with code `1` when there is at least one finding (after allowlist).
3. **Safe-start** – Runs the scanner with `--block --yes`; only if it exits `0` does it start your server. So if a backdoor is present, the server never starts.

---

## What gets scanned

- **Files:** By extension (see “Supported codebases”).
- **Directories skipped:** `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `.cache`, `security-scanner` (install dir), `.venv`, `venv`, `__pycache__`, `.dart_tool`, `vendor`, `tmp`, `.nuxt`, `.output`.
- **Env:** Any file named `.env` or ending in `.env`.

---

## Troubleshooting

- **"no real binary for ..."** — Re-run the installer (`install.sh` or `install.ps1`) so it can detect and store paths in config, or set `realBinaries` in your config file by hand.
- **"Unknown command: .../run-wrapper.js"** when running `npm` — Wrappers are out of date. Re-run the installer from the repo: `cd /path/to/rce-detector && ./install.sh` (Linux/macOS) or `powershell -ExecutionPolicy Bypass -File install.ps1` (Windows). Open a new terminal after install.
- **Windows: wrappers not used** — Ensure `%LOCALAPPDATA%\bin` is in your user PATH and appears before other Node/npm locations. Open a new terminal after install.
- **Node version** — Requires Node.js v12 or later. Run `node -v` to check.

---

## Verifying the tool

1. **Clean codebase:**  
   `rce-detector --path . --yes`  
   Expect: `No suspicious patterns found.`

2. **With backdoor (e.g. in JS):**  
   Same command on a tree that contains the backdoor pattern will list findings.  
   `rce-detector --path . --block --yes`  
   Expect: exit code `1`.

3. **Override:**  
   Run scan, then at the prompt choose **F** to allowlist findings. Run the scan again; those findings should disappear (override applied).

---

## File layout

```
rce-detector/
  cli.js              # CLI (--path, --block, --yes, --allowlist-path, --json)
  scanner.js          # Core: multi-language scan, allowlist filter
  run-guard.js        # Run scanner on a dir; used by wrappers
  run-wrapper.js      # Intercepts run/start; runs guard then real binary
  run-service.js      # systemd entry: scan config.scanPaths with --block --yes
  safe-start.js       # Scan then start app if clean
  install.sh          # User or system install + wrappers + systemd (auto PATH)
  install.ps1         # Windows user install + wrappers (auto PATH)
  get.sh              # One-line install (curl | bash)
  package.json        # npm bin for global install (rce-detector, rce-scan)
  scripts/
    build-deb.sh      # Build .deb for apt-style install
  bin/
    wrapper.sh        # Template for command wrappers (Unix)
    wrapper.cmd       # Template for command wrappers (Windows)
  scripts/
    detect-binaries.js    # Find real node, npm, python3, etc.
    merge-real-binaries.js # Write realBinaries into config
  lib/
    patterns/         # Per-language rules (javascript, python, ruby, dart)
    config.js         # Config and allowlist load/save
  config/
    config.example.json
  systemd/
    security-scanner.service
    security-scanner.timer
  PUBLISH.md          # Publishing guide (npm + GitHub Releases)
  README.md
```

---

## Publishing (npm + GitHub Releases)

To publish the CLI to **npm** and create **GitHub Release** assets (`.deb` + zip), see **[PUBLISH.md](PUBLISH.md)** for step-by-step instructions.

---

## License / reuse

You can copy the rce-detector folder into other projects or install it system-wide. No npm dependencies; runs on Node.js on Windows, macOS, and Linux.

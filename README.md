# Security Scanner — RCE / Backdoor Detection

A **cross-platform** (Windows, macOS, Linux) static analysis tool that scans **multiple languages and codebases** (JavaScript/TypeScript, Python, Ruby, Dart/Flutter, React Native, and env files) for patterns used in **remote code execution (RCE)** and supply-chain backdoors. It can **block application startup** when threats are found, supports **confirmation before running**, and **allowlist (override)** for known-good code. It can be installed **system-wide** and run as a **systemd service** (e.g. with `systemctl`).

---

## System-level block (install once, works across all projects)

You can install the scanner **once on your system** and have it **automatically** run before **any** project start, without scanning or configuring each repo.

1. **Install** (user install, no sudo):
   ```bash
   cd security-scanner && chmod +x install.sh && ./install.sh
   ```
2. **Put the install bin directory at the start of your PATH** (so the wrappers are used instead of the real commands):
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   ```
   Add that line to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`).

3. **Done.** From then on:
   - When you run **`npm start`**, **`node server.js`**, **`python app.py`**, **`rails s`**, **`flutter run`**, etc., the scanner runs on the **current directory** first.
   - If it finds threats, the command is **blocked** and does not run.
   - If the scan passes (or the path/findings are allowlisted), the real command runs as usual.
   - This applies to **any** repo or codebase you run from; you do **not** run the scanner manually or configure each project.

**Wrapped commands:** `node`, `npm`, `npx`, `python3`, `python`, `ruby`, `bundle`, `rails`, `flutter`, `dart` (only those present on your system at install time are wrapped).

**Allowlist:** Use the same allowlist as elsewhere: allowlist a path so it is never scanned, or allowlist findings so they are ignored. Config: `~/.config/security-scanner/config.json`.

**Note:** System-level block (wrappers) is set up by `install.sh` on **Linux and macOS**. On Windows, use the CLI or safe-start (e.g. `node security-scanner/cli.js --path . --block --yes` before starting the app, or integrate into your start script).

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
   node security-scanner/cli.js --path /path/to/project --allowlist-path
   ```
   Or when the scan shows findings, at the prompt choose **A** (allowlist this path).

2. **Allowlist current findings (keep scanning, ignore these rules in this project)**  
   After the report, at the prompt choose **F** (allowlist these findings). The config file is updated so the same file+line+rule are not reported again.

3. **Config file**  
   - **User:** `~/.config/security-scanner/config.json`  
   - **System:** `/etc/security-scanner/config.json` (optional)  
   - Example: `config/config.example.json`  
   - You can edit it to add `allowlistedPaths` and `allowlistedFindings` by hand.

---

## Usage (all platforms)

### 1. Scan only (report, no block)

```bash
node security-scanner/cli.js --path .
# Asks for confirmation unless you pass --yes
```

- **Windows:** `node security-scanner\cli.js --path .`
- **macOS / Linux:** `node security-scanner/cli.js --path .`

Or from project root: `npm run security-scan`

### 2. Scan and block (exit 1 if any finding)

```bash
node security-scanner/cli.js --path . --block --yes
npm run security-scan:block
```

Use in CI or before starting the app so the process does **not** start when threats are present.

### 3. Safe-start (scan then start server only if clean)

```bash
node security-scanner/safe-start.js
npm run safe-start:server
```

Runs the scanner with `--block --yes`; only if the scan passes does it start `node server/server.js`. You can change the start command with `--start "..."`.

### 4. Allowlist (override)

```bash
# Add current path to allowlist (skip scanning this path)
node security-scanner/cli.js --path /home/user/known-project --allowlist-path
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
cd security-scanner
chmod +x install.sh
./install.sh
```

- Installs to **`~/.local/share/security-scanner`**
- Puts **`security-scanner`** and **command wrappers** (`node`, `npm`, `npx`, `python3`, etc.) in **`~/.local/bin`**
- Installs **user** systemd unit in `~/.config/systemd/user/` (Linux)

**To enable system-level block:** Put `~/.local/bin` at the **start** of your PATH (see “System-level block” above).

**Optional – scheduled scan (systemd):**

```bash
mkdir -p ~/.config/security-scanner
cp security-scanner/config/config.example.json ~/.config/security-scanner/config.json
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

## How “preventing execution” works

1. **Scan** – Statically scans code and env files; does not run your app.
2. **Block** – With `--block`, the CLI exits with code `1` when there is at least one finding (after allowlist).
3. **Safe-start** – Runs the scanner with `--block --yes`; only if it exits `0` does it start your server. So if a backdoor is present, the server never starts.

---

## What gets scanned

- **Files:** By extension (see “Supported codebases”).
- **Directories skipped:** `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `.cache`, `security-scanner`, `.venv`, `venv`, `__pycache__`, `.dart_tool`, `vendor`, `tmp`.
- **Env:** Any file named `.env` or ending in `.env`.

---

## Verifying the tool

1. **Clean codebase:**  
   `node security-scanner/cli.js --path . --yes`  
   Expect: `No suspicious patterns found.`

2. **With backdoor (e.g. in JS):**  
   Same command on a tree that contains the backdoor pattern will list findings.  
   `node security-scanner/cli.js --path . --block --yes`  
   Expect: exit code `1`.

3. **Override:**  
   Run scan, then at the prompt choose **F** to allowlist findings. Run the scan again; those findings should disappear (override applied).

---

## File layout

```
security-scanner/
  cli.js              # CLI (--path, --block, --yes, --allowlist-path, --json)
  scanner.js          # Core: multi-language scan, allowlist filter
  run-guard.js        # Run scanner on a dir; used by wrappers
  run-wrapper.js      # Intercepts run/start; runs guard then real binary
  run-service.js      # systemd entry: scan config.scanPaths with --block --yes
  safe-start.js       # Scan then start app if clean
  install.sh          # User or system install + wrappers + systemd
  bin/
    wrapper.sh        # Template for command wrappers (node, npm, python3, ...)
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
  README.md
```

---

## License / reuse

You can copy the `security-scanner` folder into other projects or install it system-wide. No npm dependencies; runs on Node.js on Windows, macOS, and Linux.

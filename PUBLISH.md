# Publishing rce-detector (npm + GitHub Releases)

Use this guide to publish **rce-detector** to **npm** (global CLI) and **GitHub Releases** (installers and zip).

---

## Prerequisites

- **npm:** Account at [npmjs.com](https://www.npmjs.com). Enable 2FA for publish.
- **GitHub:** Repo pushed (e.g. `satyendra-antier/rce-backdoor-detector`). Update `package.json` `repository.url` and README URLs if your org/repo name differs.

---

## Part 1: Publish to npm

### 1.1 Package name

The package name in `package.json` is `rce-detector`. If it is taken, use a scoped name (e.g. `@your-org/rce-detector`) and run `npm publish --access public`.

### 1.2 Bump version (required before every publish)

For each release, bump the version. **npm will not update the registry if you publish the same version again.**

```bash
cd /path/to/rce-detector
npm version patch   # 1.0.1 -> 1.0.2
# or: npm version minor   # 1.0.1 -> 1.1.0
# or: npm version major   # 1.0.1 -> 2.0.0
```

### 1.3 Login and publish

**You cannot publish the same version twice.** If the registry already has your current version (e.g. 1.0.1), bump first, then publish.

**If your git working directory is not clean**, either commit (or stash) first, or bump without creating a git commit/tag:

```bash
npm login
# Option A: Commit first, then bump + publish (creates git tag v1.0.2)
git add -A && git commit -m "Prepare release"   # if you have uncommitted changes
npm version patch
npm publish

# Option B: Bump version only in package.json, no git commit/tag
npm version patch --no-git-tag-version
npm publish
```

Or in one go (only if working directory is clean): `npm version patch && npm publish`

If using a scoped package (e.g. `@your-org/rce-detector`):

```bash
npm publish --access public
```

### 1.4 Verify

```bash
npm install -g rce-detector
rce-detector --help
```

---

## Part 2: GitHub Release (installers + zip)

### 2.1 Tag the release

Use the same version as in `package.json` (e.g. `1.0.0`):

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 2.2 Build assets

**Linux (.deb):**

```bash
./scripts/build-deb.sh 1.0.0
# Output: dist/security-scanner_1.0.0_all.deb
```

**All platforms (zip for Windows/macOS/Linux):**

```bash
./scripts/build-release-zip.sh 1.0.0
# Output: dist/security-scanner-1.0.0.zip
```

### 2.3 Create the release on GitHub

1. Open your repo on GitHub → **Releases** → **Draft a new release**.
2. **Choose a tag:** `v1.0.0` (create from existing tag if needed).
3. **Release title:** e.g. `v1.0.0` or `Security Scanner 1.0.0`.
4. **Describe:** Copy from previous release or summarize changes.
5. **Attach assets:**
   - `dist/security-scanner_1.0.0_all.deb` (Debian/Ubuntu)
   - `dist/security-scanner-1.0.0.zip` (all platforms; users can run `install.ps1` or `install.sh` from the extracted folder)
6. Publish the release.

### 2.4 One-line install URLs

After the release, your one-liners are:

- **Linux / macOS (curl):**  
  `curl -fsSL https://raw.githubusercontent.com/satyendra-antier/rce-backdoor-detector/main/get.sh | bash`

- **npm (all platforms):**  
  `npm install -g rce-detector`

(Replace `satyendra-antier/rce-backdoor-detector` with your repo if different.)

---

## Checklist per release

- [ ] Bump version in `package.json` and `npm version` (or tag matches).
- [ ] Run `./scripts/build-deb.sh <version>` and `./scripts/build-release-zip.sh <version>`.
- [ ] `npm publish`.
- [ ] Push tag: `git push origin v<version>`.
- [ ] Create GitHub Release, attach `.deb` and `.zip`.
- [ ] Optionally add release notes and link to npm + one-line install in README.

---

## Optional: Windows one-liner (PowerShell)

If you host `install.ps1` on GitHub, users can run (run in PowerShell):

```powershell
irm https://raw.githubusercontent.com/satyendra-antier/rce-backdoor-detector/main/install.ps1 | iex
```

This requires the script to be runnable when piped (e.g. detect repo root or download zip). For now, Windows users can clone the repo or download the release zip and run `install.ps1` locally.

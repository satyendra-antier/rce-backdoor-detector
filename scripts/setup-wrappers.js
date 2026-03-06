#!/usr/bin/env node
/**
 * Postinstall: when installed globally (npm install -g rce-detector), set up
 * command wrappers and PATH so automatic scan-before-run works. No-op for local installs.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

const isWin = process.platform === 'win32';
const pkgRoot = path.resolve(__dirname, '..');

// Only run full setup when installed globally
if (process.env.npm_config_global !== 'true') {
  require('./banner.js');
  process.exit(0);
}

const realNode = process.execPath;
const binDir = isWin
  ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'bin')
  : path.join(os.homedir(), '.local', 'bin');
const configDir = isWin
  ? path.join(process.env.USERPROFILE || os.homedir(), '.config', 'security-scanner')
  : path.join(os.homedir(), '.config', 'security-scanner');
const configFile = path.join(configDir, 'config.json');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: pkgRoot,
    encoding: 'utf8',
    ...opts,
  });
  return r;
}

function main() {
  try {
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(configDir, { recursive: true });
  } catch (e) {
    console.error('rce-detector postinstall: could not create dirs:', e.message);
    require('./banner.js');
    process.exit(0);
  }

  // Detect real binaries (exclude binDir from PATH so we don't pick up our own wrappers)
  const pathWithoutBin = isWin
    ? (process.env.PATH || '').split(path.delimiter).filter(p => p !== binDir).join(path.delimiter)
    : (process.env.PATH || '').split(':').filter(p => p !== binDir).join(':');
  const detect = run(realNode, [path.join(pkgRoot, 'scripts', 'detect-binaries.js')], {
    env: { ...process.env, PATH: pathWithoutBin },
  });
  let realBinaries = {};
  if (detect.stdout) {
    try {
      realBinaries = JSON.parse(detect.stdout.trim() || '{}');
    } catch (_) {}
  }
  if (!realBinaries.node) realBinaries.node = realNode;

  // Merge realBinaries into config
  const merge = run(realNode, [path.join(pkgRoot, 'scripts', 'merge-real-binaries.js')], {
    env: { ...process.env, SECURITY_SCANNER_CONFIG_FILE: configFile },
    input: JSON.stringify(realBinaries),
  });

  // Wrapper template
  const wrapperPath = path.join(pkgRoot, 'bin', isWin ? 'wrapper.cmd' : 'wrapper.sh');
  let template;
  try {
    template = fs.readFileSync(wrapperPath, 'utf8');
  } catch (e) {
    console.error('rce-detector postinstall: could not read wrapper template:', e.message);
    require('./banner.js');
    process.exit(0);
  }

  const scannerDirForScript = isWin ? pkgRoot.replace(/\//g, '\\') : pkgRoot;
  const commands = ['node', 'npm', 'npx', 'python3', 'python', 'ruby', 'bundle', 'rails', 'flutter', 'dart'];
  let created = 0;
  for (const cmd of commands) {
    if (!realBinaries[cmd]) continue;
    const content = template
      .replace(/REAL_BINARY_PLACEHOLDER/g, realNode)
      .replace(/SCANNER_DIR_PLACEHOLDER/g, scannerDirForScript)
      .replace(/COMMAND_NAME_PLACEHOLDER/g, cmd);
    const outFile = path.join(binDir, isWin ? `${cmd}.cmd` : cmd);
    try {
      fs.writeFileSync(outFile, content, 'utf8');
      if (!isWin) fs.chmodSync(outFile, 0o755);
      created++;
    } catch (e) {
      // skip if no write permission
    }
  }

  // CLI entry (security-scanner / rce-detector)
  const cliEntry = isWin
    ? `@echo off\n"${realNode.replace(/"/g, '""')}" "${path.join(pkgRoot, 'cli.js').replace(/\//g, '\\')}" %*`
    : `#!/bin/sh\nexec "${realNode}" "${path.join(pkgRoot, 'cli.js')}" "$@"`;
  const cliName = isWin ? 'security-scanner.cmd' : 'security-scanner';
  try {
    fs.writeFileSync(path.join(binDir, cliName), cliEntry, 'utf8');
    if (!isWin) fs.chmodSync(path.join(binDir, cliName), 0o755);
  } catch (_) {}

  // Add binDir to PATH
  const pathLine = isWin ? binDir : `export PATH="${binDir}:$PATH"`;
  if (!isWin) {
    const profiles = [path.join(os.homedir(), '.bashrc'), path.join(os.homedir(), '.zshrc')];
    for (const profile of profiles) {
      try {
        if (fs.existsSync(profile)) {
          const data = fs.readFileSync(profile, 'utf8');
          if (!data.includes(binDir)) {
            fs.appendFileSync(profile, '\n# rce-detector: auto scan before npm/node\n' + pathLine + '\n', 'utf8');
          }
        }
      } catch (_) {}
    }
  } else {
    try {
      const ps = spawnSync('powershell', [
        '-NoProfile', '-Command',
        `$bin = '${binDir.replace(/'/g, "''")}'; $p = [Environment]::GetEnvironmentVariable('Path','User'); if ($p -notlike '*'+$bin+'*') { [Environment]::SetEnvironmentVariable('Path', $bin+';'+$p, 'User') }`,
      ], { encoding: 'utf8' });
    } catch (_) {}
  }

  require('./banner.js');
  console.log('Wrappers installed to:', binDir);
  if (!isWin) {
    console.log('Run this in the same terminal to enable automatic scan now (no new terminal needed):');
    console.log('  export PATH="' + binDir + ':$PATH"');
  } else {
    console.log('Run this in the same terminal to enable automatic scan now (PowerShell):');
    console.log('  $env:Path = "' + binDir + ';$env:Path"');
  }
  console.log('');
}

main();

#!/usr/bin/env node
/**
 * System-level wrapper: intercepts run/start commands, runs scanner, then execs real binary.
 * Invoked as: node run-wrapper.js <command> <arg1> <arg2> ...
 * e.g. node run-wrapper.js node server.js
 *      node run-wrapper.js npm start
 */

const path = require('path');
const { spawnSync } = require('child_process');
const { loadConfig, ensureConfigDir } = require('./lib/config.js');

const SCANNER_DIR = path.resolve(__dirname);

// Normalize Windows command names (node.exe, npm.cmd) to canonical names for config lookup
function normalizeCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return cmd;
  const base = cmd.replace(/\.(exe|cmd|bat)$/i, '');
  return base.toLowerCase();
}

function getRealBinary(cmd) {
  const canonical = normalizeCommand(cmd);
  const config = loadConfig();
  const real = config.realBinaries && config.realBinaries[canonical];
  if (real) return real;
  if (canonical === 'node') return process.execPath;
  return null;
}

// npm run script names that trigger a scan (project start/build)
const NPM_RUN_SCAN_SCRIPTS = ['start', 'serve', 'dev', 'build', 'develop', 'start:dev', 'dev:server'];

function isRunCommand(cmd, args) {
  const canonical = normalizeCommand(cmd);
  const a0 = args[0] || '';
  const a1 = args[1] || '';
  switch (canonical) {
    case 'node':
      return /\.(c?js|mjs)$/i.test(a0);
    case 'npm':
      if (a0 === 'install' || a0 === 'i' || a0 === 'ci') return true;
      if (a0 === 'start') return true;
      if (a0 === 'run' && (NPM_RUN_SCAN_SCRIPTS.includes(a1) || /^start:|dev:|serve/.test(a1))) return true;
      return false;
    case 'npx':
      return a0 !== 'install' && a0 !== 'i' && a0 !== 'uninstall';
    case 'python':
    case 'python3':
    case 'python2':
      return /\.pyw?$/i.test(a0);
    case 'ruby':
      return /\.rb$/i.test(a0);
    case 'bundle':
      return a0 === 'exec' && (args.join(' ').includes('rails') && (args.includes('s') || args.includes('server')));
    case 'rails':
      return a0 === 's' || a0 === 'server' || a0 === 'runner';
    case 'flutter':
      return a0 === 'run';
    case 'dart':
      return a0 === 'run';
    default:
      return false;
  }
}

function runGuard(cwd) {
  const args = [path.join(SCANNER_DIR, 'cli.js'), '--path', cwd, '--block', '--yes'];
  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    cwd: cwd || process.cwd(),
  });
  return result.status === 0;
}

const rawCommand = process.argv[2];
const args = process.argv.slice(3);

if (!rawCommand) {
  console.error('run-wrapper.js: missing command');
  process.exit(1);
}

const command = normalizeCommand(rawCommand);
const realBinary = getRealBinary(rawCommand);
if (!realBinary) {
  console.error(`security-scanner: no real binary for "${rawCommand}". Run install.sh (or install.ps1 on Windows) again or set realBinaries in config.`);
  process.exit(1);
}

const cwd = process.cwd();

if (isRunCommand(rawCommand, args)) {
  if (!runGuard(cwd)) {
    console.error('\n[security-scanner] Blocked: project failed security scan. Fix findings or allowlist, then retry.');
    process.exit(1);
  }
}

const result = spawnSync(realBinary, args, { stdio: 'inherit', cwd, shell: false });
process.exit(typeof result.status === 'number' ? result.status : 1);

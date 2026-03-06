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

function getRealBinary(cmd) {
  const config = loadConfig();
  const real = config.realBinaries && config.realBinaries[cmd];
  if (real) return real;
  if (cmd === 'node') return process.execPath;
  return null;
}

function isRunCommand(cmd, args) {
  const a0 = args[0] || '';
  const a1 = args[1] || '';
  switch (cmd) {
    case 'node':
    case 'node.exe':
      return /\.(c?js|mjs)$/i.test(a0);
    case 'npm':
      return a0 === 'start' || (a0 === 'run' && ['start', 'serve', 'dev'].includes(a1));
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

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('run-wrapper.js: missing command');
  process.exit(1);
}

const realBinary = getRealBinary(command);
if (!realBinary) {
  console.error(`security-scanner: no real binary for "${command}". Run install.sh again or set realBinaries in config.`);
  process.exit(1);
}

const cwd = process.cwd();

if (isRunCommand(command, args)) {
  if (!runGuard(cwd)) {
    console.error('\n[security-scanner] Blocked: project failed security scan. Fix findings or allowlist, then retry.');
    process.exit(1);
  }
}

const result = spawnSync(realBinary, args, { stdio: 'inherit', cwd, shell: false });
process.exit(typeof result.status === 'number' ? result.status : 1);

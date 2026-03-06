#!/usr/bin/env node
/**
 * Safe-start: run security scanner with --block, then start the app only if clean.
 * Cross-platform (Windows, macOS, Linux). Usage:
 *   node security-scanner/safe-start.js [--path <dir>] [--start <command>]
 * Default --path is . (project root). Default --start is "node server/server.js".
 */

const path = require('path');
const { spawnSync } = require('child_process');

const scannerDir = path.resolve(__dirname);
const cliPath = path.join(scannerDir, 'cli.js');

const args = process.argv.slice(2);
let scanPath = '.';
let startCmd = 'node server/server.js';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--path' && args[i + 1]) scanPath = args[++i];
  else if (args[i] === '--start' && args[i + 1]) startCmd = args[++i];
  else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Safe-start: scan for RCE/backdoors, then start the app only if clean.

Usage: node security-scanner/safe-start.js [options]

Options:
  --path <dir>    Directory to scan (default: .)
  --start <cmd>   Command to run if scan passes (default: node server/server.js)
  --help, -h      Show this help

Example:
  node security-scanner/safe-start.js
  node security-scanner/safe-start.js --start "npm run start"
`);
    process.exit(0);
  }
}

const scanResult = spawnSync(process.execPath, [cliPath, '--path', scanPath, '--block', '--yes'], {
  stdio: 'inherit',
  cwd: path.resolve(process.cwd()),
});

if (scanResult.status !== 0) {
  console.error('\n[Safe-start] App not started because the security scan found threats. Fix findings and try again.');
  process.exit(scanResult.status);
}

// Parse start command: support "node server/server.js" or "npm run start"
const isWin = process.platform === 'win32';
const parts = startCmd.split(/\s+/);
const exe = parts[0];
const rest = parts.slice(1);

console.log('\n[Safe-start] Scan passed. Starting: ' + startCmd + '\n');
const run = spawnSync(exe, rest, {
  stdio: 'inherit',
  shell: isWin,
  cwd: path.resolve(process.cwd()),
});
process.exit(run.status || 0);

#!/usr/bin/env node
/**
 * Run scanner on a directory and exit with its status.
 * Used by command wrappers for system-level block.
 * Usage: node run-guard.js [cwd]
 *   cwd  Directory to scan (default: process.cwd())
 */

const path = require('path');
const { spawnSync } = require('child_process');

const scannerDir = path.resolve(__dirname);
const cliPath = path.join(scannerDir, 'cli.js');
const cwd = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const result = spawnSync(process.execPath, [cliPath, '--path', cwd, '--block', '--yes'], {
  stdio: 'inherit',
  cwd,
});
process.exit(typeof result.status === 'number' ? result.status : 1);

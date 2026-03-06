#!/usr/bin/env node
/**
 * Entry point for systemd (or cron): read config.scanPaths, run scanner with --block --yes for each.
 * Exit 0 only if all paths pass. No confirmation (non-interactive).
 */

const path = require('path');
const { spawnSync } = require('child_process');
const { loadConfig, getConfigPath } = require('./lib/config.js');

const scannerDir = path.resolve(__dirname);
const cliPath = path.join(scannerDir, 'cli.js');

const config = loadConfig();
const scanPaths = config.scanPaths && config.scanPaths.length ? config.scanPaths : [process.cwd()];

let failed = false;
for (const dir of scanPaths) {
  const resolved = path.resolve(dir);
  const result = spawnSync(process.execPath, [cliPath, '--path', '.', '--block', '--yes'], {
    stdio: 'inherit',
    cwd: resolved,
  });
  if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);

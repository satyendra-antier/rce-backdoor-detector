#!/usr/bin/env node
/**
 * Merge realBinaries JSON (from stdin) into user config. Called by install.sh.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const configPath = process.env.SECURITY_SCANNER_CONFIG_FILE ||
  path.join(process.env.SECURITY_SCANNER_CONFIG_DIR || path.join(os.homedir(), '.config', 'security-scanner'), 'config.json');
const configDir = path.dirname(configPath);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let realBinaries = {};
  try {
    realBinaries = JSON.parse(input || '{}');
  } catch (e) {
    process.exit(0);
  }
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (_) {}
  config.realBinaries = { ...(config.realBinaries || {}), ...realBinaries };
  try {
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
});

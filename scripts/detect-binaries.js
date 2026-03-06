#!/usr/bin/env node
/**
 * Detect real binary paths for node, npm, npx, python3, etc.
 * Used by install.sh to fill config.realBinaries.
 */

const { execSync } = require('child_process');
const path = require('path');

function which(cmd) {
  try {
    const out = execSync(`which ${cmd} 2>/dev/null || command -v ${cmd} 2>/dev/null`, { encoding: 'utf8' });
    return out.trim() || null;
  } catch {
    return null;
  }
}

const commands = ['node', 'npm', 'npx', 'python3', 'python', 'ruby', 'bundle', 'rails', 'flutter', 'dart'];
const realBinaries = {};
for (const cmd of commands) {
  const p = which(cmd);
  if (p) realBinaries[cmd] = p;
}

// If npm not found but node is, npm is often node_modules/npm/bin/npm or same dir as node
if (!realBinaries.npm && realBinaries.node) {
  const nodeDir = path.dirname(realBinaries.node);
  const npmPath = path.join(nodeDir, 'npm');
  const fs = require('fs');
  if (fs.existsSync(npmPath)) realBinaries.npm = npmPath;
  const npxPath = path.join(nodeDir, 'npx');
  if (fs.existsSync(npxPath)) realBinaries.npx = npxPath;
}

console.log(JSON.stringify(realBinaries, null, 2));

#!/usr/bin/env node
/**
 * Detect real binary paths for node, npm, npx, python3, etc.
 * Cross-platform: uses which/command -v on Unix, where.exe on Windows.
 * Used by install.sh / install.ps1 to fill config.realBinaries.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const isWin = process.platform === 'win32';

function whichUnix(cmd) {
  try {
    const out = execSync(`which ${cmd} 2>/dev/null || command -v ${cmd} 2>/dev/null`, { encoding: 'utf8' });
    return (out.trim() || null);
  } catch {
    return null;
  }
}

function whichWindows(cmd) {
  try {
    const out = execSync(`where.exe ${cmd} 2>nul`, { encoding: 'utf8', maxBuffer: 4096 });
    const first = out.split(/[\r\n]+/)[0];
    if (!first || !first.trim()) return null;
    return path.normalize(first.trim());
  } catch {
    return null;
  }
}

function which(cmd) {
  const p = isWin ? whichWindows(cmd) : whichUnix(cmd);
  return p || null;
}

const commands = ['node', 'npm', 'npx', 'python3', 'python', 'ruby', 'bundle', 'rails', 'flutter', 'dart'];
const realBinaries = {};
for (const cmd of commands) {
  const p = which(cmd);
  if (p) realBinaries[cmd] = p;
}

// If npm not found but node is, npm is often in same dir as node (npm.cmd / npx.cmd on Windows)
if (!realBinaries.npm && realBinaries.node) {
  const nodeDir = path.dirname(realBinaries.node);
  const npmName = isWin ? 'npm.cmd' : 'npm';
  const npxName = isWin ? 'npx.cmd' : 'npx';
  const npmPath = path.join(nodeDir, npmName);
  const npxPath = path.join(nodeDir, npxName);
  if (fs.existsSync(npmPath)) realBinaries.npm = npmPath;
  if (fs.existsSync(npxPath)) realBinaries.npx = npxPath;
}

console.log(JSON.stringify(realBinaries, null, 2));

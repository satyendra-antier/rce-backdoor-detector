/**
 * Config and allowlist (override) for security scanner.
 * Locations: ~/.config/security-scanner/config.json, /etc/security-scanner/config.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CONFIG = {
  allowlistedPaths: [],
  allowlistedFindings: [],
  scanPaths: [],
  realBinaries: {},
};

function getConfigDir() {
  if (process.env.SECURITY_SCANNER_CONFIG_DIR) return process.env.SECURITY_SCANNER_CONFIG_DIR;
  const home = os.homedir();
  return path.join(home, '.config', 'security-scanner');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function getSystemConfigPath() {
  return '/etc/security-scanner/config.json';
}

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadConfig() {
  const system = loadJson(getSystemConfigPath());
  const userPath = getConfigPath();
  const user = loadJson(userPath);
  const merged = {
    ...DEFAULT_CONFIG,
    ...(system || {}),
    ...(user || {}),
    allowlistedPaths: [...(system?.allowlistedPaths || []), ...(user?.allowlistedPaths || [])],
    allowlistedFindings: [...(system?.allowlistedFindings || []), ...(user?.allowlistedFindings || [])],
    scanPaths: user?.scanPaths?.length ? user.scanPaths : (system?.scanPaths || []),
    realBinaries: { ...(system?.realBinaries || {}), ...(user?.realBinaries || {}) },
  };
  return merged;
}

function ensureConfigDir() {
  const dir = getConfigDir();
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EACCES') throw e;
  }
  return dir;
}

function saveConfig(config) {
  ensureConfigDir();
  const filePath = getConfigPath();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf8');
  return filePath;
}

/**
 * Check if a project path is fully allowlisted (skip scan).
 */
function isPathAllowlisted(projectPath, config) {
  const c = config || loadConfig();
  const normalized = path.resolve(projectPath);
  return c.allowlistedPaths.some((p) => {
    const abs = path.resolve(p);
    return normalized === abs || normalized.startsWith(abs + path.sep);
  });
}

/**
 * Check if a specific finding is allowlisted.
 * Finding: { file, line, id (ruleId) }; projectPath is the scanned root.
 */
function isFindingAllowlisted(projectPath, finding, fileRel, config) {
  const c = config || loadConfig();
  const normalizedProject = path.resolve(projectPath);
  return c.allowlistedFindings.some((a) => {
    const matchPath = !a.projectPath || path.resolve(a.projectPath) === normalizedProject;
    const matchFile = !a.file || a.file === fileRel || fileRel.endsWith(a.file);
    const matchLine = a.line == null || a.line === finding.line;
    const matchRule = !a.ruleId || a.ruleId === finding.id;
    return matchPath && matchFile && matchLine && matchRule;
  });
}

/**
 * Add a finding to the allowlist.
 */
function addAllowlistFinding(projectPath, fileRel, finding) {
  const c = loadConfig();
  const entry = {
    projectPath: path.resolve(projectPath),
    file: fileRel,
    line: finding.line,
    ruleId: finding.id,
  };
  if (c.allowlistedFindings.some((e) => e.projectPath === entry.projectPath && e.file === entry.file && e.line === entry.line && e.ruleId === entry.ruleId)) return c;
  c.allowlistedFindings.push(entry);
  saveConfig(c);
  return c;
}

/**
 * Add a path to the allowlist (skip scanning this path entirely).
 */
function addAllowlistPath(projectPath) {
  const c = loadConfig();
  const abs = path.resolve(projectPath);
  if (c.allowlistedPaths.includes(abs)) return c;
  c.allowlistedPaths.push(abs);
  saveConfig(c);
  return c;
}

module.exports = {
  loadConfig,
  saveConfig,
  getConfigPath,
  getConfigDir,
  getSystemConfigPath,
  ensureConfigDir,
  isPathAllowlisted,
  isFindingAllowlisted,
  addAllowlistFinding,
  addAllowlistPath,
  DEFAULT_CONFIG,
};

/**
 * Scanner core: multi-language (JS/TS, Python, Ruby, Dart), allowlist filtering.
 * Uses only Node.js built-ins. Runs on Windows, macOS, Linux.
 */

const fs = require('fs');
const path = require('path');
const { getPatternsForExtension, getAllExtensions } = require('./lib/patterns/index.js');
const { isPathAllowlisted, isFindingAllowlisted, loadConfig } = require('./lib/config.js');

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache',
  'security-scanner', '.venv', 'venv', '__pycache__', '.dart_tool', 'vendor', 'tmp',
]);

const SCAN_EXTENSIONS = new Set(getAllExtensions());

const BASE64_LIKE = /^[A-Za-z0-9+/]+=*$/;

function walkDir(dir, ignoreDirs = DEFAULT_IGNORE_DIRS) {
  const results = [];
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch {
    return results;
  }
  for (const name of list) {
    const fullPath = path.join(dir, name);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!ignoreDirs.has(name)) results.push(...walkDir(fullPath, ignoreDirs));
    } else if (SCAN_EXTENSIONS.has(path.extname(name))) {
      results.push(fullPath);
    }
  }
  return results;
}

function getLineNumber(content, index) {
  const before = content.slice(0, index);
  return (before.match(/\n/g) || []).length + 1;
}

function scanContent(content, filePath, rootDir) {
  const ext = path.extname(filePath);
  const patterns = getPatternsForExtension(ext);
  const findings = [];
  for (const pattern of patterns) {
    if (!pattern.regex) continue;
    const flags = /g/.test(pattern.regex.flags || '') ? (pattern.regex.flags || 'g') : (pattern.regex.flags || '') + 'g';
    const regex = new RegExp(pattern.regex.source, flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const line = getLineNumber(content, match.index);
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const lineEnd = content.indexOf('\n', match.index);
      const lineEndIdx = lineEnd === -1 ? content.length : lineEnd;
      let snippet = content.slice(lineStart, lineEndIdx).trim();
      if (snippet.length > 120) snippet = snippet.slice(0, 117) + '...';
      findings.push({
        id: pattern.id,
        severity: pattern.severity,
        name: pattern.name,
        description: pattern.description,
        line,
        snippet,
      });
    }
  }
  return findings;
}

function scan(rootDir, options = {}) {
  const resolved = path.isAbsolute(rootDir) ? rootDir : path.resolve(process.cwd(), rootDir);
  const config = options.config || loadConfig();
  if (isPathAllowlisted(resolved, config)) {
    return { files: 0, findings: [], skipped: true, reason: 'allowlisted path' };
  }
  const files = walkDir(resolved);
  const results = { files: files.length, findings: [] };

  for (const filePath of files) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    const fileRel = path.relative(resolved, filePath);
    const fileFindings = scanContent(content, filePath, resolved);
    const filtered = options.applyAllowlist !== false
      ? fileFindings.filter((f) => !isFindingAllowlisted(resolved, f, fileRel, config))
      : fileFindings;
    if (filtered.length > 0) {
      results.findings.push({
        file: fileRel,
        absolutePath: filePath,
        findings: filtered,
      });
    }
  }
  return results;
}

function scanEnvFiles(rootDir, options = {}) {
  const resolved = path.isAbsolute(rootDir) ? rootDir : path.resolve(process.cwd(), rootDir);
  const config = options.config || loadConfig();
  if (isPathAllowlisted(resolved, config)) return [];
  const results = [];
  function collect(dir) {
    let list;
    try {
      list = fs.readdirSync(dir);
    } catch {
      return;
    }
    for (const name of list) {
      const full = path.join(dir, name);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory() && !DEFAULT_IGNORE_DIRS.has(name)) collect(full);
        else if (stat.isFile() && (name === '.env' || name.endsWith('.env'))) {
          const content = fs.readFileSync(full, 'utf8');
          const rel = path.relative(resolved, full);
          const findings = [];
          content.split('\n').forEach((line, i) => {
            const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*["']?([^"'\s#]+)["']?/);
            if (m) {
              const value = m[2].trim();
              if (value.length >= 20 && BASE64_LIKE.test(value)) {
                findings.push({
                  id: 'ENV_BASE64',
                  severity: 'high',
                  name: 'Base64-like env value',
                  description: 'May hide URL or payload; decode and verify.',
                  line: i + 1,
                  snippet: `${m[1]}=***`,
                });
              }
            }
          });
          if (findings.length) {
            const filtered = options.applyAllowlist !== false
              ? findings.filter((f) => !isFindingAllowlisted(resolved, f, rel, config))
              : findings;
            if (filtered.length) results.push({ file: rel, absolutePath: full, findings: filtered });
          }
        }
      } catch (_) {}
    }
  }
  collect(resolved);
  return results;
}

function scanAll(rootDir, options = {}) {
  const code = scan(rootDir, options);
  if (code.skipped) return code;
  const env = scanEnvFiles(rootDir, options);
  return {
    files: code.files,
    findings: [...code.findings, ...env],
  };
}

module.exports = { scan, scanAll, scanEnvFiles, walkDir, scanContent, getPatternsForExtension, getAllExtensions };

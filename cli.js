#!/usr/bin/env node
/**
 * CLI for RCE/backdoor security scanner.
 * Multi-language (JS, Python, Ruby, Dart). Confirmation prompt, allowlist (override).
 * Usage: node cli.js [--path <dir>] [--block] [--yes] [--json] [--allowlist-path]
 * No automatic destruction; only blocks (exit 1) when threats found.
 */

const path = require('path');
const readline = require('readline');
const { scanAll } = require('./scanner.js');
const { addAllowlistFinding, addAllowlistPath, loadConfig, getConfigPath } = require('./lib/config.js');

const args = process.argv.slice(2);
let scanPath = '.';
let block = false;
let jsonOnly = false;
let yes = false;
let allowlistPath = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--path' && args[i + 1]) scanPath = args[++i];
  else if (args[i] === '--block') block = true;
  else if (args[i] === '--json') jsonOnly = true;
  else if (args[i] === '--yes' || args[i] === '-y') yes = true;
  else if (args[i] === '--allowlist-path') allowlistPath = true;
  else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Security Scanner — RCE/backdoor detection (JS, Python, Ruby, Dart, env)

Usage: security-scanner [options]

Options:
  --path <dir>       Directory to scan (default: .)
  --block             Exit with code 1 if any finding (CI / safe-start)
  --yes, -y           Skip confirmation prompt (non-interactive)
  --allowlist-path    Add scanned path to allowlist (skip future scans)
  --json              Machine-readable JSON only
  --help, -h          Show this help

Confirmation:
  When run without --yes, asks: "Run security scan on <path>? [y/N]"
  After findings, you can allowlist (override) so they are ignored next run.

Allowlist (override):
  Config: ${getConfigPath()}
  Use --allowlist-path to add current path to allowlist.
  Or when findings are shown, run again with interactive prompt to add findings to allowlist.
`);
    process.exit(0);
  }
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve((answer || '').trim().toLowerCase());
    });
  });
}

async function main() {
  const resolved = path.resolve(process.cwd(), scanPath);

  if (!yes && process.stdin.isTTY) {
    const answer = await ask(`Run security scan on ${resolved}? [y/N] `);
    if (answer !== 'y' && answer !== 'yes') {
      console.log('Scan cancelled.');
      process.exit(0);
    }
  }

  if (allowlistPath) {
    const config = loadConfig();
    config.allowlistedPaths = config.allowlistedPaths || [];
    if (config.allowlistedPaths.includes(resolved)) {
      console.log(`Path already allowlisted: ${resolved}`);
    } else {
      config.allowlistedPaths.push(resolved);
      const fs = require('fs');
      const configPath = require('./lib/config.js').getConfigPath();
      const dir = path.dirname(configPath);
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        console.log(`Allowlisted path: ${resolved}`);
        console.log(`Config: ${configPath}`);
      } catch (e) {
        console.error('Could not write config:', e.message);
        process.exit(1);
      }
    }
    process.exit(0);
  }

  const result = scanAll(scanPath);
  if (result.skipped) {
    if (jsonOnly) console.log(JSON.stringify({ skipped: true, reason: result.reason }));
    else console.log(`Skipped (allowlisted): ${result.reason}`);
    process.exit(0);
  }

  const totalFindings = result.findings.reduce((sum, f) => sum + f.findings.length, 0);

  if (jsonOnly) {
    console.log(JSON.stringify({
      filesScanned: result.files,
      totalFindings,
      findings: result.findings,
    }, null, 0));
    process.exit(block && totalFindings > 0 ? 1 : 0);
  }

  const sep = '─'.repeat(60);
  console.log('\n' + sep);
  console.log('  Security Scanner — RCE / Backdoor detection');
  console.log('  (JS, TypeScript, Python, Ruby, Dart, env files)');
  console.log(sep);
  console.log(`  Scanned: ${result.files} files under ${resolved}`);
  console.log(`  Findings: ${totalFindings}`);
  console.log(sep + '\n');

  if (result.findings.length === 0) {
    console.log('  No suspicious patterns found.\n');
    process.exit(0);
  }

  for (const { file, findings } of result.findings) {
    console.log(`  📁 ${file}`);
    for (const f of findings) {
      const icon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : '🟡';
      console.log(`     ${icon} [${f.severity}] ${f.name} (line ${f.line})`);
      console.log(`        ${f.description}`);
      if (f.snippet) console.log(`        → ${f.snippet}`);
    }
    console.log('');
  }

  if (!yes && process.stdin.isTTY && totalFindings > 0) {
    const answer = await ask(
      `Override? [A]llowlist this path (skip future scans), [F]indings (allowlist these), [Q]uit: `
    );
    if (answer === 'a' || answer === 'allowlist path') {
      const c = loadConfig();
      c.allowlistedPaths = c.allowlistedPaths || [];
      if (!c.allowlistedPaths.includes(resolved)) {
        c.allowlistedPaths.push(resolved);
        const fs = require('fs');
        const { saveConfig } = require('./lib/config.js');
        saveConfig(c);
        console.log(`  Allowlisted path: ${resolved}`);
      }
      console.log(sep + '\n');
      process.exit(0);
    }
    if (answer === 'f' || answer === 'findings') {
      const { saveConfig } = require('./lib/config.js');
      const c = loadConfig();
      c.allowlistedFindings = c.allowlistedFindings || [];
      for (const { file, findings } of result.findings) {
        for (const f of findings) {
          c.allowlistedFindings.push({
            projectPath: resolved,
            file,
            line: f.line,
            ruleId: f.id,
          });
        }
      }
      saveConfig(c);
      console.log(`  Allowlisted ${totalFindings} finding(s). Re-run scan to verify.`);
      console.log(sep + '\n');
      process.exit(0);
    }
  }

  console.log(sep);
  if (block && totalFindings > 0) {
    console.log('  ⛔ Blocked: fix or allowlist findings, then re-run.');
    console.log(sep + '\n');
    process.exit(1);
  }
  console.log(sep + '\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

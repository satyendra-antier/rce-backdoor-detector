#!/usr/bin/env node
/**
 * Print colorful RCE DETECTOR banner (install / postinstall).
 * ANSI codes work in most Unix and Windows terminals.
 */
const C = {
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
};
const line = '════════════════════════════════════════';
console.log('');
console.log(`${C.cyan}${C.bold}  ${line}`);
console.log(`  ${C.green}${C.bold}   R C E   D E T E C T O R${C.reset}`);
console.log(`  ${C.dim}   by Satyendra Pandey${C.reset}`);
console.log(`${C.cyan}  ${line}${C.reset}`);
console.log('');

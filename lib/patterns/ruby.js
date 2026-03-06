/** Ruby / Ruby on Rails */
module.exports = [
  { id: 'RB_EVAL', severity: 'critical', name: 'eval() usage', regex: /\beval\s*\(/, description: 'Evaluates Ruby code from string (RCE).' },
  { id: 'RB_INSTANCE_EVAL', severity: 'high', name: 'instance_eval / class_eval with variable', regex: /(?:instance_eval|class_eval|module_eval)\s*\(\s*[a-zA-Z_@][a-zA-Z0-9_@]*\s*\)/, description: 'Dynamic code execution from variable.' },
  { id: 'RB_SYSTEM_VAR', severity: 'high', name: 'system() / exec with variable', regex: /(?:system|exec)\s*\(\s*[a-zA-Z_@][a-zA-Z0-9_@]*\s*[,)]/, description: 'Shell command from variable.' },
  { id: 'RB_BACKTICK', severity: 'high', name: 'Kernel.` (backtick) with variable', regex: /`\s*#\s*\{[^}]+\}\s*`/, description: 'Shell interpolation from variable.' },
  { id: 'RB_OPEN_URI', severity: 'medium', name: 'open() with variable URL', regex: /open\s*\(\s*[a-zA-Z_@][a-zA-Z0-9_@]*\s*\)/, description: 'Open URI from variable (SSRF/code load risk).' },
  { id: 'RB_CONST_GET', severity: 'medium', name: 'constant_get with variable', regex: /const_get\s*\(\s*[a-zA-Z_@][a-zA-Z0-9_@]*\s*\)/, description: 'Dynamic constant from variable.' },
];

/** Python - Django, Flask, general Python */
module.exports = [
  { id: 'PY_EVAL', severity: 'high', name: 'eval() usage', regex: /\beval\s*\(/, description: 'Dynamic code execution from string.' },
  { id: 'PY_EXEC', severity: 'critical', name: 'exec() usage', regex: /\bexec\s*\(/, description: 'Executes Python code from string (RCE).' },
  { id: 'PY_COMPILE_EXEC', severity: 'critical', name: 'compile() + exec/eval', regex: /compile\s*\([^)]+\)\s*[\s\S]*?(?:exec|eval)\s*\(/, description: 'Compiled code then executed.' },
  { id: 'PY_IMPORTLIB', severity: 'high', name: '__import__ with variable', regex: /__import__\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\)/, description: 'Dynamic import from variable.' },
  { id: 'PY_OS_SYSTEM', severity: 'high', name: 'os.system() with variable', regex: /os\.system\s*\(\s*[^'"\s][^)]*\)/, description: 'Shell command from variable.' },
  { id: 'PY_SUBPROCESS_VAR', severity: 'high', name: 'subprocess with variable command', regex: /subprocess\.(?:run|call|Popen|check_output)\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[,)]/, description: 'Subprocess command from variable.' },
  { id: 'PY_PICKLE_LOADS', severity: 'high', name: 'pickle.loads (untrusted data)', regex: /pickle\.loads\s*\(/, description: 'Deserialization can lead to RCE.' },
  { id: 'PY_YAML_LOAD', severity: 'high', name: 'yaml.load (unsafe)', regex: /yaml\.load\s*\([^)]*\)(?!\s*,\s*Loader\s*=)/, description: 'Unsafe YAML load can execute code.' },
];

/** JavaScript/TypeScript/React Native - Node, browser, React Native */
module.exports = [
  { id: 'EVAL', severity: 'high', name: 'eval() usage', regex: /\beval\s*\(/, description: 'Dynamic code execution via eval().' },
  { id: 'FUNCTION_CONSTRUCTOR', severity: 'critical', name: 'Function constructor / new Function()', regex: /(?:new\s+)?Function\s*\.\s*constructor\s*\(|new\s+Function\s*\(/, description: 'Creates a function from a string (RCE vector).' },
  { id: 'ATOB_PROCESS_ENV', severity: 'critical', name: 'atob(process.env) - decoded env as URL/code', regex: /atob\s*\(\s*process\.env\.\w+/, description: 'Base64-decoded env used as URL or payload.' },
  { id: 'AXIOS_GET_VAR', severity: 'high', name: 'axios.get( variable ) - URL from variable', regex: /axios\.(get|post)\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[,)]/, description: 'HTTP URL from variable (could be env-decoded).' },
  { id: 'RESPONSE_DATA_COOKIE', severity: 'high', name: 'response.data.cookie (suspicious payload)', regex: /\.data\.cookie\s*[;)]/, description: 'Response .data.cookie often holds remote script.' },
  { id: 'HANDLER_REQUIRE', severity: 'critical', name: 'handler(require) - passing require to dynamic code', regex: /(?:handler|fn|run)\s*\(\s*require\s*\)/, description: 'Node require passed to dynamic function (full RCE).' },
  { id: 'IIFE_AFTER_EXPORT', severity: 'medium', name: 'IIFE (})(); at end of file', regex: /\}\)\s*\(\s*\)\s*;?\s*$/m, description: 'Code runs on module load (startup backdoors).' },
  { id: 'BTOA_PROCESS_ENV', severity: 'high', name: 'btoa(process.env)', regex: /btoa\s*\(\s*process\.env\.\w+/, description: 'Encoding env for exfiltration or payloads.' },
  { id: 'CHILD_PROCESS_EXEC_VAR', severity: 'high', name: 'child_process.exec/execSync with variable', regex: /require\s*\(\s*['"]child_process['"]\s*\)[\s\S]*?\.(?:execSync|exec|spawn)\s*\(\s*[^'"\s]/, description: 'Shell command from variable (injection risk).' },
];

/** Dart / Flutter */
module.exports = [
  { id: 'DART_PROCESS_RUN', severity: 'high', name: 'Process.run with variable', regex: /Process\.run\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[,)]/, description: 'Process command from variable.' },
  { id: 'DART_PROCESS_START', severity: 'high', name: 'Process.start with variable', regex: /Process\.start\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[,)]/, description: 'Process executable from variable.' },
];

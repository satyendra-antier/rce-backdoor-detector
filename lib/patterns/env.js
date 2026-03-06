/** Shared: .env / config env files (any project type) */
module.exports = [
  { id: 'ENV_BASE64', severity: 'high', name: 'Base64-like env value', regex: null, description: 'May hide URL or payload; decode and verify.' },
];

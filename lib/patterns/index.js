/**
 * Multi-language pattern registry.
 * Maps file extension (and special 'env') to list of detection patterns.
 */

const path = require('path');
const js = require('./javascript.js');
const python = require('./python.js');
const ruby = require('./ruby.js');
const dart = require('./dart.js');

const BY_EXTENSION = {
  '.js': js,
  '.jsx': js,
  '.ts': js,
  '.tsx': js,
  '.mjs': js,
  '.cjs': js,
  '.py': python,
  '.rb': ruby,
  '.rake': ruby,
  '.dart': dart,
};

function getPatternsForExtension(ext) {
  return BY_EXTENSION[ext] || [];
}

function getAllExtensions() {
  return [...new Set(Object.keys(BY_EXTENSION))];
}

module.exports = { getPatternsForExtension, getAllExtensions, BY_EXTENSION };

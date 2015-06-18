'use strict';

import path from 'path';

var globToRgxp = function (str) {
  return str
    .replace(/\./g, '\\.')
    .replace(/\?/g, '.')
    .replace(/\{(.*?)\}/g, (m, g1) => '{' + g1.split(',').join('|') + '}')
    .replace(/\{/g, '(?:')
    .replace(/\}/g, ')')
    .replace(/\*\*\//g, '(?:.{0,}/|)')
    .replace(/\*\*/g, '.{0,}')
    .replace(/\*/g, '[^/]{0,}') + '$';
};

var normalize = testPath => testPath.replace(/\/\/+/g, '/');

export var glob = function (pattern, testPath) {
  pattern = normalize(globToRgxp(pattern));
  try {
    var rgxp = new RegExp(pattern);
    var fn = testPath => !!(rgxp.exec(testPath));
    return testPath ? fn(testPath) : fn;
  }
  catch(e) {
    console.error(e);
    return testPath ? false : () => false;
  }
};

export var globFrom = function (base, pattern, testPath) {
  var fn = glob(path + '/' + pattern);
  return testPath ? fn(testPath) : fn;
};

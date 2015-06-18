'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var globToRgxp = function globToRgxp(str) {
  return str.replace(/\./g, '\\.').replace(/\?/g, '.').replace(/\{(.*?)\}/g, function (m, g1) {
    return '{' + g1.split(',').join('|') + '}';
  }).replace(/\{/g, '(?:').replace(/\}/g, ')').replace(/\*\*\//g, '(?:.{0,}/|)').replace(/\*\*/g, '.{0,}').replace(/\*/g, '[^/]{0,}') + '$';
};

var normalize = function normalize(testPath) {
  return testPath.replace(/\/\/+/g, '/');
};

var glob = function glob(pattern, testPath) {
  pattern = normalize(globToRgxp(pattern));
  try {
    var rgxp = new RegExp(pattern);
    var fn = function fn(testPath) {
      return !!rgxp.exec(testPath);
    };
    return testPath ? fn(testPath) : fn;
  } catch (e) {
    console.error(e);
    return testPath ? false : function () {
      return false;
    };
  }
};

exports.glob = glob;
var globFrom = function globFrom(base, pattern, testPath) {
  var fn = glob(_path2['default'] + '/' + pattern);
  return testPath ? fn(testPath) : fn;
};
exports.globFrom = globFrom;
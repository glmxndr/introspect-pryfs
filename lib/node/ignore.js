'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _glob = require('./glob');

var ignore = function ignore(patterns, filepath) {
  return patterns.reduce(function (ign, p) {
    if (ign) {
      return true;
    }
    if (_lodash2['default'].isString(p)) {
      return (0, _glob.glob)(p, filepath);
    }
    if (_lodash2['default'].isRegExp(p)) {
      return !!filepath.match(p);
    }
    console.error('pryfs/ignore - unknown pattern \'' + p + '\', ignored');
    return false;
  }, false);
};
exports.ignore = ignore;
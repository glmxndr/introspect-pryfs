'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _introspectStream = require('introspect-stream');

var _introspectStream2 = _interopRequireDefault(_introspectStream);

var _introspectTyped = require('introspect-typed');

var _walk = require('./walk');

var PRY_DEFAULTS = {
  quiet: false,
  ignore: ['.*{ignore,rc}', '.{svn,git}', 'node_modules'],
  walk: true,
  watch: true,
  persistent: true,
  recursive: true,
  followSymLinks: true
};

var pry = (0, _introspectTyped.overload)([String, Object], function (base, opts) {
  opts = _lodash2['default'].defaults(opts || {}, PRY_DEFAULTS, { base: base });
  opts.monitored = new Set();
  var s = (0, _introspectStream2['default'])('pryFs').log();
  var promise = (0, _walk.walkPath)(base, s, opts);
  if (!opts.watch) {
    promise.then(function () {
      return s.end();
    });
  }
  return s;
}).when([String], function (base) {
  return pry['default'](base, {});
}).when([Object], function (opts) {
  return pry['default'](opts.base || process.cwd(), opts);
}).when([], function () {
  return pry['default'](process.cwd(), {});
});

exports.pry = pry;
pry({ watch: false });
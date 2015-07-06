'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _introspectStream = require('introspect-stream');

var _introspectStream2 = _interopRequireDefault(_introspectStream);

var _introspectTyped = require('introspect-typed');

var _walk = require('./walk');

var _fsevent = require('./fsevent');

var PRY_DEFAULTS = {
  quiet: true,
  ignore: ['.*{ignore,rc}', '.{svn,git}', 'node_modules'],
  walk: true,
  watch: true,
  persistent: true,
  recursive: true,
  filesOnly: true,
  maybeFire: function maybeFire(type, file, isDir) {
    if (!(this.filesOnly && isDir)) {
      this.stream.next((0, _fsevent.FsEvent)(type, file, this.base, isDir));
    }
  },
  followSymLinks: true
};

var buildFn = function buildFn(defaults) {
  var fn = (0, _introspectTyped.overload)([String, Object], function (base, opts) {
    // Sanitize input
    if (!_path2['default'].isAbsolute(base)) {
      base = _path2['default'].join(process.cwd(), base);
    }
    opts = _lodash2['default'].defaults(opts || {}, defaults, { base: base });

    // opts.monitored is a map from filepath to boolean,
    // telling if it is a directory
    opts.monitored = new Map();

    opts.quiet = opts.verbose ? false : opts.quiet;

    // Create the stream
    var s = (0, _introspectStream2['default'])('pryFs');
    opts.stream = s;
    if (!opts.quiet) {
      s.log();
    }

    // Create the walking promise
    var promise = (0, _walk.walkPath)(base, opts);
    if (!opts.watch) {
      promise.then(function () {
        return s.end();
      });
    }

    // Attach the pry-relative data to the stream
    s.pry = { promise: promise, base: base, opts: opts };
    return s;
  }).when([String], function (base) {
    return fn['default'](base, {});
  }).when([Object], function (opts) {
    return fn['default'](opts.base || process.cwd(), opts);
  }).when([], function () {
    return fn['default'](process.cwd(), {});
  });
  return fn;
};

var pry = buildFn(PRY_DEFAULTS);

exports.pry = pry;
pry.walk = buildFn(_lodash2['default'].defaults({ watch: false }, PRY_DEFAULTS));
pry.watch = buildFn(_lodash2['default'].defaults({ walk: false }, PRY_DEFAULTS));
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _introspectStream = require('introspect-stream');

var _introspectStream2 = _interopRequireDefault(_introspectStream);

var _introspectTyped = require('introspect-typed');

var _glob = require('./glob');

var FsEvent = function FsEvent(type, file, base) {
  if (!(this instanceof FsEvent)) {
    return new FsEvent(type, file, base);
  }
  _lodash2['default'].extend(this, { file: file, type: type, base: base });
};

FsEvent.prototype = {
  toString: function toString() {
    return 'FsEvent [' + this.type + ' ' + _path2['default'].relative(this.base, this.file) + ']';
  }
};

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

var watchDir = function watchDir(dirpath, stream, opts) {
  if (ignore(opts.ignore, dirpath)) {
    return;
  }
  var watcher = _fs2['default'].watch(dirpath, { persistent: opts.persistent, recursive: false });
  var onChange = function onChange(name) {
    var file = _path2['default'].join(dirpath, name);
    if (!opts.monitored.has(file)) {
      return;
    }
    stream.next(FsEvent('changed', file, opts.base));
  };
  var onRename = function onRename(name) {
    var file = _path2['default'].join(dirpath, name);
    _fs2['default'].exists(file, function (added) {
      var deleted = !added;
      var type = added ? 'added' : 'deleted';
      if (deleted && !opts.monitored.has(file)) {
        return;
      }
      stream.next(FsEvent(type, file, opts.base));

      if (deleted) {
        opts.monitored['delete'](file);
        return;
      } else {
        opts.monitored.add(file);
      }
      var statFn = opts.followSymLinks ? 'lstat' : 'stat';
      _fs2['default'][statFn](file, function (err, stats) {
        if (err && !opts.quiet) {
          console.error('pryfs/watchDir - ' + statFn + ' on [' + file + '] ERROR ' + err);
          return;
        }
        if (stats.isDirectory()) {
          watchDir(file, stream, opts);
        }
      });
    });
  };
  watcher.on('change', function (event, name) {
    console.log(arguments);
    if (event === 'rename') {
      onRename(name);
    }
    if (event === 'change') {
      onChange(name);
    }
  });
  watcher.on('error', function (err) {
    return console.error('pryfs/watchDir - on [' + dirpath + '] ERROR ' + err);
  });
};

var pryPath;
var walkDir = function walkDir(filepath, stream, opts) {
  if (ignore(opts.ignore, filepath)) {
    return;
  }
  _fs2['default'].readdir(filepath, function (err, files) {
    if (err && !opts.quiet) {
      console.error('pryfs/walkDir - readdir on [' + filepath + '] ERROR ' + err);
      return;
    }
    (files || []).forEach(function (f) {
      var subpath = _path2['default'].join(filepath, f);
      pryPath(subpath, stream, opts);
    });
  });
};

pryPath = function (file, stream, opts) {
  if (ignore(opts.ignore, file)) {
    return;
  }
  var statFn = opts.followSymLinks ? 'lstat' : 'stat';
  _fs2['default'][statFn](file, function (err, stats) {
    if (err && !opts.quiet) {
      console.error('pryfs/pryPath - lstat on [' + file + '] ERROR ' + err);
      return;
    }
    opts.monitored.add(file);
    if (opts.walk) {
      stream.next(FsEvent('visited', file, opts.base));
    }
    if (stats.isDirectory()) {
      if (opts.watch) {
        watchDir(file, stream, opts);
      }
      if (opts.recursive) {
        walkDir(file, stream, opts);
      }
    }
  });
};

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
  pryPath(base, s, opts);
  return s;
}).when([String], function (base) {
  return pry['default'](base, {});
}).when([Object], function (opts) {
  return pry['default'](opts.base || process.cwd(), opts);
}).when([], function () {
  return pry['default'](process.cwd(), {});
});

exports.pry = pry;
pry();
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

var _fsevent = require('./fsevent');

var _ignore = require('./ignore');

var watchDir = function watchDir(dirpath, stream, opts) {
  if ((0, _ignore.ignore)(opts.ignore, dirpath)) {
    return;
  }
  var watcher = _fs2['default'].watch(dirpath, { persistent: opts.persistent, recursive: false });

  var onAdded = function onAdded(file) {
    // If the file is already monitored, it was not created...
    // so do nothing, since it was probably a glitch from fs.watch
    if (opts.monitored.has(file)) {
      return;
    }

    var statFn = opts.followSymLinks ? 'lstat' : 'stat';
    _fs2['default'][statFn](file, function (err, stats) {
      if (err && !opts.quiet) {
        console.error('pryfs/watchDir - ' + statFn + ' on [' + file + '] ERROR ' + err);
        return;
      }

      // Check that the file was really created by checking its creation time.
      // If the file was created more than 1 second ago, the current event
      // results from a glitch in multiple fs.watch watchers.
      var creationTime = stats.birthtime.getTime();
      var now = new Date().getTime();
      var diff = now - creationTime;
      if (diff > 1000) {
        return;
      }

      opts.monitored.add(file);
      stream.next((0, _fsevent.FsEvent)('added', file, opts.base));

      if (opts.recursive && stats.isDirectory()) {
        watchDir(file, stream, opts);
      }
    });
  };

  var onDeleted = function onDeleted(file) {
    if (!opts.monitored.has(file)) {
      return;
    }
    opts.monitored['delete'](file);
    stream.next((0, _fsevent.FsEvent)('deleted', file, opts.base));
  };

  var onChange = function onChange(name) {
    var file = _path2['default'].join(dirpath, name);
    if (!opts.monitored.has(file)) {
      return;
    }
    stream.next((0, _fsevent.FsEvent)('changed', file, opts.base));
  };

  var onRename = function onRename(name) {
    var file = _path2['default'].join(dirpath, name);
    _fs2['default'].exists(file, function (added) {
      return (added ? onAdded : onDeleted)(file);
    });
  };

  watcher.on('change', function (event, name) {
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
exports.watchDir = watchDir;